import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { rpcConfigs, rpcStates } from '../../db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { rpcManager } from '../../bot/rpc';

export const rpcRoutes = new Elysia({ prefix: '/api/v1/rpc' })
  .get('/configs', async ({ userId, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const configsList = await db.select().from(rpcConfigs)
        .where(eq(rpcConfigs.userId, userId))
        .orderBy(desc(rpcConfigs.createdAt));
      
      // Get states for each config
      const configs = await Promise.all(
        configsList.map(async (config) => {
          const states = await db.select().from(rpcStates)
            .where(eq(rpcStates.configId, config.id));
          return { ...config, states };
        })
      );

      return { configs };
    } catch (error) {
      logger.error('Get RPC configs error:', error);
      set.status = 500;
      return { error: 'Failed to get RPC configs' };
    }
  })
  .get('/configs/:id', async ({ userId, params, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const configResult = await db.select().from(rpcConfigs)
        .where(and(
          eq(rpcConfigs.id, parseInt(params.id)),
          eq(rpcConfigs.userId, userId)
        ));
      
      const config = configResult[0];

      if (!config) {
        set.status = 404;
        return { error: 'RPC config not found' };
      }

      // Get states
      const states = await db.select().from(rpcStates)
        .where(eq(rpcStates.configId, config.id))
        .orderBy(asc(rpcStates.order));

      return { config: { ...config, states } };
    } catch (error) {
      logger.error('Get RPC config error:', error);
      set.status = 500;
      return { error: 'Failed to get RPC config' };
    }
  })
  .post(
    '/configs',
    async ({ userId, body, set }) => {
      if (!userId) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      try {
        const { name, platform, enabled, states: statesData } = body;

        // Create config
        const [config] = await db
          .insert(rpcConfigs)
          .values({
            userId,
            name,
            platform,
            enabled,
          })
          .returning();

        // Create states
        if (statesData && statesData.length > 0) {
          const statesValues = statesData.map((state, index) => ({
            configId: config.id,
            order: index,
            details: state.details,
            state: state.state,
            largeImageKey: state.largeImageKey,
            largeImageText: state.largeImageText,
            smallImageKey: state.smallImageKey,
            smallImageText: state.smallImageText,
            partySize: state.partySize,
            partyMax: state.partyMax,
            startTimestamp: state.startTimestamp,
            endTimestamp: state.endTimestamp,
            buttons: state.buttons ? JSON.stringify(state.buttons) : null,
            duration: state.duration || 60,
          }));

          await db.insert(rpcStates).values(statesValues);
        }

        logger.info(`RPC config created: ${config.id} for user: ${userId}`);

        // Fetch the complete config with states
        const states = await db.select().from(rpcStates)
          .where(eq(rpcStates.configId, config.id))
          .orderBy(asc(rpcStates.order));
        const completeConfig = { ...config, states };

        return { config: completeConfig };
      } catch (error) {
        logger.error('Create RPC config error:', error);
        set.status = 500;
        return { error: 'Failed to create RPC config' };
      }
    },
    {
      body: t.Object({
        name: t.String(),
        platform: t.Union([
          t.Literal('xbox'),
          t.Literal('playstation'),
          t.Literal('pc'),
          t.Literal('mobile'),
          t.Literal('switch'),
          t.Literal('custom'),
        ]),
        enabled: t.Optional(t.Boolean()),
        states: t.Array(
          t.Object({
            details: t.Optional(t.String()),
            state: t.Optional(t.String()),
            largeImageKey: t.Optional(t.String()),
            largeImageText: t.Optional(t.String()),
            smallImageKey: t.Optional(t.String()),
            smallImageText: t.Optional(t.String()),
            partySize: t.Optional(t.Number()),
            partyMax: t.Optional(t.Number()),
            startTimestamp: t.Optional(t.Boolean()),
            endTimestamp: t.Optional(t.Number()),
            buttons: t.Optional(
              t.Array(
                t.Object({
                  label: t.String(),
                  url: t.String(),
                })
              )
            ),
            duration: t.Optional(t.Number()),
          })
        ),
      }),
    }
  )
  .put(
    '/configs/:id',
    async ({ userId, params, body, set }) => {
      if (!userId) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      try {
        const configId = parseInt(params.id);
        const { name, platform, enabled, states: statesData } = body;

        // Update config
        const [config] = await db
          .update(rpcConfigs)
          .set({
            name,
            platform,
            enabled,
            updatedAt: new Date(),
          })
          .where(
            and(eq(rpcConfigs.id, configId), eq(rpcConfigs.userId, userId))
          )
          .returning();

        if (!config) {
          set.status = 404;
          return { error: 'RPC config not found' };
        }

        // Delete old states and create new ones
        await db.delete(rpcStates).where(eq(rpcStates.configId, configId));

        if (statesData && statesData.length > 0) {
          const statesValues = statesData.map((state, index) => ({
            configId: config.id,
            order: index,
            details: state.details,
            state: state.state,
            largeImageKey: state.largeImageKey,
            largeImageText: state.largeImageText,
            smallImageKey: state.smallImageKey,
            smallImageText: state.smallImageText,
            partySize: state.partySize,
            partyMax: state.partyMax,
            startTimestamp: state.startTimestamp,
            endTimestamp: state.endTimestamp,
            buttons: state.buttons ? JSON.stringify(state.buttons) : null,
            duration: state.duration || 60,
          }));

          await db.insert(rpcStates).values(statesValues);
        }

        // If enabled, restart RPC
        if (enabled) {
          await rpcManager.restart(userId);
        }

        logger.info(`RPC config updated: ${config.id}`);

        // Fetch the complete config with states
        const updatedStates = await db.select().from(rpcStates)
          .where(eq(rpcStates.configId, config.id))
          .orderBy(asc(rpcStates.order));
        const completeConfig = { ...config, states: updatedStates };

        return { config: completeConfig };
      } catch (error) {
        logger.error('Update RPC config error:', error);
        set.status = 500;
        return { error: 'Failed to update RPC config' };
      }
    },
    {
      body: t.Object({
        name: t.String(),
        platform: t.Union([
          t.Literal('xbox'),
          t.Literal('playstation'),
          t.Literal('pc'),
          t.Literal('mobile'),
          t.Literal('switch'),
          t.Literal('custom'),
        ]),
        enabled: t.Optional(t.Boolean()),
        states: t.Array(
          t.Object({
            details: t.Optional(t.String()),
            state: t.Optional(t.String()),
            largeImageKey: t.Optional(t.String()),
            largeImageText: t.Optional(t.String()),
            smallImageKey: t.Optional(t.String()),
            smallImageText: t.Optional(t.String()),
            partySize: t.Optional(t.Number()),
            partyMax: t.Optional(t.Number()),
            startTimestamp: t.Optional(t.Boolean()),
            endTimestamp: t.Optional(t.Number()),
            buttons: t.Optional(
              t.Array(
                t.Object({
                  label: t.String(),
                  url: t.String(),
                })
              )
            ),
            duration: t.Optional(t.Number()),
          })
        ),
      }),
    }
  )
  .delete('/configs/:id', async ({ userId, params, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const configId = parseInt(params.id);

      // Delete states first (cascade)
      await db.delete(rpcStates).where(eq(rpcStates.configId, configId));

      // Delete config
      const result = await db
        .delete(rpcConfigs)
        .where(
          and(eq(rpcConfigs.id, configId), eq(rpcConfigs.userId, userId))
        )
        .returning();

      if (result.length === 0) {
        set.status = 404;
        return { error: 'RPC config not found' };
      }

      logger.info(`RPC config deleted: ${configId}`);
      return { message: 'RPC config deleted successfully' };
    } catch (error) {
      logger.error('Delete RPC config error:', error);
      set.status = 500;
      return { error: 'Failed to delete RPC config' };
    }
  })
  .post('/configs/:id/toggle', async ({ userId, params, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const configId = parseInt(params.id);

      const configResult = await db.select().from(rpcConfigs)
        .where(and(
          eq(rpcConfigs.id, configId),
          eq(rpcConfigs.userId, userId)
        ));
      
      const config = configResult[0];

      if (!config) {
        set.status = 404;
        return { error: 'RPC config not found' };
      }

      const [updated] = await db
        .update(rpcConfigs)
        .set({
          enabled: !config.enabled,
          updatedAt: new Date(),
        })
        .where(eq(rpcConfigs.id, configId))
        .returning();

      // Restart RPC if now enabled, stop if disabled
      if (updated.enabled) {
        await rpcManager.restart(userId);
      } else {
        await rpcManager.stop(userId);
      }

      logger.info(`RPC config toggled: ${configId} -> ${updated.enabled}`);
      return { config: updated };
    } catch (error) {
      logger.error('Toggle RPC config error:', error);
      set.status = 500;
      return { error: 'Failed to toggle RPC config' };
    }
  });

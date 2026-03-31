import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { settings, users, discordAccounts, rpcConfigs, rpcStates, slashCommands } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../../utils/logger';

export const settingsRoutes = new Elysia({ prefix: '/api/v1/settings' })
  .get('/', async ({ userId, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const settingsResult = await db.select().from(settings)
        .where(eq(settings.userId, userId));
      const userSettings = settingsResult[0];

      if (!userSettings) {
        // Create default settings
        const [newSettings] = await db
          .insert(settings)
          .values({ userId })
          .returning();
        return { settings: newSettings };
      }

      return { settings: userSettings };
    } catch (error) {
      logger.error('Get settings error:', error);
      set.status = 500;
      return { error: 'Failed to get settings' };
    }
  })
  .put(
    '/',
    async ({ userId, body, set }) => {
      if (!userId) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      try {
        const [updated] = await db
          .update(settings)
          .set({
            ...body,
            updatedAt: new Date(),
          })
          .where(eq(settings.userId, userId))
          .returning();

        if (!updated) {
          // Create if doesn't exist
          const [created] = await db
            .insert(settings)
            .values({
              userId,
              ...body,
            })
            .returning();
          return { settings: created };
        }

        logger.info(`Settings updated for user: ${userId}`);
        return { settings: updated };
      } catch (error) {
        logger.error('Update settings error:', error);
        set.status = 500;
        return { error: 'Failed to update settings' };
      }
    },
    {
      body: t.Partial(
        t.Object({
          theme: t.Union([t.Literal('light'), t.Literal('dark'), t.Literal('system')]),
          language: t.String(),
          timezone: t.String(),
          dateFormat: t.String(),
          timeFormat: t.Union([t.Literal('12h'), t.Literal('24h')]),
          notificationsEnabled: t.Boolean(),
          soundEnabled: t.Boolean(),
          compactMode: t.Boolean(),
          showAvatars: t.Boolean(),
          messagePreview: t.Boolean(),
          autoStartBot: t.Boolean(),
          logMessages: t.Boolean(),
          logCommands: t.Boolean(),
          logErrors: t.Boolean(),
        })
      ),
    }
  )
  .get('/backup', async ({ userId, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      // Get all user data
      const userResult = await db.select().from(users).where(eq(users.id, userId));
      const user = userResult[0];

      const settingsResult = await db.select().from(settings)
        .where(eq(settings.userId, userId));
      const userSettings = settingsResult[0];

      const discordAccountResult = await db.select().from(discordAccounts)
        .where(eq(discordAccounts.userId, userId));
      const discordAccount = discordAccountResult[0];

      const rpcConfigsList = await db.select().from(rpcConfigs)
        .where(eq(rpcConfigs.userId, userId));
      
      // Get states for each config
      const rpcConfigsWithStates = await Promise.all(
        rpcConfigsList.map(async (config) => {
          const states = await db.select().from(rpcStates)
            .where(eq(rpcStates.configId, config.id));
          return { ...config, states };
        })
      );

      const commands = await db.select().from(slashCommands)
        .where(eq(slashCommands.userId, userId));

      const backup = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        user: {
          username: user?.username,
          email: user?.email,
        },
        settings: userSettings,
        discordAccount: discordAccount
          ? {
              discordId: discordAccount.discordId,
              username: discordAccount.username,
              discriminator: discordAccount.discriminator,
            }
          : null,
        rpcConfigs: rpcConfigsWithStates,
        commands,
      };

      logger.info(`Settings backup created for user: ${userId}`);
      return { backup };
    } catch (error) {
      logger.error('Backup settings error:', error);
      set.status = 500;
      return { error: 'Failed to create backup' };
    }
  })
  .post(
    '/restore',
    async ({ userId, body, set }) => {
      if (!userId) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      try {
        const { backup } = body;

        // Validate backup version
        if (backup.version !== '1.0.0') {
          set.status = 400;
          return { error: 'Incompatible backup version' };
        }

        // Restore settings
        if (backup.settings) {
          await db
            .update(settings)
            .set({
              ...backup.settings,
              updatedAt: new Date(),
            })
            .where(eq(settings.userId, userId));
        }

        // Restore RPC configs
        if (backup.rpcConfigs && Array.isArray(backup.rpcConfigs)) {
          // Delete existing configs
          await db
            .delete(rpcConfigs)
            .where(eq(rpcConfigs.userId, userId));

          // Insert restored configs
          for (const config of backup.rpcConfigs) {
            const [newConfig] = await db
              .insert(rpcConfigs)
              .values({
                userId,
                name: config.name,
                platform: config.platform,
                enabled: false, // Start disabled for safety
              })
              .returning();

            // Insert states
            if (config.states && Array.isArray(config.states)) {
              for (const state of config.states) {
                await db.insert(rpcStates).values({
                  configId: newConfig.id,
                  order: state.order,
                  name: state.name || 'Unnamed State',
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
                  buttons: state.buttons,
                  duration: state.duration,
                });
              }
            }
          }
        }

        // Restore commands
        if (backup.commands && Array.isArray(backup.commands)) {
          // Delete existing commands
          await db
            .delete(slashCommands)
            .where(eq(slashCommands.userId, userId));

          // Insert restored commands
          for (const command of backup.commands) {
            await db.insert(slashCommands).values({
              userId,
              name: command.name,
              description: command.description,
              response: command.response,
              guildId: command.guildId,
              enabled: false, // Start disabled for safety
            });
          }
        }

        logger.info(`Settings restored for user: ${userId}`);
        return { message: 'Settings restored successfully' };
      } catch (error) {
        logger.error('Restore settings error:', error);
        set.status = 500;
        return { error: 'Failed to restore settings' };
      }
    },
    {
      body: t.Object({
        backup: t.Any(),
      }),
    }
  )
  .delete('/reset', async ({ userId, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      // Reset to default settings
      await db
        .update(settings)
        .set({
          theme: 'system',
          language: 'en',
          timezone: 'UTC',
          dateFormat: 'YYYY-MM-DD',
          timeFormat: '24h',
          notificationsEnabled: true,
          soundEnabled: true,
          compactMode: false,
          showAvatars: true,
          messagePreview: true,
          autoStartBot: false,
          logMessages: true,
          logCommands: true,
          logErrors: true,
          updatedAt: new Date(),
        })
        .where(eq(settings.userId, userId));

      logger.info(`Settings reset for user: ${userId}`);
      return { message: 'Settings reset to defaults' };
    } catch (error) {
      logger.error('Reset settings error:', error);
      set.status = 500;
      return { error: 'Failed to reset settings' };
    }
  });

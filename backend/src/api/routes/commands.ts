import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { slashCommands } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { botManager } from '../../bot';

export const commandsRoutes = new Elysia({ prefix: '/commands' })
  .get('/list', async ({ userId, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const commands = await db.query.slashCommands.findMany({
        where: eq(slashCommands.userId, userId),
        orderBy: (commands, { asc }) => [asc(commands.name)],
      });

      return { commands };
    } catch (error) {
      logger.error('Get commands error:', error);
      set.status = 500;
      return { error: 'Failed to get commands' };
    }
  })
  .get('/list/:id', async ({ userId, params, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const command = await db.query.slashCommands.findFirst({
        where: and(
          eq(slashCommands.id, parseInt(params.id)),
          eq(slashCommands.userId, userId)
        ),
      });

      if (!command) {
        set.status = 404;
        return { error: 'Command not found' };
      }

      return { command };
    } catch (error) {
      logger.error('Get command error:', error);
      set.status = 500;
      return { error: 'Failed to get command' };
    }
  })
  .post(
    '/create',
    async ({ userId, body, set }) => {
      if (!userId) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      try {
        const { name, description, response, guildId, enabled } = body;

        // Check if command with same name exists for this user
        const existing = await db.query.slashCommands.findFirst({
          where: and(
            eq(slashCommands.userId, userId),
            eq(slashCommands.name, name),
            guildId ? eq(slashCommands.guildId, guildId) : undefined
          ),
        });

        if (existing) {
          set.status = 409;
          return { error: 'Command with this name already exists' };
        }

        const [command] = await db
          .insert(slashCommands)
          .values({
            userId,
            name,
            description,
            response,
            guildId: guildId || null,
            enabled: enabled ?? true,
          })
          .returning();

        // Register command with Discord
        if (command.enabled) {
          await botManager.registerCommand(userId, command);
        }

        logger.info(`Command created: ${command.name} for user: ${userId}`);
        return { command };
      } catch (error) {
        logger.error('Create command error:', error);
        set.status = 500;
        return { error: 'Failed to create command' };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 32, pattern: '^[a-z0-9_-]+$' }),
        description: t.String({ minLength: 1, maxLength: 100 }),
        response: t.String({ minLength: 1 }),
        guildId: t.Optional(t.String()),
        enabled: t.Optional(t.Boolean()),
      }),
    }
  )
  .put(
    '/update/:id',
    async ({ userId, params, body, set }) => {
      if (!userId) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      try {
        const commandId = parseInt(params.id);
        const { name, description, response, guildId, enabled } = body;

        const [command] = await db
          .update(slashCommands)
          .set({
            name,
            description,
            response,
            guildId: guildId || null,
            enabled: enabled ?? true,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(slashCommands.id, commandId),
              eq(slashCommands.userId, userId)
            )
          )
          .returning();

        if (!command) {
          set.status = 404;
          return { error: 'Command not found' };
        }

        // Re-register command with Discord
        await botManager.unregisterCommand(userId, commandId);
        if (command.enabled) {
          await botManager.registerCommand(userId, command);
        }

        logger.info(`Command updated: ${command.name}`);
        return { command };
      } catch (error) {
        logger.error('Update command error:', error);
        set.status = 500;
        return { error: 'Failed to update command' };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 32, pattern: '^[a-z0-9_-]+$' }),
        description: t.String({ minLength: 1, maxLength: 100 }),
        response: t.String({ minLength: 1 }),
        guildId: t.Optional(t.String()),
        enabled: t.Optional(t.Boolean()),
      }),
    }
  )
  .delete('/delete/:id', async ({ userId, params, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const commandId = parseInt(params.id);

      // Unregister from Discord first
      await botManager.unregisterCommand(userId, commandId);

      const result = await db
        .delete(slashCommands)
        .where(
          and(
            eq(slashCommands.id, commandId),
            eq(slashCommands.userId, userId)
          )
        )
        .returning();

      if (result.length === 0) {
        set.status = 404;
        return { error: 'Command not found' };
      }

      logger.info(`Command deleted: ${commandId}`);
      return { message: 'Command deleted successfully' };
    } catch (error) {
      logger.error('Delete command error:', error);
      set.status = 500;
      return { error: 'Failed to delete command' };
    }
  })
  .post('/toggle/:id', async ({ userId, params, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const commandId = parseInt(params.id);

      const command = await db.query.slashCommands.findFirst({
        where: and(
          eq(slashCommands.id, commandId),
          eq(slashCommands.userId, userId)
        ),
      });

      if (!command) {
        set.status = 404;
        return { error: 'Command not found' };
      }

      const [updated] = await db
        .update(slashCommands)
        .set({
          enabled: !command.enabled,
          updatedAt: new Date(),
        })
        .where(eq(slashCommands.id, commandId))
        .returning();

      // Register or unregister with Discord
      if (updated.enabled) {
        await botManager.registerCommand(userId, updated);
      } else {
        await botManager.unregisterCommand(userId, commandId);
      }

      logger.info(`Command toggled: ${commandId} -> ${updated.enabled}`);
      return { command: updated };
    } catch (error) {
      logger.error('Toggle command error:', error);
      set.status = 500;
      return { error: 'Failed to toggle command' };
    }
  });

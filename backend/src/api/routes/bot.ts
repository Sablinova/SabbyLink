import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { discordAccounts, settings } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { encrypt, decrypt } from '../../utils/crypto';
import { botManager } from '../../bot';

export const botRoutes = new Elysia({ prefix: '/api/v1/bot' })
  .get('/status', async ({ userId, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const status = botManager.getStatus(userId);
      return status;
    } catch (error) {
      logger.error('Get bot status error:', error);
      set.status = 500;
      return { error: 'Failed to get bot status' };
    }
  })
  .post(
    '/start',
    async ({ userId, body, set }) => {
      if (!userId) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      try {
        const { token } = body;

        // Encrypt and store token
        const encryptedToken = encrypt(token);
        
        // Note: Schema requires discordId, username, discriminator - we'll get them from Discord
        // For now, just start the bot and update the account when we get user info
        const client = await botManager.start(userId, token);
        
        // Get user info from Discord
        const discordUser = botManager.getUser(userId);
        
        if (discordUser) {
          const [account] = await db
            .insert(discordAccounts)
            .values({
              userId,
              discordId: discordUser.id,
              username: discordUser.username,
              discriminator: discordUser.discriminator || '0',
              tokenEncrypted: encryptedToken,
            })
            .onConflictDoUpdate({
              target: discordAccounts.userId,
              set: {
                tokenEncrypted: encryptedToken,
                username: discordUser.username,
                discriminator: discordUser.discriminator || '0',
                updatedAt: new Date(),
              },
            })
            .returning();

          logger.info(`Bot started for user: ${userId}`);
          return { message: 'Bot started successfully', accountId: account.id };
        }

        logger.info(`Bot started for user: ${userId}`);
        return { message: 'Bot started successfully' };
      } catch (error) {
        logger.error('Start bot error:', error);
        set.status = 500;
        return { error: 'Failed to start bot' };
      }
    },
    {
      body: t.Object({
        token: t.String(),
      }),
    }
  )
  .post('/stop', async ({ userId, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      await botManager.stop(userId);

      logger.info(`Bot stopped for user: ${userId}`);
      return { message: 'Bot stopped successfully' };
    } catch (error) {
      logger.error('Stop bot error:', error);
      set.status = 500;
      return { error: 'Failed to stop bot' };
    }
  })
  .post('/restart', async ({ userId, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      // Get stored token
      const accountResult = await db.select().from(discordAccounts)
        .where(eq(discordAccounts.userId, userId));
      
      const account = accountResult[0];

      if (!account) {
        set.status = 404;
        return { error: 'Discord account not configured' };
      }

      const token = decrypt(account.tokenEncrypted);

      // Restart bot
      await botManager.stop(userId);
      await botManager.start(userId, token);

      logger.info(`Bot restarted for user: ${userId}`);
      return { message: 'Bot restarted successfully' };
    } catch (error) {
      logger.error('Restart bot error:', error);
      set.status = 500;
      return { error: 'Failed to restart bot' };
    }
  })
  .get('/guilds', async ({ userId, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const guilds = await botManager.getGuilds(userId);
      return { guilds };
    } catch (error) {
      logger.error('Get guilds error:', error);
      set.status = 500;
      return { error: 'Failed to get guilds' };
    }
  })
  .get('/user', async ({ userId, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const user = await botManager.getUser(userId);
      return { user };
    } catch (error) {
      logger.error('Get Discord user error:', error);
      set.status = 500;
      return { error: 'Failed to get Discord user' };
    }
  });

/**
 * User App Routes
 * 
 * Manages Discord User Applications for slash commands (hybrid mode).
 * Like Nighty, this allows users to create their own Discord apps
 * to register slash commands that work with autocompletion.
 */

import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { users, discordAccounts } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { encrypt, decrypt } from '../../utils/crypto';

const DISCORD_API = 'https://discord.com/api/v10';

interface DiscordApplication {
  id: string;
  name: string;
  icon: string | null;
  description: string;
  bot_public: boolean;
  bot_require_code_grant: boolean;
  verify_key: string;
}

/**
 * Get user's Discord applications
 */
async function getUserApplications(userToken: string): Promise<DiscordApplication[]> {
  const response = await fetch(`${DISCORD_API}/applications`, {
    headers: {
      Authorization: userToken,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to get Discord applications:', error);
    throw new Error('Failed to get Discord applications');
  }

  return response.json();
}

/**
 * Create a new Discord application
 */
async function createApplication(userToken: string, name: string): Promise<DiscordApplication> {
  const response = await fetch(`${DISCORD_API}/applications`, {
    method: 'POST',
    headers: {
      Authorization: userToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to create Discord application:', error);
    throw new Error('Failed to create Discord application');
  }

  return response.json();
}

/**
 * Get application details
 */
async function getApplication(userToken: string, appId: string): Promise<DiscordApplication> {
  const response = await fetch(`${DISCORD_API}/applications/${appId}`, {
    headers: {
      Authorization: userToken,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get application');
  }

  return response.json();
}

/**
 * Update application
 */
async function updateApplication(
  userToken: string,
  appId: string,
  data: { name?: string; description?: string }
): Promise<DiscordApplication> {
  const response = await fetch(`${DISCORD_API}/applications/${appId}`, {
    method: 'PATCH',
    headers: {
      Authorization: userToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to update application');
  }

  return response.json();
}

/**
 * Reset application bot token
 */
async function resetBotToken(userToken: string, appId: string): Promise<{ token: string }> {
  const response = await fetch(`${DISCORD_API}/applications/${appId}/bot/reset`, {
    method: 'POST',
    headers: {
      Authorization: userToken,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to reset bot token:', error);
    throw new Error('Failed to reset bot token');
  }

  return response.json();
}

/**
 * Create bot for application (if not exists)
 */
async function createBot(userToken: string, appId: string): Promise<any> {
  const response = await fetch(`${DISCORD_API}/applications/${appId}/bot`, {
    method: 'POST',
    headers: {
      Authorization: userToken,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    // Bot might already exist
    if (response.status === 400) {
      return { exists: true };
    }
    throw new Error('Failed to create bot');
  }

  return response.json();
}

/**
 * Register global slash commands for an application
 */
async function registerSlashCommands(
  botToken: string,
  appId: string,
  commands: Array<{
    name: string;
    description: string;
    options?: any[];
  }>
): Promise<any[]> {
  const response = await fetch(`${DISCORD_API}/applications/${appId}/commands`, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to register slash commands:', error);
    throw new Error('Failed to register slash commands');
  }

  return response.json();
}

/**
 * Get authorization URL for user app
 */
function getAppAuthUrl(appId: string, redirectUri?: string): string {
  const params = new URLSearchParams({
    client_id: appId,
    scope: 'applications.commands',
  });

  if (redirectUri) {
    params.set('redirect_uri', redirectUri);
    params.set('response_type', 'code');
  }

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

// Helper to extract user from JWT
async function getUserFromToken(authHeader: string | undefined): Promise<typeof users.$inferSelect | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const token = authHeader.substring(7);
    const payload = require('jsonwebtoken').verify(token, env.JWT_SECRET) as { userId: number };

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    return user || null;
  } catch {
    return null;
  }
}

export const userAppRoutes = new Elysia({ prefix: '/api/v1/user-app' })
  /**
   * Get user's Discord applications
   */
  .get('/list', async ({ headers, set }) => {
    try {
      const user = await getUserFromToken(headers.authorization);
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      // Get linked Discord account with token
      const [account] = await db
        .select()
        .from(discordAccounts)
        .where(eq(discordAccounts.userId, user.id))
        .limit(1);

      if (!account) {
        set.status = 400;
        return { error: 'No Discord account linked. Connect your Discord account first.' };
      }

      const userToken = decrypt(account.tokenEncrypted);
      const apps = await getUserApplications(userToken);

      return {
        applications: apps.map((app) => ({
          id: app.id,
          name: app.name,
          icon: app.icon,
          description: app.description,
        })),
      };
    } catch (error) {
      logger.error('List user apps error:', error);
      set.status = 500;
      return { error: 'Failed to list applications' };
    }
  })

  /**
   * Create a new Discord application for slash commands
   */
  .post('/create', async ({ body, headers, set }) => {
    try {
      const user = await getUserFromToken(headers.authorization);
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const [account] = await db
        .select()
        .from(discordAccounts)
        .where(eq(discordAccounts.userId, user.id))
        .limit(1);

      if (!account) {
        set.status = 400;
        return { error: 'No Discord account linked' };
      }

      const userToken = decrypt(account.tokenEncrypted);
      
      // Create the application
      const app = await createApplication(userToken, body.name);
      logger.info(`Created Discord application: ${app.name} (${app.id})`);

      // Create bot for the application
      await createBot(userToken, app.id);

      // Get the bot token
      const botTokenResult = await resetBotToken(userToken, app.id);

      return {
        application: {
          id: app.id,
          name: app.name,
          icon: app.icon,
        },
        botToken: botTokenResult.token,
        authUrl: getAppAuthUrl(app.id),
        message: 'Application created! Authorize it to enable slash commands.',
      };
    } catch (error) {
      logger.error('Create user app error:', error);
      set.status = 500;
      return { error: 'Failed to create application' };
    }
  }, {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 32 }),
    }),
  })

  /**
   * Update application name/description
   */
  .patch('/:appId', async ({ params, body, headers, set }) => {
    try {
      const user = await getUserFromToken(headers.authorization);
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const [account] = await db
        .select()
        .from(discordAccounts)
        .where(eq(discordAccounts.userId, user.id))
        .limit(1);

      if (!account) {
        set.status = 400;
        return { error: 'No Discord account linked' };
      }

      const userToken = decrypt(account.tokenEncrypted);
      const app = await updateApplication(userToken, params.appId, body);

      return {
        application: {
          id: app.id,
          name: app.name,
          description: app.description,
        },
      };
    } catch (error) {
      logger.error('Update user app error:', error);
      set.status = 500;
      return { error: 'Failed to update application' };
    }
  }, {
    params: t.Object({
      appId: t.String(),
    }),
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1, maxLength: 32 })),
      description: t.Optional(t.String({ maxLength: 400 })),
    }),
  })

  /**
   * Reset bot token for application
   */
  .post('/:appId/reset-token', async ({ params, headers, set }) => {
    try {
      const user = await getUserFromToken(headers.authorization);
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const [account] = await db
        .select()
        .from(discordAccounts)
        .where(eq(discordAccounts.userId, user.id))
        .limit(1);

      if (!account) {
        set.status = 400;
        return { error: 'No Discord account linked' };
      }

      const userToken = decrypt(account.tokenEncrypted);
      const result = await resetBotToken(userToken, params.appId);

      return {
        botToken: result.token,
        message: 'Bot token reset successfully',
      };
    } catch (error) {
      logger.error('Reset bot token error:', error);
      set.status = 500;
      return { error: 'Failed to reset bot token' };
    }
  }, {
    params: t.Object({
      appId: t.String(),
    }),
  })

  /**
   * Get authorization URL for an application
   */
  .get('/:appId/auth-url', async ({ params, set }) => {
    return {
      url: getAppAuthUrl(params.appId),
    };
  }, {
    params: t.Object({
      appId: t.String(),
    }),
  })

  /**
   * Register SabbyLink's slash commands to the user's application
   */
  .post('/:appId/register-commands', async ({ params, body, headers, set }) => {
    try {
      const user = await getUserFromToken(headers.authorization);
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      // Default SabbyLink commands
      const defaultCommands = [
        {
          name: 'help',
          description: 'Show SabbyLink help and available commands',
        },
        {
          name: 'rpc',
          description: 'Manage Rich Presence settings',
          options: [
            {
              name: 'set',
              description: 'Set a Rich Presence preset',
              type: 1, // SUB_COMMAND
              options: [
                {
                  name: 'preset',
                  description: 'Preset name to activate',
                  type: 3, // STRING
                  required: true,
                },
              ],
            },
            {
              name: 'clear',
              description: 'Clear Rich Presence',
              type: 1,
            },
            {
              name: 'list',
              description: 'List available presets',
              type: 1,
            },
          ],
        },
        {
          name: 'afk',
          description: 'Toggle AFK mode',
          options: [
            {
              name: 'message',
              description: 'Custom AFK message',
              type: 3,
              required: false,
            },
          ],
        },
        {
          name: 'ai',
          description: 'AI chat commands',
          options: [
            {
              name: 'chat',
              description: 'Chat with AI',
              type: 1,
              options: [
                {
                  name: 'message',
                  description: 'Your message',
                  type: 3,
                  required: true,
                },
              ],
            },
          ],
        },
        {
          name: 'settings',
          description: 'View or modify settings',
        },
        {
          name: 'status',
          description: 'Show bot status and uptime',
        },
      ];

      const commands = body.commands || defaultCommands;

      // We need the bot token - user must provide it or we use stored one
      if (!body.botToken) {
        set.status = 400;
        return { error: 'Bot token required. Get it from /user-app/:appId/reset-token' };
      }

      const registered = await registerSlashCommands(body.botToken, params.appId, commands);

      return {
        registered: registered.length,
        commands: registered.map((cmd: any) => ({
          id: cmd.id,
          name: cmd.name,
          description: cmd.description,
        })),
        message: 'Commands registered successfully!',
      };
    } catch (error) {
      logger.error('Register commands error:', error);
      set.status = 500;
      return { error: 'Failed to register commands' };
    }
  }, {
    params: t.Object({
      appId: t.String(),
    }),
    body: t.Object({
      botToken: t.String(),
      commands: t.Optional(t.Array(t.Object({
        name: t.String(),
        description: t.String(),
        options: t.Optional(t.Array(t.Any())),
      }))),
    }),
  });

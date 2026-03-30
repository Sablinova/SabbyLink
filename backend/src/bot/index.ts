import { Client } from 'discord.js-selfbot-v13';
import { db } from '../db';
import { discordAccounts, slashCommands } from '../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { decrypt } from '../utils/crypto';
import { wsManager } from '../ws';
import { EventEmitter } from 'events';

interface BotInstance {
  client: Client;
  userId: number;
  ready: boolean;
}

class BotManager extends EventEmitter {
  private bots: Map<number, BotInstance> = new Map();

  async start(userId: number, token: string): Promise<void> {
    // Stop existing bot if running
    if (this.bots.has(userId)) {
      await this.stop(userId);
    }

    const client = new Client({
      checkUpdate: false,
      readyStatus: false,
    });

    const instance: BotInstance = {
      client,
      userId,
      ready: false,
    };

    this.bots.set(userId, instance);

    // Setup event handlers
    this.setupEventHandlers(instance);

    try {
      await client.login(token);
      logger.info(`Bot started for user: ${userId}`);
    } catch (error) {
      logger.error(`Bot login failed for user ${userId}:`, error);
      this.bots.delete(userId);
      throw error;
    }
  }

  async stop(userId: number): Promise<void> {
    const instance = this.bots.get(userId);
    if (!instance) return;

    try {
      instance.client.destroy();
      this.bots.delete(userId);
      logger.info(`Bot stopped for user: ${userId}`);

      // Notify dashboard
      wsManager.broadcast(userId, 'bot:status', {
        status: 'offline',
        ready: false,
      });
    } catch (error) {
      logger.error(`Error stopping bot for user ${userId}:`, error);
      throw error;
    }
  }

  getStatus(userId: number) {
    const instance = this.bots.get(userId);
    if (!instance || !instance.ready) {
      return {
        status: 'offline',
        ready: false,
      };
    }

    const { client } = instance;
    return {
      status: 'online',
      ready: true,
      user: {
        id: client.user?.id,
        username: client.user?.username,
        discriminator: client.user?.discriminator,
        avatar: client.user?.avatar,
      },
      guilds: client.guilds.cache.size,
      ping: client.ws.ping,
      uptime: client.uptime,
    };
  }

  async getGuilds(userId: number) {
    const instance = this.bots.get(userId);
    if (!instance || !instance.ready) {
      throw new Error('Bot not ready');
    }

    return instance.client.guilds.cache.map((guild) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      memberCount: guild.memberCount,
      owner: guild.ownerId === instance.client.user?.id,
    }));
  }

  async getUser(userId: number) {
    const instance = this.bots.get(userId);
    if (!instance || !instance.ready) {
      throw new Error('Bot not ready');
    }

    const { user } = instance.client;
    return {
      id: user?.id,
      username: user?.username,
      discriminator: user?.discriminator,
      avatar: user?.avatar,
      bot: user?.bot,
      createdAt: user?.createdAt,
    };
  }

  getClient(userId: number): Client | undefined {
    return this.bots.get(userId)?.client;
  }

  async registerCommand(userId: number, command: any): Promise<void> {
    // Command registration is handled via interaction events
    // Discord.js-selfbot doesn't support creating application commands
    // Commands are stored in DB and triggered via message patterns
    logger.info(`Command registered: ${command.name} for user: ${userId}`);
  }

  async unregisterCommand(userId: number, commandId: number): Promise<void> {
    logger.info(`Command unregistered: ${commandId} for user: ${userId}`);
  }

  private setupEventHandlers(instance: BotInstance) {
    const { client, userId } = instance;

    client.on('ready', () => {
      instance.ready = true;
      logger.info(`Bot ready: ${client.user?.tag} (user: ${userId})`);

      // Notify dashboard
      wsManager.broadcast(userId, 'bot:status', {
        status: 'online',
        ready: true,
        user: {
          id: client.user?.id,
          username: client.user?.username,
          discriminator: client.user?.discriminator,
          avatar: client.user?.avatar,
        },
      });
    });

    client.on('error', (error) => {
      logger.error(`Bot error for user ${userId}:`, error);
      wsManager.broadcast(userId, 'bot:error', {
        error: error.message,
      });
    });

    client.on('disconnect', () => {
      logger.warn(`Bot disconnected for user ${userId}`);
      instance.ready = false;
      wsManager.broadcast(userId, 'bot:status', {
        status: 'offline',
        ready: false,
      });
    });

    client.on('messageCreate', async (message) => {
      // Message logging handled by message logger module
      this.emit('message', { userId, message });
    });

    client.on('interactionCreate', async (interaction) => {
      // Handle slash commands
      if (interaction.isCommand()) {
        this.emit('command', { userId, interaction });
      }
    });
  }

  // Auto-start bots on server startup
  async autoStart() {
    try {
      const accounts = await db.query.discordAccounts.findMany({
        where: eq(discordAccounts.isActive, true),
      });

      logger.info(`Auto-starting ${accounts.length} bots...`);

      for (const account of accounts) {
        try {
          const token = decrypt(account.token);
          await this.start(account.userId, token);
        } catch (error) {
          logger.error(
            `Failed to auto-start bot for user ${account.userId}:`,
            error
          );
        }
      }
    } catch (error) {
      logger.error('Auto-start error:', error);
    }
  }
}

export const botManager = new BotManager();

/**
 * AFK Module
 * Auto-responds to DMs and mentions when user is AFK
 */

import type { Client, Message } from 'discord.js-selfbot-v13';
import { db } from '@/db';
import { afkSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { log } from '@/utils/logger';

interface AFKState {
  enabled: boolean;
  message: string;
  startTime: Date;
  respondToDMs: boolean;
  respondToMentions: boolean;
  respondToReplies: boolean;
  ignoredUsers: string[];
  ignoredGuilds: string[];
}

export class AFKModule {
  private client: Client;
  private discordAccountId: number;
  private state: AFKState | null = null;
  private respondedTo: Map<string, number> = new Map(); // userId -> timestamp
  private cooldownMs = 60000; // 1 minute cooldown per user

  constructor(client: Client, discordAccountId: number) {
    this.client = client;
    this.discordAccountId = discordAccountId;
  }

  async init(): Promise<void> {
    await this.loadSettings();
    this.setupListeners();
    log.info(`AFK module initialized for account ${this.discordAccountId}`);
  }

  private async loadSettings(): Promise<void> {
    try {
      const settingsResult = await db.select().from(afkSettings)
        .where(eq(afkSettings.discordAccountId, this.discordAccountId));
      
      const settings = settingsResult[0];

      if (settings && settings.enabled) {
        this.state = {
          enabled: settings.enabled,
          message: settings.message || "I'm currently AFK. I'll respond when I'm back!",
          startTime: settings.startedAt || new Date(),
          respondToDMs: settings.respondToDms ?? true,
          respondToMentions: settings.respondToMentions ?? true,
          respondToReplies: settings.respondToReplies ?? true,
          ignoredUsers: settings.ignoredUsers || [],
          ignoredGuilds: settings.ignoredGuilds || [],
        };
      }
    } catch (error) {
      log.error('Failed to load AFK settings:', error);
    }
  }

  private setupListeners(): void {
    this.client.on('messageCreate', async (message: Message) => {
      if (!this.state?.enabled) return;
      if (message.author.id === this.client.user?.id) return;
      if (message.author.bot) return;

      await this.handleMessage(message);
    });
  }

  private async handleMessage(message: Message): Promise<void> {
    if (!this.state) return;

    const userId = message.author.id;
    const guildId = message.guild?.id;

    // Check ignored lists
    if (this.state.ignoredUsers.includes(userId)) return;
    if (guildId && this.state.ignoredGuilds.includes(guildId)) return;

    // Check cooldown
    const lastResponded = this.respondedTo.get(userId);
    if (lastResponded && Date.now() - lastResponded < this.cooldownMs) return;

    let shouldRespond = false;

    // Check if DM
    if (!message.guild && this.state.respondToDMs) {
      shouldRespond = true;
    }

    // Check if mentioned
    if (message.mentions.has(this.client.user!.id) && this.state.respondToMentions) {
      shouldRespond = true;
    }

    // Check if reply to our message
    if (message.reference && this.state.respondToReplies) {
      try {
        const repliedTo = await message.channel.messages.fetch(message.reference.messageId!);
        if (repliedTo.author.id === this.client.user?.id) {
          shouldRespond = true;
        }
      } catch {
        // Message not found, ignore
      }
    }

    if (shouldRespond) {
      await this.sendAFKResponse(message);
    }
  }

  private async sendAFKResponse(message: Message): Promise<void> {
    if (!this.state) return;

    try {
      const afkDuration = this.formatDuration(Date.now() - this.state.startTime.getTime());
      const response = `${this.state.message}\n\n*AFK for ${afkDuration}*`;

      await message.reply(response);
      this.respondedTo.set(message.author.id, Date.now());
      
      log.debug(`Sent AFK response to ${message.author.tag}`);
    } catch (error) {
      log.error('Failed to send AFK response:', error);
    }
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }

  async enable(options: Partial<AFKState> = {}): Promise<void> {
    this.state = {
      enabled: true,
      message: options.message || "I'm currently AFK. I'll respond when I'm back!",
      startTime: new Date(),
      respondToDMs: options.respondToDMs ?? true,
      respondToMentions: options.respondToMentions ?? true,
      respondToReplies: options.respondToReplies ?? true,
      ignoredUsers: options.ignoredUsers || [],
      ignoredGuilds: options.ignoredGuilds || [],
    };

    await this.saveSettings();
    log.info('AFK enabled');
  }

  async disable(): Promise<void> {
    const wasEnabled = this.state?.enabled;
    const duration = this.state?.startTime 
      ? this.formatDuration(Date.now() - this.state.startTime.getTime())
      : null;

    this.state = null;
    this.respondedTo.clear();

    await db
      .update(afkSettings)
      .set({ enabled: false, endedAt: new Date() })
      .where(eq(afkSettings.discordAccountId, this.discordAccountId));

    if (wasEnabled) {
      log.info(`AFK disabled after ${duration}`);
    }
  }

  private async saveSettings(): Promise<void> {
    if (!this.state) return;

    try {
      await db
        .insert(afkSettings)
        .values({
          discordAccountId: this.discordAccountId,
          enabled: this.state.enabled,
          message: this.state.message,
          respondToDms: this.state.respondToDMs,
          respondToMentions: this.state.respondToMentions,
          respondToReplies: this.state.respondToReplies,
          ignoredUsers: this.state.ignoredUsers,
          ignoredGuilds: this.state.ignoredGuilds,
          startedAt: this.state.startTime,
        })
        .onConflictDoUpdate({
          target: afkSettings.discordAccountId,
          set: {
            enabled: this.state.enabled,
            message: this.state.message,
            respondToDms: this.state.respondToDMs,
            respondToMentions: this.state.respondToMentions,
            respondToReplies: this.state.respondToReplies,
            ignoredUsers: this.state.ignoredUsers,
            ignoredGuilds: this.state.ignoredGuilds,
            startedAt: this.state.startTime,
          },
        });
    } catch (error) {
      log.error('Failed to save AFK settings:', error);
    }
  }

  isEnabled(): boolean {
    return this.state?.enabled ?? false;
  }

  getState(): AFKState | null {
    return this.state;
  }
}

export default AFKModule;

/**
 * Giveaway Joiner Module
 * Automatically detects and joins giveaways
 * 
 * Supports:
 * - GiveawayBot
 * - Giveaway Boat
 * - Generic reaction-based giveaways
 */

import type { Client, Message, MessageReaction, TextChannel } from 'discord.js-selfbot-v13';
import { db } from '@/db';
import { giveawayJoiners, giveawayHistory } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { log } from '@/utils/logger';

interface GiveawaySettings {
  enabled: boolean;
  webhookUrl?: string;
  notifyOnJoin: boolean;
  notifyOnWin: boolean;
  whitelistedGuilds: string[];
  blacklistedGuilds: string[];
  minDelay: number; // Minimum delay in ms
  maxDelay: number; // Maximum delay in ms
  keywords: string[];
  ignoredKeywords: string[];
  maxJoinsPerHour: number;
}

interface GiveawayEntry {
  messageId: string;
  channelId: string;
  guildId: string;
  guildName: string;
  prize: string;
  endsAt?: Date;
  joinedAt: Date;
  emoji: string;
  host?: string;
  won?: boolean;
}

// Known giveaway bot IDs
const GIVEAWAY_BOT_IDS = [
  '294882584201003009', // GiveawayBot
  '530082442967646230', // Giveaway Boat
  '720351927581278219', // Gift Boat
  '582537632991543307', // Arcane
];

// Keywords that indicate a giveaway
const DEFAULT_KEYWORDS = [
  'giveaway',
  'giveaways',
  'win',
  'winner',
  'prize',
  'raffle',
  'drop',
];

// Common giveaway emojis
const GIVEAWAY_EMOJIS = ['🎉', '🎁', '🎊', '🏆', '✨', '🎈'];

export class GiveawayJoinerModule {
  private client: Client;
  private discordAccountId: number;
  private settings: GiveawaySettings | null = null;
  private joinedGiveaways: Map<string, GiveawayEntry> = new Map();
  private joinsThisHour: number = 0;
  private hourlyResetInterval: NodeJS.Timeout | null = null;

  constructor(client: Client, discordAccountId: number) {
    this.client = client;
    this.discordAccountId = discordAccountId;
  }

  async init(): Promise<void> {
    await this.loadSettings();
    if (this.settings?.enabled) {
      this.setupListeners();
      this.startHourlyReset();
      log.info('Giveaway joiner module initialized');
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const settings = await db.query.giveawayJoiners.findFirst({
        where: eq(giveawayJoiners.discordAccountId, this.discordAccountId),
      });

      if (settings) {
        this.settings = {
          enabled: settings.enabled ?? false,
          webhookUrl: settings.webhookUrl || undefined,
          notifyOnJoin: settings.notifyOnJoin ?? true,
          notifyOnWin: settings.notifyOnWin ?? true,
          whitelistedGuilds: settings.whitelistedGuilds || [],
          blacklistedGuilds: settings.blacklistedGuilds || [],
          minDelay: settings.minDelay || 1000,
          maxDelay: settings.maxDelay || 5000,
          keywords: settings.keywords || DEFAULT_KEYWORDS,
          ignoredKeywords: settings.ignoredKeywords || [],
          maxJoinsPerHour: settings.maxJoinsPerHour || 20,
        };
      } else {
        this.settings = {
          enabled: false,
          notifyOnJoin: true,
          notifyOnWin: true,
          whitelistedGuilds: [],
          blacklistedGuilds: [],
          minDelay: 1000,
          maxDelay: 5000,
          keywords: DEFAULT_KEYWORDS,
          ignoredKeywords: [],
          maxJoinsPerHour: 20,
        };
      }
    } catch (error) {
      log.error('Failed to load giveaway joiner settings:', error);
    }
  }

  private setupListeners(): void {
    // Listen for new messages (embed-based giveaways)
    this.client.on('messageCreate', async (message: Message) => {
      if (!this.settings?.enabled) return;
      await this.checkMessage(message);
    });

    // Listen for reactions (to detect win announcements)
    this.client.on('messageReactionAdd', async (reaction: MessageReaction, user: any) => {
      if (!this.settings?.enabled) return;
      if (user.id !== this.client.user?.id) return;
      
      // Check if this might be a win notification
      await this.checkForWin(reaction.message as Message);
    });
  }

  private startHourlyReset(): void {
    this.hourlyResetInterval = setInterval(() => {
      this.joinsThisHour = 0;
    }, 3600000); // 1 hour
  }

  private async checkMessage(message: Message): Promise<void> {
    if (!this.settings || !message.guild) return;

    // Check guild whitelist/blacklist
    if (this.settings.whitelistedGuilds.length > 0) {
      if (!this.settings.whitelistedGuilds.includes(message.guild.id)) return;
    }
    if (this.settings.blacklistedGuilds.includes(message.guild.id)) return;

    // Check rate limit
    if (this.joinsThisHour >= this.settings.maxJoinsPerHour) return;

    // Skip if already joined this giveaway
    if (this.joinedGiveaways.has(message.id)) return;

    // Check if it's a giveaway
    const giveawayInfo = this.detectGiveaway(message);
    if (!giveawayInfo) return;

    // Apply random delay
    const delay = this.getRandomDelay();
    await this.delay(delay);

    // Join the giveaway
    await this.joinGiveaway(message, giveawayInfo);
  }

  private detectGiveaway(message: Message): { prize: string; emoji: string; endsAt?: Date; host?: string } | null {
    // Check if from known giveaway bot
    const isFromGiveawayBot = GIVEAWAY_BOT_IDS.includes(message.author.id);

    // Check embeds for giveaway indicators
    if (message.embeds.length > 0) {
      const embed = message.embeds[0];
      const embedText = [
        embed.title,
        embed.description,
        embed.footer?.text,
      ].filter(Boolean).join(' ').toLowerCase();

      // Check for giveaway keywords
      const hasKeyword = this.settings!.keywords.some(kw => 
        embedText.includes(kw.toLowerCase())
      );

      // Check for ignored keywords
      const hasIgnoredKeyword = this.settings!.ignoredKeywords.some(kw =>
        embedText.includes(kw.toLowerCase())
      );

      if (hasIgnoredKeyword) return null;

      if (hasKeyword || isFromGiveawayBot) {
        // Try to extract prize from title or description
        const prize = embed.title || 'Unknown Prize';
        
        // Find the reaction emoji to use
        const emoji = this.findGiveawayEmoji(message);
        if (!emoji) return null;

        // Try to parse end time
        let endsAt: Date | undefined;
        if (embed.timestamp) {
          endsAt = new Date(embed.timestamp);
        }

        // Try to find host
        let host: string | undefined;
        const hostMatch = embedText.match(/hosted by:?\s*<?@?!?(\d+)>?|host:?\s*(.+)/i);
        if (hostMatch) {
          host = hostMatch[1] || hostMatch[2];
        }

        return { prize, emoji, endsAt, host };
      }
    }

    // Check message content for giveaway indicators
    const content = message.content.toLowerCase();
    const hasKeyword = this.settings!.keywords.some(kw => 
      content.includes(kw.toLowerCase())
    );

    if (hasKeyword || isFromGiveawayBot) {
      const emoji = this.findGiveawayEmoji(message);
      if (emoji) {
        return {
          prize: 'Unknown Prize',
          emoji,
        };
      }
    }

    return null;
  }

  private findGiveawayEmoji(message: Message): string | null {
    // Check existing reactions
    if (message.reactions.cache.size > 0) {
      for (const reaction of message.reactions.cache.values()) {
        const emojiId = reaction.emoji.id || reaction.emoji.name;
        if (emojiId && GIVEAWAY_EMOJIS.includes(reaction.emoji.name || '')) {
          return reaction.emoji.name!;
        }
        // Return first reaction if no common emoji found
        return reaction.emoji.name || reaction.emoji.id || null;
      }
    }

    // Check embed/message content for emoji hints
    const content = message.content + message.embeds.map(e => 
      `${e.title} ${e.description} ${e.footer?.text}`
    ).join(' ');

    for (const emoji of GIVEAWAY_EMOJIS) {
      if (content.includes(emoji)) {
        return emoji;
      }
    }

    // Default to party emoji
    return '🎉';
  }

  private async joinGiveaway(message: Message, info: { prize: string; emoji: string; endsAt?: Date; host?: string }): Promise<void> {
    try {
      // React to join
      await message.react(info.emoji);
      
      this.joinsThisHour++;

      const entry: GiveawayEntry = {
        messageId: message.id,
        channelId: message.channel.id,
        guildId: message.guild!.id,
        guildName: message.guild!.name,
        prize: info.prize,
        endsAt: info.endsAt,
        joinedAt: new Date(),
        emoji: info.emoji,
        host: info.host,
      };

      this.joinedGiveaways.set(message.id, entry);

      // Save to database
      await this.saveEntry(entry);

      log.info(`Joined giveaway: ${info.prize} in ${message.guild!.name}`);

      // Send notification
      await this.notify('join', entry);
    } catch (error: any) {
      log.error(`Failed to join giveaway:`, error);
    }
  }

  private async checkForWin(message: Message): Promise<void> {
    // Check if this message mentions us as a winner
    const content = (message.content + message.embeds.map(e => 
      `${e.title} ${e.description}`
    ).join(' ')).toLowerCase();

    const userId = this.client.user?.id;
    if (!userId) return;

    const isWinner = content.includes(userId) && 
      (content.includes('won') || content.includes('winner') || content.includes('congratulations'));

    if (isWinner) {
      // Find the corresponding giveaway entry
      const entry = this.joinedGiveaways.get(message.id);
      if (entry) {
        entry.won = true;
        await this.updateEntry(entry);
        await this.notify('win', entry);
        log.info(`Won giveaway: ${entry.prize} in ${entry.guildName}`);
      }
    }
  }

  private async saveEntry(entry: GiveawayEntry): Promise<void> {
    try {
      await db.insert(giveawayHistory).values({
        discordAccountId: this.discordAccountId,
        messageId: entry.messageId,
        channelId: entry.channelId,
        guildId: entry.guildId,
        guildName: entry.guildName,
        prize: entry.prize,
        endsAt: entry.endsAt,
        joinedAt: entry.joinedAt,
        emoji: entry.emoji,
        host: entry.host,
        won: false,
      });
    } catch (error) {
      log.error('Failed to save giveaway entry:', error);
    }
  }

  private async updateEntry(entry: GiveawayEntry): Promise<void> {
    try {
      await db
        .update(giveawayHistory)
        .set({ won: entry.won })
        .where(eq(giveawayHistory.messageId, entry.messageId));
    } catch (error) {
      log.error('Failed to update giveaway entry:', error);
    }
  }

  private async notify(type: 'join' | 'win', entry: GiveawayEntry): Promise<void> {
    if (!this.settings?.webhookUrl) return;

    const shouldNotify = type === 'join' 
      ? this.settings.notifyOnJoin 
      : this.settings.notifyOnWin;

    if (!shouldNotify) return;

    try {
      const embed = {
        title: type === 'win' ? '🏆 Giveaway Won!' : '🎉 Joined Giveaway',
        color: type === 'win' ? 0xffd700 : 0x00ff00,
        fields: [
          { name: 'Prize', value: entry.prize, inline: true },
          { name: 'Server', value: entry.guildName, inline: true },
          { name: 'Host', value: entry.host || 'Unknown', inline: true },
        ],
        timestamp: new Date().toISOString(),
      };

      if (entry.endsAt) {
        embed.fields.push({
          name: 'Ends',
          value: `<t:${Math.floor(entry.endsAt.getTime() / 1000)}:R>`,
          inline: true,
        });
      }

      await fetch(this.settings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
    } catch (error) {
      log.error('Failed to send giveaway webhook:', error);
    }
  }

  private getRandomDelay(): number {
    if (!this.settings) return 1000;
    return Math.floor(
      Math.random() * (this.settings.maxDelay - this.settings.minDelay) + this.settings.minDelay
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API
  async enable(): Promise<void> {
    if (!this.settings) {
      this.settings = {
        enabled: true,
        notifyOnJoin: true,
        notifyOnWin: true,
        whitelistedGuilds: [],
        blacklistedGuilds: [],
        minDelay: 1000,
        maxDelay: 5000,
        keywords: DEFAULT_KEYWORDS,
        ignoredKeywords: [],
        maxJoinsPerHour: 20,
      };
    } else {
      this.settings.enabled = true;
    }

    this.setupListeners();
    this.startHourlyReset();
    await this.saveSettings();
    log.info('Giveaway joiner enabled');
  }

  async disable(): Promise<void> {
    if (this.settings) {
      this.settings.enabled = false;
    }
    if (this.hourlyResetInterval) {
      clearInterval(this.hourlyResetInterval);
    }
    await this.saveSettings();
    log.info('Giveaway joiner disabled');
  }

  async updateSettings(updates: Partial<GiveawaySettings>): Promise<void> {
    if (!this.settings) return;
    this.settings = { ...this.settings, ...updates };
    await this.saveSettings();
  }

  private async saveSettings(): Promise<void> {
    if (!this.settings) return;

    try {
      await db
        .insert(giveawayJoiners)
        .values({
          discordAccountId: this.discordAccountId,
          enabled: this.settings.enabled,
          webhookUrl: this.settings.webhookUrl,
          notifyOnJoin: this.settings.notifyOnJoin,
          notifyOnWin: this.settings.notifyOnWin,
          whitelistedGuilds: this.settings.whitelistedGuilds,
          blacklistedGuilds: this.settings.blacklistedGuilds,
          minDelay: this.settings.minDelay,
          maxDelay: this.settings.maxDelay,
          keywords: this.settings.keywords,
          ignoredKeywords: this.settings.ignoredKeywords,
          maxJoinsPerHour: this.settings.maxJoinsPerHour,
        })
        .onConflictDoUpdate({
          target: giveawayJoiners.discordAccountId,
          set: {
            enabled: this.settings.enabled,
            webhookUrl: this.settings.webhookUrl,
            notifyOnJoin: this.settings.notifyOnJoin,
            notifyOnWin: this.settings.notifyOnWin,
            whitelistedGuilds: this.settings.whitelistedGuilds,
            blacklistedGuilds: this.settings.blacklistedGuilds,
            minDelay: this.settings.minDelay,
            maxDelay: this.settings.maxDelay,
            keywords: this.settings.keywords,
            ignoredKeywords: this.settings.ignoredKeywords,
            maxJoinsPerHour: this.settings.maxJoinsPerHour,
          },
        });
    } catch (error) {
      log.error('Failed to save giveaway joiner settings:', error);
    }
  }

  isEnabled(): boolean {
    return this.settings?.enabled ?? false;
  }

  getSettings(): GiveawaySettings | null {
    return this.settings;
  }

  getJoinedGiveaways(): GiveawayEntry[] {
    return Array.from(this.joinedGiveaways.values());
  }

  getStats(): { total: number; won: number; pending: number } {
    const entries = Array.from(this.joinedGiveaways.values());
    const won = entries.filter(e => e.won).length;
    const pending = entries.filter(e => !e.won && (!e.endsAt || e.endsAt > new Date())).length;
    
    return {
      total: entries.length,
      won,
      pending,
    };
  }

  destroy(): void {
    if (this.hourlyResetInterval) {
      clearInterval(this.hourlyResetInterval);
    }
  }
}

export default GiveawayJoinerModule;

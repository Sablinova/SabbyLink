/**
 * Auto-Reactions Module
 * Automatically reacts to messages matching specified patterns
 */

import type { Client, Message, MessageReaction } from 'discord.js-selfbot-v13';
import { db } from '@/db';
import { autoReactions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { log } from '@/utils/logger';

interface ReactionRule {
  id: number;
  name: string;
  pattern: string;
  patternType: 'contains' | 'exact' | 'regex' | 'startsWith' | 'endsWith';
  emojis: string[];
  enabled: boolean;
  guildId?: string;
  channelId?: string;
  userId?: string; // React only to specific user's messages
  caseSensitive: boolean;
  delay: number; // ms delay before reacting
  chance: number; // 0-100 probability
}

export class AutoReactionsModule {
  private client: Client;
  private discordAccountId: number;
  private rules: ReactionRule[] = [];
  private processing: Set<string> = new Set(); // Prevent duplicate processing

  constructor(client: Client, discordAccountId: number) {
    this.client = client;
    this.discordAccountId = discordAccountId;
  }

  async init(): Promise<void> {
    await this.loadRules();
    this.setupListeners();
    log.info(`Auto-reactions module initialized with ${this.rules.length} rules`);
  }

  private async loadRules(): Promise<void> {
    try {
      const rules = await db.select().from(autoReactions)
        .where(eq(autoReactions.discordAccountId, this.discordAccountId));

      this.rules = rules.map(r => ({
        id: r.id,
        name: r.name,
        pattern: r.pattern,
        patternType: r.patternType as ReactionRule['patternType'],
        emojis: r.emojis || [],
        enabled: r.enabled ?? true,
        guildId: r.guildId || undefined,
        channelId: r.channelId || undefined,
        userId: r.userId || undefined,
        caseSensitive: r.caseSensitive ?? false,
        delay: r.delay || 0,
        chance: r.chance || 100,
      }));
    } catch (error) {
      log.error('Failed to load auto-reaction rules:', error);
    }
  }

  private setupListeners(): void {
    this.client.on('messageCreate', async (message: Message) => {
      if (message.author.id === this.client.user?.id) return;
      if (message.author.bot) return;

      await this.processMessage(message);
    });
  }

  private async processMessage(message: Message): Promise<void> {
    // Prevent duplicate processing
    if (this.processing.has(message.id)) return;
    this.processing.add(message.id);

    try {
      for (const rule of this.rules) {
        if (!rule.enabled) continue;
        if (!this.matchesFilters(message, rule)) continue;
        if (!this.matchesPattern(message.content, rule)) continue;
        if (!this.passesChance(rule.chance)) continue;

        await this.react(message, rule);
      }
    } finally {
      // Clean up after processing
      setTimeout(() => this.processing.delete(message.id), 5000);
    }
  }

  private matchesFilters(message: Message, rule: ReactionRule): boolean {
    // Guild filter
    if (rule.guildId && message.guild?.id !== rule.guildId) return false;
    
    // Channel filter
    if (rule.channelId && message.channel.id !== rule.channelId) return false;
    
    // User filter
    if (rule.userId && message.author.id !== rule.userId) return false;

    return true;
  }

  private matchesPattern(content: string, rule: ReactionRule): boolean {
    const text = rule.caseSensitive ? content : content.toLowerCase();
    const pattern = rule.caseSensitive ? rule.pattern : rule.pattern.toLowerCase();

    switch (rule.patternType) {
      case 'contains':
        return text.includes(pattern);
      
      case 'exact':
        return text === pattern;
      
      case 'startsWith':
        return text.startsWith(pattern);
      
      case 'endsWith':
        return text.endsWith(pattern);
      
      case 'regex':
        try {
          const flags = rule.caseSensitive ? '' : 'i';
          const regex = new RegExp(rule.pattern, flags);
          return regex.test(content);
        } catch {
          log.warn(`Invalid regex pattern: ${rule.pattern}`);
          return false;
        }
      
      default:
        return false;
    }
  }

  private passesChance(chance: number): boolean {
    if (chance >= 100) return true;
    if (chance <= 0) return false;
    return Math.random() * 100 < chance;
  }

  private async react(message: Message, rule: ReactionRule): Promise<void> {
    try {
      // Apply delay if configured
      if (rule.delay > 0) {
        await this.delay(rule.delay);
      }

      // React with each emoji
      for (const emoji of rule.emojis) {
        try {
          await message.react(emoji);
          // Small delay between reactions to avoid rate limits
          await this.delay(250);
        } catch (error: any) {
          if (error.code === 10014) {
            // Unknown emoji
            log.warn(`Unknown emoji: ${emoji}`);
          } else if (error.code === 90001) {
            // Reaction blocked
            log.debug(`Cannot react to message (blocked)`);
          } else {
            throw error;
          }
        }
      }

      log.debug(`Auto-reacted to message with rule: ${rule.name}`);
    } catch (error) {
      log.error(`Failed to auto-react:`, error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API for managing rules
  async addRule(rule: Omit<ReactionRule, 'id'>): Promise<number> {
    const [result] = await db
      .insert(autoReactions)
      .values({
        discordAccountId: this.discordAccountId,
        name: rule.name,
        pattern: rule.pattern,
        patternType: rule.patternType,
        emojis: rule.emojis,
        enabled: rule.enabled,
        guildId: rule.guildId,
        channelId: rule.channelId,
        userId: rule.userId,
        caseSensitive: rule.caseSensitive,
        delay: rule.delay,
        chance: rule.chance,
      })
      .returning({ id: autoReactions.id });

    await this.loadRules();
    return result.id;
  }

  async updateRule(id: number, updates: Partial<ReactionRule>): Promise<void> {
    await db
      .update(autoReactions)
      .set({
        name: updates.name,
        pattern: updates.pattern,
        patternType: updates.patternType,
        emojis: updates.emojis,
        enabled: updates.enabled,
        guildId: updates.guildId,
        channelId: updates.channelId,
        userId: updates.userId,
        caseSensitive: updates.caseSensitive,
        delay: updates.delay,
        chance: updates.chance,
      })
      .where(and(
        eq(autoReactions.id, id),
        eq(autoReactions.discordAccountId, this.discordAccountId)
      ));

    await this.loadRules();
  }

  async deleteRule(id: number): Promise<void> {
    await db
      .delete(autoReactions)
      .where(and(
        eq(autoReactions.id, id),
        eq(autoReactions.discordAccountId, this.discordAccountId)
      ));

    await this.loadRules();
  }

  async enableRule(id: number): Promise<void> {
    await this.updateRule(id, { enabled: true });
  }

  async disableRule(id: number): Promise<void> {
    await this.updateRule(id, { enabled: false });
  }

  getRules(): ReactionRule[] {
    return [...this.rules];
  }
}

export default AutoReactionsModule;

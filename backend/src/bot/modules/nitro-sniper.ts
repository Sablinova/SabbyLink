/**
 * Nitro Sniper Module
 * Detects and attempts to claim Nitro gift codes
 * 
 * WARNING: Using this feature may violate Discord's ToS.
 * Use at your own risk.
 */

import type { Client, Message } from 'discord.js-selfbot-v13';
import { db } from '@/db';
import { nitroSnipers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { log } from '@/utils/logger';

interface NitroSnipeSettings {
  enabled: boolean;
  webhookUrl?: string;
  notifyOnSuccess: boolean;
  notifyOnFail: boolean;
  ignoredGuilds: string[];
  delay: number; // Random delay 0-X ms to appear more human
}

interface SnipeResult {
  success: boolean;
  code: string;
  message: string;
  guildName?: string;
  channelName?: string;
  senderTag?: string;
  timestamp: Date;
}

// Regex patterns for Nitro gift codes
const NITRO_PATTERNS = [
  /discord\.gift\/([a-zA-Z0-9]+)/gi,
  /discordapp\.com\/gifts\/([a-zA-Z0-9]+)/gi,
  /discord\.com\/gifts\/([a-zA-Z0-9]+)/gi,
];

export class NitroSniperModule {
  private client: Client;
  private discordAccountId: number;
  private settings: NitroSnipeSettings | null = null;
  private claimedCodes: Set<string> = new Set();
  private snipeHistory: SnipeResult[] = [];

  constructor(client: Client, discordAccountId: number) {
    this.client = client;
    this.discordAccountId = discordAccountId;
  }

  async init(): Promise<void> {
    await this.loadSettings();
    if (this.settings?.enabled) {
      this.setupListeners();
      log.info('Nitro sniper module initialized');
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const settingsResult = await db.select().from(nitroSnipers)
        .where(eq(nitroSnipers.discordAccountId, this.discordAccountId));
      
      const settings = settingsResult[0];

      if (settings) {
        this.settings = {
          enabled: settings.enabled ?? false,
          webhookUrl: settings.webhookUrl || undefined,
          notifyOnSuccess: settings.notifyOnSuccess ?? true,
          notifyOnFail: settings.notifyOnFail ?? false,
          ignoredGuilds: settings.ignoredGuilds || [],
          delay: settings.delay || 0,
        };
      } else {
        this.settings = {
          enabled: false,
          notifyOnSuccess: true,
          notifyOnFail: false,
          ignoredGuilds: [],
          delay: 0,
        };
      }
    } catch (error) {
      log.error('Failed to load nitro sniper settings:', error);
    }
  }

  private setupListeners(): void {
    this.client.on('messageCreate', async (message: Message) => {
      if (!this.settings?.enabled) return;
      
      // Skip own messages
      if (message.author.id === this.client.user?.id) return;

      // Check ignored guilds
      if (message.guild && this.settings.ignoredGuilds.includes(message.guild.id)) {
        return;
      }

      await this.scanMessage(message);
    });
  }

  private async scanMessage(message: Message): Promise<void> {
    const codes = this.extractCodes(message.content);
    
    for (const code of codes) {
      // Skip already claimed codes
      if (this.claimedCodes.has(code)) continue;
      this.claimedCodes.add(code);

      // Apply random delay if configured
      if (this.settings?.delay && this.settings.delay > 0) {
        const delay = Math.random() * this.settings.delay;
        await this.delay(delay);
      }

      await this.attemptClaim(code, message);
    }
  }

  private extractCodes(content: string): string[] {
    const codes: string[] = [];
    
    for (const pattern of NITRO_PATTERNS) {
      // Reset regex lastIndex
      pattern.lastIndex = 0;
      
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const code = match[1];
        if (code && code.length >= 16 && !codes.includes(code)) {
          codes.push(code);
        }
      }
    }

    return codes;
  }

  private async attemptClaim(code: string, sourceMessage: Message): Promise<void> {
    const result: SnipeResult = {
      success: false,
      code,
      message: '',
      guildName: sourceMessage.guild?.name,
      channelName: (sourceMessage.channel as any).name || 'DM',
      senderTag: sourceMessage.author.tag,
      timestamp: new Date(),
    };

    try {
      // Use the Discord API to redeem the gift
      const response = await fetch(`https://discord.com/api/v9/entitlements/gift-codes/${code}/redeem`, {
        method: 'POST',
        headers: {
          'Authorization': this.client.token!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel_id: sourceMessage.channel.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        result.success = true;
        result.message = 'Successfully claimed Nitro!';
        log.info(`Claimed Nitro code: ${code.substring(0, 8)}...`);
      } else {
        result.message = data.message || 'Unknown error';
        
        switch (data.code) {
          case 50050:
            result.message = 'Code already redeemed';
            break;
          case 10038:
            result.message = 'Invalid/expired code';
            break;
          case 50070:
            result.message = 'Already own Nitro';
            break;
        }
        
        log.debug(`Failed to claim code ${code.substring(0, 8)}...: ${result.message}`);
      }
    } catch (error: any) {
      result.message = error.message || 'Network error';
      log.error(`Error claiming Nitro code:`, error);
    }

    this.snipeHistory.push(result);
    await this.notify(result);
  }

  private async notify(result: SnipeResult): Promise<void> {
    if (!this.settings) return;

    const shouldNotify = result.success 
      ? this.settings.notifyOnSuccess 
      : this.settings.notifyOnFail;

    if (!shouldNotify || !this.settings.webhookUrl) return;

    try {
      const embed = {
        title: result.success ? 'Nitro Claimed!' : 'Snipe Failed',
        color: result.success ? 0x00ff00 : 0xff0000,
        fields: [
          { name: 'Code', value: `\`${result.code.substring(0, 8)}...\``, inline: true },
          { name: 'Result', value: result.message, inline: true },
          { name: 'Source', value: `${result.guildName || 'DM'} / ${result.channelName}`, inline: true },
          { name: 'Sender', value: result.senderTag || 'Unknown', inline: true },
        ],
        timestamp: result.timestamp.toISOString(),
      };

      await fetch(this.settings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
    } catch (error) {
      log.error('Failed to send webhook notification:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API
  async enable(): Promise<void> {
    if (!this.settings) {
      this.settings = {
        enabled: true,
        notifyOnSuccess: true,
        notifyOnFail: false,
        ignoredGuilds: [],
        delay: 0,
      };
    } else {
      this.settings.enabled = true;
    }
    
    this.setupListeners();
    await this.saveSettings();
    log.info('Nitro sniper enabled');
  }

  async disable(): Promise<void> {
    if (this.settings) {
      this.settings.enabled = false;
    }
    await this.saveSettings();
    log.info('Nitro sniper disabled');
  }

  async updateSettings(updates: Partial<NitroSnipeSettings>): Promise<void> {
    if (!this.settings) return;
    
    this.settings = { ...this.settings, ...updates };
    await this.saveSettings();
  }

  private async saveSettings(): Promise<void> {
    if (!this.settings) return;

    try {
      await db
        .insert(nitroSnipers)
        .values({
          discordAccountId: this.discordAccountId,
          enabled: this.settings.enabled,
          webhookUrl: this.settings.webhookUrl,
          notifyOnSuccess: this.settings.notifyOnSuccess,
          notifyOnFail: this.settings.notifyOnFail,
          ignoredGuilds: this.settings.ignoredGuilds,
          delay: this.settings.delay,
        })
        .onConflictDoUpdate({
          target: nitroSnipers.discordAccountId,
          set: {
            enabled: this.settings.enabled,
            webhookUrl: this.settings.webhookUrl,
            notifyOnSuccess: this.settings.notifyOnSuccess,
            notifyOnFail: this.settings.notifyOnFail,
            ignoredGuilds: this.settings.ignoredGuilds,
            delay: this.settings.delay,
          },
        });
    } catch (error) {
      log.error('Failed to save nitro sniper settings:', error);
    }
  }

  isEnabled(): boolean {
    return this.settings?.enabled ?? false;
  }

  getSettings(): NitroSnipeSettings | null {
    return this.settings;
  }

  getHistory(): SnipeResult[] {
    return [...this.snipeHistory];
  }

  getStats(): { total: number; successful: number; failed: number } {
    const successful = this.snipeHistory.filter(r => r.success).length;
    return {
      total: this.snipeHistory.length,
      successful,
      failed: this.snipeHistory.length - successful,
    };
  }
}

export default NitroSniperModule;

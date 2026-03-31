/**
 * Dynamic System Settings Service
 * 
 * Manages app-wide configuration stored in the database.
 * Settings can be configured via dashboard instead of VPS env vars.
 * Sensitive values are encrypted using AES-256-GCM.
 */

import { db } from '@/db';
import { systemSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt } from '@/utils/crypto';

// Setting keys for type safety
export const SETTING_KEYS = {
  // Discord OAuth
  DISCORD_CLIENT_ID: 'discord_client_id',
  DISCORD_CLIENT_SECRET: 'discord_client_secret',
  DISCORD_REDIRECT_URI: 'discord_redirect_uri',
  
  // Bot mode
  BOT_MODE: 'bot_mode',
  
  // Feature toggles
  ENABLE_RPC: 'enable_rpc',
  ENABLE_AI_RESPONDER: 'enable_ai_responder',
  ENABLE_NITRO_SNIPER: 'enable_nitro_sniper',
  ENABLE_GIVEAWAY_JOINER: 'enable_giveaway_joiner',
  ENABLE_MESSAGE_LOGGER: 'enable_message_logger',
  ENABLE_AUTO_REACTIONS: 'enable_auto_reactions',
  ENABLE_AFK_SYSTEM: 'enable_afk_system',
  
  // RPC defaults
  RPC_PLATFORM: 'rpc_platform',
  RPC_ANIMATION_ENABLED: 'rpc_animation_enabled',
  RPC_ANIMATION_INTERVAL: 'rpc_animation_interval',
  
  // Security
  RATE_LIMIT_MAX: 'rate_limit_max',
  RATE_LIMIT_WINDOW_MS: 'rate_limit_window_ms',
  MAX_LOGIN_ATTEMPTS: 'max_login_attempts',
  ACCOUNT_LOCK_DURATION_MINUTES: 'account_lock_duration_minutes',
  SESSION_TIMEOUT_HOURS: 'session_timeout_hours',
  
  // Analytics
  ENABLE_ANALYTICS: 'enable_analytics',
  ANALYTICS_RETENTION_DAYS: 'analytics_retention_days',
  
  // Backup
  AUTO_BACKUP_ENABLED: 'auto_backup_enabled',
  AUTO_BACKUP_INTERVAL_HOURS: 'auto_backup_interval_hours',
  AUTO_BACKUP_MAX_BACKUPS: 'auto_backup_max_backups',
} as const;

export type SettingKey = typeof SETTING_KEYS[keyof typeof SETTING_KEYS];

// Which settings should be encrypted
const ENCRYPTED_SETTINGS: SettingKey[] = [
  SETTING_KEYS.DISCORD_CLIENT_SECRET,
];

// Setting metadata for UI
export interface SettingMeta {
  key: SettingKey;
  label: string;
  description: string;
  category: 'discord' | 'features' | 'security' | 'rpc' | 'analytics' | 'backup';
  type: 'string' | 'boolean' | 'number' | 'select';
  options?: { value: string; label: string }[];
  default: string;
  encrypted?: boolean;
  required?: boolean;
}

export const SETTINGS_METADATA: SettingMeta[] = [
  // Discord OAuth
  {
    key: SETTING_KEYS.DISCORD_CLIENT_ID,
    label: 'Discord Client ID',
    description: 'Application ID from Discord Developer Portal',
    category: 'discord',
    type: 'string',
    default: '',
    required: true,
  },
  {
    key: SETTING_KEYS.DISCORD_CLIENT_SECRET,
    label: 'Discord Client Secret',
    description: 'Client secret from Discord Developer Portal',
    category: 'discord',
    type: 'string',
    default: '',
    encrypted: true,
    required: true,
  },
  {
    key: SETTING_KEYS.DISCORD_REDIRECT_URI,
    label: 'Discord Redirect URI',
    description: 'OAuth callback URL (e.g., https://your-domain.com/login)',
    category: 'discord',
    type: 'string',
    default: '',
    required: true,
  },
  {
    key: SETTING_KEYS.BOT_MODE,
    label: 'Bot Mode',
    description: 'How the bot operates',
    category: 'discord',
    type: 'select',
    options: [
      { value: 'selfbot', label: 'Selfbot (User Token)' },
      { value: 'bot', label: 'Bot (Bot Token)' },
    ],
    default: 'selfbot',
  },
  
  // Features
  {
    key: SETTING_KEYS.ENABLE_RPC,
    label: 'Enable RPC',
    description: 'Allow custom Rich Presence',
    category: 'features',
    type: 'boolean',
    default: 'true',
  },
  {
    key: SETTING_KEYS.ENABLE_AI_RESPONDER,
    label: 'Enable AI Responder',
    description: 'AI auto-response to messages',
    category: 'features',
    type: 'boolean',
    default: 'false',
  },
  {
    key: SETTING_KEYS.ENABLE_NITRO_SNIPER,
    label: 'Enable Nitro Sniper',
    description: 'Auto-claim Nitro gift links',
    category: 'features',
    type: 'boolean',
    default: 'false',
  },
  {
    key: SETTING_KEYS.ENABLE_GIVEAWAY_JOINER,
    label: 'Enable Giveaway Joiner',
    description: 'Auto-join Discord giveaways',
    category: 'features',
    type: 'boolean',
    default: 'false',
  },
  {
    key: SETTING_KEYS.ENABLE_MESSAGE_LOGGER,
    label: 'Enable Message Logger',
    description: 'Log deleted/edited messages',
    category: 'features',
    type: 'boolean',
    default: 'true',
  },
  {
    key: SETTING_KEYS.ENABLE_AUTO_REACTIONS,
    label: 'Enable Auto Reactions',
    description: 'Automatic emoji reactions',
    category: 'features',
    type: 'boolean',
    default: 'false',
  },
  {
    key: SETTING_KEYS.ENABLE_AFK_SYSTEM,
    label: 'Enable AFK System',
    description: 'Away-from-keyboard auto-responses',
    category: 'features',
    type: 'boolean',
    default: 'true',
  },
  
  // RPC
  {
    key: SETTING_KEYS.RPC_PLATFORM,
    label: 'Default RPC Platform',
    description: 'Default gaming platform to emulate',
    category: 'rpc',
    type: 'select',
    options: [
      { value: 'pc', label: 'PC' },
      { value: 'xbox', label: 'Xbox' },
      { value: 'playstation', label: 'PlayStation' },
      { value: 'mobile', label: 'Mobile' },
      { value: 'switch', label: 'Nintendo Switch' },
    ],
    default: 'pc',
  },
  {
    key: SETTING_KEYS.RPC_ANIMATION_ENABLED,
    label: 'Enable RPC Animation',
    description: 'Cycle through RPC states',
    category: 'rpc',
    type: 'boolean',
    default: 'false',
  },
  {
    key: SETTING_KEYS.RPC_ANIMATION_INTERVAL,
    label: 'RPC Animation Interval',
    description: 'Seconds between RPC state changes',
    category: 'rpc',
    type: 'number',
    default: '30',
  },
  
  // Security
  {
    key: SETTING_KEYS.RATE_LIMIT_MAX,
    label: 'Rate Limit Max Requests',
    description: 'Max API requests per window',
    category: 'security',
    type: 'number',
    default: '100',
  },
  {
    key: SETTING_KEYS.RATE_LIMIT_WINDOW_MS,
    label: 'Rate Limit Window (ms)',
    description: 'Time window for rate limiting',
    category: 'security',
    type: 'number',
    default: '60000',
  },
  {
    key: SETTING_KEYS.MAX_LOGIN_ATTEMPTS,
    label: 'Max Login Attempts',
    description: 'Failed attempts before lockout',
    category: 'security',
    type: 'number',
    default: '5',
  },
  {
    key: SETTING_KEYS.ACCOUNT_LOCK_DURATION_MINUTES,
    label: 'Account Lock Duration',
    description: 'Minutes to lock account after failed attempts',
    category: 'security',
    type: 'number',
    default: '30',
  },
  {
    key: SETTING_KEYS.SESSION_TIMEOUT_HOURS,
    label: 'Session Timeout',
    description: 'Hours until session expires',
    category: 'security',
    type: 'number',
    default: '24',
  },
  
  // Analytics
  {
    key: SETTING_KEYS.ENABLE_ANALYTICS,
    label: 'Enable Analytics',
    description: 'Track usage statistics',
    category: 'analytics',
    type: 'boolean',
    default: 'true',
  },
  {
    key: SETTING_KEYS.ANALYTICS_RETENTION_DAYS,
    label: 'Analytics Retention',
    description: 'Days to keep analytics data',
    category: 'analytics',
    type: 'number',
    default: '30',
  },
  
  // Backup
  {
    key: SETTING_KEYS.AUTO_BACKUP_ENABLED,
    label: 'Enable Auto Backup',
    description: 'Automatically backup database',
    category: 'backup',
    type: 'boolean',
    default: 'true',
  },
  {
    key: SETTING_KEYS.AUTO_BACKUP_INTERVAL_HOURS,
    label: 'Backup Interval',
    description: 'Hours between backups',
    category: 'backup',
    type: 'number',
    default: '24',
  },
  {
    key: SETTING_KEYS.AUTO_BACKUP_MAX_BACKUPS,
    label: 'Max Backups',
    description: 'Number of backups to retain',
    category: 'backup',
    type: 'number',
    default: '7',
  },
];

// In-memory cache for settings (refreshed on update)
let settingsCache: Map<string, string | null> = new Map();
let cacheLoaded = false;

/**
 * Load all settings into memory cache
 */
export async function loadSettingsCache(): Promise<void> {
  const rows = db.select().from(systemSettings).all();
  settingsCache.clear();
  
  for (const row of rows) {
    if (row.encrypted && row.value) {
      try {
        settingsCache.set(row.key, decrypt(row.value));
      } catch {
        // If decryption fails, store null
        settingsCache.set(row.key, null);
      }
    } else {
      settingsCache.set(row.key, row.value);
    }
  }
  
  cacheLoaded = true;
}

/**
 * Get a setting value (from cache or default)
 */
export function getSetting(key: SettingKey): string | null {
  if (!cacheLoaded) {
    // Synchronous load on first access
    loadSettingsCache();
  }
  
  // Check cache first
  if (settingsCache.has(key)) {
    return settingsCache.get(key) ?? null;
  }
  
  // Return default from metadata
  const meta = SETTINGS_METADATA.find(m => m.key === key);
  return meta?.default ?? null;
}

/**
 * Get a setting as boolean
 */
export function getSettingBool(key: SettingKey): boolean {
  const value = getSetting(key);
  return value === 'true' || value === '1';
}

/**
 * Get a setting as number
 */
export function getSettingNumber(key: SettingKey): number {
  const value = getSetting(key);
  const num = parseInt(value ?? '0', 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Set a setting value
 */
export async function setSetting(key: SettingKey, value: string | null): Promise<void> {
  const isEncrypted = ENCRYPTED_SETTINGS.includes(key);
  const meta = SETTINGS_METADATA.find(m => m.key === key);
  
  const valueToStore = isEncrypted && value ? encrypt(value) : value;
  
  // Check if setting exists
  const existing = db.select().from(systemSettings).where(eq(systemSettings.key, key)).get();
  
  if (existing) {
    db.update(systemSettings)
      .set({ 
        value: valueToStore, 
        encrypted: isEncrypted,
        updatedAt: new Date(),
      })
      .where(eq(systemSettings.key, key))
      .run();
  } else {
    db.insert(systemSettings).values({
      key,
      value: valueToStore,
      encrypted: isEncrypted,
      category: meta?.category ?? 'general',
      description: meta?.description ?? null,
    }).run();
  }
  
  // Update cache
  settingsCache.set(key, value);
}

/**
 * Set multiple settings at once
 */
export async function setSettings(settings: Record<SettingKey, string | null>): Promise<void> {
  for (const [key, value] of Object.entries(settings)) {
    await setSetting(key as SettingKey, value);
  }
}

/**
 * Get all settings (for admin UI)
 * Returns decrypted values
 */
export function getAllSettings(): Record<string, string | null> {
  if (!cacheLoaded) {
    loadSettingsCache();
  }
  
  const result: Record<string, string | null> = {};
  
  // Start with defaults
  for (const meta of SETTINGS_METADATA) {
    result[meta.key] = meta.default;
  }
  
  // Override with stored values
  for (const [key, value] of settingsCache.entries()) {
    result[key] = value;
  }
  
  return result;
}

/**
 * Get settings metadata for UI
 */
export function getSettingsMetadata(): SettingMeta[] {
  return SETTINGS_METADATA;
}

/**
 * Check if Discord OAuth is configured
 */
export function isDiscordOAuthConfigured(): boolean {
  const clientId = getSetting(SETTING_KEYS.DISCORD_CLIENT_ID);
  const clientSecret = getSetting(SETTING_KEYS.DISCORD_CLIENT_SECRET);
  const redirectUri = getSetting(SETTING_KEYS.DISCORD_REDIRECT_URI);
  
  return !!(clientId && clientSecret && redirectUri);
}

/**
 * Get Discord OAuth configuration
 */
export function getDiscordOAuthConfig() {
  return {
    clientId: getSetting(SETTING_KEYS.DISCORD_CLIENT_ID),
    clientSecret: getSetting(SETTING_KEYS.DISCORD_CLIENT_SECRET),
    redirectUri: getSetting(SETTING_KEYS.DISCORD_REDIRECT_URI),
  };
}

// Initialize cache on module load
loadSettingsCache();

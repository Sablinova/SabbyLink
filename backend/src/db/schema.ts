/**
 * Database Schema Definition using Drizzle ORM
 * 
 * Defines all tables, columns, indexes, and relations for the SQLite database.
 * See docs/PLANNING.md for complete schema documentation.
 */

import { sqliteTable, integer, text, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Helper function for timestamps
const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
};

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'), // Nullable for OAuth-only users
  // Discord OAuth fields
  discordId: text('discord_id').unique(),
  discordUsername: text('discord_username'),
  discordAvatar: text('discord_avatar'),
  discordAccessToken: text('discord_access_token'),
  discordRefreshToken: text('discord_refresh_token'),
  discordTokenExpires: integer('discord_token_expires', { mode: 'timestamp' }),
  lastLogin: integer('last_login', { mode: 'timestamp' }),
  ...timestamps,
});

export const discordAccounts = sqliteTable('discord_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  discordId: text('discord_id').notNull().unique(),
  username: text('username').notNull(),
  discriminator: text('discriminator').notNull(),
  avatar: text('avatar'),
  tokenEncrypted: text('token_encrypted').notNull(),
  ...timestamps,
});

// ============================================================================
// SETTINGS
// ============================================================================

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  theme: text('theme').notNull().default('dark'),
  accentColor: text('accent_color').notNull().default('#3b82f6'),
  compactMode: integer('compact_mode', { mode: 'boolean' }).notNull().default(false),
  notificationsEnabled: integer('notifications_enabled', { mode: 'boolean' }).notNull().default(true),
  soundEnabled: integer('sound_enabled', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
});

// ============================================================================
// RPC SYSTEM
// ============================================================================

export const rpcConfigs = sqliteTable('rpc_configs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  platform: text('platform').notNull().default('pc'),
  animationEnabled: integer('animation_enabled', { mode: 'boolean' }).notNull().default(false),
  animationInterval: integer('animation_interval').notNull().default(30),
  ...timestamps,
});

export const rpcStates = sqliteTable('rpc_states', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  configId: integer('config_id').notNull().references(() => rpcConfigs.id, { onDelete: 'cascade' }),
  order: integer('order').notNull().default(0),
  name: text('name').notNull(),
  type: text('type').notNull().default('playing'),
  details: text('details'),
  state: text('state'),
  largeImage: text('large_image'),
  largeText: text('large_text'),
  smallImage: text('small_image'),
  smallText: text('small_text'),
  showTimestamp: integer('show_timestamp', { mode: 'boolean' }).notNull().default(false),
  button1Text: text('button1_text'),
  button1Url: text('button1_url'),
  button2Text: text('button2_text'),
  button2Url: text('button2_url'),
  status: text('status').notNull().default('online'),
  ...timestamps,
}, (table) => ({
  configIdIdx: index('rpc_states_config_id_idx').on(table.configId),
}));

// ============================================================================
// COMMANDS
// ============================================================================

export const slashCommands = sqliteTable('slash_commands', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  response: text('response').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  embedEnabled: integer('embed_enabled', { mode: 'boolean' }).notNull().default(false),
  embedColor: text('embed_color'),
  embedTitle: text('embed_title'),
  embedDescription: text('embed_description'),
  embedImage: text('embed_image'),
  ...timestamps,
}, (table) => ({
  userIdIdx: index('slash_commands_user_id_idx').on(table.userId),
  nameIdx: index('slash_commands_name_idx').on(table.name),
}));

// ============================================================================
// AUTOMATION
// ============================================================================

export const automations = sqliteTable('automations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
}, (table) => ({
  userIdIdx: index('automations_user_id_idx').on(table.userId),
}));

export const automationBlocks = sqliteTable('automation_blocks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  automationId: integer('automation_id').notNull().references(() => automations.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'trigger', 'condition', 'action'
  blockType: text('block_type').notNull(), // specific type like 'message_received', 'contains_text', 'send_message'
  config: text('config').notNull(), // JSON stringified config
  order: integer('order').notNull().default(0),
  ...timestamps,
}, (table) => ({
  automationIdIdx: index('automation_blocks_automation_id_idx').on(table.automationId),
}));

// ============================================================================
// AI SYSTEM
// ============================================================================

export const aiConfigs = sqliteTable('ai_configs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  apiKeyEncrypted: text('api_key_encrypted'),
  model: text('model').notNull(),
  temperature: real('temperature').notNull().default(0.7),
  maxTokens: integer('max_tokens').notNull().default(1000),
  systemPrompt: text('system_prompt'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  ...timestamps,
}, (table) => ({
  userIdIdx: index('ai_configs_user_id_idx').on(table.userId),
  providerIdx: index('ai_configs_provider_idx').on(table.provider),
}));

export const aiConversations = sqliteTable('ai_conversations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channelId: text('channel_id').notNull(),
  title: text('title'),
  ...timestamps,
}, (table) => ({
  userIdIdx: index('ai_conversations_user_id_idx').on(table.userId),
  channelIdIdx: index('ai_conversations_channel_id_idx').on(table.channelId),
}));

export const aiMessages = sqliteTable('ai_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  conversationId: integer('conversation_id').notNull().references(() => aiConversations.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'system', 'user', 'assistant'
  content: text('content').notNull(),
  tokens: integer('tokens'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  conversationIdIdx: index('ai_messages_conversation_id_idx').on(table.conversationId),
}));

// ============================================================================
// LOGGING & ANALYTICS
// ============================================================================

export const messageLogs = sqliteTable('message_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  messageId: text('message_id').notNull(),
  channelId: text('channel_id').notNull(),
  guildId: text('guild_id'),
  authorId: text('author_id').notNull(),
  content: text('content').notNull(),
  action: text('action').notNull(), // 'deleted', 'edited'
  oldContent: text('old_content'), // For edits
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  userIdIdx: index('message_logs_user_id_idx').on(table.userId),
  messageIdIdx: index('message_logs_message_id_idx').on(table.messageId),
  createdAtIdx: index('message_logs_created_at_idx').on(table.createdAt),
}));

export const commandLogs = sqliteTable('command_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  commandName: text('command_name').notNull(),
  channelId: text('channel_id').notNull(),
  guildId: text('guild_id'),
  success: integer('success', { mode: 'boolean' }).notNull(),
  error: text('error'),
  executionTime: integer('execution_time'), // milliseconds
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  userIdIdx: index('command_logs_user_id_idx').on(table.userId),
  commandNameIdx: index('command_logs_command_name_idx').on(table.commandName),
  timestampIdx: index('command_logs_timestamp_idx').on(table.timestamp),
}));

export const errorLogs = sqliteTable('error_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  level: text('level').notNull(), // 'error', 'warn', 'fatal'
  message: text('message').notNull(),
  stack: text('stack'),
  context: text('context'), // JSON stringified additional context
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  levelIdx: index('error_logs_level_idx').on(table.level),
  timestampIdx: index('error_logs_timestamp_idx').on(table.timestamp),
}));

export const analyticsDaily = sqliteTable('analytics_daily', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // YYYY-MM-DD format
  messagesSent: integer('messages_sent').notNull().default(0),
  messagesReceived: integer('messages_received').notNull().default(0),
  commandsExecuted: integer('commands_executed').notNull().default(0),
  aiInteractions: integer('ai_interactions').notNull().default(0),
  uptimeSeconds: integer('uptime_seconds').notNull().default(0),
}, (table) => ({
  userIdDateIdx: index('analytics_daily_user_id_date_idx').on(table.userId, table.date),
}));

// ============================================================================
// FEATURE MODULES
// ============================================================================

export const afkSettings = sqliteTable('afk_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  message: text('message').notNull().default('I am currently AFK'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  ...timestamps,
});

export const autoReactions = sqliteTable('auto_reactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  trigger: text('trigger').notNull(), // 'keyword', 'user', 'channel', 'always'
  triggerValue: text('trigger_value'),
  emojis: text('emojis').notNull(), // JSON array of emoji strings
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
}, (table) => ({
  userIdIdx: index('auto_reactions_user_id_idx').on(table.userId),
}));

export const nitroSnipers = sqliteTable('nitro_snipers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  delay: integer('delay').notNull().default(0), // milliseconds
  notifyOnClaim: integer('notify_on_claim', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
});

export const giveawayConfigs = sqliteTable('giveaway_configs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  delay: integer('delay').notNull().default(0), // milliseconds
  blacklistedGuilds: text('blacklisted_guilds'), // JSON array of guild IDs
  keywords: text('keywords'), // JSON array of required keywords
  ...timestamps,
});

// ============================================================================
// TYPES
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type DiscordAccount = typeof discordAccounts.$inferSelect;
export type NewDiscordAccount = typeof discordAccounts.$inferInsert;

export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;

export type RPCConfig = typeof rpcConfigs.$inferSelect;
export type NewRPCConfig = typeof rpcConfigs.$inferInsert;

export type RPCState = typeof rpcStates.$inferSelect;
export type NewRPCState = typeof rpcStates.$inferInsert;

export type SlashCommand = typeof slashCommands.$inferSelect;
export type NewSlashCommand = typeof slashCommands.$inferInsert;

export type Automation = typeof automations.$inferSelect;
export type NewAutomation = typeof automations.$inferInsert;

export type AutomationBlock = typeof automationBlocks.$inferSelect;
export type NewAutomationBlock = typeof automationBlocks.$inferInsert;

export type AIConfig = typeof aiConfigs.$inferSelect;
export type NewAIConfig = typeof aiConfigs.$inferInsert;

export type AIConversation = typeof aiConversations.$inferSelect;
export type NewAIConversation = typeof aiConversations.$inferInsert;

export type AIMessage = typeof aiMessages.$inferSelect;
export type NewAIMessage = typeof aiMessages.$inferInsert;

export type MessageLog = typeof messageLogs.$inferSelect;
export type NewMessageLog = typeof messageLogs.$inferInsert;

export type CommandLog = typeof commandLogs.$inferSelect;
export type NewCommandLog = typeof commandLogs.$inferInsert;

export type ErrorLog = typeof errorLogs.$inferSelect;
export type NewErrorLog = typeof errorLogs.$inferInsert;

export type AnalyticsDaily = typeof analyticsDaily.$inferSelect;
export type NewAnalyticsDaily = typeof analyticsDaily.$inferInsert;

export type AFKSettings = typeof afkSettings.$inferSelect;
export type NewAFKSettings = typeof afkSettings.$inferInsert;

export type AutoReaction = typeof autoReactions.$inferSelect;
export type NewAutoReaction = typeof autoReactions.$inferInsert;

export type NitroSniper = typeof nitroSnipers.$inferSelect;
export type NewNitroSniper = typeof nitroSnipers.$inferInsert;

export type GiveawayConfig = typeof giveawayConfigs.$inferSelect;
export type NewGiveawayConfig = typeof giveawayConfigs.$inferInsert;

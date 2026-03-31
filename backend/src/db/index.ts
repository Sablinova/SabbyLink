/**
 * Database Connection and Initialization
 */

import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { env } from '@/config/env';
import * as schema from './schema';

// Create SQLite connection using Bun's native SQLite
const sqlite = new Database(env.DATABASE_URL, { create: true });

// Enable WAL mode for better concurrency
sqlite.exec('PRAGMA journal_mode = WAL;');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

// Export schema for convenience
export * from './schema';

/**
 * Initialize database tables
 * Creates all tables if they don't exist
 */
export async function initDatabase() {
  console.log('📦 Initializing database...');
  
  try {
    // Create all tables
    sqlite.exec(`
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        discord_id TEXT UNIQUE,
        discord_username TEXT,
        discord_avatar TEXT,
        discord_access_token TEXT,
        discord_refresh_token TEXT,
        discord_token_expires INTEGER,
        last_login INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );

      -- Discord accounts table
      CREATE TABLE IF NOT EXISTS discord_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        discord_id TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL,
        discriminator TEXT NOT NULL,
        avatar TEXT,
        token_encrypted TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );

      -- Settings table
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        theme TEXT NOT NULL DEFAULT 'dark',
        accent_color TEXT NOT NULL DEFAULT '#3b82f6',
        compact_mode INTEGER NOT NULL DEFAULT 0,
        notifications_enabled INTEGER NOT NULL DEFAULT 1,
        sound_enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );

      -- RPC configs table
      CREATE TABLE IF NOT EXISTS rpc_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        enabled INTEGER NOT NULL DEFAULT 0,
        platform TEXT NOT NULL DEFAULT 'pc',
        animation_enabled INTEGER NOT NULL DEFAULT 0,
        animation_interval INTEGER NOT NULL DEFAULT 30,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );

      -- RPC states table
      CREATE TABLE IF NOT EXISTS rpc_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_id INTEGER NOT NULL REFERENCES rpc_configs(id) ON DELETE CASCADE,
        "order" INTEGER NOT NULL DEFAULT 0,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'playing',
        details TEXT,
        state TEXT,
        large_image TEXT,
        large_text TEXT,
        small_image TEXT,
        small_text TEXT,
        show_timestamp INTEGER NOT NULL DEFAULT 0,
        button1_text TEXT,
        button1_url TEXT,
        button2_text TEXT,
        button2_url TEXT,
        status TEXT NOT NULL DEFAULT 'online',
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS rpc_states_config_id_idx ON rpc_states(config_id);

      -- Slash commands table
      CREATE TABLE IF NOT EXISTS slash_commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        response TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        embed_enabled INTEGER NOT NULL DEFAULT 0,
        embed_color TEXT,
        embed_title TEXT,
        embed_description TEXT,
        embed_image TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS slash_commands_user_id_idx ON slash_commands(user_id);
      CREATE INDEX IF NOT EXISTS slash_commands_name_idx ON slash_commands(name);

      -- Automations table
      CREATE TABLE IF NOT EXISTS automations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS automations_user_id_idx ON automations(user_id);

      -- Automation blocks table
      CREATE TABLE IF NOT EXISTS automation_blocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        automation_id INTEGER NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        block_type TEXT NOT NULL,
        config TEXT NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS automation_blocks_automation_id_idx ON automation_blocks(automation_id);

      -- AI configs table
      CREATE TABLE IF NOT EXISTS ai_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        api_key_encrypted TEXT,
        model TEXT NOT NULL,
        temperature REAL NOT NULL DEFAULT 0.7,
        max_tokens INTEGER NOT NULL DEFAULT 1000,
        system_prompt TEXT,
        enabled INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS ai_configs_user_id_idx ON ai_configs(user_id);
      CREATE INDEX IF NOT EXISTS ai_configs_provider_idx ON ai_configs(provider);

      -- AI conversations table
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        channel_id TEXT NOT NULL,
        title TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS ai_conversations_user_id_idx ON ai_conversations(user_id);
      CREATE INDEX IF NOT EXISTS ai_conversations_channel_id_idx ON ai_conversations(channel_id);

      -- AI messages table
      CREATE TABLE IF NOT EXISTS ai_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tokens INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS ai_messages_conversation_id_idx ON ai_messages(conversation_id);

      -- Message logs table
      CREATE TABLE IF NOT EXISTS message_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        guild_id TEXT,
        author_id TEXT NOT NULL,
        content TEXT NOT NULL,
        action TEXT NOT NULL,
        old_content TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS message_logs_user_id_idx ON message_logs(user_id);
      CREATE INDEX IF NOT EXISTS message_logs_message_id_idx ON message_logs(message_id);
      CREATE INDEX IF NOT EXISTS message_logs_created_at_idx ON message_logs(created_at);

      -- Command logs table
      CREATE TABLE IF NOT EXISTS command_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        command_name TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        guild_id TEXT,
        success INTEGER NOT NULL,
        error TEXT,
        execution_time INTEGER,
        timestamp INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS command_logs_user_id_idx ON command_logs(user_id);
      CREATE INDEX IF NOT EXISTS command_logs_command_name_idx ON command_logs(command_name);
      CREATE INDEX IF NOT EXISTS command_logs_timestamp_idx ON command_logs(timestamp);

      -- Error logs table
      CREATE TABLE IF NOT EXISTS error_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        stack TEXT,
        context TEXT,
        timestamp INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS error_logs_level_idx ON error_logs(level);
      CREATE INDEX IF NOT EXISTS error_logs_timestamp_idx ON error_logs(timestamp);

      -- Analytics daily table
      CREATE TABLE IF NOT EXISTS analytics_daily (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        messages_sent INTEGER NOT NULL DEFAULT 0,
        messages_received INTEGER NOT NULL DEFAULT 0,
        commands_executed INTEGER NOT NULL DEFAULT 0,
        ai_interactions INTEGER NOT NULL DEFAULT 0,
        uptime_seconds INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS analytics_daily_user_id_date_idx ON analytics_daily(user_id, date);

      -- AFK settings table
      CREATE TABLE IF NOT EXISTS afk_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        enabled INTEGER NOT NULL DEFAULT 0,
        message TEXT NOT NULL DEFAULT 'I am currently AFK',
        started_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );

      -- Auto reactions table
      CREATE TABLE IF NOT EXISTS auto_reactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        trigger TEXT NOT NULL,
        trigger_value TEXT,
        emojis TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS auto_reactions_user_id_idx ON auto_reactions(user_id);

      -- Nitro snipers table
      CREATE TABLE IF NOT EXISTS nitro_snipers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        enabled INTEGER NOT NULL DEFAULT 0,
        delay INTEGER NOT NULL DEFAULT 0,
        notify_on_claim INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );

      -- Giveaway configs table
      CREATE TABLE IF NOT EXISTS giveaway_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        enabled INTEGER NOT NULL DEFAULT 0,
        delay INTEGER NOT NULL DEFAULT 0,
        blacklisted_guilds TEXT,
        keywords TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );

      -- System settings table (for dashboard-configurable app settings)
      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        encrypted INTEGER NOT NULL DEFAULT 0,
        category TEXT NOT NULL DEFAULT 'general',
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS system_settings_key_idx ON system_settings(key);
      CREATE INDEX IF NOT EXISTS system_settings_category_idx ON system_settings(category);
    `);

    // Run migrations for new columns
    console.log('📦 Running migrations...');
    
    // Add Discord OAuth columns to users table if they don't exist
    const migrations = [
      `ALTER TABLE users ADD COLUMN discord_id TEXT UNIQUE`,
      `ALTER TABLE users ADD COLUMN discord_username TEXT`,
      `ALTER TABLE users ADD COLUMN discord_avatar TEXT`,
      `ALTER TABLE users ADD COLUMN discord_access_token TEXT`,
      `ALTER TABLE users ADD COLUMN discord_refresh_token TEXT`,
      `ALTER TABLE users ADD COLUMN discord_token_expires INTEGER`,
    ];

    for (const migration of migrations) {
      try {
        sqlite.exec(migration);
      } catch (e: any) {
        // Ignore "duplicate column" errors - column already exists
        if (!e.message?.includes('duplicate column')) {
          console.warn(`Migration warning: ${e.message}`);
        }
      }
    }

    // Make password_hash nullable for OAuth users
    // SQLite doesn't support ALTER COLUMN, so we just allow NULL in new tables
    // Existing tables will work since we handle NULL in code

    console.log('✅ Database tables created/verified');
    console.log(`   Location: ${env.DATABASE_URL}`);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
export function closeDatabase() {
  sqlite.close();
  console.log('Database connection closed');
}

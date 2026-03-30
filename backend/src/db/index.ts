/**
 * Database Connection and Initialization
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { env } from '@/config/env';
import * as schema from './schema';

// Create SQLite connection
const sqlite = new Database(env.DATABASE_URL);

// Enable WAL mode for better concurrency
sqlite.pragma('journal_mode = WAL');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

// Export schema for convenience
export * from './schema';

/**
 * Initialize database tables
 * This runs migrations and creates tables if they don't exist
 */
export async function initDatabase() {
  console.log('📦 Initializing database...');
  
  try {
    // In production, you'd run migrations here
    // For now, we'll just verify the connection
    const result = sqlite.prepare('SELECT 1 as test').get();
    
    if (result) {
      console.log('✅ Database connection established');
      console.log(`   Location: ${env.DATABASE_URL}`);
    }
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

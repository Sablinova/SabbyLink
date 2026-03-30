/**
 * Environment Configuration with Validation
 * 
 * Loads and validates environment variables using Zod schemas.
 * Throws descriptive errors if required variables are missing or invalid.
 */

import { z } from 'zod';

// Environment schema with validation
const envSchema = z.object({
  // Discord (optional - can be set via dashboard)
  DISCORD_TOKEN: z.string().optional(),
  
  // Backend
  BACKEND_PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  DATABASE_URL: z.string().default('./data/sabbylink.db'),
  
  // Security
  ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be at least 32 characters'),
  JWT_SECRET: z.string().min(16, 'JWT secret must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // Logging
  DEBUG: z.string().transform(v => v === 'true').default('false'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // AI Providers (all optional)
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-3-sonnet-20240229'),
  GOOGLE_AI_API_KEY: z.string().optional(),
  GOOGLE_AI_MODEL: z.string().default('gemini-pro'),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('mixtral-8x7b-32768'),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('llama2'),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('anthropic/claude-3-opus'),
  PERPLEXITY_API_KEY: z.string().optional(),
  PERPLEXITY_MODEL: z.string().default('pplx-70b-online'),
  CUSTOM_AI_URL: z.string().url().optional(),
  CUSTOM_AI_API_KEY: z.string().optional(),
  CUSTOM_AI_MODEL: z.string().optional(),
  DEFAULT_AI_PROVIDER: z.enum([
    'openai', 
    'anthropic', 
    'google', 
    'groq', 
    'ollama', 
    'openrouter', 
    'perplexity', 
    'custom'
  ]).default('openai'),
  AI_TEMPERATURE: z.string().transform(Number).pipe(z.number().min(0).max(2)).default('0.7'),
  AI_MAX_TOKENS: z.string().transform(Number).pipe(z.number().int().positive()).default('1000'),
  AI_SYSTEM_PROMPT: z.string().default('You are a helpful AI assistant integrated into a Discord selfbot.'),
  
  // Rate Limiting
  RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number().int().positive()).default('100'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().int().positive()).default('60000'),
  
  // Feature Toggles
  ENABLE_RPC: z.string().transform(v => v === 'true').default('true'),
  ENABLE_AI_RESPONDER: z.string().transform(v => v === 'true').default('false'),
  ENABLE_NITRO_SNIPER: z.string().transform(v => v === 'true').default('false'),
  ENABLE_GIVEAWAY_JOINER: z.string().transform(v => v === 'true').default('false'),
  ENABLE_MESSAGE_LOGGER: z.string().transform(v => v === 'true').default('true'),
  ENABLE_AUTO_REACTIONS: z.string().transform(v => v === 'true').default('false'),
  ENABLE_AFK_SYSTEM: z.string().transform(v => v === 'true').default('true'),
  
  // RPC
  RPC_PLATFORM: z.enum(['pc', 'xbox', 'playstation', 'mobile', 'switch', 'custom']).default('pc'),
  RPC_ANIMATION_ENABLED: z.string().transform(v => v === 'true').default('false'),
  RPC_ANIMATION_INTERVAL: z.string().transform(Number).pipe(z.number().int().positive()).default('30'),
  
  // Backup
  AUTO_BACKUP_ENABLED: z.string().transform(v => v === 'true').default('true'),
  AUTO_BACKUP_INTERVAL_HOURS: z.string().transform(Number).pipe(z.number().int().positive()).default('24'),
  AUTO_BACKUP_MAX_BACKUPS: z.string().transform(Number).pipe(z.number().int().positive()).default('7'),
  BACKUP_DIR: z.string().default('./backups'),
  
  // Security
  ENABLE_RATE_LIMITING: z.string().transform(v => v === 'true').default('true'),
  MAX_LOGIN_ATTEMPTS: z.string().transform(Number).pipe(z.number().int().positive()).default('5'),
  ACCOUNT_LOCK_DURATION_MINUTES: z.string().transform(Number).pipe(z.number().int().positive()).default('30'),
  SESSION_TIMEOUT_HOURS: z.string().transform(Number).pipe(z.number().int().positive()).default('24'),
  
  // Analytics
  ENABLE_ANALYTICS: z.string().transform(v => v === 'true').default('true'),
  ANALYTICS_RETENTION_DAYS: z.string().transform(Number).pipe(z.number().int().positive()).default('30'),
  
  // Advanced
  WS_PING_INTERVAL: z.string().transform(Number).pipe(z.number().int().positive()).default('30'),
  WS_CONNECTION_TIMEOUT: z.string().transform(Number).pipe(z.number().int().positive()).default('60'),
  MAX_UPLOAD_SIZE_MB: z.string().transform(Number).pipe(z.number().int().positive()).default('10'),
  ENABLE_EXPERIMENTAL_FEATURES: z.string().transform(v => v === 'true').default('false'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Load and validate environment variables
 */
export function loadEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

// Export singleton instance
export const env = loadEnv();

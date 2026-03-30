/**
 * Application Constants
 */

export const APP_NAME = 'SabbyLink';
export const APP_VERSION = '0.1.0';
export const APP_DESCRIPTION = 'Advanced Discord selfbot with AI integration';

// API
export const API_PREFIX = '/api/v1';
export const WS_PATH = '/ws';

// Discord
export const DISCORD_API_BASE = 'https://discord.com/api/v10';
export const DISCORD_CDN_BASE = 'https://cdn.discordapp.com';

// RPC Platform Application IDs
export const RPC_PLATFORMS = {
  pc: {
    name: 'PC',
    applicationId: '0', // Use custom application ID
    defaultAssets: {
      largeImage: 'pc_logo',
      smallImage: 'pc_icon',
    },
  },
  xbox: {
    name: 'Xbox',
    applicationId: '438122941302046720',
    defaultAssets: {
      largeImage: 'xbox_logo',
      smallImage: 'xbox_controller',
    },
  },
  playstation: {
    name: 'PlayStation',
    applicationId: '1149387775104172162',
    defaultAssets: {
      largeImage: 'ps_logo',
      smallImage: 'ps_controller',
    },
  },
  mobile: {
    name: 'Mobile',
    applicationId: '0',
    defaultAssets: {
      largeImage: 'mobile_logo',
      smallImage: 'mobile_icon',
    },
  },
  switch: {
    name: 'Nintendo Switch',
    applicationId: '0',
    defaultAssets: {
      largeImage: 'switch_logo',
      smallImage: 'switch_icon',
    },
  },
  custom: {
    name: 'Custom',
    applicationId: '0',
    defaultAssets: {
      largeImage: 'custom_logo',
      smallImage: 'custom_icon',
    },
  },
} as const;

// Activity Types
export const ACTIVITY_TYPES = {
  playing: 0,
  streaming: 1,
  listening: 2,
  watching: 3,
  competing: 5,
} as const;

// Status Types
export const STATUS_TYPES = {
  online: 'online',
  idle: 'idle',
  dnd: 'dnd',
  invisible: 'invisible',
} as const;

// Database
export const DB_MIGRATIONS_PATH = './src/db/migrations';

// Security
export const BCRYPT_ROUNDS = 12;
export const TOKEN_EXPIRY = 60 * 60 * 24 * 7; // 7 days in seconds

// Rate Limiting
export const RATE_LIMIT_SKIP_PATHS = ['/api/v1/health', '/ws'];

// Logging
export const LOG_FORMAT = 'combined';
export const LOG_DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

// File Upload
export const ALLOWED_UPLOAD_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

// Pagination
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

// AI
export const AI_CONTEXT_MAX_MESSAGES = 20;
export const AI_CONTEXT_MAX_TOKENS = 4000;

// WebSocket Events
export const WS_EVENTS = {
  // Bot events
  BOT_STATUS: 'bot:status',
  BOT_READY: 'bot:ready',
  BOT_ERROR: 'bot:error',
  
  // Message events
  MESSAGE_NEW: 'message:new',
  MESSAGE_DELETED: 'message:deleted',
  MESSAGE_EDITED: 'message:edited',
  
  // Command events
  COMMAND_EXECUTED: 'command:executed',
  
  // RPC events
  RPC_CONFIG_UPDATED: 'rpc:config:updated',
  RPC_STATE_CHANGED: 'rpc:state:changed',
  
  // AI events
  AI_MESSAGE: 'ai:message',
  AI_STREAM_CHUNK: 'ai:stream:chunk',
  AI_STREAM_END: 'ai:stream:end',
  
  // Analytics events
  ANALYTICS_UPDATE: 'analytics:update',
  
  // Client events
  PING: 'ping',
  PONG: 'pong',
} as const;

// Error Codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BOT_NOT_READY: 'BOT_NOT_READY',
  DISCORD_ERROR: 'DISCORD_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  AI_PROVIDER_ERROR: 'AI_PROVIDER_ERROR',
} as const;

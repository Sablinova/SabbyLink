/**
 * SabbyLink Backend Entry Point
 * 
 * Initializes and starts all backend services:
 * - Database (SQLite + Drizzle ORM)
 * - REST API (Elysia.js)
 * - WebSocket Server (for real-time updates)
 * - Discord Bot Client (selfbot)
 */

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { env } from '@/config/env';
import { APP_NAME, APP_VERSION, API_PREFIX } from '@/config/constants';
import { initDatabase, closeDatabase } from '@/db';
import { logger } from '@/utils/logger';
import { authenticate } from '@/api/middleware/auth';
import { rateLimiting } from '@/api/middleware/rate-limit';
import { authRoutes } from '@/api/routes/auth';
import { discordOAuthRoutes } from '@/api/routes/discord-oauth';
import { userAppRoutes } from '@/api/routes/user-app';
import { botRoutes } from '@/api/routes/bot';
import { rpcRoutes } from '@/api/routes/rpc';
import { commandsRoutes } from '@/api/routes/commands';
import { aiRoutes } from '@/api/routes/ai';
import { analyticsRoutes } from '@/api/routes/analytics';
import { settingsRoutes } from '@/api/routes/settings';
import { adminSettingsRoutes } from '@/api/routes/admin-settings';
import { wsManager } from '@/ws';
import { botManager } from '@/bot';
import { rpcManager } from '@/bot/rpc';

// ASCII art banner
const banner = `
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ███████╗ █████╗ ██████╗ ██████╗ ██╗   ██╗             ║
║   ██╔════╝██╔══██╗██╔══██╗██╔══██╗╚██╗ ██╔╝             ║
║   ███████╗███████║██████╔╝██████╔╝ ╚████╔╝              ║
║   ╚════██║██╔══██║██╔══██╗██╔══██╗  ╚██╔╝               ║
║   ███████║██║  ██║██████╔╝██████╔╝   ██║                ║
║   ╚══════╝╚═╝  ╚═╝╚═════╝ ╚═════╝    ╚═╝                ║
║                                                           ║
║   ██╗     ██╗███╗   ██╗██╗  ██╗                         ║
║   ██║     ██║████╗  ██║██║ ██╔╝                         ║
║   ██║     ██║██╔██╗ ██║█████╔╝                          ║
║   ██║     ██║██║╚██╗██║██╔═██╗                          ║
║   ███████╗██║██║ ╚████║██║  ██╗                         ║
║   ╚══════╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝                         ║
║                                                           ║
║   Advanced Discord Selfbot with AI Integration           ║
║   Version ${APP_VERSION}                                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`;

/**
 * Create and configure Elysia app
 */
function createApp() {
  const app = new Elysia()
    // CORS middleware
    .use(cors({
      origin: env.NODE_ENV === 'development',
      credentials: true,
    }))
    // Rate limiting
    .use(rateLimiting)
    
    // Health check endpoint
    .get(`${API_PREFIX}/health`, () => ({
      status: 'ok',
      service: APP_NAME,
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      websockets: wsManager.getTotalClients(),
    }))
    
    // API info endpoint
    .get(`${API_PREFIX}/info`, () => ({
      name: APP_NAME,
      version: APP_VERSION,
      description: 'Advanced Discord selfbot with AI integration',
      endpoints: {
        health: `${API_PREFIX}/health`,
        auth: `${API_PREFIX}/auth/*`,
        bot: `${API_PREFIX}/bot/*`,
        rpc: `${API_PREFIX}/rpc/*`,
        commands: `${API_PREFIX}/commands/*`,
        automation: `${API_PREFIX}/automation/*`,
        ai: `${API_PREFIX}/ai/*`,
        analytics: `${API_PREFIX}/analytics/*`,
        logs: `${API_PREFIX}/logs/*`,
        settings: `${API_PREFIX}/settings/*`,
      },
    }))
    
    // Public auth routes (no middleware)
    .use(authRoutes)
    .use(discordOAuthRoutes)
    
    // Protected routes (require authentication)
    .use(authenticate)
    .use(userAppRoutes)
    .use(botRoutes)
    .use(rpcRoutes)
    .use(commandsRoutes)
    .use(aiRoutes)
    .use(analyticsRoutes)
    .use(settingsRoutes)
    .use(adminSettingsRoutes)
    
    // WebSocket endpoint
    .ws('/ws', {
      open: (ws) => wsManager.handleConnection(ws),
      message: (ws, message) => {
        if (typeof message === 'string') {
          wsManager.handleMessage(ws, message);
        }
      },
      close: (ws) => wsManager.handleClose(ws),
    })
    
    // 404 handler
    .onError(({ code, error, set }) => {
      if (code === 'NOT_FOUND') {
        set.status = 404;
        return {
          error: 'Not Found',
          message: 'The requested resource was not found',
          code: 'NOT_FOUND',
        };
      }
      
      // Generic error handler
      logger.error('API Error:', error);
      set.status = 500;
      return {
        error: 'Internal Server Error',
        message: env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      };
    });
  
  return app;
}

/**
 * Main startup function
 */
async function start() {
  try {
    // Print banner
    console.log(banner);
    
    logger.info(`Starting ${APP_NAME} v${APP_VERSION}...`);
    logger.info(`Environment: ${env.NODE_ENV}`);
    logger.info(`Port: ${env.BACKEND_PORT}`);
    
    // 1. Initialize database
    await initDatabase();
    
    // 2. Create and start API server
    const app = createApp();
    
    app.listen(env.BACKEND_PORT, () => {
      logger.info(`API server listening on port ${env.BACKEND_PORT}`);
      logger.info(`Health check: http://localhost:${env.BACKEND_PORT}${API_PREFIX}/health`);
      logger.info(`API info: http://localhost:${env.BACKEND_PORT}${API_PREFIX}/info`);
      logger.info(`WebSocket: ws://localhost:${env.BACKEND_PORT}/ws`);
    });
    
    // 3. Initialize WebSocket manager with server
    wsManager.initialize(app.server!);
    
    // 4. Auto-start bots
    logger.info('Starting auto-start sequence...');
    await botManager.autoStart();
    logger.info('Bots auto-started');
    
    // 5. Wait for bots to be ready, then auto-start RPCs
    setTimeout(async () => {
      await rpcManager.autoStart();
      logger.info('RPCs auto-started');
    }, 5000);
    
    logger.info(`${APP_NAME} is ready! 🚀`);
    logger.info('Press Ctrl+C to stop');
    
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
function setupShutdownHandlers() {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    
    try {
      // Stop all bots
      logger.info('Stopping bots...');
      // botManager handles cleanup internally
      
      // Close database connection
      closeDatabase();
      
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Setup shutdown handlers
setupShutdownHandlers();

// Start the application
start();

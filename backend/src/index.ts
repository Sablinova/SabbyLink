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
import { log } from '@/utils/logger';

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
    
    // Health check endpoint
    .get(`${API_PREFIX}/health`, () => ({
      status: 'ok',
      service: APP_NAME,
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
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
      log.error('API Error:', error);
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
    
    log.info(`Starting ${APP_NAME} v${APP_VERSION}...`);
    log.info(`Environment: ${env.NODE_ENV}`);
    log.info(`Port: ${env.BACKEND_PORT}`);
    
    // 1. Initialize database
    await initDatabase();
    
    // 2. Create and start API server
    const app = createApp();
    
    app.listen(env.BACKEND_PORT, () => {
      log.success(`API server listening on port ${env.BACKEND_PORT}`);
      log.info(`Health check: http://localhost:${env.BACKEND_PORT}${API_PREFIX}/health`);
      log.info(`API info: http://localhost:${env.BACKEND_PORT}${API_PREFIX}/info`);
    });
    
    // 3. TODO: Initialize Discord bot client
    // await initBot();
    
    // 4. TODO: Initialize WebSocket server
    // await initWebSocket();
    
    // 5. TODO: Initialize AI providers
    // await initAI();
    
    log.success(`${APP_NAME} is ready! 🚀`);
    log.info('Press Ctrl+C to stop');
    
  } catch (error) {
    log.error('Failed to start application:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
function setupShutdownHandlers() {
  const shutdown = async (signal: string) => {
    log.info(`Received ${signal}, shutting down gracefully...`);
    
    try {
      // Close database connection
      closeDatabase();
      
      // TODO: Close Discord client
      // TODO: Close WebSocket connections
      
      log.success('Shutdown complete');
      process.exit(0);
    } catch (error) {
      log.error('Error during shutdown:', error);
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

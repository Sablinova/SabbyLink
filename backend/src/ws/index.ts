import { ServerWebSocket, Server } from 'bun';
import { verify } from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';

interface WebSocketData {
  userId: number;
  authenticated: boolean;
}

interface WebSocketMessage {
  type: string;
  data?: any;
}

class WSManager {
  private clients: Map<number, Set<ServerWebSocket<WebSocketData>>> = new Map();
  private server?: Server;

  initialize(server: Server) {
    this.server = server;
    logger.info('WebSocket manager initialized');
  }

  handleConnection(ws: ServerWebSocket<WebSocketData>) {
    logger.debug('New WebSocket connection');

    ws.send(
      JSON.stringify({
        type: 'connected',
        data: { message: 'Connected to SabbyLink WebSocket' },
      })
    );
  }

  handleMessage(ws: ServerWebSocket<WebSocketData>, message: string) {
    try {
      const parsed: WebSocketMessage = JSON.parse(message);

      switch (parsed.type) {
        case 'auth':
          this.handleAuth(ws, parsed.data);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        default:
          logger.warn(`Unknown WebSocket message type: ${parsed.type}`);
      }
    } catch (error) {
      logger.error('WebSocket message error:', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          data: { message: 'Invalid message format' },
        })
      );
    }
  }

  handleClose(ws: ServerWebSocket<WebSocketData>) {
    if (ws.data.authenticated && ws.data.userId) {
      const userClients = this.clients.get(ws.data.userId);
      if (userClients) {
        userClients.delete(ws);
        if (userClients.size === 0) {
          this.clients.delete(ws.data.userId);
        }
      }
      logger.debug(`WebSocket disconnected for user: ${ws.data.userId}`);
    }
  }

  private handleAuth(ws: ServerWebSocket<WebSocketData>, data: any) {
    try {
      const { token } = data;

      if (!token) {
        ws.send(
          JSON.stringify({
            type: 'auth_error',
            data: { message: 'Token required' },
          })
        );
        return;
      }

      // Verify JWT
      const decoded = verify(token, env.JWT_SECRET) as { userId: number };

      // Mark as authenticated
      ws.data.userId = decoded.userId;
      ws.data.authenticated = true;

      // Add to clients map
      if (!this.clients.has(decoded.userId)) {
        this.clients.set(decoded.userId, new Set());
      }
      this.clients.get(decoded.userId)!.add(ws);

      ws.send(
        JSON.stringify({
          type: 'auth_success',
          data: { userId: decoded.userId },
        })
      );

      logger.debug(`WebSocket authenticated for user: ${decoded.userId}`);
    } catch (error) {
      logger.error('WebSocket auth error:', error);
      ws.send(
        JSON.stringify({
          type: 'auth_error',
          data: { message: 'Invalid token' },
        })
      );
    }
  }

  // Broadcast message to all connections for a user
  broadcast(userId: number, type: string, data: any) {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) return;

    const message = JSON.stringify({ type, data });

    userClients.forEach((ws) => {
      try {
        ws.send(message);
      } catch (error) {
        logger.error('Error broadcasting to WebSocket:', error);
      }
    });
  }

  // Broadcast to all authenticated clients
  broadcastAll(type: string, data: any) {
    const message = JSON.stringify({ type, data });

    this.clients.forEach((userClients) => {
      userClients.forEach((ws) => {
        try {
          ws.send(message);
        } catch (error) {
          logger.error('Error broadcasting to WebSocket:', error);
        }
      });
    });
  }

  // Get connected client count for a user
  getClientCount(userId: number): number {
    return this.clients.get(userId)?.size || 0;
  }

  // Get total connected clients
  getTotalClients(): number {
    let total = 0;
    this.clients.forEach((userClients) => {
      total += userClients.size;
    });
    return total;
  }
}

export const wsManager = new WSManager();

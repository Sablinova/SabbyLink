import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useBotStore } from '../store/bot';

// WebSocket event types matching backend constants
export const WS_EVENTS = {
  // Bot events
  BOT_STATUS: 'bot:status',
  BOT_CONNECTED: 'bot:connected',
  BOT_DISCONNECTED: 'bot:disconnected',
  BOT_ERROR: 'bot:error',
  
  // Message events
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_SENT: 'message:sent',
  MESSAGE_DELETED: 'message:deleted',
  MESSAGE_EDITED: 'message:edited',
  
  // Command events
  COMMAND_EXECUTED: 'command:executed',
  COMMAND_ERROR: 'command:error',
  
  // RPC events
  RPC_UPDATED: 'rpc:updated',
  RPC_STARTED: 'rpc:started',
  RPC_STOPPED: 'rpc:stopped',
  
  // AI events
  AI_RESPONSE: 'ai:response',
  AI_STREAMING: 'ai:streaming',
  AI_ERROR: 'ai:error',
  
  // Analytics events
  ANALYTICS_UPDATE: 'analytics:update',
} as const;

export type WebSocketEvent = typeof WS_EVENTS[keyof typeof WS_EVENTS];

interface WebSocketMessage {
  type: WebSocketEvent;
  data: any;
  timestamp?: number;
}

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

interface WebSocketState {
  isConnected: boolean;
  reconnectAttempts: number;
  lastMessage: WebSocketMessage | null;
  error: string | null;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const { token } = useAuthStore();
  const { setStatus, setConnected, setError } = useBotStore();
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    reconnectAttempts: 0,
    lastMessage: null,
    error: null,
  });

  // Event listeners map for subscribe/unsubscribe pattern
  const listenersRef = useRef<Map<WebSocketEvent, Set<(data: any) => void>>>(new Map());

  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = (import.meta as any).env?.VITE_WS_URL;
    const host = wsUrl || `${protocol}//${window.location.host}`;
    return `${host}/ws?token=${token}`;
  }, [token]);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      message.timestamp = Date.now();
      
      setState(prev => ({ ...prev, lastMessage: message }));
      
      // Call global message handler
      onMessage?.(message);
      
      // Call event-specific listeners
      const listeners = listenersRef.current.get(message.type);
      if (listeners) {
        listeners.forEach(listener => listener(message.data));
      }
      
      // Handle built-in events for state management
      switch (message.type) {
        case WS_EVENTS.BOT_STATUS:
          setStatus(message.data.status);
          break;
        case WS_EVENTS.BOT_CONNECTED:
          setConnected(true);
          break;
        case WS_EVENTS.BOT_DISCONNECTED:
          setConnected(false);
          break;
        case WS_EVENTS.BOT_ERROR:
          setError(message.data.error);
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, [onMessage, setStatus, setConnected, setError]);

  const connect = useCallback(() => {
    if (!token) {
      console.warn('Cannot connect WebSocket: no auth token');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const url = getWebSocketUrl();
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttemptsRef.current = 0;
        setState(prev => ({
          ...prev,
          isConnected: true,
          reconnectAttempts: 0,
          error: null,
        }));
        onConnect?.();
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setState(prev => ({ ...prev, isConnected: false }));
        onDisconnect?.();
        
        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          setState(prev => ({
            ...prev,
            reconnectAttempts: reconnectAttemptsRef.current,
          }));
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Reconnecting... (attempt ${reconnectAttemptsRef.current})`);
            connect();
          }, reconnectInterval);
        } else {
          setState(prev => ({
            ...prev,
            error: 'Max reconnection attempts reached',
          }));
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ ...prev, error: 'WebSocket connection error' }));
        onError?.(error);
      };

      wsRef.current.onmessage = handleMessage;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setState(prev => ({ ...prev, error: 'Failed to create WebSocket connection' }));
    }
  }, [token, getWebSocketUrl, handleMessage, onConnect, onDisconnect, onError, maxReconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setState(prev => ({ ...prev, isConnected: false }));
  }, []);

  const send = useCallback((type: WebSocketEvent, data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
      return true;
    }
    console.warn('WebSocket not connected, cannot send message');
    return false;
  }, []);

  // Subscribe to specific event types
  const subscribe = useCallback((event: WebSocketEvent, callback: (data: any) => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      listenersRef.current.get(event)?.delete(callback);
    };
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, token, connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    send,
    subscribe,
  };
}

// Convenience hook for subscribing to specific events
export function useWebSocketEvent<T = any>(
  event: WebSocketEvent,
  callback: (data: T) => void
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const { subscribe, isConnected } = useWebSocket({ autoConnect: true });

  useEffect(() => {
    const unsubscribe = subscribe(event, (data: T) => {
      callbackRef.current(data);
    });

    return unsubscribe;
  }, [event, subscribe]);

  return { isConnected };
}

// Hook for real-time bot status
export function useBotStatus() {
  const [status, setStatus] = useState<{
    online: boolean;
    uptime: number;
    guilds: number;
    ping: number;
  } | null>(null);

  useWebSocketEvent(WS_EVENTS.BOT_STATUS, setStatus);

  return status;
}

// Hook for real-time analytics
export function useAnalyticsUpdates() {
  const [analytics, setAnalytics] = useState<{
    messagesProcessed: number;
    commandsExecuted: number;
    aiResponses: number;
  } | null>(null);

  useWebSocketEvent(WS_EVENTS.ANALYTICS_UPDATE, setAnalytics);

  return analytics;
}

// Hook for AI streaming responses
export function useAIStreaming(onChunk: (chunk: string) => void) {
  const [isStreaming, setIsStreaming] = useState(false);

  useWebSocketEvent(WS_EVENTS.AI_STREAMING, (data: { chunk: string; done: boolean }) => {
    if (data.done) {
      setIsStreaming(false);
    } else {
      setIsStreaming(true);
      onChunk(data.chunk);
    }
  });

  return { isStreaming };
}

export default useWebSocket;

import { create } from 'zustand';
import { botApi } from '../lib/api';

interface BotUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
}

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  owner: boolean;
}

interface BotState {
  status: 'online' | 'offline' | 'connecting' | 'error';
  user: BotUser | null;
  guilds: Guild[];
  ping: number;
  uptime: number;
  isLoading: boolean;
  error: string | null;

  fetchStatus: () => Promise<void>;
  start: (token: string) => Promise<void>;
  stop: () => Promise<void>;
  restart: () => Promise<void>;
  fetchGuilds: () => Promise<void>;
  setStatus: (status: BotState['status']) => void;
  setConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useBotStore = create<BotState>((set, get) => ({
  status: 'offline',
  user: null,
  guilds: [],
  ping: 0,
  uptime: 0,
  isLoading: false,
  error: null,

  fetchStatus: async () => {
    try {
      const response = await botApi.getStatus();
      const data = response.data;
      
      set({
        status: data.status,
        user: data.user || null,
        guilds: [],
        ping: data.ping || 0,
        uptime: data.uptime || 0,
      });
    } catch (error: any) {
      set({
        status: 'offline',
        error: error.response?.data?.error || 'Failed to fetch status',
      });
    }
  },

  start: async (token) => {
    set({ isLoading: true, error: null, status: 'connecting' });
    try {
      await botApi.start(token);
      // Wait a bit for bot to connect
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await get().fetchStatus();
      set({ isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        status: 'error',
        error: error.response?.data?.error || 'Failed to start bot',
      });
      throw error;
    }
  },

  stop: async () => {
    set({ isLoading: true, error: null });
    try {
      await botApi.stop();
      set({
        status: 'offline',
        user: null,
        guilds: [],
        ping: 0,
        uptime: 0,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.error || 'Failed to stop bot',
      });
      throw error;
    }
  },

  restart: async () => {
    set({ isLoading: true, error: null, status: 'connecting' });
    try {
      await botApi.restart();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await get().fetchStatus();
      set({ isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        status: 'error',
        error: error.response?.data?.error || 'Failed to restart bot',
      });
      throw error;
    }
  },

  fetchGuilds: async () => {
    try {
      const response = await botApi.getGuilds();
      set({ guilds: response.data.guilds });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to fetch guilds',
      });
    }
  },

  setStatus: (status) => set({ status }),

  setConnected: (connected) => set({ status: connected ? 'online' : 'offline' }),

  setError: (error) => set({ error, status: error ? 'error' : 'offline' }),

  clearError: () => set({ error: null }),
}));

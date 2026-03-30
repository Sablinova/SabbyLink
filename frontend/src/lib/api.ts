import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sabbylink_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sabbylink_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (username: string, email: string, password: string) =>
    api.post('/auth/register', { username, email, password }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Bot API
export const botApi = {
  getStatus: () => api.get('/bot/status'),
  start: (token: string) => api.post('/bot/start', { token }),
  stop: () => api.post('/bot/stop'),
  restart: () => api.post('/bot/restart'),
  getGuilds: () => api.get('/bot/guilds'),
  getUser: () => api.get('/bot/user'),
};

// RPC API
export const rpcApi = {
  getConfigs: () => api.get('/rpc/configs'),
  getConfig: (id: number) => api.get(`/rpc/configs/${id}`),
  createConfig: (data: any) => api.post('/rpc/configs', data),
  updateConfig: (id: number, data: any) => api.put(`/rpc/configs/${id}`, data),
  deleteConfig: (id: number) => api.delete(`/rpc/configs/${id}`),
  toggleConfig: (id: number) => api.post(`/rpc/configs/${id}/toggle`),
};

// Commands API
export const commandsApi = {
  list: () => api.get('/commands/list'),
  get: (id: number) => api.get(`/commands/list/${id}`),
  create: (data: any) => api.post('/commands/create', data),
  update: (id: number, data: any) => api.put(`/commands/update/${id}`, data),
  delete: (id: number) => api.delete(`/commands/delete/${id}`),
  toggle: (id: number) => api.post(`/commands/toggle/${id}`),
};

// AI API
export const aiApi = {
  getProviders: () => api.get('/ai/providers'),
  getConfigs: () => api.get('/ai/configs'),
  createConfig: (data: any) => api.post('/ai/configs', data),
  chat: (configId: number, message: string, conversationId?: number) =>
    api.post('/ai/chat', { configId, message, conversationId }),
  getConversations: () => api.get('/ai/conversations'),
  getConversation: (id: number) => api.get(`/ai/conversations/${id}`),
  deleteConversation: (id: number) => api.delete(`/ai/conversations/${id}`),
};

// Analytics API
export const analyticsApi = {
  getOverview: () => api.get('/analytics/overview'),
  getMessages: (params?: any) => api.get('/analytics/messages', { params }),
  getCommands: (params?: any) => api.get('/analytics/commands', { params }),
  getStats: (days?: number) => api.get('/analytics/stats', { params: { days } }),
};

// Settings API
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: any) => api.put('/settings', data),
  backup: () => api.get('/settings/backup'),
  restore: (backup: any) => api.post('/settings/restore', { backup }),
  reset: () => api.delete('/settings/reset'),
};

export default api;

/**
 * AI Provider Adapter Interface
 * 
 * Universal interface for ANY LLM provider
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIStreamChunk {
  content: string;
  done: boolean;
}

export interface AIResponse {
  content: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs?: number;
}

export interface AIProviderConfig {
  provider: string;
  apiKey?: string;
  baseURL?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  systemPrompt?: string;
}

export interface AIProvider {
  name: string;
  displayName?: string;
  models?: string[];
  chat(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse>;
  stream?(messages: AIMessage[], config: AIProviderConfig): AsyncGenerator<AIStreamChunk>;
  isConfigured(config: AIProviderConfig): boolean;
  testConnection?(config: AIProviderConfig): Promise<boolean>;
}

// Callback type for streaming responses
export type AIStreamCallback = (chunk: string, done: boolean) => void;

// Provider-specific config types
export interface OpenAIConfig extends AIProviderConfig {
  provider: 'openai';
}

export interface ClaudeConfig extends AIProviderConfig {
  provider: 'claude';
}

export interface GeminiConfig extends AIProviderConfig {
  provider: 'gemini';
}

export interface GroqConfig extends AIProviderConfig {
  provider: 'groq';
}

export interface OllamaConfig extends AIProviderConfig {
  provider: 'ollama';
}

// Supported provider names
export type AIProviderName = 'openai' | 'claude' | 'gemini' | 'groq' | 'ollama';

// Default models per provider
export const DEFAULT_MODELS: Record<AIProviderName, string> = {
  openai: 'gpt-4o',
  claude: 'claude-sonnet-4-20250514',
  gemini: 'gemini-2.0-flash-exp',
  groq: 'llama-3.3-70b-versatile',
  ollama: 'llama3.2',
};

// All available models per provider
export const AVAILABLE_MODELS: Record<AIProviderName, string[]> = {
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
    'o1-preview',
    'o1-mini',
  ],
  claude: [
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229',
    'claude-3-haiku-20240307',
  ],
  gemini: [
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
  ],
  groq: [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'llama-3.2-90b-vision-preview',
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
  ],
  ollama: [
    'llama3.2',
    'llama3.1',
    'mistral',
    'codellama',
    'phi3',
    'gemma2',
    'qwen2.5',
  ],
};

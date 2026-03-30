/**
 * AI Manager
 * 
 * Central hub for managing AI provider adapters
 */

import type { AIProvider, AIProviderConfig, AIMessage, AIResponse, AIStreamChunk } from './types';
import { OpenAIProvider } from './providers/openai';
import { ClaudeProvider } from './providers/claude';
import { GeminiProvider } from './providers/gemini';
import { GroqProvider } from './providers/groq';
import { OllamaProvider } from './providers/ollama';
import { logger } from '@/utils/logger';

class AIManager {
  private providers: Map<string, AIProvider> = new Map();

  constructor() {
    // Register all built-in providers
    this.registerProvider(new OpenAIProvider());
    this.registerProvider(new ClaudeProvider());
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new GroqProvider());
    this.registerProvider(new OllamaProvider());
    
    logger.info(`AI Manager initialized with ${this.providers.size} providers`);
  }

  registerProvider(provider: AIProvider) {
    this.providers.set(provider.name, provider);
    logger.debug(`Registered AI provider: ${provider.name}`);
  }

  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }

  listProviders(): { name: string; displayName?: string; models?: string[] }[] {
    return Array.from(this.providers.values()).map(p => ({
      name: p.name,
      displayName: p.displayName,
      models: p.models,
    }));
  }

  async chat(
    providerName: string,
    messages: AIMessage[],
    config: AIProviderConfig
  ): Promise<AIResponse> {
    const provider = this.getProvider(providerName);
    
    if (!provider) {
      throw new Error(`Unknown AI provider: ${providerName}`);
    }

    if (!provider.isConfigured(config)) {
      throw new Error(`Provider ${providerName} is not properly configured`);
    }

    try {
      return await provider.chat(messages, config);
    } catch (error) {
      logger.error(`AI chat error (${providerName}):`, error);
      throw error;
    }
  }

  async *stream(
    providerName: string,
    messages: AIMessage[],
    config: AIProviderConfig
  ): AsyncGenerator<AIStreamChunk> {
    const provider = this.getProvider(providerName);
    
    if (!provider) {
      throw new Error(`Unknown AI provider: ${providerName}`);
    }

    if (!provider.stream) {
      throw new Error(`Provider ${providerName} does not support streaming`);
    }

    if (!provider.isConfigured(config)) {
      throw new Error(`Provider ${providerName} is not properly configured`);
    }

    try {
      yield* provider.stream(messages, config);
    } catch (error) {
      logger.error(`AI stream error (${providerName}):`, error);
      throw error;
    }
  }

  async testProvider(
    providerName: string,
    config: AIProviderConfig
  ): Promise<boolean> {
    const provider = this.getProvider(providerName);
    
    if (!provider) {
      return false;
    }

    if (provider.testConnection) {
      return provider.testConnection(config);
    }

    // Fall back to a simple chat test
    try {
      await provider.chat([{ role: 'user', content: 'Hi' }], config);
      return true;
    } catch {
      return false;
    }
  }
}

export const aiManager = new AIManager();

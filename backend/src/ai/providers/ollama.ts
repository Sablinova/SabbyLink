/**
 * Ollama AI Provider
 * Local/self-hosted LLM inference
 */

import type { AIProvider, AIMessage, AIResponse, AIStreamChunk, AIProviderConfig } from '../types';
import { log } from '@/utils/logger';

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaStreamChunk {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaProvider implements AIProvider {
  name = 'ollama';
  displayName = 'Ollama (Local)';
  models = ['llama3.2', 'llama3.1', 'mistral', 'codellama', 'phi3', 'gemma2', 'qwen2.5'];

  isConfigured(config: AIProviderConfig): boolean {
    // Ollama doesn't require an API key, just needs baseURL (defaults to localhost)
    return true;
  }

  private getBaseUrl(config: AIProviderConfig): string {
    return config.baseURL || 'http://localhost:11434';
  }

  private convertMessages(messages: AIMessage[], config: AIProviderConfig): OllamaMessage[] {
    const result: OllamaMessage[] = [];
    
    // Add system prompt if not present
    const hasSystem = messages.some(m => m.role === 'system');
    if (!hasSystem && config.systemPrompt) {
      result.push({ role: 'system', content: config.systemPrompt });
    }
    
    for (const m of messages) {
      result.push({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      });
    }
    
    return result;
  }

  async chat(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
    const baseUrl = this.getBaseUrl(config);
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model || 'llama3.2',
          messages: this.convertMessages(messages, config),
          stream: false,
          options: {
            num_predict: config.maxTokens || 4096,
            temperature: config.temperature ?? 0.7,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Ollama API error: ${response.status}`);
      }

      const data: OllamaResponse = await response.json();
      const content = data.message?.content || '';

      return {
        content,
        model: data.model,
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      log.error('Ollama chat error:', error);
      throw error;
    }
  }

  async *stream(messages: AIMessage[], config: AIProviderConfig): AsyncGenerator<AIStreamChunk> {
    const baseUrl = this.getBaseUrl(config);

    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model || 'llama3.2',
          messages: this.convertMessages(messages, config),
          stream: true,
          options: {
            num_predict: config.maxTokens || 4096,
            temperature: config.temperature ?? 0.7,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Ollama API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const chunk: OllamaStreamChunk = JSON.parse(line);
            const content = chunk.message?.content;
            
            if (content) {
              yield { content, done: false };
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      yield { content: '', done: true };
    } catch (error) {
      log.error('Ollama stream error:', error);
      throw error;
    }
  }

  async testConnection(config: AIProviderConfig): Promise<boolean> {
    try {
      const baseUrl = this.getBaseUrl(config);
      const response = await fetch(`${baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Additional Ollama-specific methods
  async listModels(config: AIProviderConfig): Promise<string[]> {
    try {
      const baseUrl = this.getBaseUrl(config);
      const response = await fetch(`${baseUrl}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        return data.models?.map((m: any) => m.name) || this.models;
      }
    } catch (error) {
      log.warn('Failed to fetch Ollama models:', error);
    }
    return this.models;
  }
}

export default OllamaProvider;

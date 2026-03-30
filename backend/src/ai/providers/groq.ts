/**
 * Groq AI Provider
 * Ultra-fast inference with Llama, Mixtral, Gemma models
 */

import type { AIProvider, AIMessage, AIResponse, AIStreamChunk, AIProviderConfig } from '../types';
import { log } from '@/utils/logger';

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface GroqStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

export class GroqProvider implements AIProvider {
  name = 'groq';
  displayName = 'Groq';
  models = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'llama-3.2-90b-vision-preview',
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
  ];
  
  private baseUrl = 'https://api.groq.com/openai/v1';

  isConfigured(config: AIProviderConfig): boolean {
    return !!config.apiKey;
  }

  private convertMessages(messages: AIMessage[], config: AIProviderConfig): GroqMessage[] {
    const result: GroqMessage[] = [];
    
    // Add system prompt if not present in messages
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
    if (!this.isConfigured(config)) {
      throw new Error('Groq API key not configured');
    }

    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || 'llama-3.3-70b-versatile',
          messages: this.convertMessages(messages, config),
          max_tokens: config.maxTokens || 8192,
          temperature: config.temperature ?? 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Groq API error: ${response.status}`);
      }

      const data: GroqResponse = await response.json();
      const content = data.choices[0]?.message?.content || '';

      return {
        content,
        model: data.model,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      log.error('Groq chat error:', error);
      throw error;
    }
  }

  async *stream(messages: AIMessage[], config: AIProviderConfig): AsyncGenerator<AIStreamChunk> {
    if (!this.isConfigured(config)) {
      throw new Error('Groq API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || 'llama-3.3-70b-versatile',
          messages: this.convertMessages(messages, config),
          max_tokens: config.maxTokens || 8192,
          temperature: config.temperature ?? 0.7,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Groq API error: ${response.status}`);
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
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const chunk: GroqStreamChunk = JSON.parse(data);
              const content = chunk.choices[0]?.delta?.content;
              
              if (content) {
                yield { content, done: false };
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      yield { content: '', done: true };
    } catch (error) {
      log.error('Groq stream error:', error);
      throw error;
    }
  }

  async testConnection(config: AIProviderConfig): Promise<boolean> {
    try {
      await this.chat([{ role: 'user', content: 'Hi' }], config);
      return true;
    } catch {
      return false;
    }
  }
}

export default GroqProvider;

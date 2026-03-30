/**
 * Anthropic Claude AI Provider
 * Supports Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
 */

import type { AIProvider, AIMessage, AIResponse, AIStreamChunk, AIProviderConfig } from '../types';
import { log } from '@/utils/logger';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class ClaudeProvider implements AIProvider {
  name = 'claude';
  displayName = 'Anthropic Claude';
  models = [
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229',
    'claude-3-haiku-20240307',
  ];
  
  private baseUrl = 'https://api.anthropic.com/v1';
  private apiVersion = '2023-06-01';

  isConfigured(config: AIProviderConfig): boolean {
    return !!config.apiKey;
  }

  private convertMessages(messages: AIMessage[]): { chatMessages: ClaudeMessage[]; systemPrompt: string | undefined } {
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages: ClaudeMessage[] = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }));

    return {
      chatMessages,
      systemPrompt: systemMessage?.content || config?.systemPrompt,
    };
  }

  async chat(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
    if (!this.isConfigured(config)) {
      throw new Error('Claude API key not configured');
    }

    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages: ClaudeMessage[] = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }));

    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey!,
          'anthropic-version': this.apiVersion,
        },
        body: JSON.stringify({
          model: config.model || 'claude-sonnet-4-20250514',
          max_tokens: config.maxTokens || 4096,
          temperature: config.temperature ?? 0.7,
          system: systemMessage?.content || config.systemPrompt || 'You are a helpful AI assistant.',
          messages: chatMessages,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Claude API error: ${response.status}`);
      }

      const data: ClaudeResponse = await response.json();
      const content = data.content[0]?.text || '';

      return {
        content,
        model: data.model,
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        },
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      log.error('Claude chat error:', error);
      throw error;
    }
  }

  async *stream(messages: AIMessage[], config: AIProviderConfig): AsyncGenerator<AIStreamChunk> {
    if (!this.isConfigured(config)) {
      throw new Error('Claude API key not configured');
    }

    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages: ClaudeMessage[] = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }));

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey!,
          'anthropic-version': this.apiVersion,
        },
        body: JSON.stringify({
          model: config.model || 'claude-sonnet-4-20250514',
          max_tokens: config.maxTokens || 4096,
          temperature: config.temperature ?? 0.7,
          system: systemMessage?.content || config.systemPrompt || 'You are a helpful AI assistant.',
          messages: chatMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Claude API error: ${response.status}`);
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
              const event = JSON.parse(data);
              
              if (event.type === 'content_block_delta' && event.delta?.text) {
                yield { content: event.delta.text, done: false };
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      yield { content: '', done: true };
    } catch (error) {
      log.error('Claude stream error:', error);
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

export default ClaudeProvider;

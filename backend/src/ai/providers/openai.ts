/**
 * OpenAI Provider Adapter
 * 
 * Supports OpenAI API and compatible endpoints
 */

import OpenAI from 'openai';
import type {
  AIProvider,
  AIMessage,
  AIResponse,
  AIStreamChunk,
  AIProviderConfig,
} from '../types';
import { logger } from '@/utils/logger';

export class OpenAIProvider implements AIProvider {
  name = 'openai';

  isConfigured(config: AIProviderConfig): boolean {
    return !!config.apiKey;
  }

  async chat(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
    if (!this.isConfigured(config)) {
      throw new Error('OpenAI API key not configured');
    }

    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL || 'https://api.openai.com/v1',
    });

    try {
      const response = await client.chat.completions.create({
        model: config.model || 'gpt-4-turbo-preview',
        messages: messages as any,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens,
        top_p: config.topP,
        frequency_penalty: config.frequencyPenalty,
        presence_penalty: config.presencePenalty,
        stop: config.stop,
      });

      return {
        content: response.choices[0]?.message?.content || '',
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      logger.error('OpenAI API error:', error);
      throw error;
    }
  }

  async *stream(
    messages: AIMessage[],
    config: AIProviderConfig
  ): AsyncGenerator<AIStreamChunk> {
    if (!this.isConfigured(config)) {
      throw new Error('OpenAI API key not configured');
    }

    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL || 'https://api.openai.com/v1',
    });

    try {
      const stream = await client.chat.completions.create({
        model: config.model || 'gpt-4-turbo-preview',
        messages: messages as any,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens,
        top_p: config.topP,
        frequency_penalty: config.frequencyPenalty,
        presence_penalty: config.presencePenalty,
        stop: config.stop,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          yield {
            content,
            done: false,
          };
        }
      }

      yield {
        content: '',
        done: true,
      };
    } catch (error) {
      logger.error('OpenAI stream error:', error);
      throw error;
    }
  }
}

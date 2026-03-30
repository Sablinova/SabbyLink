/**
 * Google Gemini AI Provider
 * Supports Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash
 */

import type { AIProvider, AIMessage, AIResponse, AIStreamChunk, AIProviderConfig } from '../types';
import { log } from '@/utils/logger';

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
    index: number;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GeminiProvider implements AIProvider {
  name = 'gemini';
  displayName = 'Google Gemini';
  models = [
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
  ];
  
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  isConfigured(config: AIProviderConfig): boolean {
    return !!config.apiKey;
  }

  private convertMessages(messages: AIMessage[], config: AIProviderConfig): { 
    contents: GeminiContent[]; 
    systemInstruction?: { parts: Array<{ text: string }> } 
  } {
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const contents: GeminiContent[] = chatMessages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const result: { contents: GeminiContent[]; systemInstruction?: { parts: Array<{ text: string }> } } = { contents };

    const systemPrompt = systemMessage?.content || config.systemPrompt;
    if (systemPrompt) {
      result.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    return result;
  }

  async chat(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
    if (!this.isConfigured(config)) {
      throw new Error('Gemini API key not configured');
    }

    const model = config.model || 'gemini-2.0-flash-exp';
    const { contents, systemInstruction } = this.convertMessages(messages, config);
    const startTime = Date.now();
    
    try {
      const response = await fetch(
        `${this.baseUrl}/models/${model}:generateContent?key=${config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
            systemInstruction,
            generationConfig: {
              temperature: config.temperature ?? 0.7,
              maxOutputTokens: config.maxTokens || 8192,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
      }

      const data: GeminiResponse = await response.json();
      const content = data.candidates[0]?.content?.parts[0]?.text || '';

      return {
        content,
        model,
        usage: data.usageMetadata ? {
          promptTokens: data.usageMetadata.promptTokenCount,
          completionTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount,
        } : undefined,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      log.error('Gemini chat error:', error);
      throw error;
    }
  }

  async *stream(messages: AIMessage[], config: AIProviderConfig): AsyncGenerator<AIStreamChunk> {
    if (!this.isConfigured(config)) {
      throw new Error('Gemini API key not configured');
    }

    const model = config.model || 'gemini-2.0-flash-exp';
    const { contents, systemInstruction } = this.convertMessages(messages, config);

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${model}:streamGenerateContent?key=${config.apiKey}&alt=sse`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
            systemInstruction,
            generationConfig: {
              temperature: config.temperature ?? 0.7,
              maxOutputTokens: config.maxTokens || 8192,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
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
              const parsed: GeminiResponse = JSON.parse(data);
              const text = parsed.candidates[0]?.content?.parts[0]?.text;
              
              if (text) {
                yield { content: text, done: false };
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      yield { content: '', done: true };
    } catch (error) {
      log.error('Gemini stream error:', error);
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

export default GeminiProvider;

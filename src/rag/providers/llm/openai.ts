/**
 * OpenAI LLM Provider
 * Implements ILLMProvider using OpenAI REST API
 */

import { ILLMProvider } from '../../core/interfaces';

export class OpenAILLMProvider implements ILLMProvider {
  name = 'OpenAI';

  constructor(private apiKey: string, public model: string) {}

  async generate(
    prompt: string,
    options?: { maxTokens?: number; temperature?: number; topP?: number }
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY not set');
    }

    try {
      // Lazy import to avoid dependency
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey: this.apiKey });

      const response = await client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.maxTokens || 1024,
        temperature: options?.temperature || 0.7,
        top_p: options?.topP || 0.9,
      });

      return response.choices[0]?.message?.content || '';
    } catch (err) {
      console.error('❌ OpenAI generation failed:', err);
      return '// TODO: AI generation failed, implement manually';
    }
  }

  async countTokens(text: string): Promise<number> {
    // Rough estimate: ~1.3 tokens per word for English
    const words = text.split(/\s+/).length;
    return Math.ceil(words * 1.3);
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey: this.apiKey });

      // Try to list models to verify API key
      await client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}


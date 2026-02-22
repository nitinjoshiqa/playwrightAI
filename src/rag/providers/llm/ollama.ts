/**
 * Ollama LLM Provider
 * Implements ILLMProvider using Ollama HTTP API
 */

import { ILLMProvider } from '../../core/interfaces';
import axios from 'axios';

export class OllamaLLMProvider implements ILLMProvider {
  name = 'Ollama';

  constructor(private endpoint: string, public model: string) {}

  async generate(
    prompt: string,
    options?: { maxTokens?: number; temperature?: number; topP?: number }
  ): Promise<string> {
    try {
      const response = await axios.post(
        `${this.endpoint}/api/generate`,
        {
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            num_predict: options?.maxTokens || 512,
            temperature: options?.temperature || 0.7,
            top_p: options?.topP || 0.9,
          },
        },
        { timeout: 60000 }
      );

      return response.data.response || '';
    } catch (err) {
      console.error('❌ Ollama generation failed:', err);
      return '// TODO: AI generation failed, implement manually';
    }
  }

  async countTokens(text: string): Promise<number> {
    // Ollama doesn't provide token counting, so estimate based on words
    const words = text.split(/\s+/).length;
    return Math.ceil(words * 1.3); // Rough estimate: ~1.3 tokens per word
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.endpoint}/api/tags`, { timeout: 5000 });
      const models = response.data.models || [];
      return models.some((m: any) => m.name === this.model);
    } catch {
      return false;
    }
  }
}


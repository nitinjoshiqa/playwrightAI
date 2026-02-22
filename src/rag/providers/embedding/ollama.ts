/**
 * Ollama Embedding Provider
 * Implements IEmbeddingProvider using Ollama HTTP API
 */

import { IEmbeddingProvider } from '../../core/interfaces';
import axios from 'axios';

export class OllamaEmbeddingProvider implements IEmbeddingProvider {
  name = 'Ollama';
  dimensionality = 384; // nomic-embed-text default

  constructor(private endpoint: string, private model: string) {}

  async embed(text: string): Promise<number[]> {
    try {
      const response = await axios.post(
        `${this.endpoint}/api/embeddings`,
        {
          model: this.model,
          prompt: text,
        },
        { timeout: 30000 }
      );
      return response.data.embedding || [];
    } catch (err) {
      console.error('❌ Ollama embedding failed:', err);
      return new Array(this.dimensionality).fill(0);
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results = await Promise.all(texts.map((t) => this.embed(t)));
    return results;
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


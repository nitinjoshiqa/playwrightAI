/**
 * OpenAI Embedding Provider
 * Implements IEmbeddingProvider using OpenAI REST API
 */

import { IEmbeddingProvider } from '../../core/interfaces';
import axios from 'axios';

export class OpenAIEmbeddingProvider implements IEmbeddingProvider {
  name = 'OpenAI';
  dimensionality = 1536; // text-embedding-3-small default

  constructor(private apiKey: string, private model: string) {}

  async embed(text: string): Promise<number[]> {
    if (!this.apiKey) {
      console.error('❌ OPENAI_API_KEY not set');
      return new Array(this.dimensionality).fill(0);
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          model: this.model,
          input: text,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
      return response.data.data[0]?.embedding || [];
    } catch (err) {
      console.error('❌ OpenAI embedding failed:', err);
      return new Array(this.dimensionality).fill(0);
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      return texts.map(() => new Array(this.dimensionality).fill(0));
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          model: this.model,
          input: texts,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      // Sort by index to ensure correct order
      return response.data.data
        .sort((a: any, b: any) => a.index - b.index)
        .map((item: any) => item.embedding);
    } catch (err) {
      console.error('❌ OpenAI batch embedding failed:', err);
      return texts.map(() => new Array(this.dimensionality).fill(0));
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      // Test with a small text
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          model: this.model,
          input: 'test',
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      );
      return !!response.data.data;
    } catch {
      return false;
    }
  }
}


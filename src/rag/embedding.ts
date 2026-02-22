import { ragConfig } from './ragConfig';
import axios from 'axios';

/**
 * Call Ollama embedding API
 */
async function embedWithOllama(text: string): Promise<number[]> {
  try {
    const response = await axios.post(
      `${ragConfig.ollamaEndpoint}/api/embeddings`,
      {
        model: ragConfig.ollamaModel,
        prompt: text,
      },
      { timeout: 5000 } // Reduced timeout for faster fallback
    );
    return response.data.embedding || [];
  } catch (err) {
    // Silently fall back to zero vector
    return new Array(384).fill(0);
  }
}

/**
 * Call OpenAI embedding API
 */
async function embedWithOpenAI(text: string): Promise<number[]> {
  if (!ragConfig.openaiApiKey) {
    return new Array(384).fill(0);
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        model: 'text-embedding-3-small',
        input: text,
      },
      {
        headers: {
          Authorization: `Bearer ${ragConfig.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000, // Reduced timeout
      }
    );
    return response.data.data[0]?.embedding || [];
  } catch (err) {
    // Silently fall back to zero vector
    return new Array(384).fill(0);
  }
}

/**
 * Embed text using the configured provider
 */
export async function embedText(text: string): Promise<number[]> {
  if (!ragConfig.enabled) {
    console.warn('RAG disabled; returning zero vector');
    return new Array(384).fill(0);
  }

  switch (ragConfig.embeddingProvider) {
    case 'ollama':
      return embedWithOllama(text);
    case 'openai':
      return embedWithOpenAI(text);
    default:
      console.warn('Unknown embedding provider; returning zero vector');
      return new Array(384).fill(0);
  }
}

/**
 * Batch embed multiple texts
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results = await Promise.all(texts.map((t) => embedText(t)));
  return results;
}

export default { embedText, embedBatch };

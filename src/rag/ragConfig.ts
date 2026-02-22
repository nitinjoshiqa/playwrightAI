import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface RagConfig {
  enabled: boolean;
  llmProvider: 'ollama' | 'openai';
  embeddingProvider: 'ollama' | 'openai';
  ollamaEndpoint: string;
  ollamaModel: string;
  openaiApiKey?: string;
  openaiModel: string;
  indexPath: string;
  chunkSize: number;
  similarityThreshold: number;
}

export function loadRagConfig(): RagConfig {
  const config: RagConfig = {
    enabled: process.env.RAG_ENABLED !== 'false',
    llmProvider: (process.env.RAG_LLM_PROVIDER as any) || 'ollama',
    embeddingProvider: (process.env.RAG_EMBEDDING_PROVIDER as any) || 'ollama',
    ollamaEndpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama2',
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    indexPath: process.env.RAG_INDEX_PATH || 'rag/data/index.json',
    chunkSize: parseInt(process.env.RAG_CHUNK_SIZE || '500', 10),
    similarityThreshold: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.75'),
  };

  // Ensure index directory exists
  const indexDir = path.dirname(config.indexPath);
  if (!fs.existsSync(indexDir)) {
    fs.mkdirSync(indexDir, { recursive: true });
  }

  return config;
}

export const ragConfig = loadRagConfig();

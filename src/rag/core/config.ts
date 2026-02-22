/**
 * RAG Plugin Configuration Interface
 */

import {
  IEmbeddingProvider,
  ILLMProvider,
  IVectorStore,
  IPromptRenderer,
  IRetriever,
} from './interfaces';

/**
 * Plugin Configuration
 * Specifies which providers to use and their configuration
 */
export interface PluginConfig {
  // Mode: embedded (in-process) or service (remote REST)
  mode: 'embedded' | 'service';

  // Service endpoint (if mode='service')
  serviceEndpoint?: string;

  // Enable/disable RAG entirely
  enabled: boolean;

  // Embedding configuration
  embedding: {
    provider: 'ollama' | 'openai' | 'custom';
    endpoint?: string;
    model?: string;
    apiKey?: string;
  };

  // LLM configuration
  llm: {
    provider: 'ollama' | 'openai' | 'custom';
    endpoint?: string;
    model?: string;
    apiKey?: string;
  };

  // Vector store configuration
  vectorStore: {
    provider: 'sqlite' | 'chromadb' | 'custom';
    path?: string; // For file-based stores
    endpoint?: string; // For remote stores
  };

  // Prompt renderer configuration
  promptRenderer: {
    type: 'handlebars' | 'simple';
  };

  // RAG-specific settings
  similarity: {
    threshold: number;
    topK: number;
  };

  // Paths to requirement and prompt files
  paths: {
    requirementsDir: string;
    promptsDir: string;
    indexDir: string;
  };

  // Feature flags for each operation
  features: {
    testGeneration: boolean;
    testSelection: boolean;
    failureAnalysis: boolean;
    traceability: boolean;
    knowledge: boolean;
  };
}

/**
 * Default plugin configuration
 */
export const DEFAULT_PLUGIN_CONFIG: PluginConfig = {
  mode: 'embedded',
  enabled: true,

  embedding: {
    provider: 'ollama',
    endpoint: 'http://localhost:11434',
    model: 'nomic-embed-text',
  },

  llm: {
    provider: 'ollama',
    endpoint: 'http://localhost:11434',
    model: 'llama2',
  },

  vectorStore: {
    provider: 'sqlite',
    path: 'rag/data/index.db',
  },

  promptRenderer: {
    type: 'simple',
  },

  similarity: {
    threshold: 0.75,
    topK: 5,
  },

  paths: {
    requirementsDir: 'rag/requirements',
    promptsDir: 'rag/prompts',
    indexDir: 'rag/data',
  },

  features: {
    testGeneration: true,
    testSelection: true,
    failureAnalysis: true,
    traceability: true,
    knowledge: true,
  },
};

/**
 * Configuration loaded from environment
 */
export function loadPluginConfigFromEnv(): Partial<PluginConfig> {
  return {
    mode: (process.env.RAG_MODE as any) || 'embedded',
    enabled: process.env.RAG_ENABLED !== 'false',
    embedding: {
      provider: (process.env.RAG_EMBEDDING_PROVIDER as any) || 'ollama',
      endpoint: process.env.OLLAMA_ENDPOINT,
      model: process.env.OLLAMA_MODEL,
      apiKey: process.env.OPENAI_API_KEY,
    },
    llm: {
      provider: (process.env.RAG_LLM_PROVIDER as any) || 'ollama',
      endpoint: process.env.OLLAMA_ENDPOINT,
      model: process.env.OLLAMA_MODEL,
      apiKey: process.env.OPENAI_API_KEY,
    },
    vectorStore: {
      provider: (process.env.RAG_VECTOR_STORE as any) || 'sqlite',
      path: process.env.RAG_INDEX_PATH,
    },
    similarity: {
      threshold: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.75'),
      topK: parseInt(process.env.RAG_TOP_K || '5', 10),
    },
  };
}


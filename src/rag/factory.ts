/**
 * RAG Plugin Factory
 * Creates plugin instances with appropriate providers based on configuration
 */

import {
  PluginConfig,
  DEFAULT_PLUGIN_CONFIG,
  loadPluginConfigFromEnv,
  IEmbeddingProvider,
  ILLMProvider,
  IVectorStore,
  IPromptRenderer,
  IRetriever,
  IRAGPlugin,
} from './core';
import { RAGPluginImpl } from './plugin-impl';

/**
 * Create a RAG plugin instance
 */
export async function createRagPlugin(
  config?: Partial<PluginConfig>
): Promise<IRAGPlugin | null> {
  // Merge default config with provided config and environment
  const finalConfig: PluginConfig = {
    ...DEFAULT_PLUGIN_CONFIG,
    ...loadPluginConfigFromEnv(),
    ...config,
  };

  if (!finalConfig.enabled) {
    console.log('ℹ️  RAG plugin is disabled (RAG_ENABLED=false)');
    return null;
  }

  console.log(`🔌 Creating RAG plugin (mode: ${finalConfig.mode})`);

  try {
    // Create embedding provider
    const embeddingProvider = await createEmbeddingProvider(finalConfig);
    if (!embeddingProvider) {
      throw new Error('Failed to create embedding provider');
    }

    // Create LLM provider
    const llmProvider = await createLLMProvider(finalConfig);
    if (!llmProvider) {
      throw new Error('Failed to create LLM provider');
    }

    // Create vector store
    const vectorStore = await createVectorStore(finalConfig);
    if (!vectorStore) {
      throw new Error('Failed to create vector store');
    }

    // Create prompt renderer
    const promptRenderer = await createPromptRenderer(finalConfig);

    // Create retriever
    const retriever = await createRetriever(vectorStore, embeddingProvider, finalConfig);

    // Create plugin instance
    const plugin = new RAGPluginImpl(
      finalConfig,
      embeddingProvider,
      llmProvider,
      vectorStore,
      promptRenderer,
      retriever
    );

    await plugin.init();
    console.log('✅ RAG plugin initialized successfully');
    return plugin;
  } catch (err) {
    console.error('❌ Failed to create RAG plugin:', err);
    return null;
  }
}

/**
 * Create embedding provider based on config
 */
async function createEmbeddingProvider(config: PluginConfig): Promise<IEmbeddingProvider | null> {
  const { provider, endpoint, model, apiKey } = config.embedding;

  switch (provider) {
    case 'ollama': {
      const { OllamaEmbeddingProvider } = await import('./providers/embedding/ollama');
      return new OllamaEmbeddingProvider(endpoint || 'http://localhost:11434', model || 'nomic-embed-text');
    }

    case 'openai': {
      const { OpenAIEmbeddingProvider } = await import('./providers/embedding/openai');
      return new OpenAIEmbeddingProvider(apiKey || process.env.OPENAI_API_KEY, model || 'text-embedding-3-small');
    }

    case 'custom': {
      console.warn('⚠️  Custom embedding provider not yet implemented');
      return null;
    }

    default:
      console.warn(`⚠️  Unknown embedding provider: ${provider}`);
      return null;
  }
}

/**
 * Create LLM provider based on config
 */
async function createLLMProvider(config: PluginConfig): Promise<ILLMProvider | null> {
  const { provider, endpoint, model, apiKey } = config.llm;

  switch (provider) {
    case 'ollama': {
      const { OllamaLLMProvider } = await import('./providers/llm/ollama');
      return new OllamaLLMProvider(endpoint || 'http://localhost:11434', model || 'llama2');
    }

    case 'openai': {
      const { OpenAILLMProvider } = await import('./providers/llm/openai');
      return new OpenAILLMProvider(apiKey || process.env.OPENAI_API_KEY, model || 'gpt-3.5-turbo');
    }

    case 'custom': {
      console.warn('⚠️  Custom LLM provider not yet implemented');
      return null;
    }

    default:
      console.warn(`⚠️  Unknown LLM provider: ${provider}`);
      return null;
  }
}

/**
 * Create vector store based on config
 */
async function createVectorStore(config: PluginConfig): Promise<IVectorStore | null> {
  const { provider, path, endpoint } = config.vectorStore;

  switch (provider) {
    case 'sqlite': {
      const { SQLiteVectorStore } = await import('./providers/vectorstore/sqlite');
      return new SQLiteVectorStore(path || 'rag/data/index.db');
    }

    case 'chromadb': {
      console.warn('⚠️  ChromaDB vector store not yet implemented');
      return null;
    }

    case 'custom': {
      console.warn('⚠️  Custom vector store not yet implemented');
      return null;
    }

    default:
      console.warn(`⚠️  Unknown vector store provider: ${provider}`);
      return null;
  }
}

/**
 * Create prompt renderer based on config
 */
async function createPromptRenderer(config: PluginConfig): Promise<IPromptRenderer> {
  const { type } = config.promptRenderer;

  switch (type) {
    case 'handlebars': {
      const { HandlebarsRenderer } = await import('./providers/prompt/handlebars');
      return new HandlebarsRenderer();
    }

    case 'simple':
    default: {
      const { SimpleRenderer } = await import('./providers/prompt/simple');
      return new SimpleRenderer();
    }
  }
}

/**
 * Create retriever based on config
 */
async function createRetriever(
  vectorStore: IVectorStore,
  embeddingProvider: IEmbeddingProvider,
  config: PluginConfig
): Promise<IRetriever> {
  const { SemanticRetriever } = await import('./providers/retriever/semantic');
  return new SemanticRetriever(vectorStore, embeddingProvider, {
    topK: config.similarity.topK,
    threshold: config.similarity.threshold,
  });
}

export default { createRagPlugin };


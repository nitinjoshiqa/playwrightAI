/**
 * Core Provider Interfaces for RAG Plugin System
 * These define the contracts that providers must implement
 */

import { IndexRecord, SearchResult } from './types';

/**
 * Embedding Provider Interface
 * Converts text to high-dimensional vectors
 */
export interface IEmbeddingProvider {
  name: string;
  dimensionality: number;

  /**
   * Embed a single text
   */
  embed(text: string): Promise<number[]>;

  /**
   * Embed multiple texts in batch
   */
  embedBatch(texts: string[]): Promise<number[][]>;

  /**
   * Check if provider is available (e.g., can reach API endpoint)
   */
  isAvailable(): Promise<boolean>;
}

/**
 * LLM Provider Interface
 * Generates text based on prompts
 */
export interface ILLMProvider {
  name: string;
  model: string;

  /**
   * Generate text from prompt
   */
  generate(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
    }
  ): Promise<string>;

  /**
   * Estimate token count for text
   */
  countTokens(text: string): Promise<number>;

  /**
   * Check if provider is available
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Vector Store Interface
 * Persistent storage for embeddings and records
 */
export interface IVectorStore {
  name: string;

  /**
   * Initialize database/connection
   */
  init(): Promise<void>;

  /**
   * Add or update a record
   */
  addRecord(record: IndexRecord): Promise<void>;

  /**
   * Get record by ID
   */
  getRecord(id: string): Promise<IndexRecord | null>;

  /**
   * Find records by exact text match
   */
  findByText(text: string): Promise<IndexRecord[]>;

  /**
   * Get all records
   */
  getAllRecords(): Promise<IndexRecord[]>;

  /**
   * Get record count
   */
  getRecordCount(): Promise<number>;

  /**
   * Search by vector similarity
   */
  search(
    queryEmbedding: number[],
    topK?: number,
    threshold?: number
  ): Promise<SearchResult<IndexRecord>[]>;

  /**
   * Delete record by ID
   */
  deleteRecord(id: string): Promise<void>;

  /**
   * Clear all records
   */
  clearAll(): Promise<void>;

  /**
   * Close connection
   */
  close(): Promise<void>;
}

/**
 * Prompt Template Renderer Interface
 * Renders templates with variable interpolation
 */
export interface IPromptRenderer {
  name: string;

  /**
   * Render template with values
   * Supports {{variable}} or other formats depending on implementation
   */
  render(template: string, values: Record<string, string>): string;

  /**
   * Validate template syntax
   */
  validate(template: string): { valid: boolean; error?: string };
}

/**
 * Retriever Interface
 * Semantic search with ranking
 */
export interface IRetriever {
  name: string;

  /**
   * Retrieve top-K similar records
   */
  retrieve(
    query: string,
    topK?: number
  ): Promise<SearchResult<IndexRecord>[]>;

  /**
   * Retrieve by vector with ranking
   */
  retrieveByVector(
    queryEmbedding: number[],
    topK?: number
  ): Promise<SearchResult<IndexRecord>[]>;

  /**
   * Rerank results for better relevance
   */
  rerank(
    query: string,
    results: SearchResult<IndexRecord>[]
  ): Promise<SearchResult<IndexRecord>[]>;
}


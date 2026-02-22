/**
 * Main RAG Plugin Interface
 * Exposes the 5 core operations: Generate, Select, Analyze, Trace, Knowledge
 */

import {
  IndexRecord,
  FailureAnalysis,
  TestTrace,
  GeneratedTest,
  TestPattern,
  RAGStats,
  CodeChange,
  SearchResult,
} from './types';

/**
 * Main RAG Plugin Interface
 * This is the core contract between the framework and RAG subsystem
 */
export interface IRAGPlugin {
  /**
   * Initialize the plugin (connect to vector store, verify providers)
   */
  init(): Promise<void>;

  /**
   * OP 1: TEST GENERATION
   * Generate a test from an Acceptance Criterion
   */
  generateTest(ac: string, context?: Record<string, string>): Promise<GeneratedTest>;

  /**
   * Index requirements from files
   */
  indexRequirements(dir?: string): Promise<number>;

  /**
   * OP 2: SMART TEST SELECTION
   * Find tests related to a query (change, AC, etc.)
   */
  findRelatedTests(query: string, limit?: number): Promise<string[]>;

  /**
   * Find tests affected by a code change
   */
  findAffectedTests(change: CodeChange): Promise<string[]>;

  /**
   * OP 3: FAILURE ANALYSIS
   * Analyze a test failure and suggest fixes
   */
  analyzeFailure(errorLog: string): Promise<FailureAnalysis>;

  /**
   * Find similar past failures
   */
  findSimilarFailures(errorLog: string, limit?: number): Promise<FailureAnalysis[]>;

  /**
   * Estimate wait time for a selector based on similar elements
   */
  estimateWaitTime(selector: string): Promise<number>;

  /**
   * OP 4: REQUIREMENTS TRACEABILITY
   * Determine which AC a test code satisfies
   */
  getTraceable(testCode: string): Promise<TestTrace>;

  /**
   * Generate traceability matrix (AC -> Test -> Code)
   */
  generateTraceMatrix(): Promise<Map<string, string[]>>;

  /**
   * OP 5: KNOWLEDGE MANAGEMENT
   * Find similar tests to learn from
   */
  findSimilarTests(query: string, limit?: number): Promise<TestPattern[]>;

  /**
   * Suggest test patterns for a task
   */
  suggestTestPatterns(task: string, limit?: number): Promise<TestPattern[]>;

  /**
   * Get framework context (for prompts)
   */
  getFrameworkContext(): string;

  /**
   * Get statistics about the RAG system
   */
  getStats(): Promise<RAGStats>;

  /**
   * Search the index directly
   */
  search(
    query: string,
    topK?: number,
    threshold?: number
  ): Promise<SearchResult<IndexRecord>[]>;

  /**
   * Add a custom record to the index
   */
  addRecord(record: IndexRecord): Promise<void>;

  /**
   * Close connections and cleanup
   */
  close(): Promise<void>;
}


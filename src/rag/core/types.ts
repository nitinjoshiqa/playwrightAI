/**
 * Shared types for RAG Plugin System
 */

/**
 * Indexed record (Acceptance Criterion with embedding)
 */
export interface IndexRecord {
  id: string;
  text: string;
  embedding: number[];
  sourceFile: string;
  metadata: {
    created: string;
    author?: string;
    type: 'ac' | 'test' | 'flow' | 'requirement' | 'pattern';
  };
}

/**
 * Test metadata and traceability
 */
export interface TestTrace {
  testName: string;
  testPath: string;
  testCode: string;
  relatedACs: IndexRecord[];
  confidence: number;
}

/**
 * Failure analysis result
 */
export interface FailureAnalysis {
  errorMessage: string;
  similarFailures: Array<{
    testName: string;
    cause: string;
    rootCause?: string;
    fixedBy?: string;
  }>;
  suggestion: string;
  retry: boolean;
  waitMs?: number;
}

/**
 * Test pattern (for knowledge management)
 */
export interface TestPattern {
  name: string;
  description: string;
  code: string;
  usageCount: number;
  examples: string[];
}

/**
 * Test generation result
 */
export interface GeneratedTest {
  testCode: string;
  acId: string;
  acText: string;
  confidence: number;
  reasoning: string;
}

/**
 * Retrieval result with score
 */
export interface SearchResult<T = IndexRecord> {
  record: T;
  score: number;
}

/**
 * Code change for impact analysis
 */
export interface CodeChange {
  filePath: string;
  before: string;
  after: string;
  type: 'modified' | 'added' | 'deleted';
}

/**
 * Statistics about RAG system
 */
export interface RAGStats {
  totalRecords: number;
  embeddingModel: string;
  vectorStore: string;
  llmProvider: string;
  indexedACs: number;
  indexedTests: number;
  lastIndexed: string;
}


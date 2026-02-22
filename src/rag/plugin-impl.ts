/**
 * RAG Plugin Implementation
 * Main class that implements IRAGPlugin interface
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  IRAGPlugin,
  PluginConfig,
  IEmbeddingProvider,
  ILLMProvider,
  IVectorStore,
  IPromptRenderer,
  IRetriever,
  IndexRecord,
  FailureAnalysis,
  TestTrace,
  GeneratedTest,
  TestPattern,
  RAGStats,
  CodeChange,
  SearchResult,
} from './core';
import { loadAndInterpolate } from './promptLoader';

export class RAGPluginImpl implements IRAGPlugin {
  private initialized = false;

  constructor(
    private config: PluginConfig,
    private embeddingProvider: IEmbeddingProvider,
    private llmProvider: ILLMProvider,
    private vectorStore: IVectorStore,
    private promptRenderer: IPromptRenderer,
    private retriever: IRetriever
  ) {}

  async init(): Promise<void> {
    if (this.initialized) return;

    console.log('🔧 Initializing RAG plugin...');
    await this.vectorStore.init();
    this.initialized = true;

    // Verify providers are available
    const embeddingOk = await this.embeddingProvider.isAvailable();
    const llmOk = await this.llmProvider.isAvailable();

    if (!embeddingOk) console.warn('⚠️  Embedding provider not available');
    if (!llmOk) console.warn('⚠️  LLM provider not available');
  }

  /**
   * OP 1: TEST GENERATION
   */
  async generateTest(ac: string, context?: Record<string, string>): Promise<GeneratedTest> {
    console.log(`🧪 Generating test for AC: ${ac.substring(0, 50)}...`);

    // Determine template based on AC keywords
    let templateName = 'shared/default';
    if (ac.toLowerCase().includes('login') || ac.toLowerCase().includes('auth')) {
      templateName = 'login/user_flow';
    } else if (ac.toLowerCase().includes('checkout') || ac.toLowerCase().includes('order')) {
      templateName = 'checkout/order_flow';
    }

    // Search for similar ACs
    const queryEmbedding = await this.embeddingProvider.embed(ac);
    const similarRecords = await this.retriever.retrieveByVector(queryEmbedding, 3);
    const contextText = similarRecords
      .map((r) => `- ${r.record.text} (confidence: ${(r.score * 100).toFixed(0)}%)`)
      .join('\n');

    // Load and interpolate prompt
    const prompt = loadAndInterpolate(templateName, {
      ac_text: ac,
      framework_context: this.getFrameworkContext(),
      similar_tests: contextText || '(no similar tests found)',
    });

    // Generate test code via LLM
    const testCode = await this.llmProvider.generate(prompt, {
      maxTokens: 1024,
      temperature: 0.7,
    });

    return {
      testCode,
      acId: `ac-${Date.now()}`,
      acText: ac,
      confidence: similarRecords[0]?.score || 0,
      reasoning: `Generated using template ${templateName} with ${similarRecords.length} similar references`,
    };
  }

  async indexRequirements(dir?: string): Promise<number> {
    const requirementsDir = dir || this.config.paths.requirementsDir;

    if (!fs.existsSync(requirementsDir)) {
      console.warn(`⚠️  Requirements directory not found: ${requirementsDir}`);
      return 0;
    }

    const files = fs
      .readdirSync(requirementsDir)
      .filter((f) => f.endsWith('.md') || f.endsWith('.txt'));

    let totalIndexed = 0;

    for (const file of files) {
      const filePath = path.join(requirementsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const acs = this.parseRequirements(content);

      console.log(`📄 Indexing ${file} (${acs.length} ACs)`);

      for (let i = 0; i < acs.length; i++) {
        const ac = acs[i];
        const id = `${file}-ac-${i + 1}`;

        // Check for duplicates
        const existing = await this.vectorStore.findByText(ac);
        if (existing.length > 0) {
          console.log(`   ⚠️  Duplicate, skipping`);
          continue;
        }

        // Embed and store
        const embedding = await this.embeddingProvider.embed(ac);
        await this.vectorStore.addRecord({
          id,
          text: ac,
          embedding,
          sourceFile: file,
          metadata: {
            created: new Date().toISOString(),
            type: 'ac',
          },
        });

        totalIndexed++;

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Indexed ${totalIndexed} ACs`);
    return totalIndexed;
  }

  /**
   * OP 2: SMART TEST SELECTION
   */
  async findRelatedTests(query: string, limit: number = 10): Promise<string[]> {
    const results = await this.search(query, limit);
    // This would be enhanced to return actual test file names
    // For now, return the AC texts as placeholder
    return results.map((r) => r.record.text);
  }

  async findAffectedTests(change: CodeChange): Promise<string[]> {
    // Embed the code change
    const changeText = `${change.before}\n---\n${change.after}`;
    return this.findRelatedTests(changeText);
  }

  /**
   * OP 3: FAILURE ANALYSIS
   */
  async analyzeFailure(errorLog: string): Promise<FailureAnalysis> {
    const similarFailures = await this.findSimilarFailures(errorLog, 3);

    // Call LLM to analyze
    const analysisPrompt = `
Error Log:
${errorLog}

Similar Past Failures:
${similarFailures.map((f) => f.suggestion).join('\n')}

Based on this error and similar failures, suggest:
1. What is the likely root cause?
2. How should this be fixed?
3. Should we retry?
4. If retry, recommended wait time in ms?

Format as JSON: { "cause": "...", "suggestion": "...", "retry": true/false, "waitMs": 1000 }
`;

    const response = await this.llmProvider.generate(analysisPrompt);

    try {
      const parsed = JSON.parse(response);
      return {
        errorMessage: errorLog,
        similarFailures: similarFailures.map((f) => ({
          testName: '',
          cause: f.suggestion,
        })),
        ...parsed,
      };
    } catch {
      return {
        errorMessage: errorLog,
        similarFailures: similarFailures.map((f) => ({
          testName: '',
          cause: f.suggestion,
        })),
        suggestion: response,
        retry: false,
      };
    }
  }

  async findSimilarFailures(errorLog: string, limit: number = 5): Promise<FailureAnalysis[]> {
    // Embed the error and search
    const embedding = await this.embeddingProvider.embed(errorLog);
    const results = await this.retriever.retrieveByVector(embedding, limit);

    // For now, return formatted analysis results
    return results.map((r) => ({
      errorMessage: r.record.text,
      similarFailures: [],
      suggestion: `Similar to: ${r.record.sourceFile}`,
      retry: true,
    }));
  }

  async estimateWaitTime(selector: string): Promise<number> {
    // Query LLM for estimate based on selector complexity
    const prompt = `
CSS Selector: ${selector}

Based on common web element waits:
- Simple selectors (button, input): 3000ms
- Complex selectors (nested, dynamic): 5000ms
- API-dependent elements: 8000ms

Estimate reasonable wait time in ms for this selector. Return only a number.
`;

    const response = await this.llmProvider.generate(prompt);
    const waitTime = parseInt(response, 10);
    return isNaN(waitTime) ? 5000 : waitTime;
  }

  /**
   * OP 4: REQUIREMENTS TRACEABILITY
   */
  async getTraceable(testCode: string): Promise<TestTrace> {
    // Embed test code and search for related ACs
    const embedding = await this.embeddingProvider.embed(testCode);
    const relatedACs = await this.retriever.retrieveByVector(embedding, 3);

    // Extract test name from code
    const testNameMatch = testCode.match(/test\(['"`]([^'"`]+)['"` ]/);
    const testName = testNameMatch?.[1] || 'unknown-test';

    return {
      testName,
      testPath: 'tests/*.spec.ts',
      testCode,
      relatedACs: relatedACs.map((r) => r.record),
      confidence: relatedACs[0]?.score || 0,
    };
  }

  async generateTraceMatrix(): Promise<Map<string, string[]>> {
    const matrix = new Map<string, string[]>();

    // Get all records
    const records = await this.vectorStore.getAllRecords();

    for (const record of records) {
      if (record.metadata.type === 'ac') {
        const key = `${record.sourceFile}: ${record.text.substring(0, 50)}...`;
        matrix.set(key, []); // Placeholder for tests
      }
    }

    return matrix;
  }

  /**
   * OP 5: KNOWLEDGE MANAGEMENT
   */
  async findSimilarTests(query: string, limit: number = 5): Promise<TestPattern[]> {
    const results = await this.search(query, limit);

    return results.map((r, idx) => ({
      name: `Pattern ${idx + 1}`,
      description: r.record.text.substring(0, 100),
      code: `// See ${r.record.sourceFile}`,
      usageCount: 1,
      examples: [r.record.text],
    }));
  }

  async suggestTestPatterns(task: string, limit: number = 5): Promise<TestPattern[]> {
    const prompt = `
Task: ${task}

Suggest ${limit} common test patterns for this task. Include:
1. Pattern name
2. Description
3. Code example
4. When to use

Format as JSON array of objects with fields: name, description, code, note
`;

    const response = await this.llmProvider.generate(prompt);

    try {
      const patterns = JSON.parse(response);
      return patterns.map((p: any) => ({
        name: p.name,
        description: p.description,
        code: p.code,
        usageCount: 0,
        examples: [p.note],
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get framework context string
   */
  getFrameworkContext(): string {
    return `
Playwright + TypeScript Framework with layers:
- Pages: Locator registry (pages.login, pages.inventory, etc.)
- Core: ElementActions wrapper (click, type, getText, assertText, waitForVisible)
- Flows: Business flows (loginFlow, addItemToCartFlow, checkoutFlow, completeOrderFlow)
- Fixtures: Playwright test injection (test, expect, { actions, pages })
- Tests: Spec files using flows and fixtures

Rules:
1. Always import from fixtures, not directly from Playwright
2. Use flows for business logic; keep tests thin
3. Never hardcode selectors in tests; use pages registry
4. Each test should verify one feature/AC
5. Use preconditions for test setup (userLoggedIn, userHasItemInCart)
`;
  }

  /**
   * Search the index
   */
  async search(
    query: string,
    topK: number = 5,
    threshold?: number
  ): Promise<SearchResult<IndexRecord>[]> {
    const embedding = await this.embeddingProvider.embed(query);
    return this.retriever.retrieveByVector(embedding, topK);
  }

  /**
   * Add record to index
   */
  async addRecord(record: IndexRecord): Promise<void> {
    await this.vectorStore.addRecord(record);
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<RAGStats> {
    const recordCount = await this.vectorStore.getRecordCount();

    return {
      totalRecords: recordCount,
      embeddingModel: this.embeddingProvider.name,
      vectorStore: this.vectorStore.name,
      llmProvider: this.llmProvider.name,
      indexedACs: recordCount,
      indexedTests: 0,
      lastIndexed: new Date().toISOString(),
    };
  }

  /**
   * Parse requirements from markdown
   */
  private parseRequirements(content: string): string[] {
    const lines = content.split(/\r?\n/);
    const acs: string[] = [];
    let currentAc = '';

    for (const line of lines) {
      if (/^\s*[-*]\s+/.test(line)) {
        if (currentAc.trim()) {
          acs.push(currentAc.trim());
        }
        currentAc = line.replace(/^\s*[-*]\s+/, '').trim();
      } else if (line.trim() && currentAc) {
        currentAc += ' ' + line.trim();
      }
    }

    if (currentAc.trim()) {
      acs.push(currentAc.trim());
    }

    return acs;
  }

  /**
   * Cleanup
   */
  async close(): Promise<void> {
    await this.vectorStore.close();
  }
}


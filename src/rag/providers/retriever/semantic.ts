/**
 * Semantic Retriever
 * Implements IRetriever with vector similarity search and optional reranking
 */

import { IRetriever } from '../../core/interfaces';
import { IVectorStore } from '../../core/interfaces';
import { IEmbeddingProvider } from '../../core/interfaces';
import { IndexRecord, SearchResult } from '../../core/types';

export class SemanticRetriever implements IRetriever {
  name = 'Semantic';

  constructor(
    private vectorStore: IVectorStore,
    private embeddingProvider: IEmbeddingProvider,
    private options: { topK: number; threshold: number }
  ) {}

  async retrieve(query: string, topK: number = 5): Promise<SearchResult<IndexRecord>[]> {
    const embedding = await this.embeddingProvider.embed(query);
    return this.retrieveByVector(embedding, topK);
  }

  async retrieveByVector(
    queryEmbedding: number[],
    topK: number = 5
  ): Promise<SearchResult<IndexRecord>[]> {
    const results = await this.vectorStore.search(
      queryEmbedding,
      topK || this.options.topK,
      this.options.threshold
    );

    return results;
  }

  async rerank(
    query: string,
    results: SearchResult<IndexRecord>[]
  ): Promise<SearchResult<IndexRecord>[]> {
    // Simple reranking: boost results that match keywords in query
    const keywords = query.toLowerCase().split(/\s+/);

    const scored = results.map((r) => {
      let boost = 1;

      for (const keyword of keywords) {
        if (r.record.text.toLowerCase().includes(keyword)) {
          boost += 0.1;
        }
      }

      return {
        ...r,
        score: r.score * boost,
      };
    });

    return scored.sort((a, b) => b.score - a.score);
  }
}


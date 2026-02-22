import * as fs from 'fs';
import * as path from 'path';
import { ragConfig } from './ragConfig';

export interface IndexRecord {
  id: string;
  text: string;
  embedding: number[];
  sourceFile: string;
  metadata: {
    created: string;
    author?: string;
    type: 'ac' | 'test' | 'flow' | 'requirement';
  };
}

export interface IndexStore {
  records: IndexRecord[];
  version: string;
  lastUpdated: string;
}

let memoryStore: IndexStore = {
  records: [],
  version: '1.0',
  lastUpdated: new Date().toISOString(),
};

/**
 * Load index from disk or initialize empty store
 */
export function loadIndex(): IndexStore {
  if (fs.existsSync(ragConfig.indexPath)) {
    try {
      const data = fs.readFileSync(ragConfig.indexPath, 'utf8');
      memoryStore = JSON.parse(data);
      return memoryStore;
    } catch (err) {
      console.warn(`Failed to load index from ${ragConfig.indexPath}:`, err);
    }
  }
  return memoryStore;
}

/**
 * Save index to disk
 */
export function saveIndex(store: IndexStore = memoryStore): void {
  store.lastUpdated = new Date().toISOString();
  fs.writeFileSync(ragConfig.indexPath, JSON.stringify(store, null, 2));
}

/**
 * Add a record to the index
 */
export function addRecord(record: IndexRecord): void {
  memoryStore.records.push(record);
  saveIndex();
}

/**
 * Clear the index
 */
export function clearIndex(): void {
  memoryStore = {
    records: [],
    version: '1.0',
    lastUpdated: new Date().toISOString(),
  };
  saveIndex();
}

/**
 * Search the index for similar records using cosine similarity
 */
export function search(
  query: number[],
  topK: number = 5,
  threshold: number = ragConfig.similarityThreshold
): IndexRecord[] {
  const scores = memoryStore.records.map((record) => ({
    record,
    score: cosineSimilarity(query, record.embedding),
  }));

  return scores
    .filter((s) => s.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.record);
}

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Find records by exact text match (for deduplication)
 */
export function findByText(text: string): IndexRecord[] {
  return memoryStore.records.filter(
    (r) => r.text.toLowerCase() === text.toLowerCase()
  );
}

/**
 * Get all records
 */
export function getAllRecords(): IndexRecord[] {
  return memoryStore.records;
}

/**
 * Get record count
 */
export function getRecordCount(): number {
  return memoryStore.records.length;
}

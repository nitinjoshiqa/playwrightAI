import Database from 'better-sqlite3';
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

let db: Database.Database | null = null;

/**
 * Initialize the SQLite database
 */
export function initDb(): Promise<void> {
  return Promise.resolve().then(() => {
    const dbPath = ragConfig.indexPath.replace('.json', '.db');
    db = new Database(dbPath);

    // Create tables if they don't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS records (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        embedding TEXT NOT NULL,
        sourceFile TEXT NOT NULL,
        created TEXT NOT NULL,
        author TEXT,
        type TEXT NOT NULL
      )
    `);
  });
}

/**
 * Add a record to the database
 */
export function addRecord(record: IndexRecord): Promise<void> {
  return Promise.resolve().then(() => {
    if (!db) throw new Error('Database not initialized');

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO records 
      (id, text, embedding, sourceFile, created, author, type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.id,
      record.text,
      JSON.stringify(record.embedding),
      record.sourceFile,
      record.metadata.created,
      record.metadata.author || null,
      record.metadata.type
    );
  });
}

/**
 * Find records by matching text (exact or similar)
 */
export function findByText(text: string): Promise<IndexRecord[]> {
  return Promise.resolve().then(() => {
    if (!db) throw new Error('Database not initialized');

    const stmt = db.prepare(`SELECT * FROM records WHERE LOWER(text) = LOWER(?)`);
    const rows = stmt.all(text) as any[];

    return (rows || []).map((r) => ({
      id: r.id,
      text: r.text,
      embedding: JSON.parse(r.embedding),
      sourceFile: r.sourceFile,
      metadata: {
        created: r.created,
        author: r.author,
        type: r.type,
      },
    }));
  });
}

/**
 * Search records by text (LIKE query)
 */
export function searchByText(query: string): Promise<IndexRecord[]> {
  return Promise.resolve().then(() => {
    if (!db) throw new Error('Database not initialized');

    const stmt = db.prepare(`SELECT * FROM records WHERE text LIKE ? LIMIT 10`);
    const rows = stmt.all(`%${query}%`) as any[];

    return (rows || []).map((r) => ({
      id: r.id,
      text: r.text,
      embedding: JSON.parse(r.embedding),
      sourceFile: r.sourceFile,
      metadata: {
        created: r.created,
        author: r.author,
        type: r.type,
      },
    }));
  });
}

/**
 * Get all records (use sparingly; can be large)
 */
export function getAllRecords(): Promise<IndexRecord[]> {
  return Promise.resolve().then(() => {
    if (!db) throw new Error('Database not initialized');

    const stmt = db.prepare(`SELECT * FROM records`);
    const rows = stmt.all() as any[];

    return (rows || []).map((r) => ({
      id: r.id,
      text: r.text,
      embedding: JSON.parse(r.embedding),
      sourceFile: r.sourceFile,
      metadata: {
        created: r.created,
        author: r.author,
        type: r.type,
      },
    }));
  });
}

/**
 * Get record count
 */
export function getRecordCount(): Promise<number> {
  return Promise.resolve().then(() => {
    if (!db) throw new Error('Database not initialized');

    const stmt = db.prepare(`SELECT COUNT(*) as count FROM records`);
    const row: any = stmt.get();
    return row?.count || 0;
  });
}

/**
 * Clear all records
 */
export function clearIndex(): Promise<void> {
  return Promise.resolve().then(() => {
    if (!db) throw new Error('Database not initialized');

    db.exec(`DELETE FROM records`);
  });
}

/**
 * Search by vector similarity (cosine similarity)
 * Load all records and compute similarity in-memory for now
 * (For production, use a dedicated vector DB like Milvus or Pinecone)
 */
export async function search(
  queryEmbedding: number[],
  topK: number = 5,
  threshold: number = ragConfig.similarityThreshold
): Promise<IndexRecord[]> {
  const records = await getAllRecords();

  const scored = records
    .map((r) => ({
      record: r,
      score: cosineSimilarity(queryEmbedding, r.embedding),
    }))
    .filter((s) => s.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map((s) => s.record);
}

/**
 * Compute cosine similarity
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
 * Close the database connection
 */
export function closeDb(): Promise<void> {
  return Promise.resolve().then(() => {
    if (!db) return;
    db.close();
    db = null;
  });
}

export default {
  initDb,
  addRecord,
  findByText,
  searchByText,
  getAllRecords,
  getRecordCount,
  clearIndex,
  search,
  closeDb,
};

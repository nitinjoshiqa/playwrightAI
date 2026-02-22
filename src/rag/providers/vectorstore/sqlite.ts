/**
 * SQLite Vector Store Provider
 * Implements IVectorStore using SQLite with better-sqlite3
 */

import { IVectorStore } from '../../core/interfaces';
import { IndexRecord, SearchResult } from '../../core/types';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

export class SQLiteVectorStore implements IVectorStore {
  name = 'SQLite';
  private db: Database.Database | null = null;

  constructor(private dbPath: string) {
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async init(): Promise<void> {
    this.db = new Database(this.dbPath);

    // Create table if it doesn't exist
    this.db.exec(`
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

    console.log(`✅ SQLite vector store initialized at ${this.dbPath}`);
  }

  async addRecord(record: IndexRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
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
  }

  async getRecord(id: string): Promise<IndexRecord | null> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM records WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      id: row.id,
      text: row.text,
      embedding: JSON.parse(row.embedding),
      sourceFile: row.sourceFile,
      metadata: {
        created: row.created,
        author: row.author,
        type: row.type,
      },
    };
  }

  async findByText(text: string): Promise<IndexRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM records WHERE LOWER(text) = LOWER(?)');
    const rows = stmt.all(text) as any[];

    return rows.map((r) => ({
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
  }

  async getAllRecords(): Promise<IndexRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM records');
    const rows = stmt.all() as any[];

    return rows.map((r) => ({
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
  }

  async getRecordCount(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM records');
    const result = stmt.get() as any;
    return result?.count || 0;
  }

  async search(
    queryEmbedding: number[],
    topK: number = 5,
    threshold: number = 0.75
  ): Promise<SearchResult<IndexRecord>[]> {
    const records = await this.getAllRecords();

    const scored = records
      .map((r) => ({
        record: r,
        score: this.cosineSimilarity(queryEmbedding, r.embedding),
      }))
      .filter((s) => s.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored;
  }

  async deleteRecord(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM records WHERE id = ?');
    stmt.run(id);
  }

  async clearAll(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.exec('DELETE FROM records');
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
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
}


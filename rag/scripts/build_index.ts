#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { ragConfig } from '../../src/rag/ragConfig';
import {
  initDb,
  addRecord,
  findByText,
  clearIndex,
  closeDb,
} from '../../src/rag/indexStorePersistent';
import { embedText } from '../../src/rag/embedding';

/**
 * Parse markdown requirement files and extract acceptance criteria
 */
function parseRequirements(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  const acs: string[] = [];
  let currentAc = '';

  for (const line of lines) {
    // Detect AC bullet points
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
 * Build the RAG index from requirement files
 */
async function buildIndex(): Promise<void> {
  console.log('🏗️  Building RAG index...');
  console.log(`LLM Provider: ${ragConfig.llmProvider}`);
  console.log(`Embedding Provider: ${ragConfig.embeddingProvider}`);
  console.log(`Index Path: ${ragConfig.indexPath}\n`);

  // Initialize database
  await initDb();
  await clearIndex();

  const requirementsDir = path.join(process.cwd(), 'rag', 'requirements');

  if (!fs.existsSync(requirementsDir)) {
    console.warn(`Requirements directory not found: ${requirementsDir}`);
    await closeDb();
    return;
  }

  const files = fs
    .readdirSync(requirementsDir)
    .filter((f) => f.endsWith('.md') || f.endsWith('.txt'));

  let totalAcs = 0;

  for (const file of files) {
    const filePath = path.join(requirementsDir, file);
    console.log(`📄 Parsing ${file}...`);

    const acs = parseRequirements(filePath);
    console.log(`   Found ${acs.length} ACs`);

    for (let i = 0; i < acs.length; i++) {
      const ac = acs[i];
      const id = `${file}-ac-${i + 1}`;

      // Check for duplicates
      const existing = await findByText(ac);
      if (existing.length > 0) {
        console.log(
          `   ⚠️  AC ${i + 1} is a duplicate of ${existing[0].sourceFile}, skipping`
        );
        continue;
      }

      // Embed the AC (real LLM embeddings now)
      console.log(`   🔄 Embedding AC ${i + 1}...`);
      const embedding = await embedText(ac);

      if (embedding.length === 0) {
        console.log(`   ⚠️  Embedding failed for AC ${i + 1}, using zero vector`);
      }

      // Add to index
      await addRecord({
        id,
        text: ac,
        embedding,
        sourceFile: file,
        metadata: {
          created: new Date().toISOString(),
          type: 'ac',
        },
      });

      console.log(`   ✅ Indexed AC ${i + 1}`);
      totalAcs++;

      // Small delay to avoid rate limiting on embeddings
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  await closeDb();
  console.log(`\n✨ Index built successfully! Total ACs: ${totalAcs}`);
  console.log(`📊 Stored in SQLite database at ${ragConfig.indexPath.replace('.json', '.db')}`);
}

// Run the generator
buildIndex().catch((err) => {
  console.error('Error building index:', err);
  process.exit(1);
});

export { buildIndex };


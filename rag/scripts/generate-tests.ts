#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { ragConfig } from '../../src/rag/ragConfig';
import { initDb, getAllRecords, closeDb } from '../../src/rag/indexStorePersistent';
import { askChatbot, embedText } from '../../src/rag/chatbot';
import { loadAndInterpolate } from '../../src/rag/promptLoader';

const generatedTestsDir = path.join(process.cwd(), 'tests', 'generated');

/**
 * Sanitize AC text to create a safe filename
 */
function sanitizeFilename(ac: string): string {
  return ac
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .substring(0, 50)
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate a test for a single AC
 */
async function generateTestForAc(
  ac: string,
  acIndex: number,
  sourceFile: string
): Promise<string | null> {
  try {
    console.log(`\n🧪 Generating test ${acIndex}: "${ac.substring(0, 60)}..."`);

    // Determine template based on source file or AC keywords
    let templateName = 'shared/default';
    if (sourceFile.includes('login')) {
      templateName = 'login/user_flow';
    } else if (sourceFile.includes('checkout')) {
      templateName = 'checkout/order_flow';
    }

    // Load and interpolate the prompt
    const prompt = loadAndInterpolate(templateName, {
      ac_text: ac,
      framework_context: getFrameworkContext(),
      similar_tests: '(see generated files in tests/generated/)',
    });

    // Call the LLM to generate the test
    const testCode = await askChatbot(templateName, ac);

    if (!testCode || testCode.includes('TODO')) {
      console.log(
        `   ⚠️  LLM returned incomplete response, using skeleton`
      );
      return createTestSkeleton(ac, templateName);
    }

    console.log(`   ✅ Generated test code (${testCode.length} chars)`);
    return testCode;
  } catch (err) {
    console.error(`   ❌ Error generating test: ${(err as any).message}`);
    return createTestSkeleton(ac, 'shared/default');
  }
}

/**
 * Create a skeleton test when generation fails or times out
 */
function createTestSkeleton(ac: string, templateName: string): string {
  return `import { test, expect } from '../src/fixtures/testFixtures';

/**
 * Generated from AC:
 * ${ac}
 */
test.skip('TODO: Generated test - review and complete', async ({ actions, pages }) => {
  // AC: ${ac}
  //
  // TODO: Implement test based on the AC above
  // Use flows, preconditions, and the actions/pages fixtures
  // See RAG_ARCHITECTURE.md for guidance
  
  throw new Error('Test not implemented');
});
`;
}

/**
 * Write test file to disk
 */
function writeTestFile(filename: string, testCode: string): void {
  const filePath = path.join(generatedTestsDir, `${filename}.spec.ts`);

  // Create directory if it doesn't exist
  if (!fs.existsSync(generatedTestsDir)) {
    fs.mkdirSync(generatedTestsDir, { recursive: true });
  }

  fs.writeFileSync(filePath, testCode, 'utf8');
  console.log(`   💾 Saved to ${filename}.spec.ts`);
}

/**
 * Get framework context to include in prompts
 */
function getFrameworkContext(): string {
  return `
Framework layers (use them in generated tests):
- import { test, expect } from '../src/fixtures/testFixtures'
- Use flows: loginFlow, addItemToCartFlow, checkoutFlow, completeOrderFlow
- Use preconditions: userLoggedIn, userHasItemInCart
- Access pages via fixture: pages.login, pages.inventory, pages.cart, etc.
- Use actions fixture: actions.click, actions.type, actions.getText, etc.
- Keep tests thin; delegate logic to flows
`;
}

/**
 * Main generator function
 */
async function generateTests(): Promise<void> {
  console.log('🚀 PlaywrightAI Test Generator');
  console.log('================================\n');

  if (!ragConfig.enabled) {
    console.warn('⚠️  RAG is disabled. Set RAG_ENABLED=true in .env');
    return;
  }

  try {
    // Initialize database
    await initDb();
    const records = await getAllRecords();

    if (records.length === 0) {
      console.log('ℹ️  No ACs in index. Run "npm run rag:build" first.');
      await closeDb();
      return;
    }

    console.log(`Found ${records.length} ACs ready for generation\n`);

    let generated = 0;
    let skipped = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // Check if test already exists
      const filename = sanitizeFilename(record.text);
      const testPath = path.join(generatedTestsDir, `${filename}.spec.ts`);

      if (fs.existsSync(testPath)) {
        console.log(
          `⏭️  Test already exists, skipping: ${filename}.spec.ts`
        );
        skipped++;
        continue;
      }

      // Generate test
      const testCode = await generateTestForAc(
        record.text,
        i + 1,
        record.sourceFile
      );

      if (testCode) {
        writeTestFile(filename, testCode);
        generated++;

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`✨ Generation complete!`);
    console.log(`   Generated: ${generated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Output directory: ${generatedTestsDir}`);
    console.log(`\nNext: Run "npm test" to execute all tests`);
  } finally {
    await closeDb();
  }
}

// Run the generator
generateTests().catch((err) => {
  console.error('Generation failed:', err);
  process.exit(1);
});

export { generateTests };

#!/usr/bin/env node

/**
 * Test RAG Plugin Initialization
 */

import { createRagPlugin } from '../../src/rag/factory';

async function testPlugin() {
  console.log('🧪 Testing RAG Plugin Initialization\n');

  try {
    console.log('Creating plugin instance...');
    const plugin = await createRagPlugin();

    if (!plugin) {
      console.log('⚠️  Plugin returned null (RAG disabled)');
      return;
    }

    console.log('✅ Plugin created successfully\n');

    // Test basic operations
    console.log('🔍 Testing plugin methods:');
    
    const stats = await plugin.getStats();
    console.log('   ✅ getStats():', stats);

    const trace = await plugin.getFrameworkContext();
    console.log('   ✅ getFrameworkContext():', trace.substring(0, 50) + '...');

    await plugin.close();
    console.log('\n✅ Plugin test passed!');
  } catch (err) {
    console.error('❌ Plugin test failed:', err);
    process.exit(1);
  }
}

testPlugin();


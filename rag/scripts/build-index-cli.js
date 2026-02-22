#!/usr/bin/env node

// Simple wrapper to run RAG build index
require('ts-node').register({
  project: './tsconfig.json',
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
  },
});

require('./build_index.ts');

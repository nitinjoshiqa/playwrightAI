# Retrieval‑Augmented Generation (RAG) Architecture

This document outlines the design of the RAG subsystem for the PlaywrightAI automation framework. The goal is to provide scalable, maintainable prompt management and a clear computation flow that supports intelligent test generation and documentation‑driven responses.

---

## 1. Core Components

### 1.1 Prompt Templates
- Stored under `rag/prompts/` organized by suite.
- Use plain text (`.txt`) or YAML (`.yaml`) with metadata.
- Templates contain placeholders (e.g. `{{framework_context}}`, `{{ac_text}}`) and minimal instructions.
- Include version comments (e.g. `# v1.2 – added order history context`).

### 1.2 Requirements Folder
- Raw documents (test requirements, user stories, acceptance criteria) that feed the RAG index.
- Located at `rag/requirements/` containing `.md` or `.txt` files.
- Each document should contain one or more acceptance criteria (ACs) as bullet points.

### 1.3 Generator Script
- `rag/scripts/build_index.ts` reads requirement files, computes embeddings, and writes to the index store.
- Command: `npm run rag:build`
- Runs before test generation or during CI when docs change.
- Supports local Ollama or cloud-based embedding APIs (OpenAI, Hugging Face, etc.).

### 1.4 Index Store
- A lightweight vector database (`src/rag/indexStore.ts`).
- On first run uses an in-memory map; can be swapped for SQLite + FAISS or cloud vector DBs later.
- Stores embeddings, original text, file reference, and metadata (creator, date).

### 1.5 Chatbot Service
- `src/rag/chatbot.ts` – combines user input, prompt templates, and retrieved context.
- Exposes a simple query function: `chatbot.ask(template, userQuery)`.
- Handles fallbacks (if API unavailable, returns stub), caching, and rate-limits.
- Works with Ollama (local) or cloud LLMs via config.

### 1.6 Prompt Loader
- `src/rag/promptLoader.ts` loads and interpolates templates.
- Simple placeholder replacement: `{{key}}` → resolved value.
- Lazy-loads templates on demand.

### 1.7 Configuration
- `src/rag/ragConfig.ts` loads paths, model settings, API keys from environment variables or a `rag/config.json`.
- Primary settings:
  - `RAG_ENABLED` – whether RAG is active (default: `true` if `OLLAMA_ENDPOINT` or `OPENAI_API_KEY` is set).
  - `RAG_LLM_PROVIDER` – `'ollama'` (default) or `'openai'`.
  - `RAG_EMBEDDING_PROVIDER` – LLM provider to use for embeddings (often same as `RAG_LLM_PROVIDER`).
  - `OLLAMA_ENDPOINT` – local Ollama API (default: `http://localhost:11434`).
  - `OPENAI_API_KEY` – for cloud LLM/embeddings.
  - `RAG_INDEX_PATH` – where to save/load the index (default: `rag/data/index.json`).
  - `RAG_CHUNK_SIZE` – how many tokens per chunk (default: `500`).

---

## 2. Interaction Flow

### Test Generation Flow

```
1. User writes feature docs in rag/requirements/*.md
   ↓
2. Run: npm run rag:build
   - Generator reads *.md files
   - For each AC, computes embedding (via Ollama or OpenAI)
   - Stores in index: { text, embedding, file, metadata }
   ↓
3. User runs: npm run generate
   - Generator picks a requirement AC
   - Queries index for similar tests (deduplication check)
   - If no match found, loads a test-generation prompt template
   - Calls LLM (Ollama/OpenAI) with prompt + context
   - Writes response to tests/generated/<ac-name>.spec.ts
   ↓
4. npm test
   - Runs generated + manual tests via Playwright
```

### Chatbot Query Flow

```
1. User/script calls: chatbot.ask('shared/default', 'What tests exist for login?')
   ↓
2. Chatbot:
   - Loads template from rag/prompts/shared/default.txt
   - Queries index: search vector store for docs matching 'login'
   - Assembles context from top-N matches
   ↓
3. Constructs final prompt:
   [Template content] + [Retrieved context] + [User question]
   ↓
4. Calls LLM (Ollama CLI or OpenAI SDK)
   ↓
5. Returns response to caller
```

---

## 3. Directory Structure

```
rag/
  ├─ prompts/
  │   ├─ shared/
  │   │   ├─ default.txt               # default generation prompt
  │   │   ├─ version.yaml              # metadata
  │   │   └─ README.md
  │   ├─ login/
  │   │   └─ user_flow.txt
  │   └─ checkout/
  │       └─ order_flow.txt
  ├─ requirements/
  │   ├─ login-spec.md                 # sample ACs
  │   └─ checkout-spec.md
  ├─ scripts/
  │   └─ build_index.ts                # runs embeddings
  ├─ data/
  │   └─ index.json                    # vector store (generated)
  └─ config.json                       # optional local config

src/
  ├─ rag/
  │   ├─ ragConfig.ts                  # env loader
  │   ├─ indexStore.ts                 # vector DB abstraction
  │   ├─ promptLoader.ts               # template interpolation
  │   ├─ chatbot.ts                    # main service
  │   └─ embedding.ts                  # (optional) embedder helper
  └─ (existing: pages, core, flows, etc.)

scripts/
  ├─ generate-tests.ts                 # test generator (uses chatbot)
  └─ (existing)

.env.example
RAG_ARCHITECTURE.md                     # this file
README.md                               # (existing)
package.json                            # (updated with new scripts)
tsconfig.json                           # (unchanged, already covers src/rag)
```

---

## 4. Prompt Management Guidelines

- **Keep templates minimal**: focus on instructions, not logic.
- **Parameterize extensively**: define all variable parts (user input, context) as placeholders.
- **Version control**: track template changes in Git; include version headers.
- **Suite organization**: group related prompts in subfolders (`login/`, `checkout/`).
- **Reuse shared templates**: place common patterns in `shared/`.
- **Metadata**: use YAML files to store template version, author, last updated date.

Example template with placeholders:

```txt
# v1.0 – generate Playwright test from AC

You are a test automation engineer for a Playwright + TypeScript framework.
Your job is to write a single Playwright test spec based on the AC below.

Framework context:
{{framework_context}}

Acceptance Criterion:
{{ac_text}}

Similar existing tests (for reference, don't duplicate):
{{similar_tests}}

Write a TypeScript test file using the fixture `{ test, expect }` from the framework.
```

---

## 5. Embeddings & Indexing

### Embedding Process

1. **Read**: parse each requirement file (extract AC bullets).
2. **Chunk**: split long text into ~500 token chunks (configurable).
3. **Embed**: call embedding API (Ollama, OpenAI, or local transformer).
4. **Store**: save vector + metadata in index.

### Query & Retrieval

1. **Embed user query**: convert input text to vector.
2. **Search**: perform cosine-similarity search (in-memory or DB).
3. **Return**: top-N results sorted by similarity.

### De-duplication

Before generating a test, query the index with the AC text. If a match exceeds threshold (default: 0.85 similarity), either skip or prompt the LLM to "extend" the existing test.

---

## 6. New Files & Dependencies

### New Dependencies

```json
{
  "devDependencies": {
    "dotenv": "^16",         // load .env files
    "marked": "^5"           // markdown parsing (optional)
  }
}
```

### Environment Variables

Create a `.env` file (or `.env.local`) in the project root:

```env
# RAG Configuration
RAG_ENABLED=true
RAG_LLM_PROVIDER=ollama
RAG_EMBEDDING_PROVIDER=ollama
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=llama2

# If using cloud LLM (optional)
# OPENAI_API_KEY=sk-...

# Paths & limits
RAG_INDEX_PATH=rag/data/index.json
RAG_CHUNK_SIZE=500
```

### `package.json` Scripts

Add to `scripts` section:

```json
{
  "rag:build": "ts-node rag/scripts/build_index.ts",
  "rag:chat": "ts-node src/rag/chatbot.ts --repl",
  "generate": "ts-node rag/scripts/generate-tests.ts",
  "generate:watch": "nodemon --watch rag/requirements -e md --exec 'npm run generate'"
}
```

---

## 7. Usage Examples

### Build the index

```bash
npm run rag:build
```

Scans `rag/requirements/`, embeds each AC, stores vectors.

### Generate tests

```bash
npm run generate
```

Reads requirements, checks for duplicates, queries LLM, writes to `tests/generated/`.

### Chat with the knowledge base

```bash
npm run rag:chat
> What tests do we have for checkout?
> How many ACs cover login flow?
```

### Run all tests

```bash
npm test
```

Executes manual + generated tests via Playwright.

---

## 8. Future Enhancements

- **Persistent vector DB**: replace in-memory store with SQLite + FAISS or Pinecone.
- **Web UI**: simple dashboard to browse requirements, generated tests, and run chatbot queries.
- **Auto-versioning**: track changes to requirements over time; suggest test updates.
- **Multi-model support**: seamlessly switch between Ollama, OpenAI, Anthropic.
- **Flakiness detection**: chatbot scans test results and suggests fixes.
- **Test correlation**: cluster tests by intent; suggest consolidation if they overlap.

---

By adopting this RAG structure, PlaywrightAI becomes a self-aware test automation framework with clear separation of concerns, scalable prompt/doc management, and the ability to learn from and reason about its own tests.


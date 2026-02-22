# Playwright + TypeScript Automation Framework

Structure follows a layered architecture where only `src/core/ElementActions.ts` depends on Playwright.

Key folders:
- `src/pages` — locators only
- `src/core` — Playwright-dependent adapter
- `src/flows` — business flows using `actions` + `pages`
- `src/preconditions` — reusable test preconditions
- `src/fixtures` — Playwright fixtures injecting `actions` and `pages`
- `tests` — thin tests using flows and preconditions
- `src/rag` — Retrieval-Augmented Generation (RAG) for intelligent test generation
- `rag/` — requirement documents and prompt templates

## Quick Start

1. Install dependencies and browsers:

```bash
npm install
npx playwright install --with-deps
```

2. Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

3. Run tests:

```bash
npm test
```

## Test Generation with RAG

PlaywrightAI includes an AI-powered test generator that reads acceptance criteria from markdown files and auto-generates Playwright tests using your local Ollama instance or OpenAI.

### Setup

1. **Ensure Ollama is running** (or set `OPENAI_API_KEY` in `.env`):

```bash
ollama serve
```

2. **Build the RAG index** to embed your requirements:

```bash
npm run rag:build
```

3. **Generate tests** from acceptance criteria:

```bash
npm run generate
```

Generated tests will appear in `tests/generated/`.

### Writing Requirements

Create acceptance criteria in `rag/requirements/*.md`:

```markdown
# Login Feature

## AC1: Valid login
- Given I am on the login page
- When I enter valid credentials
- Then I should see the inventory page

## AC2: Invalid login shows error
- Given I enter invalid credentials
- Then I see an error message
```

Run `npm run rag:build` to index the ACs, then `npm run generate` to create tests.

### Chat with Your Tests

Query the knowledge base:

```bash
npm run rag:chat
> How many tests cover login?
> What flows are used in checkout tests?
```

### Watch for Changes

Automatically regenerate tests when requirements change:

```bash
npm run generate:watch
```

---

## Allure Reporting

1. Generate after a test run:

```bash
npm run allure:generate
```

2. Open the generated report:

```bash
npm run allure:open
```

## CI/CD

There's a GitHub Actions workflow at `.github/workflows/playwright.yml` that runs tests and uploads `playwright-report`, `test-results` and `allure-results` as CI artifacts.

## Architecture

See [RAG_ARCHITECTURE.md](RAG_ARCHITECTURE.md) for details on the Retrieval-Augmented Generation subsystem that powers automated test generation.


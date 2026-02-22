import { ragConfig } from './ragConfig';
import { loadIndex, search, getAllRecords } from './indexStore';
import { loadAndInterpolate } from './promptLoader';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Call Ollama API via CLI
 */
async function callOllama(prompt: string): Promise<string> {
  try {
    const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const { stdout } = await execAsync(
      `curl -s -X POST ${ragConfig.ollamaEndpoint}/api/generate -d "{\\\"model\\\":\\\"${ragConfig.ollamaModel}\\\",\\\"prompt\\\":\\\"${escapedPrompt}\\\",\\\"stream\\\":false}"`
    );
    const response = JSON.parse(stdout);
    return response.response || '';
  } catch (err) {
    console.error('Ollama call failed:', err);
    return '// TODO: AI response failed, review manually';
  }
}

/**
 * Call OpenAI API (if API key is set)
 */
async function callOpenAI(prompt: string): Promise<string> {
  if (!ragConfig.openaiApiKey) {
    throw new Error('OPENAI_API_KEY not set');
  }

  try {
    const response = await import('openai').then((m) => {
      const client = new m.default({ apiKey: ragConfig.openaiApiKey });
      return client.chat.completions.create({
        model: ragConfig.openaiModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });
    });
    return response.choices[0]?.message?.content || '';
  } catch (err) {
    console.error('OpenAI call failed:', err);
    return '// TODO: AI response failed, review manually';
  }
}

/**
 * Call the configured LLM
 */
export async function callLLM(prompt: string): Promise<string> {
  if (!ragConfig.enabled) {
    return '// RAG disabled; manual implementation required';
  }

  switch (ragConfig.llmProvider) {
    case 'ollama':
      return callOllama(prompt);
    case 'openai':
      return callOpenAI(prompt);
    default:
      return '// Unknown LLM provider';
  }
}

/**
 * Embed text using the configured provider
 * Returns a simple hash-based "embedding" if no real service is available
 */
export async function embedText(text: string): Promise<number[]> {
  // For now, return a simple hash-based embedding
  // In production, use a real embedding API
  const hash = simpleHash(text);
  const embedding = new Array(384).fill(0);
  for (let i = 0; i < 384; i++) {
    embedding[i] = Math.sin((hash + i) / 100) * 0.5 + 0.5;
  }
  return embedding;
}

/**
 * Simple hash function for demo (not cryptographic)
 */
function simpleHash(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Chatbot query interface
 */
export async function askChatbot(
  templateName: string,
  userQuery: string,
  topKContext: number = 3
): Promise<string> {
  try {
    // Load the index
    loadIndex();

    // Embed the query (simple hash for now)
    const queryEmbedding = await embedText(userQuery);

    // Search for similar records
    const similarRecords = search(queryEmbedding, topKContext);
    const contextText = similarRecords
      .map((r) => `- ${r.text} (source: ${r.sourceFile})`)
      .join('\n');

    // Load and interpolate the template
    const finalPrompt = loadAndInterpolate(templateName, {
      ac_text: userQuery,
      framework_context: getFrameworkContext(),
      similar_tests: contextText || '(no similar tests found)',
    });

    // Call the LLM
    const response = await callLLM(finalPrompt);
    return response;
  } catch (err) {
    console.error('Chatbot error:', err);
    return `Error: ${(err as any).message}`;
  }
}

/**
 * Get framework context to include in prompts
 */
function getFrameworkContext(): string {
  return `
Playwright + TypeScript framework with layers:
- pages: locator registry (pages.login, pages.inventory, etc.)
- core: ElementActions wrapper (click, type, getText, etc.)
- flows: business flows (loginFlow, addItemToCartFlow, checkoutFlow, completeOrderFlow)
- preconditions: test setup (userLoggedIn, userHasItemInCart)
- fixtures: Playwright test injection (test, expect, { actions, pages })
- tests: spec files using flows and preconditions

Always import from fixtures and use flows; never hardcode selectors in tests.
`;
}

/**
 * Interactive REPL mode for chatbot
 */
export async function startRepl(): Promise<void> {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('🤖 PlaywrightAI Chatbot');
  console.log('Type your question or exit to quit.\n');

  const askQuestion = () => {
    rl.question('> ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        rl.close();
        console.log('Goodbye!');
        return;
      }

      if (input.trim().length === 0) {
        askQuestion();
        return;
      }

      try {
        const response = await askChatbot('shared/default', input);
        console.log(`\n${response}\n`);
      } catch (err) {
        console.error(`Error: ${(err as any).message}\n`);
      }

      askQuestion();
    });
  };

  askQuestion();
}

export default {
  ask: askChatbot,
  embed: embedText,
  callLLM,
  startRepl,
};

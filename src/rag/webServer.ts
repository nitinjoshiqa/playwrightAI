import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { initDb, getAllRecords, search, closeDb } from './indexStorePersistent';
import { askChatbot } from './chatbot';
import { askChatbot as generateTest } from './chatbot';
import { embedText } from './embedding';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Serve static files (UI)
app.use(express.static(path.join(process.cwd(), 'public')));

// ============ API Routes ============

/**
 * Health check
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get all requirements
 */
app.get('/api/requirements', async (req: Request, res: Response) => {
  try {
    const records = await getAllRecords();
    res.json({
      count: records.length,
      requirements: records.map((r) => ({
        id: r.id,
        text: r.text,
        sourceFile: r.sourceFile,
        type: r.metadata.type,
        created: r.metadata.created,
      })),
    });
  } catch (err) {
    console.error('Error fetching requirements:', err);
    res.status(500).json({ error: 'Failed to fetch requirements' });
  }
});

/**
 * Search requirements by semantic similarity
 */
app.post('/api/requirements/search', async (req: Request, res: Response) => {
  try {
    const { query, topK = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Embed the query
    const embedding = await embedText(query);

    // Search in index
    const results = await search(embedding, topK);

    res.json({
      query,
      count: results.length,
      results: results.map((r) => ({
        id: r.id,
        text: r.text,
        sourceFile: r.sourceFile,
        type: r.metadata.type,
      })),
    });
  } catch (err) {
    console.error('Error searching requirements:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * Chat with the AI assistant
 */
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, template = 'shared/default', topK = 3 } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Ask chatbot
    const response = await askChatbot(template, message, topK);

    res.json({
      message,
      response,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error in chat:', err);
    res.status(500).json({ error: 'Chat failed', details: (err as any).message });
  }
});

/**
 * Generate test(s) from AC
 */
app.post('/api/generate-test', async (req: Request, res: Response) => {
  try {
    const { ac, template = 'shared/default' } = req.body;

    if (!ac) {
      return res.status(400).json({ error: 'AC text is required' });
    }

    // Generate test code
    const testCode = await generateTest(template, ac);

    res.json({
      ac,
      testCode,
      status: 'generated',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error generating test:', err);
    res.status(500).json({ error: 'Test generation failed', details: (err as any).message });
  }
});

/**
 * Index statistics
 */
app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const records = await getAllRecords();
    
    const stats = {
      total_acs: records.length,
      by_source: {} as Record<string, number>,
      by_type: {} as Record<string, number>,
    };

    records.forEach((r) => {
      stats.by_source[r.sourceFile] = (stats.by_source[r.sourceFile] || 0) + 1;
      stats.by_type[r.metadata.type] = (stats.by_type[r.metadata.type] || 0) + 1;
    });

    res.json(stats);
  } catch (err) {
    console.error('Error getting stats:', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ============ Catch-all for SPA ============
// Serve index.html for any unmatched route (for client-side routing)
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'), (err) => {
    if (err) {
      res.status(404).json({ error: 'Not found' });
    }
  });
});

// ============ Server Startup ============
async function startServer() {
  try {
    // Initialize database
    await initDb();
    console.log('✅ Database initialized');

    // Start express server
    app.listen(PORT, () => {
      console.log(`\n🚀 PlaywrightAI Web Server`);
      console.log(`📍 Running on http://localhost:${PORT}`);
      console.log(`🤖 Chatbot: POST http://localhost:${PORT}/api/chat`);
      console.log(`📚 Search: POST http://localhost:${PORT}/api/requirements/search`);
      console.log(`🧪 Generate: POST http://localhost:${PORT}/api/generate-test`);
      console.log(`📊 Stats: GET http://localhost:${PORT}/api/stats\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹️  Shutting down...');
  await closeDb();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏹️  Shutting down...');
  await closeDb();
  process.exit(0);
});

startServer();

export default app;

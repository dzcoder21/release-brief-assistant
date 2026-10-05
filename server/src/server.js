import app from './app.js';
import { config } from './config/env.js';
import { connectDb } from './config/db.js';
import { recoverInterruptedAnalyses } from './services/ai/aiAnalysisService.js';
import { isAiConfigured } from './config/env.js';

async function start() {
  await connectDb();
  await recoverInterruptedAnalyses();
  app.listen(config.port, () => {
    console.log(`[server] listening on http://localhost:${config.port}`);
    console.log(`[ai] ${isAiConfigured() ? `provider=${config.ai.provider} model=${config.ai.model}` : 'not configured (set AI_API_KEY and AI_MODEL to enable analysis)'}`);
  });
}

start().catch((err) => {
  console.error('[server] failed to start:', err.message);
  process.exit(1);
});

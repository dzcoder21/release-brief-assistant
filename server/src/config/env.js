import dotenv from 'dotenv';

dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}. Copy server/.env.example to server/.env and fill it in.`);
  return value;
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/release-brief-assistant',
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
  ai: {
    provider: (process.env.AI_PROVIDER || 'openai').toLowerCase(),
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || '',
    baseUrl: (process.env.AI_BASE_URL || '').replace(/\/+$/, ''),
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 120000,
    maxTokens: Number(process.env.AI_MAX_TOKENS) || 0,
  },
};

export const isAiConfigured = () => Boolean(config.ai.apiKey && config.ai.model);

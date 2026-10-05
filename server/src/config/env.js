import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 5000),

  mongoUri: process.env.MONGODB_URI,

  jwtSecret: process.env.JWT_SECRET,

  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  clientUrls: (process.env.CLIENT_URLS || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),

  ai: {
    provider: process.env.AI_PROVIDER,
    model: process.env.AI_MODEL,
    apiKey: process.env.AI_API_KEY,
  },
};

export function isAiConfigured() {
  return Boolean(
    config.ai.apiKey &&
    config.ai.model
  );
}
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import routes from './routes/index.js';
import { sanitize } from './middleware/sanitize.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/error.js';

const app = express();

app.disable('x-powered-by');

app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://release-brief-assistant-six.vercel.app',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(helmet());

app.use(express.json({ limit: '1mb' }));

app.use(sanitize);

app.use('/api', apiLimiter, routes);

app.use(notFound);

app.use(errorHandler);

export default app;
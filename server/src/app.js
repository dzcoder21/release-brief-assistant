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
app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => (!origin || config.clientUrls.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'))),
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(sanitize);
app.use('/api', apiLimiter, routes);
app.use(notFound);
app.use(errorHandler);

export default app;

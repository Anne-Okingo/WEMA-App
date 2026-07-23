import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { Config } from '../config/environment.js';
import { errorHandler, notFoundHandler } from '../middleware/error-handler.middleware.js';
import { loggingMiddleware } from '../middleware/logging.middleware.js';
import { requestIdMiddleware } from '../middleware/request-id.middleware.js';
import { registerRoutes } from './routes.js';

export function createApp(config?: Pick<Config, 'cors' | 'jobs'>): express.Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config?.cors.origins ?? ['http://localhost:5173', 'http://localhost:5174'],
      credentials: true,
    }),
  );
  app.use(requestIdMiddleware);
  app.use(loggingMiddleware);
  app.use(express.json({ limit: '100kb' }));

  registerRoutes(app, config?.jobs.queueSchema ?? 'wema_jobs');

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

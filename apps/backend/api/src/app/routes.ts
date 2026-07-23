import { type Express } from 'express';
import { createHealthRouter } from '../modules/health/health.router.js';

export function registerRoutes(app: Express, jobQueueSchema: string): void {
  app.get('/api/status', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', createHealthRouter(jobQueueSchema));
}

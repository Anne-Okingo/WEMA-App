import { type Express } from 'express';

export function registerRoutes(app: Express): void {
  app.get('/api/status', (_req, res) => {
    res.json({ status: 'ok' });
  });
}

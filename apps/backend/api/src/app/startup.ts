import { connectDatabase } from '@wema/database';
import { type Express } from 'express';
import { type Server } from 'node:http';
import { logger } from '../shared/logger.js';

export async function startServer(app: Express, port: number): Promise<Server> {
  await connectDatabase();

  return new Promise((resolve, reject) => {
    const server = app
      .listen(port, () => {
        logger.info({ port }, 'API listening');
        resolve(server);
      })
      .on('error', reject);
  });
}

import { disconnectDatabase } from '@wema/database';
import { type Server } from 'node:http';
import { logger } from '../shared/logger.js';

export function registerShutdownHandlers(server: Server): void {
  const shutdown = (): void => {
    server.close((err) => {
      disconnectDatabase()
        .then(() => {
          if (err) {
            logger.error({ err }, 'Error during shutdown');
            process.exit(1);
          }
          logger.info('Server shut down gracefully');
          process.exit(0);
        })
        .catch((disconnectErr: unknown) => {
          logger.error({ err: disconnectErr }, 'Error disconnecting database');
          process.exit(1);
        });
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

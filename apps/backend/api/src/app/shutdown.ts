import { disconnectDatabase } from '@wema/database';
import { type Server } from 'node:http';

export function registerShutdownHandlers(server: Server): void {
  const shutdown = (): void => {
    server.close((err) => {
      disconnectDatabase()
        .then(() => {
          if (err) {
            console.error('Error during shutdown:', err);
            process.exit(1);
          }
          process.exit(0);
        })
        .catch((disconnectErr: unknown) => {
          console.error('Error disconnecting database:', disconnectErr);
          process.exit(1);
        });
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

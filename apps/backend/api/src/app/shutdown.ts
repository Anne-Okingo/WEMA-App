import { type Server } from 'node:http';

export function registerShutdownHandlers(server: Server): void {
  const shutdown = (): void => {
    server.close((err) => {
      if (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
      }
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

import { config } from '../config/environment.js';
import { createApp } from './app.js';
import { registerShutdownHandlers } from './shutdown.js';
import { startServer } from './startup.js';

const app = createApp();

startServer(app, config.port)
  .then((server) => {
    registerShutdownHandlers(server);
  })
  .catch((err: unknown) => {
    console.error('Failed to start API:', err);
    process.exit(1);
  });

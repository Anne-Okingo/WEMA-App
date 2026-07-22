import { loadConfig } from '../config/environment.js';
import { createApp } from './app.js';
import { registerShutdownHandlers } from './shutdown.js';
import { startServer } from './startup.js';

const config = loadConfig();
const app = createApp();

startServer(app, config.api.port)
  .then((server) => {
    registerShutdownHandlers(server);
  })
  .catch((err: unknown) => {
    console.error('Failed to start API:', err);
    process.exit(1);
  });

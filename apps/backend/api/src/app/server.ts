import { loadConfig } from '../config/environment.js';
import { logger } from '../shared/logger.js';
import { createApp } from './app.js';
import { registerShutdownHandlers } from './shutdown.js';
import { startServer } from './startup.js';

const config = loadConfig();
const app = createApp(config);

startServer(app, config.api.port)
  .then((server) => {
    registerShutdownHandlers(server);
  })
  .catch((err: unknown) => {
    logger.error({ err }, 'Failed to start API');
    process.exit(1);
  });

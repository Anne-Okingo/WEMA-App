// Minimal entry point used only by the startup-config-failure integration test.
// Calls loadConfig() so that invalid env vars trigger process.exit(1).
import { loadConfig } from './environment.js';
loadConfig();

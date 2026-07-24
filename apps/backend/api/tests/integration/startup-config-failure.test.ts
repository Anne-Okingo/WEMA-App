import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const API_ROOT = new URL('../../', import.meta.url).pathname;

describe('API startup with invalid configuration', () => {
  it('exits with code 1 and prints a config error when required env vars are missing', () => {
    let output = '';
    let exitCode: number | null = null;

    try {
      // Target only the config module — it calls process.exit(1) on bad env
      // and has no dependency on @wema/database, avoiding the need for a build.
      execFileSync(process.execPath, ['--import', 'tsx/esm', 'src/config/validate-env.ts'], {
        cwd: API_ROOT,
        // Pass a HOME that has no .env, and override DATABASE_URL to empty
        // so dotenv can't satisfy the schema even if it finds a .env file.
        env: { NODE_ENV: 'test', DATABASE_URL: '', JWT_SECRET: '' },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err: unknown) {
      const spawnError = err as { status?: number; stderr?: string; stdout?: string };
      exitCode = spawnError.status ?? null;
      output = (spawnError.stderr ?? '') + (spawnError.stdout ?? '');
    }

    expect(exitCode).toBe(1);
    expect(output).toMatch(/Configuration error/);
    expect(output).not.toMatch(/JWT_SECRET\s*=\s*\S/);
  });
});

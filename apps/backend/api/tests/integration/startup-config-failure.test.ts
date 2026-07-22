import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('API startup with invalid configuration', () => {
  it('exits with code 1 and prints a config error when required env vars are missing', () => {
    let output = '';
    let exitCode: number | null = null;

    try {
      execFileSync(
        process.execPath,
        ['--import', 'tsx/esm', 'src/app/server.ts'],
        {
          cwd: new URL('../../', import.meta.url).pathname,
          // Provide no env vars at all — DATABASE_URL, JWT_SECRET, etc. are absent
          env: { NODE_ENV: 'test' },
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
    } catch (err: unknown) {
      const spawnError = err as { status?: number; stderr?: string; stdout?: string };
      exitCode = spawnError.status ?? null;
      output = (spawnError.stderr ?? '') + (spawnError.stdout ?? '');
    }

    expect(exitCode).toBe(1);
    expect(output).toMatch(/Configuration error/);
    // Secret values must not appear in the error output
    expect(output).not.toMatch(/JWT_SECRET\s*=\s*\S/);
  });
});

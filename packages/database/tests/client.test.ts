import { afterEach, describe, expect, it } from 'vitest';
import { disconnectDatabase, getPrismaClient } from '../src/client.js';

describe('getPrismaClient', () => {
  afterEach(async () => {
    // Reset singleton between tests without a real connection
    await disconnectDatabase().catch(() => undefined);
  });

  it('returns a PrismaClient instance', () => {
    const client = getPrismaClient();
    expect(client).toBeDefined();
    expect(typeof client.$connect).toBe('function');
    expect(typeof client.$disconnect).toBe('function');
  });

  it('returns the same instance on repeated calls', () => {
    const a = getPrismaClient();
    const b = getPrismaClient();
    expect(a).toBe(b);
  });

  it('returns a fresh instance after disconnectDatabase', async () => {
    const a = getPrismaClient();
    await disconnectDatabase().catch(() => undefined);
    const b = getPrismaClient();
    expect(a).not.toBe(b);
  });
});

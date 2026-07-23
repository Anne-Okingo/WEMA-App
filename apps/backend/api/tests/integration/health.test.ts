import supertest from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app/app.js';

vi.mock('@wema/database', () => ({
  getPrismaClient: vi.fn(),
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

import { getPrismaClient } from '@wema/database';

const mockQueryRaw = vi.fn();
const mockQueryRawUnsafe = vi.fn();

beforeEach(() => {
  vi.mocked(getPrismaClient).mockReturnValue({
    $queryRaw: mockQueryRaw,
    $queryRawUnsafe: mockQueryRawUnsafe,
  } as never);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/health', () => {
  it('returns 200 while the API process is running', async () => {
    const res = await supertest(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('GET /api/health/deep', () => {
  it('returns 200 when postgres and job queue are available', async () => {
    mockQueryRaw.mockResolvedValue([{ '?column?': 1 }]);
    mockQueryRawUnsafe.mockResolvedValue([]);

    const res = await supertest(createApp()).get('/api/health/deep');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.checks.postgres.ok).toBe(true);
    expect(res.body.checks.jobQueue.ok).toBe(true);
  });

  it('returns 503 when postgres is unavailable', async () => {
    mockQueryRaw.mockRejectedValue(new Error('connection refused'));
    mockQueryRawUnsafe.mockResolvedValue([]);

    const res = await supertest(createApp()).get('/api/health/deep');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.postgres.ok).toBe(false);
    expect(res.body.checks.postgres.error).toContain('connection refused');
  });

  it('returns 503 when job queue schema check fails', async () => {
    mockQueryRaw.mockResolvedValue([]);
    mockQueryRawUnsafe.mockRejectedValue(new Error('schema missing'));

    const res = await supertest(createApp()).get('/api/health/deep');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.jobQueue.ok).toBe(false);
  });

  it('Wonder/WhatsApp outages do not affect health status', async () => {
    // Health checks only cover postgres and jobQueue — no Wonder/WhatsApp checks exist
    mockQueryRaw.mockResolvedValue([]);
    mockQueryRawUnsafe.mockResolvedValue([]);

    const res = await supertest(createApp()).get('/api/health/deep');
    expect(res.status).toBe(200);
    expect(res.body.checks).not.toHaveProperty('wonder');
    expect(res.body.checks).not.toHaveProperty('whatsapp');
  });
});

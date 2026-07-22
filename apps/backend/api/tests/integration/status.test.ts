import supertest from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/app.js';

describe('GET /api/status', () => {
  it('returns 200 with status ok', async () => {
    const response = await supertest(createApp()).get('/api/status');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

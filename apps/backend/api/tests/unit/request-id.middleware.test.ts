import supertest from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/app.js';

describe('request-id middleware', () => {
  const app = createApp();

  it('generates a request ID when none is provided', async () => {
    const res = await supertest(app).get('/api/status');
    expect(res.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('preserves a provided x-request-id', async () => {
    const id = 'my-correlation-id-123';
    const res = await supertest(app).get('/api/status').set('x-request-id', id);
    expect(res.headers['x-request-id']).toBe(id);
  });

  it('preserves a provided x-correlation-id', async () => {
    const id = 'upstream-correlation-456';
    const res = await supertest(app).get('/api/status').set('x-correlation-id', id);
    expect(res.headers['x-correlation-id']).toBe(id);
  });

  it('uses request-id as correlation-id when only request-id is provided', async () => {
    const id = 'req-id-789';
    const res = await supertest(app).get('/api/status').set('x-request-id', id);
    expect(res.headers['x-correlation-id']).toBe(id);
  });
});

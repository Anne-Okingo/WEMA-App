import express from 'express';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler, notFoundHandler } from '../../src/middleware/error-handler.middleware.js';
import { createApp } from '../../src/app/app.js';
import { AppError } from '../../src/shared/errors.js';

describe('not-found handler', () => {
  it('returns 404 JSON for an unknown route', async () => {
    const res = await supertest(createApp()).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

describe('error handler', () => {
  function makeTestApp() {
    const app = express();
    app.get('/test/app-error', () => {
      throw new AppError(422, 'Unprocessable', 'UNPROCESSABLE');
    });
    app.get('/test/unexpected-error', () => {
      throw new Error('boom');
    });
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
  }

  it('returns the AppError status and message', async () => {
    const res = await supertest(makeTestApp()).get('/test/app-error');
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Unprocessable');
    expect(res.body.code).toBe('UNPROCESSABLE');
  });

  it('returns 500 for unexpected errors without a stack trace', async () => {
    const res = await supertest(makeTestApp()).get('/test/unexpected-error');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal Server Error');
    expect(res.body).not.toHaveProperty('stack');
  });
});

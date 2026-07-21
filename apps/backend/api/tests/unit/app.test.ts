import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/app.js';

describe('createApp', () => {
  it('returns an Express application', () => {
    const app = createApp();
    expect(typeof app).toBe('function');
  });
});

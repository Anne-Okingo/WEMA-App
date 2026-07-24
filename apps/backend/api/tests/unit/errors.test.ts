import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/shared/errors.js';

describe('AppError', () => {
  it('sets statusCode, message, and name', () => {
    const err = new AppError(404, 'Not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.name).toBe('AppError');
    expect(err instanceof Error).toBe(true);
  });

  it('sets optional code', () => {
    const err = new AppError(400, 'Bad input', 'VALIDATION_ERROR');
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('code is undefined when not provided', () => {
    const err = new AppError(500, 'Oops');
    expect(err.code).toBeUndefined();
  });
});

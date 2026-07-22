import { describe, expect, it } from 'vitest';
import { environmentSchema } from '../../src/config/environment.js';

const VALID_BASE = {
  NODE_ENV: 'development',
  API_PORT: '3000',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/wema_dev',
  LOG_LEVEL: 'info',
  JWT_SECRET: 'a'.repeat(32),
  JWT_EXPIRES_IN: '15m',
  JOB_QUEUE_SCHEMA: 'wema_jobs',
  WONDER_ENABLED: 'false',
  WHATSAPP_ENABLED: 'false',
} as const;

describe('environmentSchema', () => {
  it('accepts a fully valid configuration', () => {
    const result = environmentSchema.safeParse(VALID_BASE);
    expect(result.success).toBe(true);
  });

  it('applies defaults for optional fields', () => {
    const { NODE_ENV: _, API_PORT: __, LOG_LEVEL: ___, JWT_EXPIRES_IN: ____, JOB_QUEUE_SCHEMA: _____, ...minimal } = VALID_BASE;
    const result = environmentSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.NODE_ENV).toBe('development');
    expect(result.data.API_PORT).toBe(3000);
    expect(result.data.LOG_LEVEL).toBe('info');
    expect(result.data.JWT_EXPIRES_IN).toBe('15m');
    expect(result.data.JOB_QUEUE_SCHEMA).toBe('wema_jobs');
  });

  it('rejects a missing DATABASE_URL', () => {
    const { DATABASE_URL: _, ...rest } = VALID_BASE;
    const result = environmentSchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map((i) => i.path[0]);
    expect(paths).toContain('DATABASE_URL');
  });

  it('rejects a JWT_SECRET shorter than 32 characters', () => {
    const result = environmentSchema.safeParse({ ...VALID_BASE, JWT_SECRET: 'short' });
    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map((i) => i.path[0]);
    expect(paths).toContain('JWT_SECRET');
  });

  it('rejects an invalid NODE_ENV', () => {
    const result = environmentSchema.safeParse({ ...VALID_BASE, NODE_ENV: 'local' });
    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map((i) => i.path[0]);
    expect(paths).toContain('NODE_ENV');
  });

  it('rejects an invalid LOG_LEVEL', () => {
    const result = environmentSchema.safeParse({ ...VALID_BASE, LOG_LEVEL: 'verbose' });
    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map((i) => i.path[0]);
    expect(paths).toContain('LOG_LEVEL');
  });

  it('rejects an out-of-range API_PORT', () => {
    const result = environmentSchema.safeParse({ ...VALID_BASE, API_PORT: '99999' });
    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map((i) => i.path[0]);
    expect(paths).toContain('API_PORT');
  });

  it('rejects a non-numeric API_PORT', () => {
    const result = environmentSchema.safeParse({ ...VALID_BASE, API_PORT: 'abc' });
    expect(result.success).toBe(false);
  });

  describe('Wonder integration', () => {
    it('does not require Wonder credentials when WONDER_ENABLED=false', () => {
      const result = environmentSchema.safeParse({ ...VALID_BASE, WONDER_ENABLED: 'false' });
      expect(result.success).toBe(true);
    });

    it('requires Wonder credentials when WONDER_ENABLED=true', () => {
      const result = environmentSchema.safeParse({ ...VALID_BASE, WONDER_ENABLED: 'true' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.issues[0]?.message).toMatch(/WONDER_BASE_URL/);
    });

    it('accepts a valid Wonder configuration when WONDER_ENABLED=true', () => {
      const result = environmentSchema.safeParse({
        ...VALID_BASE,
        WONDER_ENABLED: 'true',
        WONDER_BASE_URL: 'https://wonder.example.com/api',
        WONDER_CLIENT_ID: 'client-id',
        WONDER_CLIENT_SECRET: 'client-secret',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('WhatsApp integration', () => {
    it('does not require WhatsApp credentials when WHATSAPP_ENABLED=false', () => {
      const result = environmentSchema.safeParse({ ...VALID_BASE, WHATSAPP_ENABLED: 'false' });
      expect(result.success).toBe(true);
    });

    it('requires WhatsApp credentials when WHATSAPP_ENABLED=true', () => {
      const result = environmentSchema.safeParse({ ...VALID_BASE, WHATSAPP_ENABLED: 'true' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.issues[0]?.message).toMatch(/WHATSAPP_API_URL/);
    });

    it('accepts a valid WhatsApp configuration when WHATSAPP_ENABLED=true', () => {
      const result = environmentSchema.safeParse({
        ...VALID_BASE,
        WHATSAPP_ENABLED: 'true',
        WHATSAPP_API_URL: 'https://graph.facebook.com/v19.0',
        WHATSAPP_ACCESS_TOKEN: 'token',
        WHATSAPP_DESTINATION: '+254700000000',
      });
      expect(result.success).toBe(true);
    });
  });
});

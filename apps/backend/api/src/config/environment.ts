import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

// Load .env from the monorepo root, relative to the package directory
dotenv.config({ path: resolve(process.cwd(), '../../../.env') });

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const ENVIRONMENTS = ['development', 'test', 'staging', 'production'] as const;
const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;

const environmentSchema = z.object({
  // Runtime
  NODE_ENV: z.enum(ENVIRONMENTS).default('development'),

  // API
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  // Database
  DATABASE_URL: z.string().min(1),

  // Logging
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),

  // CORS
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:5174')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    ),

  // Background jobs
  JOB_QUEUE_SCHEMA: z.string().default('wema_jobs'),

  // Wonder integration — optional unless WONDER_ENABLED=true
  WONDER_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  WONDER_BASE_URL: z.string().url().optional(),
  WONDER_CLIENT_ID: z.string().optional(),
  WONDER_CLIENT_SECRET: z.string().optional(),

  // WhatsApp integration — optional unless WHATSAPP_ENABLED=true
  WHATSAPP_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  WHATSAPP_API_URL: z.string().url().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_DESTINATION: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Refinements — require integration fields when the integration is enabled
// ---------------------------------------------------------------------------

const refinedSchema = environmentSchema
  .refine(
    (env) =>
      !env.WONDER_ENABLED ||
      (env.WONDER_BASE_URL !== undefined &&
        env.WONDER_CLIENT_ID !== undefined &&
        env.WONDER_CLIENT_SECRET !== undefined),
    {
      message:
        'WONDER_BASE_URL, WONDER_CLIENT_ID, and WONDER_CLIENT_SECRET are required when WONDER_ENABLED=true',
      path: ['WONDER_BASE_URL'],
    }
  )
  .refine(
    (env) =>
      !env.WHATSAPP_ENABLED ||
      (env.WHATSAPP_API_URL !== undefined &&
        env.WHATSAPP_ACCESS_TOKEN !== undefined &&
        env.WHATSAPP_DESTINATION !== undefined),
    {
      message:
        'WHATSAPP_API_URL, WHATSAPP_ACCESS_TOKEN, and WHATSAPP_DESTINATION are required when WHATSAPP_ENABLED=true',
      path: ['WHATSAPP_API_URL'],
    }
  );

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const SECRET_KEYS = new Set([
  'DATABASE_URL',
  'JWT_SECRET',
  'WONDER_CLIENT_SECRET',
  'WHATSAPP_ACCESS_TOKEN',
]);

function redactSecrets(issues: z.ZodIssue[]): z.ZodIssue[] {
  return issues.map((issue) => {
    const field = issue.path[0];
    if (typeof field === 'string' && SECRET_KEYS.has(field)) {
      return { ...issue, message: `[redacted] ${issue.message}` };
    }
    return issue;
  });
}

function loadConfig() {
  const result = refinedSchema.safeParse(process.env);

  if (!result.success) {
    const issues = redactSecrets(result.error.issues);
    const messages = issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    console.error(`Configuration error — application cannot start:\n${messages}`);
    process.exit(1);
  }

  const env = result.data;

  return {
    nodeEnv: env.NODE_ENV,
    api: {
      port: env.API_PORT,
    },
    database: {
      url: env.DATABASE_URL,
    },
    log: {
      level: env.LOG_LEVEL,
    },
    auth: {
      jwtSecret: env.JWT_SECRET,
      jwtExpiresIn: env.JWT_EXPIRES_IN,
    },
    cors: {
      origins: env.CORS_ORIGINS,
    },
    jobs: {
      queueSchema: env.JOB_QUEUE_SCHEMA,
    },
    wonder: {
      enabled: env.WONDER_ENABLED,
      baseUrl: env.WONDER_BASE_URL,
      clientId: env.WONDER_CLIENT_ID,
      clientSecret: env.WONDER_CLIENT_SECRET,
    },
    whatsapp: {
      enabled: env.WHATSAPP_ENABLED,
      apiUrl: env.WHATSAPP_API_URL,
      accessToken: env.WHATSAPP_ACCESS_TOKEN,
      destination: env.WHATSAPP_DESTINATION,
    },
  } as const;
}

export type Config = ReturnType<typeof loadConfig>;

export { loadConfig, refinedSchema as environmentSchema };

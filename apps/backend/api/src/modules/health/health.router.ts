import { getPrismaClient } from '@wema/database';
import express, { type Router } from 'express';

async function checkPostgres(): Promise<{ ok: boolean; error?: string }> {
  try {
    await getPrismaClient().$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}

async function checkJobQueue(schema: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await getPrismaClient().$queryRawUnsafe(
      `SELECT 1 FROM information_schema.schemata WHERE schema_name = $1`,
      schema,
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}

export function createHealthRouter(jobQueueSchema: string): Router {
  const router = express.Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/health/deep', async (_req, res) => {
    const [postgres, jobQueue] = await Promise.all([
      checkPostgres(),
      checkJobQueue(jobQueueSchema),
    ]);

    const allOk = postgres.ok && jobQueue.ok;

    res.status(allOk ? 200 : 503).json({
      status: allOk ? 'ok' : 'degraded',
      checks: { postgres, jobQueue },
    });
  });

  return router;
}

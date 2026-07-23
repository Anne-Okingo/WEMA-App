import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectDatabase, disconnectDatabase, getPrismaClient } from '../src/client.js';

const TEST_URL = process.env['DATABASE_TEST_URL'];

// Skip the entire suite when no test database is configured
const describeWithDb = TEST_URL ? describe : describe.skip;

describeWithDb('database integration', () => {
  beforeAll(async () => {
    // Point Prisma at the test database and apply all migrations
    const schemaPath = resolve(import.meta.dirname, '../prisma/schema.prisma');
    execSync(`prisma migrate deploy --schema=${schemaPath}`, {
      env: { ...process.env, DATABASE_URL: TEST_URL },
      stdio: 'pipe',
    });

    process.env['DATABASE_URL'] = TEST_URL;
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('connects to the test database', async () => {
    const client = getPrismaClient();
    // $queryRaw with a trivial query confirms the connection is live
    const result = await client.$queryRaw<[{ one: number }]>`SELECT 1 AS one`;
    expect(result[0]?.one).toBe(1);
  });

  it('migration created the _schema_version table', async () => {
    const client = getPrismaClient();
    const result = await client.$queryRaw<
      [{ exists: boolean }]
    >`SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = '_schema_version'
      ) AS exists`;
    expect(result[0]?.exists).toBe(true);
  });

  it('can insert and query a _SchemaVersion row', async () => {
    const client = getPrismaClient();
    const version = `test-${Date.now().toString()}`;

    const created = await client.schemaVersion.create({
      data: { version },
    });

    expect(created.version).toBe(version);
    expect(created.id).toBeTypeOf('number');

    await client.schemaVersion.delete({ where: { id: created.id } });
  });
});

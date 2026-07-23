import { Writable } from 'node:stream';
import pino from 'pino';
import { describe, expect, it } from 'vitest';

const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.token',
  'req.body.accessToken',
  'req.body.refreshToken',
  'req.body.answers',
  'req.body.patientId',
  'req.body.nationalId',
];

function makeLogger() {
  const lines: string[] = [];
  const dest = new Writable({
    write(chunk: Buffer, _enc: string, cb: () => void) {
      lines.push(chunk.toString());
      cb();
    },
  });
  const log = pino({ level: 'info', redact: { paths: REDACTED_PATHS, censor: '[REDACTED]' } }, dest);
  return { log, lines };
}

describe('sensitive-field redaction', () => {
  it('redacts authorization header', async () => {
    const { log, lines } = await makeLogger();
    log.info({ req: { headers: { authorization: 'Bearer secret-token' } } }, 'test');
    expect(lines[0]).toContain('[REDACTED]');
    expect(lines[0]).not.toContain('secret-token');
  });

  it('redacts password in body', async () => {
    const { log, lines } = await makeLogger();
    log.info({ req: { body: { password: 'hunter2' } } }, 'test');
    expect(lines[0]).toContain('[REDACTED]');
    expect(lines[0]).not.toContain('hunter2');
  });

  it('redacts patientId in body', async () => {
    const { log, lines } = await makeLogger();
    log.info({ req: { body: { patientId: 'PAT-001' } } }, 'test');
    expect(lines[0]).toContain('[REDACTED]');
    expect(lines[0]).not.toContain('PAT-001');
  });

  it('redacts assessment answers in body', async () => {
    const { log, lines } = await makeLogger();
    log.info({ req: { body: { answers: [1, 2, 3] } } }, 'test');
    expect(lines[0]).toContain('[REDACTED]');
    expect(lines[0]).not.toContain('[1,2,3]');
  });

  it('does not redact non-sensitive fields', async () => {
    const { log, lines } = await makeLogger();
    log.info({ req: { body: { name: 'visible' } } }, 'test');
    expect(lines[0]).toContain('visible');
  });
});

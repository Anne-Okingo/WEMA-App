import pino from 'pino';

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

export const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  redact: { paths: REDACTED_PATHS, censor: '[REDACTED]' },
  ...(process.env['NODE_ENV'] !== 'production' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
});

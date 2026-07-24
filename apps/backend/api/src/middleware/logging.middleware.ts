import { pinoHttp } from 'pino-http';
import { CORRELATION_ID_HEADER, REQUEST_ID_HEADER } from './request-id.middleware.js';
import { logger } from '../shared/logger.js';

const isProduction = process.env['NODE_ENV'] === 'production';
const isDev = process.env['NODE_ENV'] !== 'production' && process.env['NODE_ENV'] !== 'test';

export const loggingMiddleware = pinoHttp({
  // Only pass the shared logger in production — transport-backed loggers break
  // pino-http's internal stringify symbol in dev/test environments.
  logger: isProduction ? logger : undefined,
  ...(isDev && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
  level: process.env['LOG_LEVEL'] ?? 'info',
  genReqId: (req) => req.headers[REQUEST_ID_HEADER] as string,
  customProps: (req) => ({
    correlationId: req.headers[CORRELATION_ID_HEADER],
  }),
});

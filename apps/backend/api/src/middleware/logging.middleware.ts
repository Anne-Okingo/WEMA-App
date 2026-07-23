import { pinoHttp } from 'pino-http';
import { CORRELATION_ID_HEADER, REQUEST_ID_HEADER } from './request-id.middleware.js';
import { logger } from '../shared/logger.js';

const isDev = process.env['NODE_ENV'] !== 'production' && process.env['NODE_ENV'] !== 'test';

export const loggingMiddleware = pinoHttp({
  // Passing a transport-backed logger instance breaks pino-http's internal
  // stringify symbol. Use logger.child() which inherits options without the
  // worker-thread transport wrapper.
  logger: isDev ? undefined : logger,
  ...(isDev && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
  level: process.env['LOG_LEVEL'] ?? 'info',
  genReqId: (req) => req.headers[REQUEST_ID_HEADER] as string,
  customProps: (req) => ({
    correlationId: req.headers[CORRELATION_ID_HEADER],
  }),
});

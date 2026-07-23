import { pinoHttp } from 'pino-http';
import type { IncomingMessage } from 'http';
import { CORRELATION_ID_HEADER, REQUEST_ID_HEADER } from './request-id.middleware.js';
import { logger } from '../shared/logger.js';

export const loggingMiddleware = pinoHttp({
  logger,
  genReqId: (req: IncomingMessage) => req.headers[REQUEST_ID_HEADER] as string,
  customProps: (req: IncomingMessage) => ({
    correlationId: req.headers[CORRELATION_ID_HEADER],
  }),
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie'],
    censor: '[REDACTED]',
  },
});

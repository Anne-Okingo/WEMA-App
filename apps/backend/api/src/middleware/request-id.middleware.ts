import { type NextFunction, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const REQUEST_ID_HEADER = 'x-request-id';
export const CORRELATION_ID_HEADER = 'x-correlation-id';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers[REQUEST_ID_HEADER] as string | undefined) ?? uuidv4();
  const correlationId = (req.headers[CORRELATION_ID_HEADER] as string | undefined) ?? requestId;

  req.headers[REQUEST_ID_HEADER] = requestId;
  req.headers[CORRELATION_ID_HEADER] = correlationId;

  res.setHeader(REQUEST_ID_HEADER, requestId);
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  next();
}

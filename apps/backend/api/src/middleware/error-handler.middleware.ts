import { type NextFunction, type Request, type Response } from 'express';
import { AppError } from '../shared/errors.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not Found' });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.code !== undefined && { code: err.code }),
    });
    return;
  }

  const isProd = process.env['NODE_ENV'] === 'production';
  res.status(500).json({
    error: 'Internal Server Error',
    ...(!isProd && err instanceof Error && { detail: err.message }),
  });
}

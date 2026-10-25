import { type Request, type Response, type NextFunction } from 'express';
import logger from '../lib/logger.js';

/** Domain errors that map to specific HTTP responses. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Pre-built factories for the most common cases
export const notFound = (msg = 'Resource not found') => new AppError(404, 'NOT_FOUND', msg);
export const forbidden = (msg = 'Forbidden') => new AppError(403, 'FORBIDDEN', msg);
export const conflict = (msg = 'Conflict') => new AppError(409, 'CONFLICT', msg);
export const badRequest = (msg = 'Bad request') => new AppError(400, 'BAD_REQUEST', msg);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    return;
  }

  // Prisma unique-constraint violation
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  ) {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'A record with that value already exists.' } });
    return;
  }

  // Unknown error — log with context, return generic message
  logger.error({ err, url: req.url, method: req.method }, 'Unhandled error');
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
}

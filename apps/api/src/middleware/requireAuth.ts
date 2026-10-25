import { type Request, type Response, type NextFunction } from 'express';

/** Rejects requests that have no authenticated session (no req.user). */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } });
    return;
  }
  next();
}

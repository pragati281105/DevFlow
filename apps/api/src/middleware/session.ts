import { type Request, type Response, type NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { hashToken } from '../lib/crypto.js';

/** Augment Express Request with the resolved user and session. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email: string; name: string; avatarUrl: string | null };
      sessionId?: string;
      csrfToken?: string;
    }
  }
}

const COOKIE_NAME = 'devflow_session';

/**
 * Loads the authenticated user from the session cookie.
 * Attaches req.user and req.sessionId when a valid session is found.
 * Does NOT reject unauthenticated requests — use requireAuth for that.
 */
export async function sessionMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const raw: string | undefined = req.cookies?.[COOKIE_NAME];
    if (!raw) return next();

    const tokenHash = await hashToken(raw);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
    });

    if (!session || session.expiresAt < new Date()) return next();

    req.user = session.user;
    req.sessionId = session.id;
    req.csrfToken = session.csrfToken;
  } catch {
    // Don't crash the request on session lookup failure
  }
  next();
}

export { COOKIE_NAME };

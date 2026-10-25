import { Router } from 'express';
import cookieParser from 'cookie-parser';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import { COOKIE_NAME } from '../../middleware/session.js';
import { registerSchema, loginSchema } from './schemas.js';
import * as service from './service.js';

const router = Router();

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

/** POST /api/auth/register */
router.post('/register', authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const user = await service.registerUser(req.body);
    const { rawToken, csrfToken } = await service.createSession(user.id);
    res.cookie(COOKIE_NAME, rawToken, COOKIE_OPTS);
    res.status(201).json({ user, csrfToken });
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/login */
router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const user = await service.loginUser(req.body);
    const { rawToken, csrfToken } = await service.createSession(user.id);
    res.cookie(COOKIE_NAME, rawToken, COOKIE_OPTS);
    res.status(200).json({ user, csrfToken });
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/logout */
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    if (req.sessionId) await service.revokeSession(req.sessionId);
    res.clearCookie(COOKIE_NAME);
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** GET /api/auth/me */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await service.getMe(req.user!.id);
    res.status(200).json({ user, csrfToken: req.csrfToken });
  } catch (err) {
    next(err);
  }
});

export default router;

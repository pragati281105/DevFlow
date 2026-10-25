import rateLimit from 'express-rate-limit';

/** Auth endpoint rate limiter: 10 requests per 15 minutes per IP. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } },
  skip: () => process.env.NODE_ENV === 'test',
});

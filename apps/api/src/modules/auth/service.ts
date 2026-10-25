import prisma from '../../lib/prisma.js';
import { hashPassword, verifyPassword, generateToken, hashToken } from '../../lib/crypto.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { RegisterInput, LoginInput } from './schemas.js';

// Session lifetime: 30 days
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  createdAt: true,
} as const;

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError(409, 'EMAIL_TAKEN', 'An account with that email already exists.');

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { email: input.email, name: input.name, passwordHash },
    select: USER_SELECT,
  });
  return user;
}

export async function createSession(userId: string) {
  const rawToken = generateToken(32);
  const csrfToken = generateToken(24);
  const tokenHash = await hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({ data: { tokenHash, csrfToken, userId, expiresAt } });
  return { rawToken, csrfToken };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');

  const { id, email, name, avatarUrl, createdAt } = user;
  return { id, email, name, avatarUrl, createdAt };
}

export async function revokeSession(sessionId: string) {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found.');
  return user;
}

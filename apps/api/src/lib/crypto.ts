import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const SALT_ROUNDS = 12;

/** Hash a plain-text password using bcrypt. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** Verify a plain-text password against a stored bcrypt hash. */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Generate a cryptographically random opaque token (hex string). */
export function generateToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('hex');
}

/** Hash a token with SHA-256 for safe storage. Not for passwords. */
export async function hashToken(token: string): Promise<string> {
  const { createHash } = await import('crypto');
  return createHash('sha256').update(token).digest('hex');
}

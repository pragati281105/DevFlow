/**
 * Auth integration tests.
 * Each test group is self-contained — it registers its own user with a unique
 * email and cleans up after itself.  This avoids ordering dependencies between
 * describe blocks.
 */
import request from 'supertest';
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { createApp } from '../app.js';
import prisma from '../lib/prisma.js';

if (process.env['TEST_DATABASE_URL']) {
  process.env['DATABASE_URL'] = process.env['TEST_DATABASE_URL'];
}

const app = createApp();
const PW = 'Str0ngP@ssword99';

/** Register a fresh user and return { cookie, csrfToken, email } */
async function freshUser(tag: string) {
  const email = `auth-${tag}-${Date.now()}@devflow-test.local`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test', email, password: PW });
  expect(res.status).toBe(201);
  const cookie = (res.headers['set-cookie'] as unknown as string[])[0]!;
  return { email, cookie, csrfToken: res.body.csrfToken as string };
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@devflow-test.local' } } });
  await prisma.$disconnect();
});

// ─── Validation ───────────────────────────────────────────────────────────────
describe('POST /api/auth/register — validation', () => {
  it('rejects invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'X', email: 'bad', password: PW });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects password shorter than 8 chars', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'X', email: `v-${Date.now()}@devflow-test.local`, password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ─── Register ─────────────────────────────────────────────────────────────────
describe('POST /api/auth/register — happy path', () => {
  it('creates user, sets HttpOnly cookie, returns csrfToken', async () => {
    const email = `reg-${Date.now()}@devflow-test.local`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email, password: PW });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(typeof res.body.csrfToken).toBe('string');
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c: string) => c.startsWith('devflow_session='))).toBe(true);
  });

  it('rejects duplicate email with 409 EMAIL_TAKEN', async () => {
    const email = `dup-${Date.now()}@devflow-test.local`;
    await request(app).post('/api/auth/register').send({ name: 'A', email, password: PW });
    const res = await request(app).post('/api/auth/register').send({ name: 'B', email, password: PW });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });
});

// ─── /me ─────────────────────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  it('returns 401 without session', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user and csrfToken with valid cookie', async () => {
    const { email, cookie } = await freshUser('me');
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
    expect(typeof res.body.csrfToken).toBe('string');
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('rejects wrong password with 401 INVALID_CREDENTIALS', async () => {
    const { email } = await freshUser('login-bad');
    const res = await request(app).post('/api/auth/login').send({ email, password: 'WrongPass99!' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 200 + session cookie on correct credentials', async () => {
    const { email } = await freshUser('login-ok');
    const res = await request(app).post('/api/auth/login').send({ email, password: PW });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c: string) => c.startsWith('devflow_session='))).toBe(true);
  });
});

// ─── Logout ──────────────────────────────────────────────────────────────────
describe('POST /api/auth/logout', () => {
  it('returns 401 without session', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });

  it('returns 200 and clears cookie with valid session', async () => {
    const { cookie } = await freshUser('logout');
    const res = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c: string) => c.includes('devflow_session=;') || c.includes('devflow_session=;'))).toBe(true);
  });

  it('session is invalid after logout', async () => {
    const { cookie } = await freshUser('logout2');
    await request(app).post('/api/auth/logout').set('Cookie', cookie);
    const meRes = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(meRes.status).toBe(401);
  });
});

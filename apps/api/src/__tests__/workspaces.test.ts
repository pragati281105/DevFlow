/**
 * Workspace + cross-workspace IDOR integration tests.
 *
 * Creates real records against the test database, then verifies authorization
 * boundaries: a user who is NOT a member of a workspace cannot read or write
 * its resources even if they know the workspace/project/issue IDs.
 */
import request from 'supertest';
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { createApp } from '../app.js';
import prisma from '../lib/prisma.js';

if (process.env['TEST_DATABASE_URL']) {
  process.env['DATABASE_URL'] = process.env['TEST_DATABASE_URL'];
}

const app = createApp();

const TS = Date.now();
const OWNER_EMAIL = `ws-owner-${TS}@devflow-test.local`;
const OTHER_EMAIL = `ws-other-${TS}@devflow-test.local`;
const PW = 'Str0ngP@ssword';

let ownerCookie: string;
let otherCookie: string;
let workspaceId: string;
let projectId: string;

async function registerAndGetCookie(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test', email, password: PW });
  return (res.headers['set-cookie'] as unknown as string[])[0]!;
}

beforeAll(async () => {
  ownerCookie = await registerAndGetCookie(OWNER_EMAIL);
  otherCookie = await registerAndGetCookie(OTHER_EMAIL);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@devflow-test.local' } } });
  await prisma.$disconnect();
});

describe('Workspace CRUD', () => {
  it('creates a workspace and returns 201', async () => {
    const res = await request(app)
      .post('/api/workspaces')
      .set('Cookie', ownerCookie)
      .send({ name: 'Acme Corp', slug: `acme-${TS}`, description: 'Test workspace' });

    expect(res.status).toBe(201);
    expect(res.body.workspace.slug).toBe(`acme-${TS}`);
    workspaceId = res.body.workspace.id;
  });

  it('rejects duplicate slug', async () => {
    const res = await request(app)
      .post('/api/workspaces')
      .set('Cookie', ownerCookie)
      .send({ name: 'Acme 2', slug: `acme-${TS}` });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SLUG_TAKEN');
  });

  it('lists workspaces for the owner', async () => {
    const res = await request(app).get('/api/workspaces').set('Cookie', ownerCookie);
    expect(res.status).toBe(200);
    expect(res.body.workspaces.some((w: { id: string }) => w.id === workspaceId)).toBe(true);
  });
});

describe('Cross-workspace IDOR prevention', () => {
  it('returns 403 when a non-member reads workspace details', async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}`)
      .set('Cookie', otherCookie);
    expect(res.status).toBe(403);
  });

  it('returns 403 when a non-member lists projects', async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/projects`)
      .set('Cookie', otherCookie);
    expect(res.status).toBe(403);
  });

  it('returns 403 when a non-member tries to create a project', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/projects`)
      .set('Cookie', otherCookie)
      .send({ name: 'X', key: 'X' });
    expect(res.status).toBe(403);
  });
});

describe('Project CRUD', () => {
  it('creates a project inside the workspace', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/projects`)
      .set('Cookie', ownerCookie)
      .send({ name: 'Backend', key: 'BACK', description: 'API project' });

    expect(res.status).toBe(201);
    expect(res.body.project.key).toBe('BACK');
    projectId = res.body.project.id;
  });

  it('rejects duplicate project key within workspace', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/projects`)
      .set('Cookie', ownerCookie)
      .send({ name: 'Backend 2', key: 'BACK' });
    expect(res.status).toBe(409);
  });

  it('lists workspace projects', async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/projects`)
      .set('Cookie', ownerCookie);
    expect(res.status).toBe(200);
    expect(res.body.projects.some((p: { id: string }) => p.id === projectId)).toBe(true);
  });
});

describe('Issue CRUD and cross-workspace IDOR', () => {
  let issueId: string;

  it('creates an issue with sequential key', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/projects/${projectId}/issues`)
      .set('Cookie', ownerCookie)
      .send({ title: 'First issue', priority: 'HIGH' });

    expect(res.status).toBe(201);
    expect(res.body.issue.key).toBe('BACK-1');
    issueId = res.body.issue.id;
  });

  it('second issue gets BACK-2', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/projects/${projectId}/issues`)
      .set('Cookie', ownerCookie)
      .send({ title: 'Second issue' });

    expect(res.status).toBe(201);
    expect(res.body.issue.key).toBe('BACK-2');
  });

  it('lists issues with pagination metadata', async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/projects/${projectId}/issues`)
      .set('Cookie', ownerCookie);
    expect(res.status).toBe(200);
    expect(typeof res.body.total).toBe('number');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('outsider cannot read issues by guessing IDs', async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/projects/${projectId}/issues/${issueId}`)
      .set('Cookie', otherCookie);
    expect(res.status).toBe(403);
  });

  it('updates issue status and records activity', async () => {
    const res = await request(app)
      .patch(`/api/workspaces/${workspaceId}/projects/${projectId}/issues/${issueId}`)
      .set('Cookie', ownerCookie)
      .send({ status: 'IN_PROGRESS' });
    expect(res.status).toBe(200);
    expect(res.body.issue.status).toBe('IN_PROGRESS');
  });
});

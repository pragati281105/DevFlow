/**
 * Seed script — creates realistic dev data.
 * Run: npx prisma db seed  (configured in package.json)
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database…');

  // ── Users ───────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@devflow.dev' },
    update: {},
    create: { name: 'Alice Chen', email: 'alice@devflow.dev', passwordHash },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@devflow.dev' },
    update: {},
    create: { name: 'Bob Kumar', email: 'bob@devflow.dev', passwordHash },
  });

  const carol = await prisma.user.upsert({
    where: { email: 'carol@devflow.dev' },
    update: {},
    create: { name: 'Carol Diaz', email: 'carol@devflow.dev', passwordHash },
  });

  console.log('  ✔ Users');

  // ── Workspace ────────────────────────────────────────────────────────────
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'acme-engineering' },
    update: {},
    create: {
      name: 'Acme Engineering',
      slug: 'acme-engineering',
      description: 'Main engineering workspace',
    },
  });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: alice.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: alice.id, role: 'OWNER' },
  });
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: bob.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: bob.id, role: 'ADMIN' },
  });
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: carol.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: carol.id, role: 'MEMBER' },
  });

  console.log('  ✔ Workspace + members');

  // ── Labels ───────────────────────────────────────────────────────────────
  const labelData = [
    { name: 'bug', color: '#f87171' },
    { name: 'feature', color: '#818cf8' },
    { name: 'docs', color: '#34d399' },
    { name: 'chore', color: '#fbbf24' },
    { name: 'security', color: '#f43f5e' },
  ];

  for (const l of labelData) {
    await prisma.label.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name: l.name } },
      update: {},
      create: { workspaceId: workspace.id, ...l },
    });
  }
  console.log('  ✔ Labels');

  // ── Projects ──────────────────────────────────────────────────────────────
  const backendProject = await prisma.project.upsert({
    where: { workspaceId_key: { workspaceId: workspace.id, key: 'BACK' } },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: 'Backend API',
      key: 'BACK',
      description: 'Express + Prisma REST API',
      issueCount: 5,
    },
  });

  const frontendProject = await prisma.project.upsert({
    where: { workspaceId_key: { workspaceId: workspace.id, key: 'FRONT' } },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: 'Frontend',
      key: 'FRONT',
      description: 'React + Vite + Tailwind client',
      issueCount: 3,
    },
  });

  console.log('  ✔ Projects');

  // ── Issues ────────────────────────────────────────────────────────────────
  const issueData = [
    { projectId: backendProject.id, key: 'BACK-1', title: 'Set up authentication middleware', status: 'DONE'        as const, priority: 'HIGH'      as const, assigneeId: alice.id },
    { projectId: backendProject.id, key: 'BACK-2', title: 'Design Prisma schema for all entities', status: 'DONE'  as const, priority: 'URGENT'    as const, assigneeId: alice.id },
    { projectId: backendProject.id, key: 'BACK-3', title: 'Implement issue CRUD with key generation', status: 'IN_PROGRESS' as const, priority: 'HIGH' as const, assigneeId: bob.id },
    { projectId: backendProject.id, key: 'BACK-4', title: 'Add sprint planning APIs', status: 'TODO'               as const, priority: 'MEDIUM'    as const, assigneeId: bob.id },
    { projectId: backendProject.id, key: 'BACK-5', title: 'GitHub webhook verification + idempotency', status: 'BACKLOG' as const, priority: 'MEDIUM' as const, assigneeId: null },
    { projectId: frontendProject.id, key: 'FRONT-1', title: 'Create design system tokens + global CSS', status: 'DONE' as const, priority: 'HIGH'  as const, assigneeId: carol.id },
    { projectId: frontendProject.id, key: 'FRONT-2', title: 'Build issue list + kanban board views', status: 'IN_PROGRESS' as const, priority: 'HIGH' as const, assigneeId: carol.id },
    { projectId: frontendProject.id, key: 'FRONT-3', title: 'Sprint board and analytics dashboard', status: 'BACKLOG' as const, priority: 'MEDIUM' as const, assigneeId: null },
  ];

  for (const data of issueData) {
    const existing = await prisma.issue.findFirst({
      where: { projectId: data.projectId, key: data.key },
    });
    if (!existing) {
      await prisma.issue.create({
        data: {
          workspaceId: workspace.id,
          projectId: data.projectId,
          key: data.key,
          title: data.title,
          status: data.status,
          priority: data.priority,
          assigneeId: data.assigneeId,
        },
      });
    }
  }

  console.log('  ✔ Issues');

  // ── Sprint ────────────────────────────────────────────────────────────────
  const now = new Date();
  const sprintStart = new Date(now);
  sprintStart.setDate(now.getDate() - 7);
  const sprintEnd = new Date(now);
  sprintEnd.setDate(now.getDate() + 7);

  const existingSprint = await prisma.sprint.findFirst({
    where: { workspaceId: workspace.id, name: 'Sprint 1' },
  });
  if (!existingSprint) {
    await prisma.sprint.create({
      data: {
        workspaceId: workspace.id,
        name: 'Sprint 1',
        goal: 'Deliver the core backend API foundation',
        startDate: sprintStart,
        endDate: sprintEnd,
        status: 'ACTIVE',
      },
    });
  }

  console.log('  ✔ Sprint');
  console.log('\n✅ Seed complete.');
  console.log('   Login: alice@devflow.dev / bob@devflow.dev / carol@devflow.dev');
  console.log('   Password: Password123!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

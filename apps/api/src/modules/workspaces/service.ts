import { type Prisma } from '@prisma/client';
import prisma from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { CreateWorkspaceInput, UpdateWorkspaceInput, InviteMemberInput } from './schemas.js';

const WORKSPACE_SELECT = {
  id: true, name: true, slug: true, description: true, createdAt: true,
} as const;

type WorkspaceRow = { id: string; name: string; slug: string; description: string | null; createdAt: Date; }

export async function createWorkspace(userId: string, input: CreateWorkspaceInput) {
  const existing = await prisma.workspace.findUnique({ where: { slug: input.slug } });
  if (existing) throw new AppError(409, 'SLUG_TAKEN', 'A workspace with that slug already exists.');

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const ws = await tx.workspace.create({ data: input, select: WORKSPACE_SELECT });
    await tx.workspaceMember.create({ data: { workspaceId: ws.id, userId, role: 'OWNER' } });
    return ws;
  });
}

export async function listWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: { select: WORKSPACE_SELECT } },
    orderBy: { createdAt: 'asc' },
  });
  return memberships.map((m: { workspace: WorkspaceRow; role: string }) => ({ ...m.workspace, role: m.role }));
}

export async function getWorkspace(workspaceId: string) {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: WORKSPACE_SELECT });
  if (!ws) throw new AppError(404, 'NOT_FOUND', 'Workspace not found.');
  return ws;
}

export async function updateWorkspace(workspaceId: string, input: UpdateWorkspaceInput) {
  if (input.slug) {
    const conflict = await prisma.workspace.findFirst({ where: { slug: input.slug, NOT: { id: workspaceId } } });
    if (conflict) throw new AppError(409, 'SLUG_TAKEN', 'A workspace with that slug already exists.');
  }
  return prisma.workspace.update({ where: { id: workspaceId }, data: input, select: WORKSPACE_SELECT });
}

export async function listMembers(workspaceId: string) {
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function inviteMember(workspaceId: string, input: InviteMemberInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'No account found with that email address.');
  const exists = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
  });
  if (exists) throw new AppError(409, 'ALREADY_MEMBER', 'User is already a workspace member.');
  return prisma.workspaceMember.create({
    data: { workspaceId, userId: user.id, role: input.role },
    include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
  });
}

export async function removeMember(workspaceId: string, memberId: string, actorId: string) {
  const membership = await prisma.workspaceMember.findUnique({ where: { id: memberId } });
  if (!membership || membership.workspaceId !== workspaceId)
    throw new AppError(404, 'NOT_FOUND', 'Membership not found.');
  if (membership.role === 'OWNER') throw new AppError(403, 'FORBIDDEN', 'Cannot remove the workspace owner.');
  if (membership.userId === actorId) throw new AppError(400, 'BAD_REQUEST', 'Use the leave endpoint to remove yourself.');
  await prisma.workspaceMember.delete({ where: { id: memberId } });
}

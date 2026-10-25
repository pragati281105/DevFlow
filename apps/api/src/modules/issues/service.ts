import { type Prisma } from '@prisma/client';
import prisma from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { CreateIssueInput, UpdateIssueInput, IssueQuery } from './schemas.js';

const ISSUE_SELECT = {
  id: true, workspaceId: true, projectId: true, key: true, title: true,
  description: true, status: true, priority: true, assigneeId: true,
  dueDate: true, archived: true, sortOrder: true, createdAt: true, updatedAt: true,
  assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
  labels: { include: { label: { select: { id: true, name: true, color: true } } } },
} as const;

async function allocateKey(projectId: string): Promise<string> {
  const project = await prisma.project.update({
    where: { id: projectId },
    data: { issueCount: { increment: 1 } },
    select: { key: true, issueCount: true },
  });
  return `${project.key}-${project.issueCount}`;
}

export async function createIssue(
  workspaceId: string, projectId: string, actorId: string, input: CreateIssueInput,
) {
  const project = await prisma.project.findFirst({ where: { id: projectId, workspaceId } });
  if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found.');

  const { labelIds, ...rest } = input;
  const key = await allocateKey(projectId);

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.issue.create({
      data: {
        workspaceId, projectId, key, ...rest,
        dueDate: rest.dueDate ? new Date(rest.dueDate) : null,
        labels: labelIds?.length ? { create: labelIds.map((labelId) => ({ labelId })) } : undefined,
      },
      select: ISSUE_SELECT,
    });
    await tx.activityEvent.create({
      data: {
        workspaceId, issueId: created.id, actorId,
        type: 'ISSUE_CREATED', payload: { key: created.key, title: created.title },
      },
    });
    return created;
  });
}

export async function listIssues(workspaceId: string, projectId: string, query: IssueQuery) {
  const { status, priority, assigneeId, archived, page, pageSize, search } = query;
  const where = {
    workspaceId, projectId,
    archived: archived || false,
    ...(status && { status }),
    ...(priority && { priority }),
    ...(assigneeId && { assigneeId }),
    ...(search && { OR: [
      { title: { contains: search, mode: 'insensitive' as const } },
      { key:   { contains: search, mode: 'insensitive' as const } },
    ]}),
  };
  const [total, items] = await prisma.$transaction([
    prisma.issue.count({ where }),
    prisma.issue.findMany({
      where, select: ISSUE_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize, take: pageSize,
    }),
  ]);
  return { total, page, pageSize, items };
}

export async function getIssue(workspaceId: string, issueId: string) {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, workspaceId },
    select: {
      ...ISSUE_SELECT,
      comments: {
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'asc' },
      },
      activities: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });
  if (!issue) throw new AppError(404, 'NOT_FOUND', 'Issue not found.');
  return issue;
}

export async function updateIssue(
  workspaceId: string, issueId: string, actorId: string, input: UpdateIssueInput,
) {
  const existing = await prisma.issue.findFirst({ where: { id: issueId, workspaceId } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Issue not found.');

  const { dueDate, ...rest } = input;

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const issue = await tx.issue.update({
      where: { id: issueId },
      data: { ...rest, ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }) },
      select: ISSUE_SELECT,
    });
    if (rest.status && rest.status !== existing.status) {
      await tx.activityEvent.create({
        data: {
          workspaceId, issueId, actorId,
          type: 'STATUS_CHANGED', payload: { from: existing.status, to: rest.status },
        },
      });
    }
    return issue;
  });
}

export async function deleteIssue(workspaceId: string, issueId: string) {
  const issue = await prisma.issue.findFirst({ where: { id: issueId, workspaceId } });
  if (!issue) throw new AppError(404, 'NOT_FOUND', 'Issue not found.');
  await prisma.issue.delete({ where: { id: issueId } });
}

import { type Prisma } from '@prisma/client';
import prisma from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { CreateCommentInput } from './schemas.js';

export async function createComment(
  workspaceId: string,
  issueId: string,
  authorId: string,
  input: CreateCommentInput,
) {
  const issue = await prisma.issue.findFirst({ where: { id: issueId, workspaceId } });
  if (!issue) throw new AppError(404, 'NOT_FOUND', 'Issue not found.');

  const comment = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const c = await tx.comment.create({
      data: { issueId, authorId, body: input.body },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });
    await tx.activityEvent.create({
      data: {
        workspaceId,
        issueId,
        actorId: authorId,
        type: 'COMMENT_ADDED',
        payload: { commentId: c.id },
      },
    });
    return c;
  });

  return comment;
}

export async function listComments(workspaceId: string, issueId: string) {
  const issue = await prisma.issue.findFirst({ where: { id: issueId, workspaceId } });
  if (!issue) throw new AppError(404, 'NOT_FOUND', 'Issue not found.');

  return prisma.comment.findMany({
    where: { issueId },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function deleteComment(
  workspaceId: string,
  issueId: string,
  commentId: string,
  userId: string,
) {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, issueId },
    include: { issue: { select: { workspaceId: true } } },
  });
  if (!comment || comment.issue.workspaceId !== workspaceId)
    throw new AppError(404, 'NOT_FOUND', 'Comment not found.');
  if (comment.authorId !== userId)
    throw new AppError(403, 'FORBIDDEN', 'You can only delete your own comments.');
  await prisma.comment.delete({ where: { id: commentId } });
}

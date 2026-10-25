import { type Request, type Response, type NextFunction } from 'express';
import { type MemberRole } from '@prisma/client';
import prisma from '../lib/prisma.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      membership?: { id: string; role: MemberRole; workspaceId: string };
    }
  }
}

const ROLE_RANK: Record<MemberRole, number> = {
  OWNER: 4, ADMIN: 3, MEMBER: 2, VIEWER: 1,
};

export function requireMember(minimumRole: MemberRole = 'VIEWER') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const workspaceId = String((req.params as Record<string, string>)['workspaceId'] ?? '');
    if (!workspaceId) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'workspaceId param missing.' } });
      return;
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.user!.id } },
    });

    if (!membership) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You are not a member of this workspace.' } });
      return;
    }

    if (ROLE_RANK[membership.role] < ROLE_RANK[minimumRole]) {
      res.status(403).json({
        error: { code: 'INSUFFICIENT_ROLE', message: `Role ${minimumRole} or higher is required.` },
      });
      return;
    }

    req.membership = { id: membership.id, role: membership.role, workspaceId };
    next();
  };
}

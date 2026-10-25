import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireMember } from '../../middleware/requireMember.js';
import { createCommentSchema } from './schemas.js';
import * as service from './service.js';

// Mounted at /api/workspaces/:workspaceId/projects/:projectId/issues/:issueId/comments
const router = Router({ mergeParams: true });

function p(req: Parameters<Parameters<typeof router.get>[1]>[0], key: string): string {
  return String((req.params as Record<string, string>)[key] ?? '');
}

router.use(requireAuth, requireMember());

router.post('/', requireMember('MEMBER'), validate(createCommentSchema), async (req, res, next) => {
  try {
    const comment = await service.createComment(p(req, 'workspaceId'), p(req, 'issueId'), req.user!.id, req.body);
    res.status(201).json({ comment });
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const comments = await service.listComments(p(req, 'workspaceId'), p(req, 'issueId'));
    res.status(200).json({ comments });
  } catch (err) { next(err); }
});

router.delete('/:commentId', requireMember('MEMBER'), async (req, res, next) => {
  try {
    await service.deleteComment(p(req, 'workspaceId'), p(req, 'issueId'), p(req, 'commentId'), req.user!.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireMember } from '../../middleware/requireMember.js';
import { createIssueSchema, updateIssueSchema, issueQuerySchema } from './schemas.js';
import * as service from './service.js';

// Mounted at /api/workspaces/:workspaceId/projects/:projectId/issues
const router = Router({ mergeParams: true });

function p(req: Parameters<Parameters<typeof router.get>[1]>[0], key: string): string {
  return String((req.params as Record<string, string>)[key] ?? '');
}

router.use(requireAuth, requireMember());

router.post('/', requireMember('MEMBER'), validate(createIssueSchema), async (req, res, next) => {
  try {
    const issue = await service.createIssue(p(req, 'workspaceId'), p(req, 'projectId'), req.user!.id, req.body);
    res.status(201).json({ issue });
  } catch (err) { next(err); }
});

router.get('/', validate(issueQuerySchema, 'query'), async (req, res, next) => {
  try {
    const result = await service.listIssues(
      p(req, 'workspaceId'), p(req, 'projectId'),
      req.query as unknown as Parameters<typeof service.listIssues>[2],
    );
    res.status(200).json(result);
  } catch (err) { next(err); }
});

router.get('/:issueId', async (req, res, next) => {
  try {
    const issue = await service.getIssue(p(req, 'workspaceId'), p(req, 'issueId'));
    res.status(200).json({ issue });
  } catch (err) { next(err); }
});

router.patch('/:issueId', requireMember('MEMBER'), validate(updateIssueSchema), async (req, res, next) => {
  try {
    const issue = await service.updateIssue(p(req, 'workspaceId'), p(req, 'issueId'), req.user!.id, req.body);
    res.status(200).json({ issue });
  } catch (err) { next(err); }
});

router.delete('/:issueId', requireMember('MEMBER'), async (req, res, next) => {
  try {
    await service.deleteIssue(p(req, 'workspaceId'), p(req, 'issueId'));
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

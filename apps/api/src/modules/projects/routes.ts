import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireMember } from '../../middleware/requireMember.js';
import { createProjectSchema, updateProjectSchema } from './schemas.js';
import * as service from './service.js';

// Mounted at /api/workspaces/:workspaceId/projects  (mergeParams inherits workspaceId)
const router = Router({ mergeParams: true });

/** Helper — safely pull a merged param by name */
function p(req: Parameters<Parameters<typeof router.get>[1]>[0], key: string): string {
  return String((req.params as Record<string, string>)[key] ?? '');
}

router.use(requireAuth, requireMember());

router.post('/', requireMember('MEMBER'), validate(createProjectSchema), async (req, res, next) => {
  try {
    const project = await service.createProject(p(req, 'workspaceId'), req.body);
    res.status(201).json({ project });
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const projects = await service.listProjects(p(req, 'workspaceId'), req.query['archived'] === 'true');
    res.status(200).json({ projects });
  } catch (err) { next(err); }
});

router.get('/:projectId', async (req, res, next) => {
  try {
    const project = await service.getProject(p(req, 'workspaceId'), p(req, 'projectId'));
    res.status(200).json({ project });
  } catch (err) { next(err); }
});

router.patch('/:projectId', requireMember('MEMBER'), validate(updateProjectSchema), async (req, res, next) => {
  try {
    const project = await service.updateProject(p(req, 'workspaceId'), p(req, 'projectId'), req.body);
    res.status(200).json({ project });
  } catch (err) { next(err); }
});

router.delete('/:projectId', requireMember('ADMIN'), async (req, res, next) => {
  try {
    await service.archiveProject(p(req, 'workspaceId'), p(req, 'projectId'));
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

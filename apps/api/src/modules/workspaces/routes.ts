import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireMember } from '../../middleware/requireMember.js';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteMemberSchema,
} from './schemas.js';
import * as service from './service.js';

const router = Router();

router.use(requireAuth);

/** POST /api/workspaces */
router.post('/', validate(createWorkspaceSchema), async (req, res, next) => {
  try {
    const workspace = await service.createWorkspace(req.user!.id, req.body);
    res.status(201).json({ workspace });
  } catch (err) { next(err); }
});

/** GET /api/workspaces */
router.get('/', async (req, res, next) => {
  try {
    const workspaces = await service.listWorkspaces(req.user!.id);
    res.status(200).json({ workspaces });
  } catch (err) { next(err); }
});

/** GET /api/workspaces/:workspaceId */
router.get('/:workspaceId', requireMember(), async (req, res, next) => {
  try {
    const workspace = await service.getWorkspace(String(req.params['workspaceId']));
    res.status(200).json({ workspace, role: req.membership!.role });
  } catch (err) { next(err); }
});

/** PATCH /api/workspaces/:workspaceId */
router.patch('/:workspaceId', requireMember('ADMIN'), validate(updateWorkspaceSchema), async (req, res, next) => {
  try {
    const workspace = await service.updateWorkspace(String(req.params['workspaceId']), req.body);
    res.status(200).json({ workspace });
  } catch (err) { next(err); }
});

/** GET /api/workspaces/:workspaceId/members */
router.get('/:workspaceId/members', requireMember(), async (req, res, next) => {
  try {
    const members = await service.listMembers(String(req.params['workspaceId']));
    res.status(200).json({ members });
  } catch (err) { next(err); }
});

/** POST /api/workspaces/:workspaceId/members */
router.post('/:workspaceId/members', requireMember('ADMIN'), validate(inviteMemberSchema), async (req, res, next) => {
  try {
    const member = await service.inviteMember(String(req.params['workspaceId']), req.body);
    res.status(201).json({ member });
  } catch (err) { next(err); }
});

/** DELETE /api/workspaces/:workspaceId/members/:memberId */
router.delete('/:workspaceId/members/:memberId', requireMember('ADMIN'), async (req, res, next) => {
  try {
    await service.removeMember(String(req.params['workspaceId']), String(req.params['memberId']), req.user!.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

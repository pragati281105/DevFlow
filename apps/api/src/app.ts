import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';

import { sessionMiddleware } from './middleware/session.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './modules/auth/routes.js';
import workspaceRoutes from './modules/workspaces/routes.js';
import projectRoutes from './modules/projects/routes.js';
import issueRoutes from './modules/issues/routes.js';
import commentRoutes from './modules/comments/routes.js';

export function createApp(): Express {
  const app = express();

  // Security headers
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));

  // CORS — allow the Vite dev server and the production origin
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN ?? 'http://127.0.0.1:5173',
      credentials: true,
    }),
  );

  // Body parsing
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // Session loader — reads HttpOnly session cookie and attaches req.user
  app.use(sessionMiddleware);

  // ── Routes ────────────────────────────────────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/workspaces', workspaceRoutes);

  // Project routes are nested under workspaces
  app.use('/api/workspaces/:workspaceId/projects', projectRoutes);

  // Issue routes are nested under projects
  app.use('/api/workspaces/:workspaceId/projects/:projectId/issues', issueRoutes);

  // Comment routes are nested under issues
  app.use(
    '/api/workspaces/:workspaceId/projects/:projectId/issues/:issueId/comments',
    commentRoutes,
  );

  // ── Error handler (must be last) ─────────────────────────────────────────
  app.use(errorHandler);

  return app;
}

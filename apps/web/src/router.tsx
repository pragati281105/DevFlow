import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth.js';

// Lazy-loaded pages for code splitting
import SignIn from './features/auth/SignIn.js';
import SignUp from './features/auth/SignUp.js';
import WorkspaceList from './features/workspaces/WorkspaceList.js';
import WorkspaceShell from './features/workspaces/WorkspaceShell.js';
import IssueList from './features/issues/IssueList.js';
import IssueDetail from './features/issues/IssueDetail.js';

/** Show a full-screen spinner while the session is being loaded. */
function LoadingScreen() {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div className="spinner spinner-lg" />
    </div>
  );
}

/** Redirect unauthenticated users to /login. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Redirect authenticated users away from auth pages. */
function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Placeholder for workspace home — redirect to projects. */
function WorkspaceHome() {
  return (
    <div className="page-body flex-center" style={{ flexDirection: 'column', gap: 12 }}>
      <div className="empty-icon">🏠</div>
      <h3>Select a project</h3>
      <p className="text-muted" style={{ fontSize: 13 }}>Choose a project from the sidebar or create a new one.</p>
    </div>
  );
}

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/login"    element={<GuestOnly><SignIn /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><SignUp /></GuestOnly>} />

        {/* Workspace picker */}
        <Route path="/" element={<RequireAuth><WorkspaceList /></RequireAuth>} />

        {/* Workspace shell with nested project/issue routes */}
        <Route
          path="/w/:workspaceId"
          element={<RequireAuth><WorkspaceShell /></RequireAuth>}
        >
          <Route index element={<WorkspaceHome />} />
          <Route path="p/:projectId/issues" element={<IssueList />} />
          <Route path="p/:projectId/issues/:issueId" element={<IssueDetail />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

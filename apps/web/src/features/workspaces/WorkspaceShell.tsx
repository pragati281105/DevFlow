import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, NavLink, Outlet } from 'react-router-dom';
import { api, ApiError } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.js';

interface Workspace { id: string; name: string; slug: string; }
interface Project { id: string; name: string; key: string; description?: string; }

export default function WorkspaceShell() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [projForm, setProjForm] = useState({ name: '', key: '', description: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    api.get<{ workspace: Workspace }>(`/workspaces/${workspaceId}`)
      .then(({ workspace }) => setWorkspace(workspace))
      .catch(() => navigate('/'));
    api.get<{ projects: Project[] }>(`/workspaces/${workspaceId}/projects`)
      .then(({ projects }) => setProjects(projects))
      .catch(() => {});
  }, [workspaceId]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId) return;
    setCreating(true);
    try {
      const { project } = await api.post<{ project: Project }>(
        `/workspaces/${workspaceId}/projects`,
        projForm,
      );
      setProjects((p) => [...p, project]);
      setShowNewProject(false);
      setProjForm({ name: '', key: '', description: '' });
      navigate(`/w/${workspaceId}/p/${project.id}/issues`);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ padding: '4px 12px 12px', borderBottom: '1px solid var(--color-border)', marginBottom: 8 }}>
          <button
            className="btn btn-ghost"
            style={{ padding: '6px 8px', width: '100%', justifyContent: 'flex-start', gap: 8 }}
            onClick={() => navigate('/')}
          >
            <div style={{ width: 26, height: 26, borderRadius: 6, background: 'linear-gradient(135deg,#6366f1,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#fff' }}>D</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}>
                {workspace?.name ?? '…'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-text-faint)' }}>/ {workspace?.slug}</div>
            </div>
          </button>
        </div>

        <span className="nav-section-label">Projects</span>
        {projects.map((p) => (
          <NavLink
            key={p.id}
            to={`/w/${workspaceId}/p/${p.id}/issues`}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            id={`nav-project-${p.id}`}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-faint)', background: 'var(--color-surface-2)', borderRadius: 4, padding: '1px 5px' }}>{p.key}</span>
            <span className="truncate">{p.name}</span>
          </NavLink>
        ))}
        <button
          id="new-project-btn"
          className="nav-item"
          style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%' }}
          onClick={() => setShowNewProject(true)}
        >
          <span style={{ fontSize: 16, color: 'var(--color-text-faint)' }}>+</span>
          <span style={{ color: 'var(--color-text-faint)', fontSize: 13 }}>New project</span>
        </button>

        <div style={{ flex: 1 }} />

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
          <div className="nav-item" style={{ gap: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-accent-h)', flexShrink: 0 }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <span className="truncate" style={{ flex: 1, color: 'var(--color-text)', fontSize: 13 }}>{user?.name}</span>
            <button className="btn btn-ghost btn-sm btn-icon" title="Sign out" onClick={logout}>↩</button>
          </div>
        </div>
      </aside>

      {/* Main content rendered by child routes */}
      <main className="main-content">
        <Outlet context={{ workspace, projects, setProjects, workspaceId }} />
      </main>

      {/* New project modal */}
      {showNewProject && (
        <div className="modal-backdrop" onClick={() => setShowNewProject(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">New project</h2>
            <form onSubmit={createProject}>
              <div className="form-group">
                <label className="form-label">Project name</label>
                <input
                  id="proj-name"
                  className="input"
                  placeholder="Backend API"
                  value={projForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const key = name.replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 6) || '';
                    setProjForm((f) => ({ ...f, name, key }));
                  }}
                  required autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Key (2–8 uppercase letters)</label>
                <input
                  id="proj-key"
                  className="input"
                  placeholder="BACK"
                  value={projForm.key}
                  onChange={(e) => setProjForm((f) => ({ ...f, key: e.target.value.toUpperCase() }))}
                  required
                  maxLength={8}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <input
                  id="proj-desc"
                  className="input"
                  value={projForm.description}
                  onChange={(e) => setProjForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowNewProject(false)}>Cancel</button>
                <button id="proj-submit" type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating…' : 'Create project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

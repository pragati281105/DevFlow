import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.js';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  role: string;
}

interface CreateForm {
  name: string;
  slug: string;
  description: string;
}

export default function WorkspaceList() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>({ name: '', slug: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<{ workspaces: Workspace[] }>('/workspaces')
      .then(({ workspaces }) => setWorkspaces(workspaces))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const { workspace } = await api.post<{ workspace: Workspace }>('/workspaces', form);
      setWorkspaces((prev) => [...prev, { ...workspace, role: 'OWNER' }]);
      setShowCreate(false);
      setForm({ name: '', slug: '', description: '' });
      navigate(`/w/${workspace.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create workspace.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '24px' }}>
      {/* Header */}
      <div className="flex-between" style={{ maxWidth: 960, margin: '0 auto 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="auth-logo" style={{ margin: 0, width: 36, height: 36, fontSize: 16 }}>D</div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>DevFlow</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="text-muted" style={{ fontSize: 13 }}>{user?.email}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div className="flex-between" style={{ marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', marginBottom: 4 }}>Your workspaces</h1>
            <p className="text-muted" style={{ fontSize: 13 }}>Select a workspace or create a new one</p>
          </div>
          <button id="create-workspace-btn" className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New workspace
          </button>
        </div>

        {loading ? (
          <div className="flex-center" style={{ padding: 64 }}>
            <div className="spinner spinner-lg" />
          </div>
        ) : workspaces.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏢</div>
            <h3>No workspaces yet</h3>
            <p style={{ fontSize: 13 }}>Create your first workspace to get started.</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create workspace</button>
          </div>
        ) : (
          <div className="workspace-grid">
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                className="workspace-card"
                onClick={() => navigate(`/w/${ws.id}`)}
                role="button"
                id={`workspace-${ws.id}`}
              >
                <div className="workspace-avatar">{ws.name[0]?.toUpperCase()}</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{ws.name}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>/{ws.slug}</div>
                {ws.description && (
                  <div className="text-muted truncate" style={{ fontSize: 12, marginTop: 6 }}>{ws.description}</div>
                )}
                <div style={{ marginTop: 12 }}>
                  <span className="badge badge-todo" style={{ textTransform: 'capitalize', letterSpacing: 0 }}>
                    {ws.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create workspace modal */}
      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Create workspace</h2>
            {error && (
              <div className="toast error" style={{ marginBottom: 16, fontSize: 13 }}>
                <span>⚠</span> {error}
              </div>
            )}
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Workspace name</label>
                <input
                  id="ws-name"
                  className="input"
                  placeholder="Acme Engineering"
                  value={form.name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, name: e.target.value, slug: autoSlug(e.target.value) }));
                  }}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">URL slug</label>
                <input
                  id="ws-slug"
                  className="input"
                  placeholder="acme-engineering"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <input
                  id="ws-desc"
                  className="input"
                  placeholder="A short description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button id="ws-submit" type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating…' : 'Create workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

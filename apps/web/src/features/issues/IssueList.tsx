import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api.js';

type Status = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
type Priority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NO_PRIORITY';

interface Issue {
  id: string; key: string; title: string; status: Status; priority: Priority;
  assigneeId?: string; dueDate?: string; createdAt: string;
  assignee?: { id: string; name: string; avatarUrl?: string };
  labels: { label: { id: string; name: string; color: string } }[];
}

interface PageResult { total: number; page: number; pageSize: number; items: Issue[]; }

const STATUS_LABELS: Record<Status, string> = {
  BACKLOG: 'Backlog', TODO: 'To Do', IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review', DONE: 'Done', CANCELLED: 'Cancelled',
};
const STATUS_CLASS: Record<Status, string> = {
  BACKLOG: 'badge-backlog', TODO: 'badge-todo', IN_PROGRESS: 'badge-progress',
  IN_REVIEW: 'badge-review', DONE: 'badge-done', CANCELLED: 'badge-cancel',
};
const PRIORITY_ICON: Record<Priority, string> = {
  URGENT: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🔵', NO_PRIORITY: '⚪',
};
const KANBAN_STATUSES: Status[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

interface CreateForm { title: string; priority: Priority; description: string; }

export default function IssueList() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const navigate = useNavigate();
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>({ title: '', priority: 'MEDIUM', description: '' });
  const [creating, setCreating] = useState(false);

  const loadIssues = useCallback(() => {
    if (!workspaceId || !projectId) return;
    const qs = new URLSearchParams();
    if (statusFilter) qs.set('status', statusFilter);
    if (search) qs.set('search', search);
    setLoading(true);
    api.get<PageResult>(`/workspaces/${workspaceId}/projects/${projectId}/issues?${qs}`)
      .then(({ items, total }) => { setIssues(items); setTotal(total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId, projectId, statusFilter, search]);

  useEffect(() => { loadIssues(); }, [loadIssues]);

  async function createIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId || !projectId) return;
    setCreating(true);
    try {
      const { issue } = await api.post<{ issue: Issue }>(
        `/workspaces/${workspaceId}/projects/${projectId}/issues`, form,
      );
      setIssues((prev) => [issue, ...prev]);
      setTotal((t) => t + 1);
      setShowCreate(false);
      setForm({ title: '', priority: 'MEDIUM', description: '' });
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to create issue');
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(issueId: string, status: Status) {
    if (!workspaceId || !projectId) return;
    try {
      const { issue } = await api.patch<{ issue: Issue }>(
        `/workspaces/${workspaceId}/projects/${projectId}/issues/${issueId}`, { status },
      );
      setIssues((prev) => prev.map((i) => (i.id === issueId ? issue : i)));
    } catch { /* silent */ }
  }

  const byStatus = (s: Status) => issues.filter((i) => i.status === s);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: '1rem', marginBottom: 2 }}>Issues</h2>
          <span className="text-muted" style={{ fontSize: 12 }}>{total} total</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'var(--color-surface-2)', borderRadius: 'var(--radius)', padding: 2, gap: 2 }}>
            <button
              id="view-list"
              className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '4px 10px' }}
              onClick={() => setView('list')}
            >☰ List</button>
            <button
              id="view-kanban"
              className={`btn btn-sm ${view === 'kanban' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '4px 10px' }}
              onClick={() => setView('kanban')}
            >⬛ Board</button>
          </div>
          <button id="create-issue-btn" className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            + New issue
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: 10, flexShrink: 0 }}>
        <input
          id="issue-search"
          className="input"
          style={{ width: 240 }}
          placeholder="Search issues…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          id="status-filter"
          className="input"
          style={{ width: 160 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Content */}
      <div className="page-body" style={{ padding: view === 'kanban' ? '24px' : 0 }}>
        {loading ? (
          <div className="flex-center" style={{ paddingTop: 64 }}>
            <div className="spinner spinner-lg" />
          </div>
        ) : issues.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No issues found</h3>
            <p style={{ fontSize: 13 }}>{search || statusFilter ? 'Try adjusting your filters.' : 'Create your first issue to get started.'}</p>
            {!search && !statusFilter && (
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>New issue</button>
            )}
          </div>
        ) : view === 'list' ? (
          <table className="data-table animate-fade-in">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Key</th>
                <th>Title</th>
                <th style={{ width: 130 }}>Status</th>
                <th style={{ width: 90 }}>Priority</th>
                <th style={{ width: 120 }}>Assignee</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr
                  key={issue.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/w/${workspaceId}/p/${projectId}/issues/${issue.id}`)}
                  id={`issue-row-${issue.id}`}
                >
                  <td><span className="text-faint" style={{ fontFamily: 'monospace', fontSize: 12 }}>{issue.key}</span></td>
                  <td style={{ fontWeight: 500 }}>{issue.title}</td>
                  <td><span className={`badge ${STATUS_CLASS[issue.status]}`}>{STATUS_LABELS[issue.status]}</span></td>
                  <td>
                    <span title={issue.priority}>{PRIORITY_ICON[issue.priority]} </span>
                    <span style={{ fontSize: 12 }} className="text-muted">{issue.priority.replace('_', ' ')}</span>
                  </td>
                  <td className="text-muted" style={{ fontSize: 12 }}>
                    {issue.assignee?.name ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /* Kanban board */
          <div className="kanban-board animate-fade-in">
            {KANBAN_STATUSES.map((status) => (
              <div key={status} className="kanban-column">
                <div className="kanban-header">
                  <span className={`badge ${STATUS_CLASS[status]}`}>{STATUS_LABELS[status]}</span>
                  <span className="kanban-count">{byStatus(status).length}</span>
                </div>
                <div className="kanban-cards">
                  {byStatus(status).map((issue) => (
                    <div
                      key={issue.id}
                      className="kanban-card"
                      id={`kanban-card-${issue.id}`}
                      onClick={() => navigate(`/w/${workspaceId}/p/${projectId}/issues/${issue.id}`)}
                    >
                      <div style={{ fontSize: 10, color: 'var(--color-text-faint)', fontFamily: 'monospace', marginBottom: 6 }}>{issue.key}</div>
                      <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8, lineHeight: 1.4 }}>{issue.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span title={issue.priority}>{PRIORITY_ICON[issue.priority]}</span>
                        {issue.assignee && (
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                            {issue.assignee.name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {byStatus(status).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--color-text-faint)', fontSize: 12 }}>
                      No issues
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create issue modal */}
      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">New issue</h2>
            <form onSubmit={createIssue}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  id="issue-title"
                  className="input"
                  placeholder="Short, descriptive title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  id="issue-priority"
                  className="input"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Priority }))}
                >
                  {(['URGENT','HIGH','MEDIUM','LOW','NO_PRIORITY'] as Priority[]).map((p) => (
                    <option key={p} value={p}>{PRIORITY_ICON[p]} {p.replace('_',' ')}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea
                  id="issue-desc"
                  className="input"
                  rows={4}
                  placeholder="Any additional context…"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button id="issue-submit" type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating…' : 'Create issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

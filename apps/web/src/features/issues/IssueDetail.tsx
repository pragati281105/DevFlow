import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.js';

type Status = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
type Priority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NO_PRIORITY';

interface Comment { id: string; body: string; createdAt: string; author: { id: string; name: string; avatarUrl?: string; }; }
interface Issue {
  id: string; key: string; title: string; description?: string;
  status: Status; priority: Priority; assigneeId?: string; dueDate?: string;
  createdAt: string; updatedAt: string;
  assignee?: { id: string; name: string; };
  labels: { label: { id: string; name: string; color: string; } }[];
  comments: Comment[];
}

const STATUS_OPTIONS: Status[] = ['BACKLOG','TODO','IN_PROGRESS','IN_REVIEW','DONE','CANCELLED'];
const STATUS_LABELS: Record<Status, string> = { BACKLOG:'Backlog',TODO:'To Do',IN_PROGRESS:'In Progress',IN_REVIEW:'In Review',DONE:'Done',CANCELLED:'Cancelled' };
const STATUS_CLASS: Record<Status, string> = { BACKLOG:'badge-backlog',TODO:'badge-todo',IN_PROGRESS:'badge-progress',IN_REVIEW:'badge-review',DONE:'badge-done',CANCELLED:'badge-cancel' };
const PRIORITY_ICON: Record<Priority, string> = { URGENT:'🔴',HIGH:'🟠',MEDIUM:'🟡',LOW:'🔵',NO_PRIORITY:'⚪' };

export default function IssueDetail() {
  const { workspaceId, projectId, issueId } = useParams<{ workspaceId: string; projectId: string; issueId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!workspaceId || !projectId || !issueId) return;
    api.get<{ issue: Issue }>(`/workspaces/${workspaceId}/projects/${projectId}/issues/${issueId}`)
      .then(({ issue }) => setIssue(issue))
      .catch(() => navigate(-1))
      .finally(() => setLoading(false));
  }, [issueId]);

  async function patchIssue(update: Partial<{ status: Status; priority: Priority; title: string }>) {
    if (!issue) return;
    try {
      const { issue: updated } = await api.patch<{ issue: Issue }>(
        `/workspaces/${workspaceId}/projects/${projectId}/issues/${issue.id}`, update,
      );
      setIssue(updated);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Update failed');
    }
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim() || !workspaceId || !projectId || !issueId) return;
    setSubmitting(true);
    try {
      const { comment: newComment } = await api.post<{ comment: Comment }>(
        `/workspaces/${workspaceId}/projects/${projectId}/issues/${issueId}/comments`,
        { body: comment },
      );
      setIssue((prev) => prev ? { ...prev, comments: [...prev.comments, newComment] } : prev);
      setComment('');
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  }

  if (loading) return <div className="flex-center" style={{ height: '100%' }}><div className="spinner spinner-lg" /></div>;
  if (!issue) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => navigate(-1)}>←</button>
          <span className="text-faint" style={{ fontFamily: 'monospace', fontSize: 13 }}>{issue.key}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-danger btn-sm" onClick={async () => {
            if (!confirm('Delete this issue?')) return;
            await api.delete(`/workspaces/${workspaceId}/projects/${projectId}/issues/${issue.id}`);
            navigate(-1);
          }}>Delete</button>
        </div>
      </div>

      <div className="page-body" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }}>
        {/* Main */}
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '1.3rem', marginBottom: 16, lineHeight: 1.4 }} contentEditable suppressContentEditableWarning
            onBlur={(e) => { const t = e.currentTarget.innerText.trim(); if (t && t !== issue.title) patchIssue({ title: t }); }}
          >{issue.title}</h1>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 20, minHeight: 120, marginBottom: 24, whiteSpace: 'pre-wrap', fontSize: 14, color: issue.description ? 'var(--color-text)' : 'var(--color-text-faint)' }}>
            {issue.description || 'No description provided.'}
          </div>

          {/* Comments */}
          <h3 style={{ marginBottom: 12 }}>Comments</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {issue.comments.length === 0 && (
              <div className="text-muted" style={{ fontSize: 13 }}>No comments yet.</div>
            )}
            {issue.comments.map((c) => (
              <div key={c.id} className="surface-2" style={{ padding: 14, borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-accent-h)' }}>
                    {c.author.name[0]?.toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{c.author.name}</span>
                  <span className="text-faint" style={{ fontSize: 11 }}>{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{c.body}</div>
              </div>
            ))}
          </div>

          <form onSubmit={addComment} style={{ display: 'flex', gap: 10 }}>
            <textarea
              id="comment-input"
              className="input"
              rows={2}
              placeholder="Add a comment…"
              style={{ flex: 1, resize: 'vertical' }}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button id="comment-submit" type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end' }} disabled={submitting || !comment.trim()}>
              {submitting ? '…' : 'Comment'}
            </button>
          </form>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="surface" style={{ padding: 16 }}>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Status</label>
              <select
                id="issue-status-select"
                className="input"
                value={issue.status}
                onChange={(e) => patchIssue({ status: e.target.value as Status })}
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Priority</label>
              <select
                id="issue-priority-select"
                className="input"
                value={issue.priority}
                onChange={(e) => patchIssue({ priority: e.target.value as Priority })}
              >
                {(['URGENT','HIGH','MEDIUM','LOW','NO_PRIORITY'] as Priority[]).map((p) => (
                  <option key={p} value={p}>{PRIORITY_ICON[p]} {p.replace('_',' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="surface" style={{ padding: 16 }}>
            <div className="form-label" style={{ marginBottom: 8 }}>Assignee</div>
            <div style={{ fontSize: 13 }}>{issue.assignee?.name ?? <span className="text-muted">Unassigned</span>}</div>
          </div>

          {issue.dueDate && (
            <div className="surface" style={{ padding: 16 }}>
              <div className="form-label" style={{ marginBottom: 6 }}>Due date</div>
              <div style={{ fontSize: 13, color: new Date(issue.dueDate) < new Date() ? 'var(--color-danger)' : 'var(--color-text)' }}>
                {new Date(issue.dueDate).toLocaleDateString()}
              </div>
            </div>
          )}

          <div className="surface" style={{ padding: 16 }}>
            <div className="form-label" style={{ marginBottom: 6 }}>Created</div>
            <div className="text-muted" style={{ fontSize: 12 }}>{new Date(issue.createdAt).toLocaleString()}</div>
            <div className="form-label" style={{ marginBottom: 6, marginTop: 10 }}>Updated</div>
            <div className="text-muted" style={{ fontSize: 12 }}>{new Date(issue.updatedAt).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

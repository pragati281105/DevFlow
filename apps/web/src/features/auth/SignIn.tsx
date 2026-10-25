import React, { useState, useRef } from 'react';
import { useAuth } from '../../lib/auth.js';
import { useNavigate, Link } from 'react-router-dom';
import { ApiError } from '../../lib/api.js';

export default function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">D</div>
        <h1 style={{ textAlign: 'center', fontSize: '1.4rem', marginBottom: 4 }}>Welcome back</h1>
        <p className="text-muted" style={{ textAlign: 'center', marginBottom: 28, fontSize: 13 }}>
          Sign in to your DevFlow account
        </p>

        {error && (
          <div className="toast error" style={{ marginBottom: 16, fontSize: 13 }}>
            <span>⚠</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            id="signin-submit"
            type="submit"
            className="btn btn-primary btn-full"
            style={{ marginTop: 8 }}
            disabled={loading}
          >
            {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in…</> : 'Sign in'}
          </button>
        </form>

        <p className="text-muted" style={{ textAlign: 'center', marginTop: 20, fontSize: 13 }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--color-accent-h)', fontWeight: 500 }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

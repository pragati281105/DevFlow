import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, setCsrfToken, clearCsrfToken, ApiError } from './api.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  // On mount, check if we have a live session
  useEffect(() => {
    api
      .get<{ user: AuthUser; csrfToken: string }>('/auth/me')
      .then(({ user, csrfToken }) => {
        setCsrfToken(csrfToken);
        setState({ user, loading: false });
      })
      .catch((err) => {
        // 401 means not logged in — expected
        if (err instanceof ApiError && err.status === 401) {
          setState({ user: null, loading: false });
        } else {
          setState({ user: null, loading: false });
        }
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user, csrfToken } = await api.post<{ user: AuthUser; csrfToken: string }>('/auth/login', {
      email,
      password,
    });
    setCsrfToken(csrfToken);
    setState({ user, loading: false });
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { user, csrfToken } = await api.post<{ user: AuthUser; csrfToken: string }>('/auth/register', {
      name,
      email,
      password,
    });
    setCsrfToken(csrfToken);
    setState({ user, loading: false });
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    clearCsrfToken();
    setState({ user: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

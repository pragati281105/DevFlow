/** Typed API client.
 *
 * Wraps fetch with:
 * - Base path /api
 * - JSON Content-Type
 * - credentials: 'include' so the HttpOnly session cookie is sent
 * - X-CSRF-Token header from the csrfToken stored in module state
 */

let _csrfToken: string | null = null;

export function setCsrfToken(token: string) {
  _csrfToken = token;
}

export function clearCsrfToken() {
  _csrfToken = null;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function apiFetch<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (_csrfToken && method !== 'GET') {
    headers['X-CSRF-Token'] = _csrfToken;
  }

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 204 No Content
  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = data?.error;
    throw new ApiError(res.status, err?.code ?? 'UNKNOWN', err?.message ?? res.statusText);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>('GET', path),
  post: <T>(path: string, body?: unknown) => apiFetch<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>('PATCH', path, body),
  delete: <T>(path: string) => apiFetch<T>('DELETE', path),
};

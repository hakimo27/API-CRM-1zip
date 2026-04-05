const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('crm_token');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('crm_refresh_token');
}

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

async function tryRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshQueue.push(resolve);
    });
  }

  isRefreshing = true;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      refreshQueue.forEach(r => r(null));
      refreshQueue = [];
      return null;
    }

    const data = await res.json();
    const newAccess = data.accessToken;
    const newRefresh = data.refreshToken;

    if (newAccess) localStorage.setItem('crm_token', newAccess);
    if (newRefresh) localStorage.setItem('crm_refresh_token', newRefresh);

    refreshQueue.forEach(r => r(newAccess));
    refreshQueue = [];
    return newAccess;
  } catch {
    refreshQueue.forEach(r => r(null));
    refreshQueue = [];
    return null;
  } finally {
    isRefreshing = false;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    const newToken = await tryRefresh();
    if (newToken) {
      const retryHeaders = { ...headers, 'Authorization': `Bearer ${newToken}` };
      const retryRes = await fetch(`${BASE}${path}`, { ...options, headers: retryHeaders });
      if (retryRes.status === 401) {
        localStorage.removeItem('crm_token');
        localStorage.removeItem('crm_refresh_token');
        window.dispatchEvent(new Event('crm:logout'));
        throw new Error('Сессия истекла');
      }
      if (!retryRes.ok) {
        const err = await retryRes.json().catch(() => ({ message: retryRes.statusText }));
        throw new Error(err.message || 'Ошибка запроса');
      }
      if (retryRes.status === 204) return undefined as T;
      return retryRes.json();
    }

    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_refresh_token');
    window.dispatchEvent(new Event('crm:logout'));
    throw new Error('Сессия истекла');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Ошибка запроса');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: formData });
    if (res.status === 401) {
      const newToken = await tryRefresh();
      if (newToken) {
        const retryHeaders: Record<string, string> = { 'Authorization': `Bearer ${newToken}` };
        const retryRes = await fetch(`${BASE}${path}`, { method: 'POST', headers: retryHeaders, body: formData });
        if (!retryRes.ok) {
          const err = await retryRes.json().catch(() => ({ message: retryRes.statusText }));
          throw new Error(err.message || 'Ошибка загрузки файла');
        }
        return retryRes.json();
      }
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_refresh_token');
      window.dispatchEvent(new Event('crm:logout'));
      throw new Error('Сессия истекла');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'Ошибка загрузки файла');
    }
    return res.json();
  },
};

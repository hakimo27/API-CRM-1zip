import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface User {
  id: number; email: string; firstName: string; lastName: string | null; role: string;
}

interface AuthCtx {
  user: User | null; loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

const ALLOWED_ROLES = ['superadmin', 'admin', 'manager', 'warehouse', 'instructor', 'content_manager'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    if (token) {
      api.get<User>('/auth/me')
        .then(u => {
          if (ALLOWED_ROLES.includes(u.role)) setUser(u);
          else {
            localStorage.removeItem('crm_token');
            localStorage.removeItem('crm_refresh_token');
          }
        })
        .catch(() => {
          // /auth/me failed even after refresh attempt — clear everything
          localStorage.removeItem('crm_token');
          localStorage.removeItem('crm_refresh_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // Listen for session expiry events fired by the API interceptor
    const handleLogout = () => setUser(null);
    window.addEventListener('crm:logout', handleLogout);
    return () => window.removeEventListener('crm:logout', handleLogout);
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.post<{ accessToken: string; refreshToken: string; user: User }>(
      '/auth/login', { email, password }
    );
    if (!ALLOWED_ROLES.includes(data.user.role)) {
      throw new Error('Недостаточно прав для доступа к CRM');
    }
    localStorage.setItem('crm_token', data.accessToken);
    if (data.refreshToken) localStorage.setItem('crm_refresh_token', data.refreshToken);
    setUser(data.user);
  };

  const logout = () => {
    const token = localStorage.getItem('crm_token');
    const refreshToken = localStorage.getItem('crm_refresh_token');

    // Clear local state immediately for instant UX
    setUser(null);
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_refresh_token');

    // Revoke the refresh token on the server using raw fetch (bypasses the API interceptor
    // so we don't trigger a spurious "session expired" event after already clearing tokens).
    if (refreshToken) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      fetch('/api/auth/logout', {
        method: 'POST',
        headers,
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be within AuthProvider');
  return ctx;
}

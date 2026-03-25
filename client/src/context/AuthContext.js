import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import { cacheApiData, getCachedApiData, enqueueSyncItem } from '../utils/offlineDB';

export const AuthContext = createContext(null);

const FETCH_TIMEOUT_MS = 5000; // 5 s – if no response, treat as offline

function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

export const AuthProvider = ({ children }) => {
  const [user, setUser]     = useState(null);
  const [token, setToken]   = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored && token) { try { setUser(JSON.parse(stored)); } catch {} }
    setLoading(false);
  }, []);

  const login = (tokenVal, refreshTokenVal, userData) => {
    localStorage.setItem('token', tokenVal);
    if (refreshTokenVal) localStorage.setItem('refreshToken', refreshTokenVal);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(tokenVal);
    setUser(userData);
  };

  const logout = useCallback(async (sessionExpired = false) => {
    const rt = localStorage.getItem('refreshToken');
    if (rt) {
      try {
        await fetch('/api/auth/logout', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: rt })
        });
      } catch (e) {}
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    if (sessionExpired) {
      window.location.href = '/login?sessionExpired=true';
    } else {
      window.location.href = '/login';
    }
  }, []);

  const handleRefresh = async () => {
    try {
      const rt = localStorage.getItem('refreshToken');
      if (!rt) throw new Error('No refresh token');
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt })
      });
      if (!res.ok) throw new Error('Refresh failed');
      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      setToken(data.token);
      tokenRef.current = data.token;
      return data.token;
    } catch (err) {
      logout(true);
      return null;
    }
  };

  const authFetch = useCallback(async (url, options = {}) => {
    let currentToken = tokenRef.current;
    let method = (options.method || 'GET').toUpperCase();
    let isGet = method === 'GET';
    const getHeaders = (tok) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tok}`,
      ...(options.headers || {}),
    });

    // ── GET: Network-First with Cache Fallback ───────────────────────────
    if (isGet) {
      try {
        let networkRes = await fetchWithTimeout(url, { ...options, headers: getHeaders(currentToken) }, FETCH_TIMEOUT_MS);
        if (networkRes.status === 401) {
          const newToken = await handleRefresh();
          if (newToken) {
            networkRes = await fetchWithTimeout(url, { ...options, headers: getHeaders(newToken) }, FETCH_TIMEOUT_MS);
          }
        }
        if (networkRes.ok) {
          const clone = networkRes.clone();
          clone.json().then(data => cacheApiData(url, data)).catch(() => {});
        }
        return networkRes;
      } catch (err) {
        // Network failed (offline or timeout) -> fallback to cache
        const cached = await getCachedApiData(url);
        if (cached) {
          return new Response(JSON.stringify(cached), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        // No cache -> return empty shape
        const emptyShape = url.includes('/patients')
          ? { patients: [], total: 0 }
          : url.includes('/appointments')
          ? { appointments: [], total: 0 }
          : url.includes('/prescriptions')
          ? { prescriptions: [], total: 0 }
          : url.includes('/invoices')
          ? { invoices: [], total: 0 }
          : url.includes('/followups')
          ? { followups: [], total: 0 }
          : {};
        return new Response(JSON.stringify(emptyShape), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // ── Mutation (POST / PUT / PATCH / DELETE) ───────────────────────────
    try {
      let res = await fetchWithTimeout(url, { ...options, headers: getHeaders(currentToken) }, FETCH_TIMEOUT_MS);
      if (res.status === 401) {
        const newToken = await handleRefresh();
        if (newToken) {
          res = await fetchWithTimeout(url, { ...options, headers: getHeaders(newToken) }, FETCH_TIMEOUT_MS);
        }
      }
      return res;
    } catch {
      // Offline — queue the mutation to retry when back online
      const tempId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await enqueueSyncItem({
        tempId,
        type: method,
        endpoint: url,
        method,
        payload: options.body ? JSON.parse(options.body) : {},
      });
      // Return 202 Accepted so components don't crash
      return new Response(JSON.stringify({ queued: true, tempId }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, authFetch, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

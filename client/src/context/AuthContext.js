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

  const login = (tokenVal, userData) => {
    localStorage.setItem('token', tokenVal);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(tokenVal);
    setUser(userData);
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const authFetch = useCallback(async (url, options = {}) => {
    const currentToken = tokenRef.current;
    const method = (options.method || 'GET').toUpperCase();
    const isGet = method === 'GET';
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${currentToken}`,
      ...(options.headers || {}),
    };

    // ── GET: stale-while-revalidate ──────────────────────────────────────
    if (isGet) {
      // 1. Start network fetch with timeout (aborts if offline within 5 s)
      const networkPromise = fetchWithTimeout(url, { ...options, headers }, FETCH_TIMEOUT_MS)
        .then(async res => {
          if (res.ok) {
            const clone = res.clone();
            clone.json().then(data => cacheApiData(url, data)).catch(() => {});
          }
          if (res.status === 401) logout();
          return res;
        })
        .catch(() => null); // null = network gone / timed out

      // 2. Read stale cache immediately
      const cached = await getCachedApiData(url);

      if (cached) {
        // Serve cached data right away; network promise will update cache for next visit
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 3. No cache yet — wait for network
      const netRes = await networkPromise;
      if (netRes) return netRes;

      // 4. Totally offline and no cache — return a safe empty object
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

    // ── Mutation (POST / PUT / PATCH / DELETE) ───────────────────────────
    try {
      const res = await fetchWithTimeout(url, { ...options, headers }, FETCH_TIMEOUT_MS);
      if (res.status === 401) logout();
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

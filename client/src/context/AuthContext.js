import React, { createContext, useState, useEffect } from 'react';
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

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

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const authFetch = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    if (res.status === 401) { logout(); return res; }
    return res;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, authFetch, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

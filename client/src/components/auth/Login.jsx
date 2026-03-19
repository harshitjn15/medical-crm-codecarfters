import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './Login.css';

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Login failed');
      login(data.token, data.user);
      navigate('/admin/dashboard');
    } catch { setError('Connection error. Is the server running?'); }
    finally { setLoading(false); }
  };

  const handleDemoLogin = async () => {
  setError('');
  setLoading(true);

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'demo',
        password: 'demo123'
      })
    });

    const data = await res.json();

    if (!res.ok) {
      return setError('Demo login failed');
    }

    // ✅ IMPORTANT: store role also
    localStorage.setItem('role', data.user?.role || 'DEMO');

    login(data.token, data.user);
    navigate('/admin/dashboard');

  } catch {
    setError('Demo login failed');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          <span className="login-brand-icon">🏥</span>
          <h1>Medical CRM</h1>
          <p>Multi-clinic management platform for modern healthcare</p>
        </div>
        <div className="login-features">
          {['Patient Management','Appointment Booking','Prescriptions','Invoices & Billing','Follow-up Tracking'].map(f => (
            <div key={f} className="feature-item"><span>✓</span> {f}</div>
          ))}
        </div>
      </div>
      <div className="login-right">
        <div className="login-card">
          <h2>Welcome back</h2>
          <p className="login-sub">Sign in to your clinic dashboard</p>
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label>Username</label><input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="admin" autoFocus /></div>
            <div className="form-group"><label>Password</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" /></div>
            <button type="submit" className="btn btn-primary login-btn" disabled={loading}>{loading ? 'Signing in…' : 'Sign in →'}</button>
          </form>
          <button
  type="button"
  onClick={handleDemoLogin}
  className="btn btn-secondary login-btn"
  style={{ marginTop: '10px' }}
>
  🚀 Try Demo (No Signup)
</button>
          <a href="/" className="back-link">← Back to public site</a>
        </div>
      </div>
    </div>
  );
}

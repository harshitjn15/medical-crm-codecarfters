import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import './Login.css';

export default function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match');
    setMsg(''); setError(''); setLoading(true);
    try {
      const res = await fetch(`/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setMsg(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          <div className="login-logo">⚕️</div>
          <h1>Mediva</h1>
          <p>Smart Clinic Management</p>
        </div>
        <div className="login-features">
          {['AI Powered Automation','Multi Specialty Support','WhatsApp Automation','Prescription & Billing'].map(f => (
            <div key={f} className="login-feature-item">
              <span className="login-check">✓</span> {f}
            </div>
          ))}
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <h2>Reset Password</h2>
          <p className="login-sub">Enter your new password below</p>
          
          {msg ? (
            <div>
              <div style={{color:'#166534', background:'#dcfce7', padding:10, borderRadius:6, marginBottom:16, fontSize:14}}>{msg}</div>
              <Link to="/login" className="btn btn-primary login-btn" style={{textDecoration:'none', textAlign:'center', display:'block'}}>Go to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div className="login-error">{error}</div>}
              <div className="form-group">
                <label>New Password</label>
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoFocus minLength={6} placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required minLength={6} placeholder="••••••••" />
              </div>
              <button className="btn btn-primary login-btn" type="submit" disabled={loading || !password || !confirm}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

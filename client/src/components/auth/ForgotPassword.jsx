import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Login.css';

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(''); setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request reset');
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
          <h2>Forgot Password</h2>
          <p className="login-sub">Enter your email, phone, or username to reset</p>
          
          {msg && <div style={{color:'#166534', background:'#dcfce7', padding:10, borderRadius:6, marginBottom:16, fontSize:14}}>{msg}</div>}
          {error && <div className="login-error">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email / Phone / Username</label>
              <input value={identifier} onChange={e=>setIdentifier(e.target.value)} required autoFocus placeholder="Enter registered detail" />
            </div>
            <button className="btn btn-primary login-btn" type="submit" disabled={loading || !identifier}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <div style={{marginTop: 15, textAlign:'center'}}>
              <Link to="/login" style={{color:'var(--primary)', textDecoration:'none', fontSize:14, fontWeight:500}}>← Back to Login</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

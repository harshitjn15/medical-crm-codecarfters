import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './Login.css';

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate  = useNavigate();
  const [mode, setMode]     = useState('password'); // 'password' | 'otp'

  // Password login state
  const [pwForm, setPwForm] = useState({ username:'', password:'' });
  const [pwErr,  setPwErr]  = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // OTP login state
  const [otpStep, setOtpStep]   = useState(1); // 1=enter phone, 2=enter code
  const [phone, setPhone]       = useState('');
  const [otp,   setOtp]         = useState('');
  const [waLink, setWaLink]     = useState('');
  const [otpErr,  setOtpErr]    = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // Password login
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setPwErr(''); setPwLoading(true);
    const res  = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(pwForm) });
    const data = await res.json();
    setPwLoading(false);
    if (!res.ok) return setPwErr(data.error || 'Invalid credentials');
    login(data.token, data.user);
    navigate('/admin/dashboard');
  };

  // OTP — step 1: generate OTP
  const handleSendOtp = async () => {
    setOtpErr(''); setOtpLoading(true);
    const res  = await fetch('/api/auth/otp/generate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ phone }) });
    const data = await res.json();
    setOtpLoading(false);
    if (!res.ok) return setOtpErr(data.error || 'Failed');
    setWaLink(data.waLink);
    setOtpStep(2);
  };

  // OTP — step 2: verify OTP
  const handleVerifyOtp = async () => {
    setOtpErr(''); setOtpLoading(true);
    const res  = await fetch('/api/auth/otp/verify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ phone, code: otp }) });
    const data = await res.json();
    setOtpLoading(false);
    if (!res.ok) return setOtpErr(data.error || 'Invalid OTP');
    login(data.token, data.user);
    navigate('/admin/dashboard');
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          <div className="login-logo">🏥</div>
          <h1>Medical CRM</h1>
          <p>Multi-specialty clinic management</p>
        </div>
        <div className="login-features">
          {['Dental · Dermatology · Cardiology','Patient files & reports','Smart clinical notes','Custom invoices'].map(f => (
            <div key={f} className="login-feature-item">
              <span className="login-check">✓</span> {f}
            </div>
          ))}
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <h2>Welcome back</h2>
          <p className="login-sub">Sign in to your clinic dashboard</p>

          {/* Mode toggle */}
          <div style={{ display:'flex', background:'var(--bg-main)', borderRadius:8, padding:3, marginBottom:20 }}>
            {[['password','🔑 Password'],['otp','📱 OTP Login']].map(([m, l]) => (
              <button key={m} onClick={() => { setMode(m); setPwErr(''); setOtpErr(''); setOtpStep(1); }}
                style={{ flex:1, padding:'7px 0', border:'none', borderRadius:6, fontSize:13, cursor:'pointer', fontFamily:'var(--font)',
                  background: mode===m ? 'var(--bg-card)' : 'transparent',
                  color: mode===m ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: mode===m ? 600 : 400,
                  boxShadow: mode===m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition:'all 0.15s',
                }}>
                {l}
              </button>
            ))}
          </div>

          {/* Password login */}
          {mode === 'password' && (
            <form onSubmit={handlePasswordLogin}>
              {pwErr && <div className="login-error">{pwErr}</div>}
              <div className="form-group">
                <label>Username</label>
                <input value={pwForm.username} onChange={e => setPwForm(f=>({...f,username:e.target.value}))} placeholder="admin" autoFocus autoComplete="username" />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={pwForm.password} onChange={e => setPwForm(f=>({...f,password:e.target.value}))} autoComplete="current-password" />
              </div>
              <button className="btn btn-primary login-btn" type="submit" disabled={pwLoading}>
                {pwLoading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          )}

          {/* OTP login */}
          {mode === 'otp' && (
            <div>
              {otpErr && <div className="login-error">{otpErr}</div>}

              {otpStep === 1 && (
                <>
                  <div className="form-group">
                    <label>WhatsApp Phone Number</label>
                    <div style={{ display:'flex', gap:8 }}>
                      <span style={{ padding:'10px 12px', background:'var(--bg-main)', border:'1px solid var(--border)', borderRadius:6, fontSize:14, color:'var(--text-muted)', whiteSpace:'nowrap' }}>+91</span>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" onKeyDown={e => e.key==='Enter' && handleSendOtp()} autoFocus style={{ flex:1 }} />
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>Must match the phone number registered with your account</div>
                  </div>
                  <button className="btn btn-primary login-btn" onClick={handleSendOtp} disabled={otpLoading || !phone.trim()}>
                    {otpLoading ? 'Generating…' : 'Send OTP'}
                  </button>
                </>
              )}

              {otpStep === 2 && (
                <>
                  <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'12px 14px', marginBottom:16 }}>
                    <div style={{ fontWeight:600, color:'#166534', fontSize:13, marginBottom:6 }}>OTP Generated!</div>
                    <div style={{ fontSize:13, color:'#166534', marginBottom:10 }}>Click the button below to open WhatsApp. Your OTP will be pre-filled — send it to yourself and then enter it here.</div>
                    <a href={waLink} target="_blank" rel="noreferrer"
                      style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'8px 16px', background:'#25D366', color:'#fff', borderRadius:7, textDecoration:'none', fontSize:13, fontWeight:600 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      Open WhatsApp to get OTP
                    </a>
                  </div>
                  <div className="form-group">
                    <label>Enter OTP</label>
                    <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="6-digit code" autoFocus maxLength={6}
                      style={{ fontSize:22, letterSpacing:8, textAlign:'center', fontFamily:'monospace' }}
                      onKeyDown={e => e.key==='Enter' && otp.length===6 && handleVerifyOtp()} />
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>OTP expires in 10 minutes</div>
                  </div>
                  <button className="btn btn-primary login-btn" onClick={handleVerifyOtp} disabled={otpLoading || otp.length < 6}>
                    {otpLoading ? 'Verifying…' : 'Verify & Sign In'}
                  </button>
                  <button style={{ width:'100%', marginTop:8, padding:'8px', border:'none', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }} onClick={() => { setOtpStep(1); setOtp(''); setOtpErr(''); }}>← Try different number</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

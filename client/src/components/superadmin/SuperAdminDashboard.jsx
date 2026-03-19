import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import './SuperAdmin.css';

const PLANS = ['basic','pro','enterprise'];
const PLAN_COLOR = { basic:'gray', pro:'info', enterprise:'success' };

export default function SuperAdminDashboard() {
  const { authFetch } = useContext(AuthContext);
  const [stats, setStats] = useState({});
  const [clinics, setClinics] = useState([]);
  const [view, setView] = useState('list');   // list | onboard | detail
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    const [s, c] = await Promise.all([
      authFetch('/api/superadmin/stats').then(r=>r.json()),
      authFetch('/api/superadmin/clinics').then(r=>r.json()),
    ]);
    setStats(s); setClinics(Array.isArray(c) ? c : []); setLoading(false);
  };
  useEffect(() => { loadData(); }, []);

  const loadDetail = async (id) => {
    const d = await authFetch(`/api/superadmin/clinics/${id}`).then(r=>r.json());
    setDetail(d); setSelected(id); setView('detail');
  };

  const toggleActive = async (id, name) => {
    const res = await authFetch(`/api/superadmin/clinics/${id}/toggle`, { method:'PUT' });
    const data = await res.json();
    setMsg(data.message || 'Updated');
    loadData();
    if (view === 'detail') loadDetail(id);
  };

  const changePlan = async (id, plan) => {
    await authFetch(`/api/superadmin/clinics/${id}/plan`, { method:'PUT', body: JSON.stringify({ plan }) });
    loadData();
    if (view === 'detail') loadDetail(id);
  };

  const fmt = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n||0);
  const fmtDate = d => d ? d.split('T')[0] : '—';

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>🛡️ Super Admin</h1>
          <p>Platform-wide clinic management</p>
        </div>
        <button className="btn btn-primary" onClick={() => setView('onboard')}>+ Onboard Clinic</button>
      </div>

      {msg && <div className="success-banner" style={{ maxWidth:500 }}>{msg} <button className="btn-icon btn-sm" onClick={()=>setMsg('')}>✕</button></div>}

      {/* Platform stats */}
      <div className="stats-grid">
        {[
          ['Total Clinics', stats.total_clinics, 'blue'],
          ['Active Clinics', stats.active_clinics, 'green'],
          ['Total Patients', stats.total_patients, 'teal'],
          ['Platform Revenue', fmt(stats.total_revenue), 'orange'],
        ].map(([label, val, color]) => (
          <div key={label} className={`stat-card ${color}`}>
            <div className="stat-label">{label}</div>
            <div className="stat-value" style={{ fontSize: 22 }}>{val}</div>
          </div>
        ))}
      </div>

      {view === 'list' && (
        <div className="card">
          <div className="card-header"><h2>All Clinics ({clinics.length})</h2></div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Clinic</th><th>Slug / URL</th><th>Plan</th>
                  <th>Patients</th><th>Revenue</th><th>Onboarded</th>
                  <th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clinics.map(c => (
                  <tr key={c.id}>
                    <td>
                      <strong style={{ cursor:'pointer', color:'var(--primary)' }} onClick={() => loadDetail(c.id)}>{c.name}</strong>
                      <div style={{ fontSize:12, color:'var(--text-muted)' }}>{c.email || c.phone}</div>
                    </td>
                    <td>
                      <code style={{ fontSize:12, background:'#f1f5f9', padding:'2px 6px', borderRadius:4 }}>{c.slug}</code>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>/book?clinic={c.slug}</div>
                    </td>
                    <td>
                      <select
                        value={c.plan}
                        onChange={e => changePlan(c.id, e.target.value)}
                        className={`plan-select plan-${c.plan}`}
                        style={{ width:'auto', padding:'4px 8px', fontSize:12 }}
                      >
                        {PLANS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                      </select>
                    </td>
                    <td>{c.patient_count}</td>
                    <td>{fmt(c.total_revenue)}</td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>{fmtDate(c.created_at)}</td>
                    <td>
                      <span className={`badge badge-${c.is_active ? 'success' : 'danger'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        <button className="btn-icon" title="Details" onClick={() => loadDetail(c.id)}>👁️</button>
                        <button
                          className={`btn btn-sm ${c.is_active ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => toggleActive(c.id, c.name)}
                        >
                          {c.is_active ? '⏸ Disable' : '▶ Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'detail' && detail && (
        <ClinicDetail
          detail={detail}
          onBack={() => setView('list')}
          onToggle={() => toggleActive(detail.clinic.id, detail.clinic.name)}
          onPlanChange={plan => changePlan(detail.clinic.id, plan)}
          fmt={fmt}
        />
      )}

      {view === 'onboard' && (
        <OnboardForm
          authFetch={authFetch}
          onBack={() => setView('list')}
          onDone={(msg) => { setMsg(msg); setView('list'); loadData(); }}
        />
      )}
    </div>
  );
}

function ClinicDetail({ detail, onBack, onToggle, onPlanChange, fmt }) {
  const { clinic, users, recentActivity } = detail;
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>← Back</button>
        <h2 style={{ margin:0 }}>{clinic.name}</h2>
        <span className={`badge badge-${clinic.is_active ? 'success' : 'danger'}`}>{clinic.is_active ? 'Active' : 'Inactive'}</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div className="card">
          <div className="card-header"><h2>Clinic Information</h2></div>
          <div className="card-body">
            {[['Name', clinic.name],['Slug', clinic.slug],['Email', clinic.email],['Phone', clinic.phone],['Address', clinic.address],['GST', clinic.gst_number],['Onboarded', clinic.created_at?.split('T')[0]]].map(([l,v]) => v ? (
              <div key={l} style={{ display:'flex', gap:10, marginBottom:10, fontSize:14 }}>
                <span style={{ color:'var(--text-muted)', minWidth:90 }}>{l}</span><span>{v}</span>
              </div>
            ) : null)}
            <div style={{ marginTop:16, display:'flex', gap:10 }}>
              <select value={clinic.plan} onChange={e=>onPlanChange(e.target.value)} className="btn btn-secondary" style={{ width:'auto' }}>
                {['basic','pro','enterprise'].map(p=><option key={p} value={p}>{p}</option>)}
              </select>
              <button className={`btn btn-sm ${clinic.is_active ? 'btn-danger' : 'btn-success'}`} onClick={onToggle}>
                {clinic.is_active ? '⏸ Disable Clinic' : '▶ Enable Clinic'}
              </button>
            </div>
            <div style={{ marginTop:12, padding:'10px 14px', background:'#f1f5f9', borderRadius:8, fontSize:13 }}>
              <strong>Booking URL:</strong><br/>
              <code style={{ fontSize:12 }}>/book?clinic={clinic.slug}</code>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2>Staff Users ({users?.length})</h2></div>
          <div className="table-container">
            <table>
              <thead><tr><th>Username</th><th>Role</th><th>Email</th><th>Since</th></tr></thead>
              <tbody>
                {users?.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.username}</strong></td>
                    <td><span className={`badge badge-${u.role==='super_admin'?'danger':u.role==='admin'?'info':'gray'}`}>{u.role}</span></td>
                    <td style={{ fontSize:12 }}>{u.email||'—'}</td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>{u.created_at?.split('T')[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card" style={{ gridColumn:'1/-1' }}>
          <div className="card-header"><h2>Recent Activity</h2></div>
          <div className="table-container">
            <table>
              <thead><tr><th>Type</th><th>Detail</th><th>Date</th></tr></thead>
              <tbody>
                {recentActivity?.map((a,i) => (
                  <tr key={i}>
                    <td><span className={`badge badge-${a.type==='appointment'?'info':a.type==='patient'?'success':'warning'}`}>{a.type}</span></td>
                    <td>{a.label}</td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>{a.created_at?.split('T')[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function OnboardForm({ authFetch, onBack, onDone }) {
  const [form, setForm] = useState({ name:'',slug:'',address:'',phone:'',email:'',tagline:'',gst_number:'',currency:'INR',plan:'basic',admin_username:'',admin_password:'',admin_email:'' });
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const autoSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

  const handleSubmit = async () => {
    if (!form.name||!form.slug||!form.admin_username||!form.admin_password) return setError('Name, slug, admin username and password are required');
    setSaving(true); setError('');
    const res = await authFetch('/api/superadmin/clinics', { method:'POST', body:JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error||'Failed'); setSaving(false); return; }
    onDone(`✓ ${form.name} onboarded! Login: ${form.admin_username} / ${form.admin_password} | Booking: /book?clinic=${form.slug}`);
  };

  return (
    <div style={{ maxWidth:820 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>← Back</button>
        <h2 style={{ margin:0 }}>Onboard New Clinic</h2>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div className="card">
          <div className="card-header"><h2>Clinic Details</h2></div>
          <div className="card-body">
            <div className="form-group">
              <label>Clinic Name *</label>
              <input value={form.name} onChange={e=>{ set('name',e.target.value); if(!form.slug) set('slug',autoSlug(e.target.value)); }} placeholder="Apollo Clinic Mumbai" autoFocus />
            </div>
            <div className="form-group">
              <label>URL Slug * <span style={{ color:'var(--text-muted)',fontSize:12 }}>(used in /book?clinic=<b>{form.slug||'...'}</b>)</span></label>
              <input value={form.slug} onChange={e=>set('slug',e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} placeholder="apollo-mumbai" />
            </div>
            <div className="form-group"><label>Tagline</label><input value={form.tagline} onChange={e=>set('tagline',e.target.value)} placeholder="Your health, our priority" /></div>
            <div className="form-group"><label>Address</label><textarea rows={2} value={form.address} onChange={e=>set('address',e.target.value)} /></div>
            <div className="form-row">
              <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e=>set('phone',e.target.value)} /></div>
              <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e=>set('email',e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>GST Number</label><input value={form.gst_number} onChange={e=>set('gst_number',e.target.value)} /></div>
              <div className="form-group"><label>Plan</label>
                <select value={form.plan} onChange={e=>set('plan',e.target.value)}>
                  <option value="basic">Basic</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2>Admin Account</h2></div>
          <div className="card-body">
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>This creates the first admin user for the clinic. They can add more staff from Settings.</p>
            <div className="form-group"><label>Admin Username *</label><input value={form.admin_username} onChange={e=>set('admin_username',e.target.value)} placeholder="apollo_admin" /></div>
            <div className="form-group"><label>Admin Password *</label><input type="password" value={form.admin_password} onChange={e=>set('admin_password',e.target.value)} placeholder="Secure password" /></div>
            <div className="form-group"><label>Admin Email</label><input type="email" value={form.admin_email} onChange={e=>set('admin_email',e.target.value)} /></div>
            <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:8, padding:'12px 14px', fontSize:13, marginTop:8 }}>
              <strong>After onboarding:</strong><br/>
              Booking URL: <code>/book?clinic={form.slug||'...'}</code><br/>
              Admin login: <code>{form.admin_username||'...'}</code>
            </div>
          </div>
        </div>
      </div>
      <div style={{ marginTop:20, display:'flex', gap:12 }}>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving?'Onboarding…':'✓ Onboard Clinic'}</button>
        <button className="btn btn-secondary" onClick={onBack}>Cancel</button>
      </div>
    </div>
  );
}

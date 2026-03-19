import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import ClinicWebsiteEditor from './ClinicWebsiteEditor';
import WhatsAppSettings from './WhatsAppSettings';

const SPECIALTIES = [
  { value:'general',       label:'General / Family Medicine' },
  { value:'dental',        label:'Dental / Oral Health' },
  { value:'dermatology',   label:'Dermatology & Skin Care' },
  { value:'cardiology',    label:'Cardiology & Heart' },
  { value:'orthopedics',   label:'Orthopedics & Bones' },
  { value:'ent',           label:'ENT (Ear, Nose, Throat)' },
  { value:'gynecology',    label:'Gynecology & Obstetrics' },
  { value:'pediatrics',    label:'Pediatrics & Child Health' },
  { value:'ophthalmology', label:'Ophthalmology & Eye Care' },
  { value:'neurology',     label:'Neurology & Brain' },
  { value:'psychiatry',    label:'Psychiatry & Mental Health' },
];

export default function ClinicSettings() {
  const { authFetch } = useContext(AuthContext);
  const [tab, setTab]     = useState('clinic');
  const [form, setForm]   = useState({ name:'', slug:'', address:'', phone:'', email:'', tagline:'', gstNumber:'', currency:'INR', specialty:'general' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [procCount, setProcCount] = useState(null);
  const [msg, setMsg]     = useState('');

  useEffect(() => {
    authFetch('/api/clinics/me').then(r=>r.json()).then(d=>{
      setForm({ name:d.name||'', slug:d.slug||'', address:d.address||'', phone:d.phone||'', email:d.email||'', tagline:d.tagline||'', gstNumber:d.gstNumber||'', currency:d.currency||'INR', specialty:d.specialty||'general' });
      setLoading(false);
    });
    authFetch('/api/procedures?active_only=false').then(r=>r.json()).then(d=>setProcCount(d.procedures?.length||0));
  }, []);

  const handleSave = async () => {
    setSaving(true); setMsg('');
    const res  = await authFetch('/api/clinics/me', { method:'PUT', body:JSON.stringify(form) });
    const data = await res.json();
    setMsg(res.ok ? '✓ Settings saved' : data.error||'Save failed');
    setSaving(false);
  };

  const handleSeedProcedures = async () => {
    setSeeding(true);
    const res  = await authFetch('/api/procedures/seed', { method:'POST', body:JSON.stringify({ specialty:form.specialty }) });
    const data = await res.json();
    setMsg(data.message||'Seeded');
    setSeeding(false);
    authFetch('/api/procedures?active_only=false').then(r=>r.json()).then(d=>setProcCount(d.procedures?.length||0));
  };

  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  const TABS = [{id:'clinic',label:'⚙️ Clinic Info'},{id:'website',label:'🌐 Public Website'},{id:'staff',label:'👤 Staff Users'}];
  const tabStyle = (active) => ({ padding:'8px 16px', border:'none', background:'transparent', cursor:'pointer', fontFamily:'var(--font)', fontSize:13, fontWeight:active?600:400, color:active?'var(--primary)':'var(--text-secondary)', borderBottom:active?'2px solid var(--primary)':'2px solid transparent', marginBottom:-2 });

  return (
    <div className="page">
      <div className="page-header"><div className="page-header-left"><h1>Settings</h1></div></div>
      <div style={{ display:'flex', marginBottom:24, borderBottom:'2px solid var(--border)' }}>
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={tabStyle(tab===t.id)}>{t.label}</button>)}
      </div>

      {tab==='clinic' && (
        <>
          {msg && <div className={msg.startsWith('✓')?'success-banner':'error-banner'} style={{ maxWidth:900, marginBottom:16 }}>{msg}</div>}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, maxWidth:900 }}>
            <div className="card">
              <div className="card-header"><h2>Basic Information</h2></div>
              <div className="card-body">
                <div className="form-group"><label>Clinic Name</label><input value={form.name} onChange={e=>set('name',e.target.value)} /></div>
                <div className="form-group"><label>Tagline</label><input value={form.tagline} onChange={e=>set('tagline',e.target.value)} placeholder="Your clinic's motto" /></div>
                <div className="form-group"><label>URL Slug (read-only)</label><input value={form.slug} disabled style={{ background:'#f8fafc', color:'var(--text-muted)' }} /></div>
                <div className="form-group"><label>Address</label><textarea rows={3} value={form.address} onChange={e=>set('address',e.target.value)} /></div>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h2>Contact & Specialty</h2></div>
              <div className="card-body">
                <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e=>set('phone',e.target.value)} /></div>
                <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e=>set('email',e.target.value)} /></div>
                <div className="form-group"><label>GST Number</label><input value={form.gstNumber} onChange={e=>set('gstNumber',e.target.value)} placeholder="27AARCA0001A1Z5" /></div>
                <div className="form-group"><label>Currency</label>
                  <select value={form.currency} onChange={e=>set('currency',e.target.value)}>
                    <option value="INR">INR — Indian Rupee (₹)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Clinic Specialty</label>
                  <select value={form.specialty} onChange={e=>set('specialty',e.target.value)}>
                    {SPECIALTIES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>Controls which clinical features appear (dental chart, specialty templates, etc.)</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop:20, display:'flex', gap:12 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save Settings'}</button>
          </div>

          <div className="card" style={{ marginTop:20, maxWidth:640 }}>
            <div className="card-header"><h2>🔗 Patient Booking Link</h2></div>
            <div className="card-body">
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <code style={{ background:'#f1f5f9', padding:'8px 14px', borderRadius:6, flex:1, fontSize:13 }}>{window.location.origin}/book?clinic={form.slug}</code>
                <button className="btn btn-secondary btn-sm" onClick={()=>{ navigator.clipboard.writeText(`${window.location.origin}/book?clinic=${form.slug}`); setMsg('✓ Link copied!'); }}>Copy</button>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop:16, maxWidth:640 }}>
            <div className="card-header"><h2>⚡ Procedure Library</h2></div>
            <div className="card-body">
              <p style={{ color:'var(--text-secondary)', fontSize:13, marginBottom:12 }}>
                Seed default procedures for <strong>{SPECIALTIES.find(s=>s.value===form.specialty)?.label||form.specialty}</strong>.
                {procCount!==null && <span style={{ marginLeft:6 }}>Currently <strong>{procCount}</strong> procedures in library.</span>}
              </p>
              {procCount===0
                ? <button className="btn btn-primary" onClick={handleSeedProcedures} disabled={seeding}>{seeding?'Seeding…':`⚡ Seed defaults for ${form.specialty}`}</button>
                : <p style={{ fontSize:13, color:'var(--success)' }}>✓ Already seeded. Manage in Procedure Library page.</p>
              }
            </div>
          </div>
        </>
      )}

      {tab==='website' && <ClinicWebsiteEditor />}
      {tab==='staff'   && <AddStaffCard authFetch={authFetch} />}
      {tab==='whatsapp' && <WhatsAppSettings />}
    </div>
  );
}

function AddStaffCard({ authFetch }) {
  const [form, setForm] = useState({ username:'', password:'', confirm:'' });
  const [msg, setMsg]   = useState('');
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    if (form.password!==form.confirm) return setMsg('Passwords do not match');
    if (form.password.length<6)      return setMsg('Password must be at least 6 characters');
    setSaving(true);
    const res  = await authFetch('/api/auth/register', { method:'POST', body:JSON.stringify({ username:form.username, password:form.password, role:'staff' }) });
    const data = await res.json();
    setMsg(res.ok?'✓ Staff user created':data.error||'Failed');
    setSaving(false);
  };
  return (
    <div style={{ maxWidth:540 }}>
      <div className="card">
        <div className="card-header"><h2>Add Staff User</h2></div>
        <div className="card-body">
          {msg && <div className={msg.startsWith('✓')?'success-banner':'error-banner'} style={{ marginBottom:12 }}>{msg}</div>}
          <div className="form-row">
            <div className="form-group"><label>Username</label><input value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} /></div>
            <div className="form-group"><label>Password</label><input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} /></div>
          </div>
          <div className="form-group" style={{ maxWidth:260 }}><label>Confirm Password</label><input type="password" value={form.confirm} onChange={e=>setForm(f=>({...f,confirm:e.target.value}))} /></div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Creating…':'Create Staff User'}</button>
        </div>
      </div>
    </div>
  );
}

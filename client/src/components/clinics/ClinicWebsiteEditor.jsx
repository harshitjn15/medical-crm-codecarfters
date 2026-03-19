import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const DEFAULT_SERVICES = ['General Consultation','Follow-up Visits','Prescription Management','Health Check-ups','Lab Reports','Emergency Care'];

export default function ClinicWebsiteEditor() {
  const { authFetch, user } = useContext(AuthContext);
  const [form, setForm] = useState({ heroTitle:'', heroSubtitle:'', primaryColor:'#0f4c75', services:[], workingHours:'Mon–Sat: 9:00 AM – 6:00 PM', aboutText:'', showMap:false, mapEmbed:'' });
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [msg, setMsg] = useState('');
  const [newService, setNewService] = useState('');

  useEffect(() => {
    authFetch('/api/website/settings').then(r=>r.json()).then(d => {
      setForm({ heroTitle:d.heroTitle||'', heroSubtitle:d.heroSubtitle||'', primaryColor:d.primaryColor||'#0f4c75', services:d.services||[], workingHours:d.workingHours||'Mon–Sat: 9:00 AM – 6:00 PM', aboutText:d.aboutText||'', showMap:!!d.showMap, mapEmbed:d.mapEmbed||'' });
      setLoading(false);
    });
  }, []);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const addService = () => { if (!newService.trim()) return; setForm(f=>({...f,services:[...f.services,newService.trim()]})); setNewService(''); };
  const removeService = (i) => setForm(f=>({...f,services:f.services.filter((_,j)=>j!==i)}));

  const handleSave = async () => {
    setSaving(true); setMsg('');
    const res = await authFetch('/api/website/settings', { method:'PUT', body:JSON.stringify(form) });
    const data = await res.json();
    setMsg(res.ok ? '✓ Website settings saved!' : data.error||'Save failed');
    setSaving(false);
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;
  const clinicSlug = user?.clinic_slug || 'default';

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div><h2 style={{ margin:0 }}>🌐 Public Website Editor</h2><p style={{ color:'var(--text-muted)', fontSize:13, marginTop:4 }}>Customize your clinic's public booking page</p></div>
        <div style={{ display:'flex', gap:8 }}>
          <a href={`/?clinic=${clinicSlug}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">👁️ Preview</a>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':'💾 Save Changes'}</button>
        </div>
      </div>
      {msg && <div className={msg.startsWith('✓')?'success-banner':'error-banner'} style={{ marginBottom:16 }}>{msg}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div className="card">
          <div className="card-header"><h2>Hero Section</h2></div>
          <div className="card-body">
            <div className="form-group"><label>Hero Title</label><input value={form.heroTitle} onChange={e=>set('heroTitle',e.target.value)} placeholder="Welcome to Our Clinic" /></div>
            <div className="form-group"><label>Hero Subtitle</label><textarea rows={2} value={form.heroSubtitle} onChange={e=>set('heroSubtitle',e.target.value)} /></div>
            <div className="form-group">
              <label>Brand Color</label>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <input type="color" value={form.primaryColor} onChange={e=>set('primaryColor',e.target.value)} style={{ width:48, height:36, padding:2, cursor:'pointer' }} />
                <input value={form.primaryColor} onChange={e=>set('primaryColor',e.target.value)} style={{ flex:1, fontFamily:'monospace' }} />
              </div>
              <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap' }}>
                {['#0f4c75','#1a5c38','#7c3aed','#b91c1c','#0369a1','#be185d','#0891b2'].map(c=>(
                  <button key={c} onClick={()=>set('primaryColor',c)} style={{ width:28, height:28, background:c, border:form.primaryColor===c?'3px solid #000':'2px solid transparent', borderRadius:6, cursor:'pointer' }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2>Services List</h2></div>
          <div className="card-body">
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
              {form.services.map((s,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, background:'var(--bg-main)', padding:'7px 10px', borderRadius:6 }}>
                  <span style={{ flex:1, fontSize:14 }}>✦ {s}</span>
                  <button className="btn-icon" style={{ color:'var(--danger)' }} onClick={()=>removeService(i)}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input value={newService} onChange={e=>setNewService(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addService()} placeholder="Add a service…" style={{ flex:1 }} />
              <button className="btn btn-secondary btn-sm" onClick={addService}>+ Add</button>
            </div>
            <div style={{ marginTop:12 }}>
              <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6 }}>Quick add:</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {DEFAULT_SERVICES.filter(s=>!form.services.includes(s)).map(s=>(
                  <button key={s} className="badge badge-info" style={{ cursor:'pointer', border:'none' }} onClick={()=>setForm(f=>({...f,services:[...f.services,s]}))}>+ {s}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2>About & Hours</h2></div>
          <div className="card-body">
            <div className="form-group"><label>Working Hours</label><input value={form.workingHours} onChange={e=>set('workingHours',e.target.value)} /></div>
            <div className="form-group"><label>About / Description</label><textarea rows={4} value={form.aboutText} onChange={e=>set('aboutText',e.target.value)} placeholder="Brief description…" /></div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Google Map</h2>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:14, fontWeight:400 }}>
              <input type="checkbox" checked={form.showMap} onChange={e=>set('showMap',e.target.checked)} />Show map
            </label>
          </div>
          <div className="card-body">
            <div className="form-group"><label>Google Maps Embed URL</label><textarea rows={3} value={form.mapEmbed} onChange={e=>set('mapEmbed',e.target.value)} placeholder="https://www.google.com/maps/embed?pb=..." disabled={!form.showMap} /></div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop:20 }}>
        <div className="card-header"><h2>Color Preview</h2></div>
        <div className="card-body" style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ background:form.primaryColor, color:'#fff', padding:'10px 20px', borderRadius:8, fontWeight:600 }}>Primary Button</div>
          <div style={{ borderLeft:`4px solid ${form.primaryColor}`, padding:'8px 12px', background:'#f8fafc', fontSize:14 }}>Section accent</div>
          <div style={{ color:form.primaryColor, fontSize:18, fontWeight:700 }}>Heading Text</div>
          <div style={{ fontSize:13, color:'var(--text-muted)', marginLeft:'auto' }}>
            Booking: <a href={`/book?clinic=${clinicSlug}`} target="_blank" rel="noreferrer">/book?clinic={clinicSlug}</a>
          </div>
        </div>
      </div>
    </div>
  );
}

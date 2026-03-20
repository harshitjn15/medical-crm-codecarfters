import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';

const LAYOUTS = [
  {
    id: 'classic',
    label: 'Classic',
    desc: 'Traditional header with full clinic details on left, invoice details on right',
    preview: '🏛️',
  },
  {
    id: 'modern',
    label: 'Modern',
    desc: 'Bold color banner header, clean minimal table, accent colors throughout',
    preview: '✨',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    desc: 'Simple black & white, no colors, best for direct printing',
    preview: '⬜',
  },
];

const COLORS = ['#0f4c75','#1a5c38','#7c3aed','#b91c1c','#0369a1','#be185d','#0891b2','#1e3a5f','#2d4a22'];

export default function InvoiceTemplateEditor() {
  const { authFetch, user } = useContext(AuthContext);
  const [form, setForm] = useState({
    layout: 'classic', logoData: '', logoName: '', primaryColor: '#0f4c75',
    headerNote: '', footerNote: 'Thank you for your visit.',
    showGst: true, showDoctorName: true,
    doctorName: '', doctorDegree: '', regNumber: '',
  });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');
  const logoRef = useRef();

  useEffect(() => {
    authFetch('/api/invoicetemplate').then(r => r.json()).then(d => {
      if (d.id) setForm({
        layout:        d.layout        || 'classic',
        logoData:      d.logoData      || '',
        logoName:      d.logoName      || '',
        primaryColor:  d.primaryColor  || '#0f4c75',
        headerNote:    d.headerNote    || '',
        footerNote:    d.footerNote    || 'Thank you for your visit.',
        showGst:       d.showGst !== false,
        showDoctorName:d.showDoctorName !== false,
        doctorName:    d.doctorName    || '',
        doctorDegree:  d.doctorDegree  || '',
        regNumber:     d.regNumber     || '',
      });
      setLoading(false);
    });
  }, []);

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1 * 1024 * 1024) return setMsg('Logo too large — max 1MB');
    const reader = new FileReader();
    reader.onload = ev => {
      set('logoData', ev.target.result.split(',')[1]);
      set('logoName', file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true); setMsg('');
    const res  = await authFetch('/api/invoicetemplate', { method:'PUT', body: JSON.stringify(form) });
    const data = await res.json();
    setMsg(res.ok ? '✓ Invoice template saved' : data.error || 'Save failed');
    setSaving(false);
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ margin:0 }}>Invoice Template</h2>
          <p style={{ margin:'4px 0 0', color:'var(--text-muted)', fontSize:13 }}>Customize how your invoices look when printed</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : '💾 Save Template'}</button>
      </div>

      {msg && <div className={msg.startsWith('✓') ? 'success-banner' : 'error-banner'} style={{ marginBottom:16 }}>{msg}</div>}

      {/* Layout selector */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-header"><h2>Layout Style</h2></div>
        <div className="card-body">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {LAYOUTS.map(l => (
              <div key={l.id}
                onClick={() => set('layout', l.id)}
                style={{ border:`2px solid ${form.layout===l.id ? 'var(--primary)' : 'var(--border)'}`, borderRadius:10, padding:'16px 14px', cursor:'pointer', transition:'all 0.15s', background: form.layout===l.id ? '#eff6ff' : 'var(--bg-card)' }}
              >
                <div style={{ fontSize:28, marginBottom:8 }}>{l.preview}</div>
                <div style={{ fontWeight:600, fontSize:14, marginBottom:4, color: form.layout===l.id ? 'var(--primary)' : 'var(--text-primary)' }}>{l.label}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5 }}>{l.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

        {/* Logo & Color */}
        <div className="card">
          <div className="card-header"><h2>Logo & Color</h2></div>
          <div className="card-body">
            <div className="form-group">
              <label>Clinic Logo</label>
              {form.logoData ? (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'var(--bg-main)', borderRadius:8, marginBottom:8 }}>
                  <img src={`data:image/png;base64,${form.logoData}`} alt="logo" style={{ height:40, maxWidth:120, objectFit:'contain' }} />
                  <div style={{ flex:1, fontSize:13 }}>{form.logoName}</div>
                  <button className="btn-icon" onClick={() => { set('logoData',''); set('logoName',''); }}>✕</button>
                </div>
              ) : (
                <div onClick={() => logoRef.current?.click()} style={{ border:'2px dashed var(--border)', borderRadius:8, padding:'20px', textAlign:'center', cursor:'pointer', color:'var(--text-muted)', fontSize:13 }}>
                  Click to upload logo (PNG, JPG — max 1MB)
                </div>
              )}
              <input ref={logoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleLogoUpload} />
            </div>

            <div className="form-group">
              <label>Primary Color</label>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input type="color" value={form.primaryColor} onChange={e => set('primaryColor', e.target.value)} style={{ width:44, height:36, borderRadius:6, cursor:'pointer', border:'1px solid var(--border)', padding:2 }} />
                <input value={form.primaryColor} onChange={e => set('primaryColor', e.target.value)} style={{ flex:1, fontFamily:'monospace' }} />
              </div>
              <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap' }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => set('primaryColor', c)}
                    style={{ width:26, height:26, background:c, borderRadius:5, cursor:'pointer', border: form.primaryColor===c ? '3px solid #000' : '2px solid transparent' }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Doctor details */}
        <div className="card">
          <div className="card-header"><h2>Doctor Details</h2></div>
          <div className="card-body">
            <div className="form-group">
              <label>Doctor Name</label>
              <input value={form.doctorName} onChange={e => set('doctorName', e.target.value)} placeholder="Dr. Ramesh Patel" />
            </div>
            <div className="form-group">
              <label>Degree / Qualification</label>
              <input value={form.doctorDegree} onChange={e => set('doctorDegree', e.target.value)} placeholder="BDS, MDS (Oral Surgery)" />
            </div>
            <div className="form-group">
              <label>Registration Number</label>
              <input value={form.regNumber} onChange={e => set('regNumber', e.target.value)} placeholder="MCI / State Reg No." />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[['showDoctorName','Show doctor name on invoice'],['showGst','Show GST number on invoice']].map(([k,l]) => (
                <label key={k} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:14 }}>
                  <input type="checkbox" checked={form[k]} onChange={e => set(k, e.target.checked)} />
                  {l}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Header / footer notes */}
        <div className="card">
          <div className="card-header"><h2>Header & Footer Notes</h2></div>
          <div className="card-body">
            <div className="form-group">
              <label>Header Note</label>
              <textarea rows={2} value={form.headerNote} onChange={e => set('headerNote', e.target.value)} placeholder="e.g. Registration No: MH/1234 | Timings: Mon–Sat 9–6" />
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>Appears below clinic address on every invoice</div>
            </div>
            <div className="form-group">
              <label>Footer Note</label>
              <textarea rows={2} value={form.footerNote} onChange={e => set('footerNote', e.target.value)} placeholder="e.g. Thank you for your visit. Payment due within 7 days." />
            </div>
          </div>
        </div>

        {/* Preview hint */}
        <div className="card" style={{ background:'#f8fafc' }}>
          <div className="card-header"><h2>📋 How to apply</h2></div>
          <div className="card-body" style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.8 }}>
            <p>Your template settings are applied automatically when you open any invoice and click <strong>🖨️ Print / Save PDF</strong>.</p>
            <p>Each layout gives a different look:</p>
            <ul style={{ paddingLeft:16, margin:'8px 0' }}>
              <li><strong>Classic</strong> — standard clinic letterhead style</li>
              <li><strong>Modern</strong> — colored header band, contemporary feel</li>
              <li><strong>Minimal</strong> — plain black & white, laser-print friendly</li>
            </ul>
            <p style={{ margin:0 }}>Your logo and doctor details appear on every printed invoice.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

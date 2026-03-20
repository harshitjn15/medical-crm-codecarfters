import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';

const CATEGORIES = [
  { value:'lab_report',   label:'Lab Report',   icon:'🧪' },
  { value:'xray',         label:'X-Ray',        icon:'🦴' },
  { value:'scan',         label:'Scan / MRI',   icon:'📡' },
  { value:'prescription', label:'Prescription', icon:'💊' },
  { value:'insurance',    label:'Insurance',    icon:'📄' },
  { value:'other',        label:'Other',        icon:'📎' },
];

const catIcon  = v => CATEGORIES.find(c => c.value === v)?.icon || '📎';
const catLabel = v => CATEGORIES.find(c => c.value === v)?.label || v;
const fmtSize  = b => b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : `${Math.round(b/1024)} KB`;

export default function FileAttachments({ patientId }) {
  const { authFetch } = useContext(AuthContext);
  const [files, setFiles]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview]   = useState(null); // { name, mimetype, data }
  const [form, setForm]         = useState({ category:'other', notes:'' });
  const [pendingFile, setPending] = useState(null); // { name, type, data }
  const [msg, setMsg]           = useState('');
  const inputRef = useRef();

  const load = async () => {
    setLoading(true);
    const r = await authFetch(`/api/files?patient_id=${patientId}`);
    const d = await r.json();
    setFiles(d.files || []);
    setLoading(false);
  };
  useEffect(() => { if (patientId) load(); }, [patientId]);

  const readFile = (file) => new Promise((res, rej) => {
    if (file.size > 5 * 1024 * 1024) return rej(new Error('File too large — max 5MB'));
    const allowed = ['application/pdf','image/jpeg','image/jpg','image/png','image/webp','image/gif'];
    if (!allowed.includes(file.type)) return rej(new Error('Only PDF and images allowed'));
    const reader = new FileReader();
    reader.onload = e => res({ name: file.name, type: file.type, data: e.target.result.split(',')[1] });
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });

  const handleDrop = async (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    try { setPending(await readFile(file)); } catch (err) { setMsg(err.message); }
  };

  const handleFileInput = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try { setPending(await readFile(file)); } catch (err) { setMsg(err.message); }
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    setUploading(true); setMsg('');
    const res = await authFetch('/api/files/upload', {
      method: 'POST',
      body: JSON.stringify({ patient_id: patientId, filename: pendingFile.name, mimetype: pendingFile.type, data: pendingFile.data, ...form }),
    });
    const d = await res.json();
    if (!res.ok) { setMsg(d.error || 'Upload failed'); setUploading(false); return; }
    setMsg('✓ Uploaded');
    setPending(null);
    setForm({ category:'other', notes:'' });
    setUploading(false);
    load();
    setTimeout(() => setMsg(''), 2500);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this file?')) return;
    await authFetch(`/api/files/${id}`, { method:'DELETE' });
    load();
  };

  const openPreview = async (file) => {
    const r  = await authFetch(`/api/files/${file.id}`);
    const d  = await r.json();
    setPreview({ name: d.originalName, mimetype: d.mimetype, data: d.data });
  };

  const downloadFile = (file, data) => {
    const a   = document.createElement('a');
    a.href    = `data:${file.mimetype};base64,${data}`;
    a.download = file.originalName || file.filename;
    a.click();
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <h3 style={{ margin:0 }}>Files & Reports</h3>
        <button className="btn btn-primary btn-sm" onClick={() => inputRef.current?.click()}>+ Upload File</button>
      </div>
      <input ref={inputRef} type="file" accept=".pdf,image/*" style={{ display:'none' }} onChange={handleFileInput} />

      {msg && <div className={msg.startsWith('✓') ? 'success-banner' : 'error-banner'} style={{ marginBottom:12 }}>{msg}</div>}

      {/* Drop zone */}
      {!pendingFile && (
        <div
          onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          style={{ border:`2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`, borderRadius:10, padding:'24px 16px', textAlign:'center', cursor:'pointer', marginBottom:16, background: dragOver ? '#eff6ff' : 'var(--bg-main)', transition:'all 0.15s' }}
        >
          <div style={{ fontSize:28, marginBottom:6 }}>📎</div>
          <div style={{ fontSize:14, color:'var(--text-secondary)' }}>Drag & drop a file here, or click to browse</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>PDF, JPG, PNG, WEBP — max 5MB</div>
        </div>
      )}

      {/* Pending file — category + notes before uploading */}
      {pendingFile && (
        <div className="card" style={{ marginBottom:16, borderLeft:'4px solid var(--primary)' }}>
          <div className="card-body">
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <span style={{ fontSize:24 }}>{pendingFile.type === 'application/pdf' ? '📄' : '🖼️'}</span>
              <div>
                <div style={{ fontWeight:600, fontSize:14 }}>{pendingFile.name}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{pendingFile.type}</div>
              </div>
              <button className="btn-icon" style={{ marginLeft:'auto' }} onClick={() => setPending(null)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({...f, category:e.target.value}))}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Notes (optional)</label>
                <input value={form.notes} onChange={e => setForm(f => ({...f, notes:e.target.value}))} placeholder="e.g. CBC report, 15 Jan 2025" />
              </div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setPending(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>{uploading ? 'Uploading…' : '⬆ Upload'}</button>
            </div>
          </div>
        </div>
      )}

      {/* File list */}
      {files.length === 0 && !pendingFile && (
        <div className="empty-state"><div className="icon">📁</div><p>No files attached yet</p></div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {files.map(f => (
          <div key={f.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8 }}>
            <span style={{ fontSize:22, flexShrink:0 }}>{catIcon(f.category)}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:600, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.originalName}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                {catLabel(f.category)} · {fmtSize(f.size)} · {new Date(f.createdAt).toLocaleDateString('en-IN')}
                {f.notes && <span> · {f.notes}</span>}
              </div>
            </div>
            <div style={{ display:'flex', gap:4, flexShrink:0 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => openPreview(f)}>👁 View</button>
              <button className="btn-icon" title="Delete" onClick={() => handleDelete(f.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview modal */}
      {preview && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setPreview(null)}>
          <div style={{ background:'var(--bg-card)', borderRadius:12, maxWidth:800, width:'100%', maxHeight:'90vh', overflow:'auto', position:'relative' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
              <strong style={{ fontSize:14 }}>{preview.name}</strong>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => downloadFile(preview, preview.data)}>⬇ Download</button>
                <button className="btn-icon" onClick={() => setPreview(null)}>✕</button>
              </div>
            </div>
            <div style={{ padding:16, textAlign:'center' }}>
              {preview.mimetype === 'application/pdf' ? (
                <iframe src={`data:application/pdf;base64,${preview.data}`} width="100%" height="600px" style={{ border:'none', borderRadius:6 }} title={preview.name} />
              ) : (
                <img src={`data:${preview.mimetype};base64,${preview.data}`} alt={preview.name} style={{ maxWidth:'100%', maxHeight:'70vh', borderRadius:6, objectFit:'contain' }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

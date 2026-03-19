import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const SPECIALTIES = [
  'general','dental','dermatology','cardiology','orthopedics',
  'ent','gynecology','pediatrics','ophthalmology','neurology','psychiatry',
];

export default function ProcedureLibrary() {
  const { authFetch, user } = useContext(AuthContext);
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [seeding, setSeeding]     = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [search, setSearch]       = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [form, setForm] = useState({ name:'', category:'', defaultPrice:'', duration:'', description:'' });
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState('');

  const load = async () => {
    setLoading(true);
    const r = await authFetch('/api/procedures?active_only=false');
    const d = await r.json();
    setProcedures(d.procedures || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const categories = [...new Set(procedures.map(p => p.category))].sort();

  const filtered = procedures.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat    = !filterCat || p.category === filterCat;
    return matchSearch && matchCat;
  });

  const openNew = () => {
    setEditItem(null);
    setForm({ name:'', category:'', defaultPrice:'', duration:'', description:'' });
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditItem(p);
    setForm({ name: p.name, category: p.category, defaultPrice: p.defaultPrice || '', duration: p.duration || '', description: p.description || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.category.trim()) return setMsg('Name and category required');
    setSaving(true);
    const url    = editItem ? `/api/procedures/${editItem.id}` : '/api/procedures';
    const method = editItem ? 'PUT' : 'POST';
    const res    = await authFetch(url, { method, body: JSON.stringify({ ...form, defaultPrice: parseFloat(form.defaultPrice) || 0, duration: parseInt(form.duration) || undefined }) });
    const data   = await res.json();
    if (!res.ok) { setMsg(data.error || 'Save failed'); setSaving(false); return; }
    setMsg(editItem ? '✓ Updated' : '✓ Procedure added');
    setShowForm(false);
    setSaving(false);
    load();
  };

  const toggleActive = async (p) => {
    await authFetch(`/api/procedures/${p.id}`, { method: 'PUT', body: JSON.stringify({ isActive: !p.isActive }) });
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this procedure?')) return;
    await authFetch(`/api/procedures/${id}`, { method: 'DELETE' });
    load();
  };

  const handleSeed = async () => {
    setSeeding(true);
    const specialty = user?.specialty || 'general';
    const res  = await authFetch('/api/procedures/seed', { method: 'POST', body: JSON.stringify({ specialty }) });
    const data = await res.json();
    setMsg(data.message || 'Seeded');
    setSeeding(false);
    load();
  };

  const fmt = n => new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 }).format(n || 0);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Procedure Library</h1>
          <p>{procedures.length} procedures · {procedures.filter(p => p.isActive).length} active</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {procedures.length === 0 && (
            <button className="btn btn-secondary" onClick={handleSeed} disabled={seeding}>
              {seeding ? 'Seeding…' : `⚡ Seed for ${user?.specialty || 'general'}`}
            </button>
          )}
          <button className="btn btn-primary" onClick={openNew}>+ Add Procedure</button>
        </div>
      </div>

      {msg && (
        <div className={msg.startsWith('✓') ? 'success-banner' : 'error-banner'} style={{ marginBottom:16 }}>
          {msg} <button className="btn-icon" onClick={() => setMsg('')} style={{ marginLeft:8 }}>✕</button>
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="card" style={{ marginBottom:20 }}>
          <div className="card-header"><h2>{editItem ? 'Edit Procedure' : 'Add Procedure'}</h2></div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label>Procedure Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Root Canal Treatment" autoFocus />
              </div>
              <div className="form-group">
                <label>Category *</label>
                <input value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} placeholder="e.g. Endodontic, Surgery, Cosmetic" list="cat-list" />
                <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Default Price (₹)</label>
                <input type="number" min="0" value={form.defaultPrice} onChange={e => setForm(f => ({...f, defaultPrice: e.target.value}))} placeholder="0" />
              </div>
              <div className="form-group">
                <label>Duration (minutes)</label>
                <input type="number" min="0" value={form.duration} onChange={e => setForm(f => ({...f, duration: e.target.value}))} placeholder="30" />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea rows={2} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Brief description of the procedure" />
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editItem ? 'Update' : 'Add Procedure'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="card-header">
          <div className="filter-row" style={{ margin:0 }}>
            <div className="search-bar" style={{ width:260 }}>
              <input placeholder="Search procedures…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="">All categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {(search || filterCat) && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFilterCat(''); }}>Clear</button>
            )}
          </div>
        </div>

        <div className="table-container">
          {loading ? <div className="loading"><div className="spinner"></div></div> : (
            <table>
              <thead>
                <tr><th>Name</th><th>Category</th><th>Default Price</th><th>Duration</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6}><div className="empty-state"><div className="icon">🔬</div><p>No procedures found{procedures.length === 0 ? ' — click ⚡ Seed to add defaults for your specialty' : ''}</p></div></td></tr>
                )}
                {filtered.map(p => (
                  <tr key={p.id} style={{ opacity: p.isActive ? 1 : 0.5 }}>
                    <td>
                      <strong>{p.name}</strong>
                      {p.description && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{p.description}</div>}
                    </td>
                    <td><span className="badge badge-info">{p.category}</span></td>
                    <td style={{ fontWeight:600 }}>{fmt(p.defaultPrice)}</td>
                    <td style={{ color:'var(--text-muted)', fontSize:13 }}>{p.duration ? `${p.duration} min` : '—'}</td>
                    <td>
                      <span className={`badge badge-${p.isActive ? 'success' : 'gray'}`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        <button className="btn-icon" title="Edit" onClick={() => openEdit(p)}>✏️</button>
                        <button className="btn-icon" title={p.isActive ? 'Deactivate' : 'Activate'} onClick={() => toggleActive(p)}>
                          {p.isActive ? '⏸' : '▶'}
                        </button>
                        <button className="btn-icon" title="Delete" onClick={() => handleDelete(p.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

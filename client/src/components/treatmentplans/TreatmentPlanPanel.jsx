import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const STATUS_COLORS = { planned: 'gray', in_progress: 'info', completed: 'success', cancelled: 'danger' };
const STATUS_LABELS = { planned: 'Planned', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };

export default function TreatmentPlanPanel({ patientId }) {
  const { authFetch } = useContext(AuthContext);
  const [plans, setPlans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editPlanId, setEditPlanId] = useState(null);
  const [form, setForm] = useState({ title: '', notes: '', start_date: new Date().toISOString().split('T')[0], items: [] });
  const [newItem, setNewItem] = useState({ procedure: '', toothNumber: '', estimatedCost: '' });

  const load = () => {
    authFetch(`/api/treatmentplans?patient_id=${patientId}`)
      .then(r => r.json()).then(d => { setPlans(d.plans || []); setLoading(false); });
  };
  useEffect(() => { if (patientId) load(); }, [patientId]);

  const addItem = () => {
    if (!newItem.procedure.trim()) return;
    setForm(f => ({ ...f, items: [...f.items, { ...newItem, status: 'planned', sortOrder: f.items.length }] }));
    setNewItem({ procedure: '', toothNumber: '', estimatedCost: '' });
  };

  const openNew = () => {
    setEditPlanId(null);
    setForm({ title: '', notes: '', start_date: new Date().toISOString().split('T')[0], items: [] });
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditPlanId(p.id);
    setForm({ title: p.title || '', notes: p.notes || '', start_date: p.startDate || '', items: [...(p.items || [])] });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return alert('Title required');
    setSaving(true);
    const method = editPlanId ? 'PUT' : 'POST';
    const url = editPlanId ? `/api/treatmentplans/${editPlanId}` : '/api/treatmentplans';
    await authFetch(url, { method, body: JSON.stringify({ patient_id: patientId, ...form }) });
    setSaving(false);
    setShowForm(false);
    setForm({ title: '', notes: '', start_date: new Date().toISOString().split('T')[0], items: [] });
    load();
  };

  const updateItemStatus = async (planId, itemIdx, status) => {
    await authFetch(`/api/treatmentplans/${planId}/items/${itemIdx}`, { method: 'PUT', body: JSON.stringify({ status }) });
    load();
  };

  const updatePlanStatus = async (planId, status) => {
    await authFetch(`/api/treatmentplans/${planId}`, { method: 'PUT', body: JSON.stringify({ status }) });
    load();
  };

  const fmt = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  const totalAllPlans = plans.filter(p => p.status !== 'cancelled').reduce((sum, p) => sum + (p.totalEstimate || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          Treatment Plans
          {plans.length > 0 && <span className="badge badge-info" style={{ fontSize: 13 }}>Total Cost: {fmt(totalAllPlans)}</span>}
        </h3>
        <button className="btn btn-primary btn-sm" onClick={() => showForm ? setShowForm(false) : openNew()}>
          {showForm ? '✕ Cancel' : '+ New Plan'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>{editPlanId ? 'Edit Treatment Plan' : 'New Treatment Plan'}</h2></div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group"><label>Plan Title *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Full Mouth Rehabilitation" /></div>
              <div className="form-group"><label>Start Date</label><input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            </div>
            <div className="form-group"><label>Notes</label><textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Overall plan notes…" /></div>

            <div className="form-group">
              <label>Procedures</label>
              {form.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, background: 'var(--bg-main)', padding: '6px 10px', borderRadius: 6 }}>
                  <span style={{ flex: 1, fontSize: 14 }}>{item.procedure}{item.toothNumber ? ` (Tooth #${item.toothNumber})` : ''}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.estimatedCost ? fmt(item.estimatedCost) : ''}</span>
                  <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))}>✕</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input value={newItem.procedure} onChange={e => setNewItem(n => ({ ...n, procedure: e.target.value }))} placeholder="Procedure name" style={{ flex: 2 }} onKeyDown={e => e.key === 'Enter' && addItem()} />
                <input value={newItem.toothNumber} onChange={e => setNewItem(n => ({ ...n, toothNumber: e.target.value }))} placeholder="Tooth #" style={{ flex: 0.7 }} />
                <input type="number" value={newItem.estimatedCost} onChange={e => setNewItem(n => ({ ...n, estimatedCost: e.target.value }))} placeholder="Cost ₹" style={{ flex: 1 }} />
                <button className="btn btn-secondary btn-sm" onClick={addItem}>+ Add</button>
              </div>
            </div>

            {form.items.length > 0 && (
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--primary)', marginTop: 8 }}>
                Total Estimate: {fmt(form.items.reduce((s, i) => s + (parseFloat(i.estimatedCost) || 0), 0))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editPlanId ? 'Update Plan' : 'Create Plan'}</button>
            </div>
          </div>
        </div>
      )}

      {plans.length === 0 && !showForm && (
        <div className="empty-state"><div className="icon">📋</div><p>No treatment plans yet</p></div>
      )}

      {plans.map(plan => {
        const completedCount = plan.items?.filter(i => i.status === 'completed').length || 0;
        const totalCount = plan.items?.length || 0;
        const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        return (
          <div key={plan.id} className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div>
                <strong>{plan.title}</strong>
                <span className={`badge badge-${STATUS_COLORS[plan.status] || 'gray'}`} style={{ marginLeft: 8 }}>{STATUS_LABELS[plan.status]}</span>
                {plan.startDate && <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>Started: {plan.startDate}</span>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>{fmt(plan.totalEstimate)}</span>
                <button className="btn-icon" onClick={() => openEdit(plan)}>✏️</button>
                {plan.status === 'active' && (
                  <button className="btn btn-sm btn-success" onClick={() => updatePlanStatus(plan.id, 'completed')}>Mark Complete</button>
                )}
              </div>
            </div>
            <div className="card-body" style={{ padding: '12px 16px' }}>
              {totalCount > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                    <span>{completedCount}/{totalCount} procedures done</span>
                    <span>{progress}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-main)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? '#2d6a4f' : 'var(--primary)', borderRadius: 3, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {plan.items?.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: item.status === 'completed' ? 'var(--success-bg)' : 'var(--bg-main)', borderRadius: 6 }}>
                    <span className={`badge badge-${STATUS_COLORS[item.status] || 'gray'}`} style={{ fontSize: 11, minWidth: 80, textAlign: 'center' }}>
                      {STATUS_LABELS[item.status]}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, textDecoration: item.status === 'cancelled' ? 'line-through' : 'none', color: item.status === 'cancelled' ? 'var(--text-muted)' : 'inherit' }}>
                      {item.procedure}
                      {item.toothNumber && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>Tooth #{item.toothNumber}</span>}
                    </span>
                    {item.estimatedCost > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmt(item.estimatedCost)}</span>}
                    {item.status !== 'completed' && item.status !== 'cancelled' && plan.status === 'active' && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        {item.status === 'planned' && <button className="btn btn-sm" style={{ fontSize: 11, padding: '2px 8px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' }} onClick={() => updateItemStatus(plan.id, idx, 'in_progress')}>Start</button>}
                        {item.status === 'in_progress' && <button className="btn btn-sm btn-success" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => updateItemStatus(plan.id, idx, 'completed')}>✓ Done</button>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {plan.notes && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10, fontStyle: 'italic' }}>{plan.notes}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function ClinicalNotes({ patientId }) {
  const { authFetch } = useContext(AuthContext);
  const [notes, setNotes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ note_date: new Date().toISOString().split('T')[0], chief_complaint: '', subjective: '', objective: '', assessment: '', plan: '', doctor_name: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    authFetch(`/api/clinicalnotes?patient_id=${patientId}`)
      .then(r => r.json()).then(d => { setNotes(d.notes || []); setLoading(false); });
  };
  useEffect(() => { if (patientId) load(); }, [patientId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => {
    setEditId(null);
    setForm({ note_date: new Date().toISOString().split('T')[0], chief_complaint: '', subjective: '', objective: '', assessment: '', plan: '', doctor_name: '' });
    setShowForm(true);
  };

  const openEdit = (n) => {
    setEditId(n.id);
    setForm({ note_date: n.noteDate || n.note_date || '', chief_complaint: n.chiefComplaint || n.chief_complaint || '', subjective: n.subjective || '', objective: n.objective || '', assessment: n.assessment || '', plan: n.plan || '', doctor_name: n.doctorName || n.doctor_name || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const url = editId ? `/api/clinicalnotes/${editId}` : '/api/clinicalnotes';
    const method = editId ? 'PUT' : 'POST';
    await authFetch(url, { method, body: JSON.stringify({ patient_id: patientId, ...form }) });
    setSaving(false);
    setShowForm(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    await authFetch(`/api/clinicalnotes/${id}`, { method: 'DELETE' });
    load();
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Clinical Notes (SOAP)</h3>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ New Note</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>{editId ? 'Edit Note' : 'New Clinical Note'}</h2></div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group"><label>Date</label><input type="date" value={form.note_date} onChange={e => set('note_date', e.target.value)} /></div>
              <div className="form-group"><label>Doctor Name</label><input value={form.doctor_name} onChange={e => set('doctor_name', e.target.value)} placeholder="Dr. Name" /></div>
            </div>
            <div className="form-group"><label>Chief Complaint</label><input value={form.chief_complaint} onChange={e => set('chief_complaint', e.target.value)} placeholder="Primary reason for visit" /></div>

            {/* SOAP sections */}
            {[
              { key: 'subjective', label: 'S — Subjective', placeholder: "Patient's own description of symptoms, history, concerns…", color: '#3b82f6' },
              { key: 'objective', label: 'O — Objective', placeholder: 'Clinical findings, examination results, test values…', color: '#8b5cf6' },
              { key: 'assessment', label: 'A — Assessment', placeholder: 'Diagnosis, clinical impression, differential diagnosis…', color: '#f59e0b' },
              { key: 'plan', label: 'P — Plan', placeholder: 'Treatment plan, medications prescribed, follow-up instructions…', color: '#10b981' },
            ].map(s => (
              <div className="form-group" key={s.key}>
                <label style={{ borderLeft: `3px solid ${s.color}`, paddingLeft: 8, borderRadius: 0 }}>{s.label}</label>
                <textarea rows={3} value={form[s.key]} onChange={e => set(s.key, e.target.value)} placeholder={s.placeholder} style={{ borderLeft: `3px solid ${s.color}20` }} />
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editId ? 'Update Note' : 'Save Note'}</button>
            </div>
          </div>
        </div>
      )}

      {notes.length === 0 && !showForm && (
        <div className="empty-state"><div className="icon">📋</div><p>No clinical notes yet</p></div>
      )}

      {notes.map(n => (
        <div key={n.id} className="card" style={{ marginBottom: 12 }}>
          <div className="card-header" style={{ padding: '12px 16px' }}>
            <div>
              <strong style={{ fontSize: 14 }}>{n.noteDate || n.note_date}</strong>
              {(n.chiefComplaint || n.chief_complaint) && <span style={{ marginLeft: 10, color: 'var(--text-secondary)', fontSize: 13 }}>{n.chiefComplaint || n.chief_complaint}</span>}
              {(n.doctorName || n.doctor_name) && <span style={{ marginLeft: 10, color: 'var(--text-muted)', fontSize: 12 }}>— {n.doctorName || n.doctor_name}</span>}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn-icon" onClick={() => openEdit(n)}>✏️</button>
              <button className="btn-icon" onClick={() => handleDelete(n.id)}>🗑️</button>
            </div>
          </div>
          <div className="card-body" style={{ padding: '12px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { field: 'subjective',  label: 'Subjective',  color: '#3b82f6' },
                { field: 'objective',   label: 'Objective',   color: '#8b5cf6' },
                { field: 'assessment',  label: 'Assessment',  color: '#f59e0b' },
                { field: 'plan',        label: 'Plan',        color: '#10b981' },
              ].map(s => (n[s.field] ? (
                <div key={s.field} style={{ borderLeft: `3px solid ${s.color}`, paddingLeft: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{n[s.field]}</div>
                </div>
              ) : null))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

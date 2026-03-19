import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
const empty = { name:'',phone:'',email:'',date_of_birth:'',gender:'',address:'',blood_group:'',allergies:'',medical_history:'' };
export default function PatientModal({ patient, onClose, onSaved }) {
  const { authFetch } = useContext(AuthContext);
  const [form, setForm] = useState(patient ? { ...patient } : { ...empty });
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = async () => {
    if (!form.name.trim()) return setError('Patient name is required');
    setSaving(true); setError('');
    const res = await authFetch(patient ? `/api/patients/${patient.id}` : '/api/patients', { method: patient ? 'PUT' : 'POST', body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Save failed'); setSaving(false); return; }
    onSaved();
  };
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header"><h2>{patient ? 'Edit Patient' : 'Add Patient'}</h2><button className="btn-icon" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          {error && <div className="error-banner">{error}</div>}
          <div className="form-row">
            <div className="form-group"><label>Full Name *</label><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Patient name" autoFocus /></div>
            <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 9876543210" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div className="form-group"><label>Date of Birth</label><input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Gender</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)}><option value="">Select…</option><option>Male</option><option>Female</option><option>Other</option></select>
            </div>
            <div className="form-group"><label>Blood Group</label>
              <select value={form.blood_group} onChange={e => set('blood_group', e.target.value)}><option value="">Unknown</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b}>{b}</option>)}</select>
            </div>
          </div>
          <div className="form-group"><label>Address</label><input value={form.address} onChange={e => set('address', e.target.value)} /></div>
          <div className="form-group"><label>Allergies</label><input value={form.allergies} onChange={e => set('allergies', e.target.value)} placeholder="Known allergies" /></div>
          <div className="form-group"><label>Medical History</label><textarea rows={3} value={form.medical_history} onChange={e => set('medical_history', e.target.value)} /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : patient ? 'Update' : 'Add Patient'}</button>
        </div>
      </div>
    </div>
  );
}

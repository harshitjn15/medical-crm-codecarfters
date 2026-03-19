import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
export default function FollowupModal({ onClose, onSaved }) {
  const { authFetch } = useContext(AuthContext);
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({ patient_id:'', followup_date:'', followup_type:'checkup', notes:'' });
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { authFetch('/api/patients?limit=500').then(r=>r.json()).then(d=>setPatients(d.patients||[])); }, []);
  const handleSubmit = async () => {
    if (!form.patient_id || !form.followup_date) return setError('Patient and date required');
    setSaving(true);
    const res = await authFetch('/api/followups', { method:'POST', body:JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error||'Failed'); setSaving(false); return; }
    onSaved();
  };
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header"><h2>New Follow-up</h2><button className="btn-icon" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          {error && <div className="error-banner">{error}</div>}
          <div className="form-group"><label>Patient *</label>
            <select value={form.patient_id} onChange={e=>setForm(f=>({...f,patient_id:e.target.value}))}>
              <option value="">Select patient…</option>
              {patients.map(p=><option key={p.id} value={p.id}>{p.name} — {p.phone}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Follow-up Date *</label><input type="date" value={form.followup_date} onChange={e=>setForm(f=>({...f,followup_date:e.target.value}))} /></div>
            <div className="form-group"><label>Type</label>
              <select value={form.followup_type} onChange={e=>setForm(f=>({...f,followup_type:e.target.value}))}>
                <option value="checkup">Checkup</option><option value="review">Review</option>
                <option value="test">Test Results</option><option value="emergency">Emergency</option><option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label>Notes</label><textarea rows={3} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Reason for follow-up…" /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving?'Saving…':'Create Follow-up'}</button>
        </div>
      </div>
    </div>
  );
}

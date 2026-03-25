import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { enqueueSyncItem } from '../../utils/offlineDB';

const emptyMed = () => ({ name: '', dosage: '', frequency: '', duration: '' });

export default function PrescriptionForm() {
  const { authFetch } = useContext(AuthContext); const navigate = useNavigate();
  const { id } = useParams(); const [searchParams] = useSearchParams(); const isEdit = Boolean(id);
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({ patient_id: searchParams.get('patient_id')||'', diagnosis:'', instructions:'', notes:'', medications:[emptyMed()] });
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');

  useEffect(() => {
    authFetch('/api/patients?limit=500').then(r=>r.json()).then(d=>setPatients(d.patients||[]));
    if (isEdit) authFetch(`/api/prescriptions/${id}`).then(r=>r.json()).then(data => {
      let meds = []; try { meds = Array.isArray(data.medications) ? data.medications : JSON.parse(data.medications||'[]'); } catch { meds=[emptyMed()]; }
      if (!meds.length) meds=[emptyMed()];
      setForm({ patient_id: data.patient_id, diagnosis: data.diagnosis||'', instructions: data.instructions||'', notes: data.notes||'', medications: meds });
    });
  }, []);

  const setMed = (i,k,v) => setForm(f => { const m=[...f.medications]; m[i]={...m[i],[k]:v}; return {...f,medications:m}; });

  const handleSubmit = async () => {
    if (!form.patient_id) return setError('Please select a patient');
    setSaving(true); setError('');

    // Offline fallback — save to IndexedDB
    if (!navigator.onLine) {
      const tempId = `offline_rx_${Date.now()}`;
      await enqueueSyncItem({
        tempId,
        type: 'prescription',
        endpoint: isEdit ? `/api/prescriptions/${id}` : '/api/prescriptions',
        method: isEdit ? 'PUT' : 'POST',
        payload: form,
      });
      setSaving(false);
      setError('');
      alert('📵 Saved offline! Will sync when you\'re back online.');
      navigate('/admin/prescriptions');
      return;
    }

    const res = await authFetch(isEdit ? `/api/prescriptions/${id}` : '/api/prescriptions', { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Save failed'); setSaving(false); return; }
    navigate('/admin/prescriptions');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>← Back</button>
          <h1>{isEdit ? 'Edit Prescription' : 'New Prescription'}</h1>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, maxWidth:900 }}>
        <div className="card">
          <div className="card-header"><h2>Patient & Diagnosis</h2></div>
          <div className="card-body">
            <div className="form-group"><label>Patient *</label>
              <select value={form.patient_id} onChange={e=>setForm(f=>({...f,patient_id:e.target.value}))} disabled={isEdit}>
                <option value="">Select patient…</option>
                {patients.map(p=><option key={p.id} value={p.id}>{p.name} — {p.phone}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Diagnosis</label><input value={form.diagnosis} onChange={e=>setForm(f=>({...f,diagnosis:e.target.value}))} placeholder="Primary diagnosis" /></div>
            <div className="form-group"><label>Instructions</label><textarea rows={3} value={form.instructions} onChange={e=>setForm(f=>({...f,instructions:e.target.value}))} placeholder="Patient instructions…" /></div>
            <div className="form-group"><label>Notes</label><textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Internal notes…" /></div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2>Medications</h2><button className="btn btn-secondary btn-sm" onClick={()=>setForm(f=>({...f,medications:[...f.medications,emptyMed()]}))}>+ Add</button></div>
          <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {form.medications.map((med,i) => (
              <div key={i} style={{ background:'var(--bg-main)', borderRadius:8, padding:'14px 14px 10px', position:'relative' }}>
                {form.medications.length > 1 && <button className="btn-icon" onClick={()=>setForm(f=>({...f,medications:f.medications.filter((_,j)=>j!==i)}))} style={{ position:'absolute', top:8, right:8, color:'var(--danger)' }}>✕</button>}
                <div className="form-group"><label>Medicine Name</label><input value={med.name} onChange={e=>setMed(i,'name',e.target.value)} placeholder="e.g. Paracetamol 500mg" /></div>
                <div className="form-row">
                  <div className="form-group"><label>Dosage</label><input value={med.dosage} onChange={e=>setMed(i,'dosage',e.target.value)} placeholder="1 tablet" /></div>
                  <div className="form-group"><label>Frequency</label><input value={med.frequency} onChange={e=>setMed(i,'frequency',e.target.value)} placeholder="Twice daily" /></div>
                </div>
                <div className="form-group"><label>Duration</label><input value={med.duration} onChange={e=>setMed(i,'duration',e.target.value)} placeholder="5 days" /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ marginTop:20, display:'flex', gap:12 }}>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving?'Saving…':isEdit?'Update':'Create Prescription'}</button>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
      </div>
    </div>
  );
}

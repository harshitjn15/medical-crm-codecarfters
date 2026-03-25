import React, { useState, useEffect } from 'react';
import './CalendarPage.css'; // Reuse existing calendar modal styles

const ALL_SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','14:00','14:30','15:00','15:30','16:00','16:30','17:00'];

function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export default function AddAppointmentModal({ onClose, onSaved, authFetch, prefillDate }) {
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({
    patient_name: '', patient_phone: '', patient_email: '',
    appointment_date: prefillDate || getTodayStr(),
    appointment_time: '09:00', reason: '',
    existing_patient_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [mode, setMode]     = useState('new'); // 'new' | 'existing'
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [bookedSlots, setBookedSlots] = useState([]);

  useEffect(() => {
    if (!form.appointment_date) return;
    authFetch(`/api/appointments?date=${form.appointment_date}&limit=100`)
      .then(r => r.json())
      .then(d => {
        const slots = (d.appointments || [])
          .filter(e => e.status !== 'cancelled')
          .map(e => e.appointment_time);
        setBookedSlots(slots);
      });
  }, [form.appointment_date, authFetch]);

  const availableSlots = ALL_SLOTS.filter(s => !bookedSlots.includes(s));

  useEffect(() => {
    if (mode === 'existing' && searchQuery.trim().length > 1) {
      const to = setTimeout(() => {
        authFetch(`/api/patients?search=${encodeURIComponent(searchQuery)}&limit=10`)
          .then(r => r.json())
          .then(d => { setSearchResults(d.patients || []); setShowDropdown(true); });
      }, 300);
      return () => clearTimeout(to);
    } else {
      setShowDropdown(false);
    }
  }, [searchQuery, mode]);

  const selectPatient = (p) => {
    setForm(f => ({ ...f, existing_patient_id: p.id }));
    setSearchQuery(`${p.name} — ${p.phone}`);
    setShowDropdown(false);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (mode === 'existing' && !form.existing_patient_id) return setError('Select a patient');
    if (!form.appointment_date || !form.appointment_time) return setError('Date and time required');
    setSaving(true); setError('');

    const patient = mode === 'existing'
      ? { id: form.existing_patient_id } // ID is present, backend will handle lookup
      : null;

    const payload = {
      patient_name:  form.patient_name,
      patient_phone: form.patient_phone,
      patient_email: form.patient_email,
      appointment_date: form.appointment_date,
      appointment_time: form.appointment_time,
      reason: form.reason,
      patient_id: patient?.id || undefined,
    };

    if (mode === 'new' && !payload.patient_name) { setError('Patient name required'); setSaving(false); return; }

    const r = await authFetch('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!r.ok) { setError(data.error || 'Failed to book appointment'); setSaving(false); return; }
    setSaving(false);
    onSaved();
  };

  return (
    <div className="cp-modal-overlay" onClick={onClose}>
      <div className="cp-modal" onClick={e => e.stopPropagation()}>
        <div className="cp-modal-header">
          <h2>Schedule a Visit</h2>
          <button className="cp-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="cp-modal-body">
          <div className="cp-mode-toggle">
            <button className={mode === 'new' ? 'active' : ''} onClick={() => setMode('new')}>New Patient</button>
            <button className={mode === 'existing' ? 'active' : ''} onClick={() => setMode('existing')}>Existing Patient</button>
          </div>

          {mode === 'existing' ? (
            <div className="cp-form-group" style={{ position: 'relative' }}>
              <label>Search Patient (Name or Mobile)</label>
              <input
                type="text"
                placeholder="Type to search..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  if (form.existing_patient_id) setForm(f => ({ ...f, existing_patient_id: '' }));
                }}
                onFocus={() => { if (searchResults.length) setShowDropdown(true); }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              />
              {showDropdown && searchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 6, zIndex: 10, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  {searchResults.map(p => (
                    <div key={p.id} onClick={() => selectPatient(p)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="cp-form-row">
                <div className="cp-form-group">
                  <label>Full Name *</label>
                  <input value={form.patient_name} onChange={e => set('patient_name', e.target.value)} placeholder="Patient name" />
                </div>
                <div className="cp-form-group">
                  <label>Phone</label>
                  <input value={form.patient_phone} onChange={e => set('patient_phone', e.target.value)} placeholder="+91 99999 00000" />
                </div>
              </div>
              <div className="cp-form-group">
                <label>Email</label>
                <input type="email" value={form.patient_email} onChange={e => set('patient_email', e.target.value)} placeholder="patient@email.com" />
              </div>
            </>
          )}

          <div className="cp-form-row">
            <div className="cp-form-group">
              <label>Date *</label>
              <input type="date" value={form.appointment_date} onChange={e => set('appointment_date', e.target.value)} />
            </div>
            <div className="cp-form-group">
              <label>Time *</label>
              <select value={form.appointment_time} onChange={e => set('appointment_time', e.target.value)}>
                {!availableSlots.includes(form.appointment_time) && <option value={form.appointment_time}>{form.appointment_time} (Booked)</option>}
                {availableSlots.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="cp-form-group">
            <label>Reason / Chief Complaint</label>
            <input value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="e.g. Regular checkup, tooth pain…" />
          </div>

          {error && <div className="cp-modal-error">{error}</div>}
        </div>
        <div className="cp-modal-footer">
          <button className="cp-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="cp-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Scheduling…' : 'Schedule Visit'}
          </button>
        </div>
      </div>
    </div>
  );
}

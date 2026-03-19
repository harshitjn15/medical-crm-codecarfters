import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import './Vitals.css';

export default function VitalsPanel({ patientId }) {
  const { authFetch } = useContext(AuthContext);
  const [vitals, setVitals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ recorded_at: new Date().toISOString().split('T')[0], bp_systolic: '', bp_diastolic: '', pulse: '', temperature: '', temp_unit: 'C', weight: '', height: '', spo2: '', blood_sugar: '', blood_sugar_type: 'random', respiratory_rate: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    authFetch(`/api/vitals?patient_id=${patientId}&limit=10`)
      .then(r => r.json()).then(d => { setVitals(d.vitals || []); setLoading(false); });
  };
  useEffect(() => { if (patientId) load(); }, [patientId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await authFetch('/api/vitals', { method: 'POST', body: JSON.stringify({ patient_id: patientId, ...form }) });
    setSaving(false);
    setShowForm(false);
    setForm(f => ({ ...f, bp_systolic: '', bp_diastolic: '', pulse: '', temperature: '', weight: '', height: '', spo2: '', blood_sugar: '', respiratory_rate: '', notes: '' }));
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    await authFetch(`/api/vitals/${id}`, { method: 'DELETE' });
    load();
  };

  // Color coding for values
  const bpColor = (s, d) => {
    if (!s || !d) return '';
    if (s >= 180 || d >= 120) return 'danger';
    if (s >= 140 || d >= 90) return 'warning';
    if (s < 90 || d < 60) return 'warning';
    return 'success';
  };
  const spo2Color = (v) => !v ? '' : v < 90 ? 'danger' : v < 95 ? 'warning' : 'success';
  const pulseColor = (v) => !v ? '' : (v < 60 || v > 100) ? 'warning' : 'success';

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div className="vitals-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Vital Signs</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(s => !s)}>
          {showForm ? '✕ Cancel' : '+ Record Vitals'}
        </button>
      </div>

      {showForm && (
        <div className="vitals-form card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>Record Vital Signs</h2></div>
          <div className="card-body">
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={form.recorded_at} onChange={e => set('recorded_at', e.target.value)} />
            </div>

            <div className="vitals-grid">
              <div className="vitals-card-input">
                <div className="vi-label">Blood Pressure</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="number" placeholder="Systolic" value={form.bp_systolic} onChange={e => set('bp_systolic', e.target.value)} />
                  <span style={{ color: 'var(--text-muted)' }}>/</span>
                  <input type="number" placeholder="Diastolic" value={form.bp_diastolic} onChange={e => set('bp_diastolic', e.target.value)} />
                </div>
                <div className="vi-unit">mmHg</div>
              </div>
              <div className="vitals-card-input">
                <div className="vi-label">Pulse Rate</div>
                <input type="number" placeholder="72" value={form.pulse} onChange={e => set('pulse', e.target.value)} />
                <div className="vi-unit">bpm</div>
              </div>
              <div className="vitals-card-input">
                <div className="vi-label">Temperature</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="number" step="0.1" placeholder="98.6" value={form.temperature} onChange={e => set('temperature', e.target.value)} />
                  <select value={form.temp_unit} onChange={e => set('temp_unit', e.target.value)} style={{ width: 60 }}>
                    <option>°F</option><option>°C</option>
                  </select>
                </div>
              </div>
              <div className="vitals-card-input">
                <div className="vi-label">SpO₂</div>
                <input type="number" min="0" max="100" placeholder="98" value={form.spo2} onChange={e => set('spo2', e.target.value)} />
                <div className="vi-unit">%</div>
              </div>
              <div className="vitals-card-input">
                <div className="vi-label">Weight</div>
                <input type="number" step="0.1" placeholder="70" value={form.weight} onChange={e => set('weight', e.target.value)} />
                <div className="vi-unit">kg</div>
              </div>
              <div className="vitals-card-input">
                <div className="vi-label">Height</div>
                <input type="number" placeholder="170" value={form.height} onChange={e => set('height', e.target.value)} />
                <div className="vi-unit">cm</div>
              </div>
              <div className="vitals-card-input">
                <div className="vi-label">Blood Sugar</div>
                <input type="number" placeholder="100" value={form.blood_sugar} onChange={e => set('blood_sugar', e.target.value)} />
                <select value={form.blood_sugar_type} onChange={e => set('blood_sugar_type', e.target.value)} style={{ marginTop: 4 }}>
                  <option value="fasting">Fasting</option>
                  <option value="random">Random</option>
                  <option value="post_meal">Post Meal</option>
                </select>
                <div className="vi-unit">mg/dL</div>
              </div>
              <div className="vitals-card-input">
                <div className="vi-label">Respiratory Rate</div>
                <input type="number" placeholder="16" value={form.respiratory_rate} onChange={e => set('respiratory_rate', e.target.value)} />
                <div className="vi-unit">breaths/min</div>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label>Notes</label>
              <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional observations…" />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Vitals'}</button>
            </div>
          </div>
        </div>
      )}

      {vitals.length === 0 && !showForm && (
        <div className="empty-state"><div className="icon">🩺</div><p>No vital signs recorded yet</p></div>
      )}

      {vitals.map((v, idx) => (
        <div key={v.id} className={`vitals-record ${idx === 0 ? 'vitals-latest' : ''}`}>
          <div className="vr-date">
            {v.recordedAt || v.recorded_at}
            {idx === 0 && <span className="badge badge-info" style={{ marginLeft: 8, fontSize: 10 }}>Latest</span>}
            <button className="btn-icon" style={{ marginLeft: 'auto', color: 'var(--danger)', fontSize: 12 }} onClick={() => handleDelete(v.id)}>🗑️</button>
          </div>
          <div className="vitals-readings">
            {v.bpSystolic && v.bpDiastolic && (
              <div className={`vr-chip vr-${bpColor(v.bpSystolic, v.bpDiastolic)}`}>
                <div className="vr-chip-label">BP</div>
                <div className="vr-chip-val">{v.bpSystolic}/{v.bpDiastolic}</div>
                <div className="vr-chip-unit">mmHg</div>
              </div>
            )}
            {v.pulse && (
              <div className={`vr-chip vr-${pulseColor(v.pulse)}`}>
                <div className="vr-chip-label">Pulse</div>
                <div className="vr-chip-val">{v.pulse}</div>
                <div className="vr-chip-unit">bpm</div>
              </div>
            )}
            {v.temperature && (
              <div className="vr-chip">
                <div className="vr-chip-label">Temp</div>
                <div className="vr-chip-val">{v.temperature}°</div>
                <div className="vr-chip-unit">{v.tempUnit || 'F'}</div>
              </div>
            )}
            {v.spo2 && (
              <div className={`vr-chip vr-${spo2Color(v.spo2)}`}>
                <div className="vr-chip-label">SpO₂</div>
                <div className="vr-chip-val">{v.spo2}</div>
                <div className="vr-chip-unit">%</div>
              </div>
            )}
            {v.weight && (
              <div className="vr-chip">
                <div className="vr-chip-label">Weight</div>
                <div className="vr-chip-val">{v.weight}</div>
                <div className="vr-chip-unit">kg</div>
              </div>
            )}
            {v.bmi && (
              <div className="vr-chip">
                <div className="vr-chip-label">BMI</div>
                <div className="vr-chip-val">{v.bmi}</div>
                <div className="vr-chip-unit"></div>
              </div>
            )}
            {v.bloodSugar && (
              <div className="vr-chip">
                <div className="vr-chip-label">Sugar ({v.bloodSugarType?.replace('_',' ')})</div>
                <div className="vr-chip-val">{v.bloodSugar}</div>
                <div className="vr-chip-unit">mg/dL</div>
              </div>
            )}
            {v.spo2 && (
              <div className={`vr-chip vr-${spo2Color(v.spo2)}`}>
                <div className="vr-chip-label">SpO₂</div>
                <div className="vr-chip-val">{v.spo2}</div>
                <div className="vr-chip-unit">%</div>
              </div>
            )}
          </div>
          {v.notes && <div className="vr-notes">{v.notes}</div>}
        </div>
      ))}
    </div>
  );
}

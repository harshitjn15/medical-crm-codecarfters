import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import './ToothChart.css';

const TOOTH_STATUS = {
  healthy:          { label: 'Healthy',          color: '#fff',    border: '#94a3b8' },
  decayed:          { label: 'Decayed',           color: '#f97316', border: '#ea580c' },
  filled:           { label: 'Filled',            color: '#94a3b8', border: '#64748b' },
  crown:            { label: 'Crown',             color: '#eab308', border: '#ca8a04' },
  extracted:        { label: 'Extracted',         color: '#f1f5f9', border: '#94a3b8' },
  root_canal:       { label: 'Root Canal',        color: '#ef4444', border: '#dc2626' },
  implant:          { label: 'Implant',           color: '#3b82f6', border: '#2563eb' },
  bridge:           { label: 'Bridge',            color: '#a855f7', border: '#9333ea' },
  missing:          { label: 'Missing',           color: '#f8fafc', border: '#cbd5e1' },
  under_treatment:  { label: 'Under Treatment',  color: '#22c55e', border: '#16a34a' },
};

// Universal numbering: upper right=1-8, upper left=9-16, lower left=17-24, lower right=25-32
// Display order top row (left→right as facing patient): 1..8 | 9..16
// Display order bottom row (left→right as facing patient): 32..25 | 24..17
const UPPER_ROW = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
const LOWER_ROW = [32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17];

const TOOTH_TYPES = {
  1:'M',2:'M',3:'M',4:'P',5:'P',6:'C',7:'I',8:'I', // upper right: M=molar,P=premolar,C=canine,I=incisor
  9:'I',10:'I',11:'C',12:'P',13:'P',14:'M',15:'M',16:'M', // upper left
  17:'M',18:'M',19:'M',20:'P',21:'P',22:'C',23:'I',24:'I', // lower left
  25:'I',26:'I',27:'C',28:'P',29:'P',30:'M',31:'M',32:'M', // lower right
};

export default function ToothChart({ patientId, readOnly = false }) {
  const { authFetch } = useContext(AuthContext);
  const [teeth, setTeeth] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState({ status: 'healthy', surfaces: [], notes: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!patientId) return;
    authFetch(`/api/dental/${patientId}`)
      .then(r => r.json())
      .then(d => {
        if (d.teeth) {
          // Ensure all 32 teeth exist
          const map = {};
          d.teeth.forEach(t => { map[t.toothNumber] = t; });
          const full = Array.from({ length: 32 }, (_, i) => map[i + 1] || { toothNumber: i + 1, status: 'healthy', surfaces: [], notes: '' });
          setTeeth(full);
        }
        setLoading(false);
      })
      .catch(() => {
        setTeeth(Array.from({ length: 32 }, (_, i) => ({ toothNumber: i + 1, status: 'healthy', surfaces: [], notes: '' })));
        setLoading(false);
      });
  }, [patientId]);

  const getTooth = num => teeth.find(t => t.toothNumber === num) || { toothNumber: num, status: 'healthy', surfaces: [], notes: '' };

  const handleClick = (num) => {
    if (readOnly) return;
    const t = getTooth(num);
    setSelected(num);
    setEditForm({ status: t.status || 'healthy', surfaces: t.surfaces || [], notes: t.notes || '' });
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await authFetch(`/api/dental/${patientId}/tooth/${selected}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      setTeeth(prev => prev.map(t => t.toothNumber === selected ? { ...t, ...editForm } : t));
      setMsg('Saved');
      setTimeout(() => setMsg(''), 2000);
      setSelected(null);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const toggleSurface = (s) => {
    setEditForm(f => ({
      ...f,
      surfaces: f.surfaces.includes(s) ? f.surfaces.filter(x => x !== s) : [...f.surfaces, s],
    }));
  };

  if (loading) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Loading chart…</div>;

  return (
    <div className="tooth-chart">
      {msg && <div className="tc-msg">{msg}</div>}

      {/* Legend */}
      <div className="tc-legend">
        {Object.entries(TOOTH_STATUS).map(([key, val]) => (
          <div key={key} className="tc-legend-item">
            <div className="tc-legend-dot" style={{ background: val.color, border: `2px solid ${val.border}` }} />
            <span>{val.label}</span>
          </div>
        ))}
      </div>

      {/* Upper jaw label */}
      <div className="tc-jaw-label">Upper Jaw (Maxillary)</div>

      {/* Upper teeth row */}
      <div className="tc-row">
        {UPPER_ROW.map(num => {
          const t = getTooth(num);
          const s = TOOTH_STATUS[t.status] || TOOTH_STATUS.healthy;
          const type = TOOTH_TYPES[num];
          return (
            <div
              key={num}
              className={`tc-tooth ${type === 'M' ? 'tc-molar' : type === 'P' ? 'tc-premolar' : type === 'C' ? 'tc-canine' : 'tc-incisor'} ${selected === num ? 'tc-selected' : ''} ${t.status === 'extracted' || t.status === 'missing' ? 'tc-empty' : ''}`}
              style={{ background: s.color, borderColor: s.border }}
              onClick={() => handleClick(num)}
              title={`#${num} — ${s.label}${t.notes ? ': ' + t.notes : ''}`}
            >
              <span className="tc-num">{num}</span>
              {t.status === 'extracted' && <span className="tc-x">✕</span>}
              {t.status === 'root_canal' && <span className="tc-dot" style={{ background: '#dc2626' }} />}
              {t.status === 'filled' && <span className="tc-dot" style={{ background: '#64748b' }} />}
              {t.status === 'implant' && <span className="tc-dot" style={{ background: '#2563eb' }} />}
            </div>
          );
        })}
      </div>

      {/* Midline */}
      <div className="tc-midline"><span>Upper</span><div className="tc-midline-rule" /><span>Lower</span></div>

      {/* Lower teeth row */}
      <div className="tc-row">
        {LOWER_ROW.map(num => {
          const t = getTooth(num);
          const s = TOOTH_STATUS[t.status] || TOOTH_STATUS.healthy;
          const type = TOOTH_TYPES[num];
          return (
            <div
              key={num}
              className={`tc-tooth ${type === 'M' ? 'tc-molar' : type === 'P' ? 'tc-premolar' : type === 'C' ? 'tc-canine' : 'tc-incisor'} ${selected === num ? 'tc-selected' : ''} ${t.status === 'extracted' || t.status === 'missing' ? 'tc-empty' : ''}`}
              style={{ background: s.color, borderColor: s.border }}
              onClick={() => handleClick(num)}
              title={`#${num} — ${s.label}${t.notes ? ': ' + t.notes : ''}`}
            >
              <span className="tc-num">{num}</span>
              {t.status === 'extracted' && <span className="tc-x">✕</span>}
              {t.status === 'root_canal' && <span className="tc-dot" style={{ background: '#dc2626' }} />}
              {t.status === 'filled' && <span className="tc-dot" style={{ background: '#64748b' }} />}
              {t.status === 'implant' && <span className="tc-dot" style={{ background: '#2563eb' }} />}
            </div>
          );
        })}
      </div>

      <div className="tc-jaw-label">Lower Jaw (Mandibular)</div>

      {/* Edit panel */}
      {selected && !readOnly && (
        <div className="tc-edit-panel">
          <div className="tc-edit-header">
            <strong>Tooth #{selected}</strong>
            <button className="btn-icon" onClick={() => setSelected(null)}>✕</button>
          </div>

          <div className="tc-edit-body">
            <div className="form-group">
              <label>Condition</label>
              <div className="tc-status-grid">
                {Object.entries(TOOTH_STATUS).map(([key, val]) => (
                  <button
                    key={key}
                    className={`tc-status-btn ${editForm.status === key ? 'tc-status-active' : ''}`}
                    style={{ '--dot': val.color, '--dotborder': val.border }}
                    onClick={() => setEditForm(f => ({ ...f, status: key }))}
                  >
                    <span className="tc-status-dot" style={{ background: val.color, border: `2px solid ${val.border}` }} />
                    {val.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Surfaces affected</label>
              <div className="tc-surfaces">
                {['mesial','distal','buccal','lingual','occlusal','incisal'].map(s => (
                  <button
                    key={s}
                    className={`tc-surface-btn ${editForm.surfaces.includes(s) ? 'active' : ''}`}
                    onClick={() => toggleSurface(s)}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                rows={2}
                value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Clinical notes for this tooth…"
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Tooth'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary of conditions */}
      {teeth.some(t => t.status !== 'healthy') && (
        <div className="tc-summary">
          <div className="tc-summary-title">Conditions Summary</div>
          <div className="tc-summary-grid">
            {teeth.filter(t => t.status !== 'healthy').map(t => (
              <div key={t.toothNumber} className="tc-summary-item">
                <span className="tc-summary-num">#{t.toothNumber}</span>
                <span className="tc-summary-status" style={{ color: TOOTH_STATUS[t.status]?.border }}>
                  {TOOTH_STATUS[t.status]?.label}
                </span>
                {t.notes && <span className="tc-summary-note">{t.notes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

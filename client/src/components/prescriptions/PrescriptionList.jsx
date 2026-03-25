import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import WhatsAppButton, { buildPrescriptionMessage } from '../whatsapp/WhatsAppButton';

export default function PrescriptionList() {
  const { authFetch, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const LIMIT = 20;

  const fetch_ = async () => {
    setLoading(true);
    try {
      const r = await authFetch(`/api/prescriptions?page=${page}&limit=${LIMIT}`);
      const d = await r.json();
      if (!r.ok) { console.error('Prescriptions error:', d.error); setLoading(false); return; }
      setPrescriptions(d.prescriptions || []);
      setTotal(d.total || 0);
    } catch (err) { console.error('Prescriptions fetch failed:', err); }
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, [page]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this prescription?')) return;
    await authFetch(`/api/prescriptions/${id}`, { method: 'DELETE' });
    fetch_();
  };

  // medications is already an array from MongoDB — no JSON.parse needed
  const getMeds = (medications) => {
    if (!medications) return [];
    if (Array.isArray(medications)) return medications;
    try { return JSON.parse(medications); } catch { return []; }
  };

  const clinicName = user?.clinic_name || 'Our Clinic';

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Prescriptions</h1>
          <p>{total} total</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/admin/prescriptions/new')}>
          + New Prescription
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="loading"><div className="spinner"></div></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Diagnosis</th>
                  <th>Medications</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!prescriptions.length && (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <div className="icon">💊</div>
                        <p>No prescriptions yet</p>
                      </div>
                    </td>
                  </tr>
                )}
                {prescriptions.map(rx => {
                  const meds = getMeds(rx.medications);
                  return (
                    <tr key={rx.id}>
                      <td>
                        <strong>{rx.patient_name}</strong>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{rx.patient_phone}</div>
                      </td>
                      <td>{rx.diagnosis || '—'}</td>
                      <td>
                        {meds.slice(0, 2).map((m, i) => (
                          <span key={i} className="badge badge-info" style={{ marginRight: 4 }}>
                            {m.name || m}
                          </span>
                        ))}
                        {meds.length > 2 && (
                          <span className="badge badge-gray">+{meds.length - 2}</span>
                        )}
                        {meds.length === 0 && <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      {/* Mongoose returns createdAt (camelCase), not created_at */}
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {rx.createdAt?.split('T')[0] || rx.created_at?.split('T')[0] || '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <button
                            className="btn-icon"
                            title="Edit"
                            onClick={() => navigate(`/admin/prescriptions/${rx.id}/edit`)}
                          >✏️</button>
                          <button
                            className="btn-icon"
                            title="Print / PDF"
                            onClick={() => navigate(`/admin/prescriptions/${rx.id}/print`)}
                          >🖨️</button>
                          <button
                            className="btn-icon"
                            title="Delete"
                            onClick={() => handleDelete(rx.id)}
                          >🗑️</button>
                          {rx.patient_phone && (
                            <WhatsAppButton
                              phone={rx.patient_phone}
                              message={buildPrescriptionMessage(
                                clinicName, null,
                                rx.patient_name, rx.diagnosis, meds
                              )}
                              type="prescription"
                              patientName={rx.patient_name}
                              label="Share Rx"
                              size="sm"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {total > LIMIT && (
          <div className="pagination">
            <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span>Page {page} of {Math.ceil(total / LIMIT)}</span>
            <button className="btn btn-secondary btn-sm" disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import FollowupModal from './FollowupModal';
import WhatsAppButton, { buildFollowupMessage } from '../whatsapp/WhatsAppButton';

const today = new Date().toISOString().split('T')[0];

export default function FollowupList() {
  const { authFetch, user } = useContext(AuthContext);
  const [followups, setFollowups] = useState([]); const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending'); const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false); const [page, setPage] = useState(1); const LIMIT = 20;

  const fetch_ = async () => {
    setLoading(true);
    const r = await authFetch(`/api/followups?status=${statusFilter}&page=${page}&limit=${LIMIT}`);
    const d = await r.json(); setFollowups(d.followups || []); setTotal(d.total || 0); setLoading(false);
  };
  useEffect(() => { fetch_(); }, [statusFilter, page]);

  const markDone = async (id) => { await authFetch(`/api/followups/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'completed' }) }); fetch_(); };
  const handleDelete = async (id) => { if (!window.confirm('Delete?')) return; await authFetch(`/api/followups/${id}`, { method: 'DELETE' }); fetch_(); };
  const clinicName = user?.clinic_name || 'Our Clinic';

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left"><h1>Follow-ups</h1><p>{total} {statusFilter}</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Follow-up</button>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="filter-row" style={{ margin: 0 }}>
            {['all', 'pending', 'completed'].map(s => (
              <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setStatusFilter(s); setPage(1); }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
            ))}
          </div>
        </div>
        <div className="table-container">
          {loading ? <div className="loading"><div className="spinner"></div></div> : (
            <table>
              <thead><tr><th>Patient</th><th>Due Date</th><th>Type</th><th>Notes</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {!followups.length && <tr><td colSpan={6}><div className="empty-state"><div className="icon">🔔</div><p>No follow-ups found</p></div></td></tr>}
                {followups.map(f => (
                  <tr key={f.id}>
                    <td>
                      {f.patient_id ? (
                        <Link to={`/admin/patients/${f.patient_id}`} style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>
                          <strong>{f.patient_name}</strong>
                        </Link>
                      ) : (
                        <strong>{f.patient_name}</strong>
                      )}
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.patient_phone}</div>
                    </td>
                    <td style={{ color: f.followup_date < today && f.status === 'pending' ? 'var(--danger)' : 'inherit', fontWeight: f.followup_date < today && f.status === 'pending' ? 600 : 400 }}>
                      {f.followup_date}{f.followup_date < today && f.status === 'pending' && <span style={{ fontSize: 11, marginLeft: 4, color: 'var(--danger)' }}> Overdue</span>}
                    </td>
                    <td><span className="badge badge-info">{f.followup_type}</span></td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{f.notes || '—'}</td>
                    <td><span className={`badge badge-${f.status === 'completed' ? 'success' : 'warning'}`}>{f.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {f.status === 'pending' && <button className="btn btn-sm btn-success" onClick={() => markDone(f.id)}>✓ Done</button>}
                        <button className="btn-icon" onClick={() => handleDelete(f.id)}>🗑️</button>
                        {f.patient_phone && f.status === 'pending' && (
                          <WhatsAppButton
                            phone={f.patient_phone}
                            message={buildFollowupMessage(clinicName, null, f.patient_name, f.followup_date, f.followup_type)}
                            type="followup_reminder"
                            patientName={f.patient_name}
                            label="Remind"
                            size="sm"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {total > LIMIT && <div className="pagination">
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span>Page {page} of {Math.ceil(total / LIMIT)}</span>
          <button className="btn btn-secondary btn-sm" disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>}
      </div>
      {showModal && <FollowupModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetch_(); }} />}
    </div>
  );
}

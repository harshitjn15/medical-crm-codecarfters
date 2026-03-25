import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import WhatsAppButton, { buildAppointmentReminderMessage } from '../whatsapp/WhatsAppButton';

const STATUS_BADGE = { scheduled: 'info', completed: 'success', cancelled: 'gray' };

export default function AppointmentList() {
  const { authFetch, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const LIMIT = 30;
  const clinicName = user?.clinic_name || 'Our Clinic';

  const fetch_ = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: LIMIT });
    if (filter === 'today') params.set('filter', 'today');
    else if (filter !== 'all') params.set('status', filter);
    const r = await authFetch(`/api/appointments?${params}`);
    const d = await r.json();
    setAppointments(d.appointments || []);
    setTotal(d.total || 0);
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, [filter, page]);

  const updateStatus = async (id, status) => {
    await authFetch(`/api/appointments/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    fetch_();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Appointments</h1>
          <p>{total} appointments</p>
        </div>
        {/* View toggle */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm btn-secondary" onClick={() => navigate('/admin/calendar')}>
            📅 Calendar View
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="filter-row" style={{ margin: 0 }}>
            {['all', 'today', 'scheduled', 'completed', 'cancelled'].map(f => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setFilter(f); setPage(1); }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="table-container">
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Phone</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!appointments.length && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <div className="icon">📅</div>
                        <p>No appointments found</p>
                      </div>
                    </td>
                  </tr>
                )}
                {appointments.map(a => (
                  <tr key={a.id}>
                    <td>
                      {/* Feature 8: patient name links to patient detail */}
                      {a.patient_id ? (
                        <Link to={`/admin/patients/${a.patient_id}`} style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
                          {a.patient_name}
                        </Link>
                      ) : (
                        <strong>{a.patient_name}</strong>
                      )}
                    </td>
                    <td>{a.patient_phone || '—'}</td>
                    <td>{a.appointment_date}</td>
                    <td><strong>{a.appointment_time}</strong></td>
                    <td style={{ color: 'var(--text-muted)' }}>{a.reason || '—'}</td>
                    <td>
                      <span className={`badge badge-${STATUS_BADGE[a.status] || 'gray'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {a.status === 'scheduled' && <>
                          <button className="btn btn-sm btn-success" onClick={() => updateStatus(a.id, 'completed')}>✓ Done</button>
                          <button className="btn btn-sm btn-danger" onClick={() => updateStatus(a.id, 'cancelled')}>✕</button>
                        </>}
                        {a.status === 'cancelled' && (
                          <button className="btn btn-sm btn-secondary" onClick={() => updateStatus(a.id, 'scheduled')}>Restore</button>
                        )}
                        {a.patient_phone && a.status === 'scheduled' && (
                          <WhatsAppButton
                            phone={a.patient_phone}
                            message={buildAppointmentReminderMessage(clinicName, null, a.patient_name, a.appointment_date, a.appointment_time)}
                            type="appointment_reminder"
                            patientName={a.patient_name}
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

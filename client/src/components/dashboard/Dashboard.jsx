import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './Dashboard.css';

function greeting() { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; }
function isOverdue(date) { return date < new Date().toISOString().split('T')[0]; }

export default function Dashboard() {
  const { authFetch, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    authFetch('/api/clinic/dashboard').then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div className="loading"><div className="spinner"></div></div>;

  const { stats, upcoming_appointments, pending_followups, recent_patients, monthly_revenue } = data;
  const fmt = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Good {greeting()}, {user?.username} 👋</h1>
          <p>Here's what's happening at your clinic today</p>
        </div>
      </div>
      <div className="stats-grid">
        <div className="stat-card blue" onClick={() => navigate('/admin/patients')} style={{ cursor: 'pointer' }}>
          <div className="stat-label">Total Patients</div><div className="stat-value">{stats.total_patients}</div><div className="stat-sub">registered</div>
        </div>
        <div className="stat-card teal" onClick={() => navigate('/admin/appointments')} style={{ cursor: 'pointer' }}>
          <div className="stat-label">Today's Appointments</div><div className="stat-value">{stats.today_appointments}</div><div className="stat-sub">scheduled</div>
        </div>
        <div className="stat-card orange" onClick={() => navigate('/admin/followups')} style={{ cursor: 'pointer' }}>
          <div className="stat-label">Pending Follow-ups</div><div className="stat-value">{stats.pending_followups}</div><div className="stat-sub">due soon</div>
        </div>
        <div className="stat-card green" onClick={() => navigate('/admin/invoices')} style={{ cursor: 'pointer' }}>
          <div className="stat-label">Revenue This Month</div><div className="stat-value">{fmt(stats.revenue_this_month)}</div><div className="stat-sub">{fmt(stats.pending_revenue)} pending</div>
        </div>
      </div>
      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header"><h2>📅 Upcoming Appointments</h2><button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/appointments')}>View all</button></div>
          <div className="card-body" style={{ padding: 0 }}>
            {!upcoming_appointments.length ? <div className="empty-state" style={{ padding: 24 }}><p>No upcoming appointments</p></div> : (
              <table><thead><tr><th>Patient</th><th>Date</th><th>Time</th><th>Reason</th></tr></thead>
                <tbody>{upcoming_appointments.map(a => (
                  <tr key={a.id}>
                    <td>
                      {a.patient_id ? (
                        <Link to={`/admin/patients/${a.patient_id}`} style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>
                          <strong>{a.patient_name}</strong>
                        </Link>
                      ) : (
                        <strong>{a.patient_name}</strong>
                      )}
                    </td>
                    <td>{a.appointment_date}</td><td>{a.appointment_time}</td><td style={{ color: 'var(--text-muted)' }}>{a.reason || '—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2>🔔 Due Follow-ups</h2><button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/followups')}>View all</button></div>
          <div className="card-body" style={{ padding: 0 }}>
            {!pending_followups.length ? <div className="empty-state" style={{ padding: 24 }}><p>No follow-ups due soon</p></div> : (
              <table><thead><tr><th>Patient</th><th>Due Date</th><th>Type</th></tr></thead>
                <tbody>{pending_followups.map(f => (
                  <tr key={f.id}>
                    <td>
                      {f.patient_id ? (
                        <Link to={`/admin/patients/${f.patient_id}`} style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>
                          <strong>{f.patient_name}</strong>
                        </Link>
                      ) : (
                        <strong>{f.patient_name}</strong>
                      )}
                    </td>
                    <td style={{ color: isOverdue(f.followup_date) ? 'var(--danger)' : 'inherit', fontWeight: isOverdue(f.followup_date) ? 600 : 400 }}>{f.followup_date}</td>
                    <td><span className="badge badge-warning">{f.followup_type}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2>👥 Recent Patients</h2><button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/patients')}>View all</button></div>
          <div className="card-body" style={{ padding: 0 }}>
            {!recent_patients.length ? <div className="empty-state" style={{ padding: 24 }}><p>No patients yet</p></div> : (
              <table><thead><tr><th>Name</th><th>Phone</th><th>Added</th></tr></thead>
                <tbody>{recent_patients.map(p => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/patients/${p.id}`)}>
                    <td><strong>{p.name}</strong></td><td>{p.phone || '—'}</td><td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.created_at?.split('T')[0]}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2>📈 Monthly Revenue</h2></div>
          <div className="card-body">
            {!monthly_revenue.length ? <div className="empty-state"><p>No revenue data yet</p></div> : (
              <div className="revenue-bars">
                {[...monthly_revenue].reverse().map(m => {
                  const max = Math.max(...monthly_revenue.map(x => x.total));
                  const pct = max > 0 ? (m.total / max) * 100 : 0;
                  return (
                    <div key={m.month} className="rev-bar-wrap">
                      <div className="rev-bar-outer"><div className="rev-bar-fill" style={{ height: `${pct}%` }} /></div>
                      <div className="rev-bar-label">{m.month?.slice(5)}</div>
                      <div className="rev-bar-val">{fmt(m.total)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

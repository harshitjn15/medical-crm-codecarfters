import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import PatientModal from './PatientModal';

export default function PatientList() {
  const { authFetch } = useContext(AuthContext);
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]); const [total, setTotal] = useState(0);
  const [search, setSearch] = useState(''); const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true); const [showModal, setShowModal] = useState(false); const [editPatient, setEditPatient] = useState(null);
  const LIMIT = 20;

  const fetch_ = async () => {
    setLoading(true);
    const r = await authFetch(`/api/patients?search=${encodeURIComponent(search)}&page=${page}&limit=${LIMIT}`);
    const d = await r.json();
    setPatients(d.patients || []); setTotal(d.total || 0); setLoading(false);
  };
  useEffect(() => { fetch_(); }, [search, page]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this patient?')) return;
    await authFetch(`/api/patients/${id}`, { method: 'DELETE' }); fetch_();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left"><h1>Patients</h1><p>{total} patients registered</p></div>
        <button className="btn btn-primary" onClick={() => { setEditPatient(null); setShowModal(true); }}>+ Add Patient</button>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="search-bar" style={{ width: 280 }}>
            <input placeholder="Search name, phone, email…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
        <div className="table-container">
          {loading ? <div className="loading"><div className="spinner"></div></div> : (
            <table>
              <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Gender</th><th>Blood</th><th>Added</th><th>Actions</th></tr></thead>
              <tbody>
                {!patients.length && <tr><td colSpan={7}><div className="empty-state"><div className="icon">👥</div><p>No patients found</p></div></td></tr>}
                {patients.map(p => (
                  <tr key={p.id}>
                    <td><strong style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(`/admin/patients/${p.id}`)}>{p.name}</strong></td>
                    <td>{p.phone || '—'}</td><td>{p.email || '—'}</td><td>{p.gender || '—'}</td>
                    <td>{p.blood_group ? <span className="badge badge-info">{p.blood_group}</span> : '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.created_at?.split('T')[0]}</td>
                    <td><div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-icon" onClick={() => navigate(`/admin/patients/${p.id}`)}>👁️</button>
                      <button className="btn-icon" onClick={() => { setEditPatient(p); setShowModal(true); }}>✏️</button>
                      <button className="btn-icon" onClick={() => handleDelete(p.id)}>🗑️</button>
                    </div></td>
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
      {showModal && <PatientModal patient={editPatient} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetch_(); }} />}
    </div>
  );
}

import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import PatientModal from './PatientModal';
import VitalsPanel from '../vitals/VitalsPanel';
import ClinicalNotes from '../clinicalnotes/ClinicalNotes';
import TreatmentPlanPanel from '../treatmentplans/TreatmentPlanPanel';
import ToothChart from '../dental/ToothChart';
import FileAttachments from '../files/FileAttachments';

export default function PatientDetail() {
  const { authFetch, user } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  const isDental = user?.specialty === 'dental';

  const load = async () => {
    const [p, rx, inv, fu] = await Promise.all([
      authFetch(`/api/patients/${id}`).then(r => r.json()),
      authFetch(`/api/prescriptions?patient_id=${id}`).then(r => r.json()),
      authFetch(`/api/invoices?patient_id=${id}`).then(r => r.json()),
      authFetch(`/api/followups?patient_id=${id}`).then(r => r.json()),
    ]);
    setPatient(p);
    setPrescriptions(rx.prescriptions || []);
    setInvoices(inv.invoices || []);
    setFollowups(fu.followups || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="loading"><div className="spinner"></div></div>;
  if (!patient || patient.error) return <div className="page"><p>Patient not found</p></div>;

  const fmt = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  const TABS = [
    { id: 'overview', label: '📋 Overview' },
    { id: 'vitals', label: '🩺 Vital Signs' },
    { id: 'notes', label: '📝 Clinical Notes' },
    { id: 'treatment', label: '🗓 Treatment Plans' },
    ...(isDental ? [{ id: 'dental', label: '🦷 Dental Chart' }] : []),
    { id: 'prescriptions', label: `💊 Prescriptions (${prescriptions.length})` },
    { id: 'invoices', label: `💰 Invoices (${invoices.length})` },
    { id: 'files', label: '📎 Files & Reports' },
  ];

  const tabStyle = (active) => ({
    padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
    fontFamily: 'var(--font)', fontSize: 13, fontWeight: active ? 600 : 400,
    color: active ? 'var(--primary)' : 'var(--text-secondary)',
    borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
    marginBottom: -2, whiteSpace: 'nowrap',
  });

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>← Back</button>
          <div className="page-header-left">
            <h1>{patient.name}</h1>
            <p>Patient · Added {patient.createdAt?.split('T')[0]}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>✏️ Edit</button>
          <button className="btn btn-primary" onClick={() => navigate(`/admin/invoices/new?patient_id=${patient.id}`)}>+ Invoice</button>
        </div>
      </div>

      {/* Quick strip */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20, padding: '10px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14, alignItems: 'center' }}>
        {patient.phone && <span>📱 {patient.phone}</span>}
        {patient.dateOfBirth && <span>🎂 {patient.dateOfBirth}</span>}
        {patient.gender && <span>⚧️ {patient.gender}</span>}
        {patient.bloodGroup && <span className="badge badge-info">🩸 {patient.bloodGroup}</span>}
        {patient.allergies && <span style={{ color: 'var(--danger)', fontWeight: 600 }}>⚠️ Allergies: {patient.allergies}</span>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid var(--border)', overflowX: 'auto' }}>
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>{t.label}</button>)}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-header"><h2>Personal Info</h2></div>
              <div className="card-body">
                {[['📱 Phone', patient.phone], ['✉️ Email', patient.email], ['🎂 DOB', patient.dateOfBirth], ['⚧️ Gender', patient.gender], ['🩸 Blood', patient.bloodGroup], ['📍 Address', patient.address]].map(([l, v]) => v ? (
                  <div key={l} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14 }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: 90 }}>{l}</span><span>{v}</span>
                  </div>
                ) : null)}
              </div>
            </div>
            {patient.allergies && <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}><div className="card-body"><h3 style={{ color: 'var(--danger)', marginBottom: 6 }}>⚠️ Allergies</h3><p style={{ fontSize: 14 }}>{patient.allergies}</p></div></div>}
            {patient.medicalHistory && <div className="card"><div className="card-header"><h2>Medical History</h2></div><div className="card-body"><p style={{ fontSize: 14, lineHeight: 1.7 }}>{patient.medicalHistory}</p></div></div>}
          </div>
          <div className="card">
            <div className="card-header"><h2>🔔 Follow-ups ({followups.length})</h2></div>
            <div className="table-container">
              {!followups.length ? <div className="empty-state" style={{ padding: 24 }}><p>No follow-ups</p></div> : (
                <table><thead><tr><th>Date</th><th>Type</th><th>Status</th></tr></thead>
                  <tbody>{followups.map(f => <tr key={f.id}><td>{f.followupDate || f.followup_date}</td><td>{f.followupType || f.followup_type}</td><td><span className={`badge badge-${f.status === 'completed' ? 'success' : 'warning'}`}>{f.status}</span></td></tr>)}</tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'vitals' && <div className="card"><div className="card-body"><VitalsPanel patientId={id} /></div></div>}
      {tab === 'notes' && <div className="card"><div className="card-body"><ClinicalNotes patientId={id} /></div></div>}
      {tab === 'treatment' && <div className="card"><div className="card-body"><TreatmentPlanPanel patientId={id} /></div></div>}
      {tab === 'dental' && isDental && <div className="card"><div className="card-header"><h2>🦷 Dental Chart — {patient.name}</h2></div><div className="card-body"><ToothChart patientId={id} /></div></div>}

      {tab === 'prescriptions' && (
        <div className="card">
          <div className="card-header"><h2>💊 Prescriptions</h2><button className="btn btn-secondary btn-sm" onClick={() => navigate(`/admin/prescriptions/new?patient_id=${id}`)}>+ New</button></div>
          <div className="table-container">
            {!prescriptions.length ? <div className="empty-state" style={{ padding: 24 }}><p>No prescriptions yet</p></div> : (
              <table><thead><tr><th>Diagnosis</th><th>Medications</th><th>Date</th><th></th></tr></thead>
                <tbody>{prescriptions.map(rx => <tr key={rx.id}><td>{rx.diagnosis || '—'}</td><td>{(rx.medications || []).slice(0, 2).map((m, i) => <span key={i} className="badge badge-info" style={{ marginRight: 4 }}>{m.name || m}</span>)}</td><td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{rx.createdAt?.split('T')[0]}</td><td><button className="btn-icon" onClick={() => navigate(`/admin/prescriptions/${rx.id}/edit`)}>✏️</button></td></tr>)}</tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'invoices' && (
        <div className="card">
          <div className="card-header"><h2>💰 Invoices</h2><button className="btn btn-secondary btn-sm" onClick={() => navigate(`/admin/invoices/new?patient_id=${id}`)}>+ New</button></div>
          <div className="table-container">
            {!invoices.length ? <div className="empty-state" style={{ padding: 24 }}><p>No invoices yet</p></div> : (
              <table><thead><tr><th>Invoice #</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
                <tbody>{invoices.map(inv => {
                  const num = inv.invoice_number || inv.invoiceNumber;
                  const dt = inv.issue_date || inv.issueDate;
                  return <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/invoices/${inv.id}`)}><td style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{num}</td><td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{dt}</td><td>{fmt(inv.total)}</td><td><span className={`badge badge-${inv.status === 'paid' ? 'success' : inv.status === 'cancelled' ? 'gray' : 'warning'}`}>{inv.status}</span></td></tr>;
                })}</tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'files' && <div className="card"><div className="card-body"><FileAttachments patientId={id} /></div></div>}

      {showEdit && <PatientModal patient={patient} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); load(); }} />}
    </div>
  );
}

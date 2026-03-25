/**
 * PrescriptionPrint.jsx
 * Prescription letterhead view — used for window.print() and jsPDF generation.
 * Also handles Share via WhatsApp and Email.
 */
import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './PrescriptionPrint.css';

export default function PrescriptionPrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authFetch, user } = useContext(AuthContext);
  const [rx, setRx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const [sending, setSending] = useState(false);
  const printRef = useRef();

  useEffect(() => {
    authFetch(`/api/prescriptions/${id}/print`)
      .then(r => r.json())
      .then(data => { setRx(data); setEmailInput(data.patient_email || ''); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handlePrint = () => window.print();

  const handlePDF = async () => {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const meds = rx.medications || [];

    // Header
    doc.setFillColor(15, 76, 117);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(rx.clinic_name || 'Medical CRM', 15, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (rx.clinic_tagline) doc.text(rx.clinic_tagline, 15, 23);
    if (rx.clinic_address) doc.text(rx.clinic_address, 15, 29);
    if (rx.clinic_phone)   doc.text(`Tel: ${rx.clinic_phone}`, 15, 35);

    // Rx title
    doc.setTextColor(15, 76, 117);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('℞ PRESCRIPTION', 15, 55);

    // Patient info box
    doc.setFillColor(240, 249, 255);
    doc.roundedRect(15, 60, 180, 32, 4, 4, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Patient Information', 20, 68);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${rx.patient_name || '—'}`, 20, 74);
    doc.text(`Phone: ${rx.patient_phone || '—'}`, 20, 80);
    if (rx.patient_dob) doc.text(`DOB: ${rx.patient_dob}`, 110, 74);
    if (rx.patient_gender) doc.text(`Gender: ${rx.patient_gender}`, 110, 80);
    doc.text(`Date: ${new Date(rx.createdAt).toLocaleDateString('en-IN')}`, 110, 86);

    // Diagnosis
    if (rx.diagnosis) {
      doc.setFont('helvetica', 'bold');
      doc.text('Diagnosis:', 15, 102);
      doc.setFont('helvetica', 'normal');
      doc.text(rx.diagnosis, 45, 102);
    }

    // Allergy warning
    if (rx.patient_allergies) {
      doc.setFillColor(254, 226, 226);
      doc.roundedRect(15, 106, 180, 12, 3, 3, 'F');
      doc.setTextColor(220, 38, 38);
      doc.setFontSize(9);
      doc.text(`⚠ Known Allergies: ${rx.patient_allergies}`, 20, 114);
    }

    // Medications table
    const startY = rx.patient_allergies ? 125 : 112;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Medications', 15, startY);

    if (meds.length) {
      autoTable(doc, {
        startY: startY + 4,
        head: [['Medicine', 'Dosage', 'Frequency', 'Duration']],
        body: meds.map(m => [m.name || '', m.dosage || '', m.frequency || '', m.duration || '']),
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [15, 76, 117], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 15, right: 15 },
      });
    }

    // Instructions
    let finalY = doc.lastAutoTable?.finalY || startY + 30;
    if (rx.instructions) {
      finalY += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Instructions:', 15, finalY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(rx.instructions, 180);
      doc.text(lines, 15, finalY + 6);
      finalY += 6 + lines.length * 5;
    }

    // Signature area
    finalY = Math.max(finalY + 20, 220);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Doctor Signature', 140, finalY);
    doc.line(135, finalY + 15, 195, finalY + 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(user?.username || 'Dr.', 140, finalY + 20);

    // Footer
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 277, 210, 20, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text(`${rx.clinic_name || ''} | ${rx.clinic_phone || ''} | ${rx.clinic_email || ''}`, 15, 285);
    doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, 15, 290);

    doc.save(`Prescription_${rx.patient_name}_${rx.createdAt?.slice(0, 10)}.pdf`);
  };

  const handleWhatsApp = () => {
    if (!rx?.patient_phone) return;
    const meds = (rx.medications || []).map(m => `• *${m.name}* — ${m.dosage}, ${m.frequency} for ${m.duration}`).join('\n');
    const msg = [
      `💊 *Prescription from ${rx.clinic_name}*`,
      ``,
      `Patient: ${rx.patient_name}`,
      rx.diagnosis ? `Diagnosis: ${rx.diagnosis}` : '',
      ``,
      `*Medications:*`,
      meds,
      rx.instructions ? `\nInstructions: ${rx.instructions}` : '',
      ``,
      `— ${rx.clinic_name}`,
    ].filter(Boolean).join('\n');
    const phone = rx.patient_phone.replace(/\D/g, '');
    const cleaned = phone.length === 10 ? `91${phone}` : phone;
    window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleEmailShare = async () => {
    if (!emailInput) return;
    setSending(true); setEmailStatus('');
    try {
      const r = await authFetch(`/api/prescriptions/${id}/share-email`, {
        method: 'POST',
        body: JSON.stringify({ to_email: emailInput }),
      });
      const d = await r.json();
      if (r.ok) setEmailStatus('✅ Email sent!');
      else setEmailStatus(`❌ ${d.error || 'Failed'}`);
    } catch { setEmailStatus('❌ Failed to send email'); }
    setSending(false);
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!rx)    return <div className="page"><p>Prescription not found.</p></div>;

  const meds = rx.medications || [];
  const dateStr = rx.createdAt ? new Date(rx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

  return (
    <div className="rx-print-page">
      {/* Action bar — hidden on print */}
      <div className="rx-action-bar no-print">
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>← Back</button>
          <h2 style={{margin:0}}>Prescription Preview</h2>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className="btn btn-secondary" onClick={handlePrint}>🖨️ Print</button>
          <button className="btn btn-primary" onClick={handlePDF}>📄 Download PDF</button>
          <button className="btn btn-success" style={{background:'#25d366',border:'1px solid #25d366'}} onClick={handleWhatsApp}>💬 WhatsApp</button>
        </div>
      </div>

      {/* Email share bar — hidden on print */}
      <div className="rx-email-bar no-print">
        <input
          type="email"
          value={emailInput}
          onChange={e => setEmailInput(e.target.value)}
          placeholder="Patient email address…"
          style={{flex:1}}
        />
        <button className="btn btn-secondary" onClick={handleEmailShare} disabled={sending || !emailInput}>
          {sending ? 'Sending…' : '📧 Send Email'}
        </button>
        {emailStatus && <span style={{fontSize:13,fontWeight:500}}>{emailStatus}</span>}
      </div>

      {/* Letterhead — this is what gets printed */}
      <div className="rx-letterhead" ref={printRef}>

        {/* Clinic Header */}
        <div className="rx-header">
          <div className="rx-header-left">
            {rx.clinic_logo ? (
              <img src={rx.clinic_logo} alt="Clinic Logo" className="rx-logo" />
            ) : (
              <div className="rx-logo-placeholder">🏥</div>
            )}
            <div>
              <div className="rx-clinic-name">{rx.clinic_name}</div>
              {rx.clinic_tagline && <div className="rx-clinic-tagline">{rx.clinic_tagline}</div>}
            </div>
          </div>
          <div className="rx-header-right">
            {rx.clinic_address && <div className="rx-clinic-address">📍 {rx.clinic_address}</div>}
            {rx.clinic_phone   && <div>📞 {rx.clinic_phone}</div>}
            {rx.clinic_email   && <div>✉ {rx.clinic_email}</div>}
          </div>
        </div>

        <div className="rx-divider" />

        {/* Prescription title + date */}
        <div className="rx-title-row">
          <h1 className="rx-title">℞ Prescription</h1>
          <div className="rx-date">Date: <strong>{dateStr}</strong></div>
        </div>

        {/* Patient info */}
        <div className="rx-patient-box">
          <div className="rx-patient-grid">
            <div><span className="rx-label">Patient Name</span><span className="rx-value">{rx.patient_name}</span></div>
            <div><span className="rx-label">Phone</span><span className="rx-value">{rx.patient_phone || '—'}</span></div>
            {rx.patient_dob    && <div><span className="rx-label">Date of Birth</span><span className="rx-value">{rx.patient_dob}</span></div>}
            {rx.patient_gender && <div><span className="rx-label">Gender</span><span className="rx-value">{rx.patient_gender}</span></div>}
            {rx.patient_blood  && <div><span className="rx-label">Blood Group</span><span className="rx-value">{rx.patient_blood}</span></div>}
          </div>
          {rx.patient_allergies && (
            <div className="rx-allergy-warning">⚠ Known Allergies: <strong>{rx.patient_allergies}</strong></div>
          )}
        </div>

        {/* Diagnosis */}
        {rx.diagnosis && (
          <div className="rx-section">
            <div className="rx-section-title">Diagnosis</div>
            <div className="rx-diagnosis">{rx.diagnosis}</div>
          </div>
        )}

        {/* Medications table */}
        <div className="rx-section">
          <div className="rx-section-title">Medications</div>
          {meds.length ? (
            <table className="rx-med-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Medicine</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {meds.map((m, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td><strong>{m.name}</strong></td>
                    <td>{m.dosage || '—'}</td>
                    <td>{m.frequency || '—'}</td>
                    <td>{m.duration || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p style={{color:'#94a3b8'}}>No medications listed.</p>}
        </div>

        {/* Instructions */}
        {rx.instructions && (
          <div className="rx-section">
            <div className="rx-section-title">Instructions & Advice</div>
            <div className="rx-instructions">{rx.instructions}</div>
          </div>
        )}

        {/* Notes for doctor */}
        {rx.notes && (
          <div className="rx-section rx-notes">
            <div className="rx-section-title">Clinical Notes</div>
            <div className="rx-instructions">{rx.notes}</div>
          </div>
        )}

        {/* Signature area */}
        <div className="rx-signature-area">
          <div className="rx-signature-block">
            <div className="rx-sig-line" />
            <div className="rx-sig-name">{user?.username || 'Doctor'}</div>
            <div className="rx-sig-title">Treating Physician</div>
          </div>
        </div>

        {/* Footer */}
        <div className="rx-footer">
          <div>{rx.clinic_name} | {rx.clinic_phone} | {rx.clinic_email}</div>
          <div style={{marginTop:4,color:'#94a3b8',fontSize:11}}>This prescription is computer-generated and is valid without signature as per clinic policy.</div>
        </div>
      </div>
    </div>
  );
}

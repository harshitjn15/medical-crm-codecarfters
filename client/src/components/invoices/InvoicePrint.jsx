import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './InvoicePrint.css';

export default function InvoicePrint() {
  const { authFetch } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  const [template, setTemplate] = useState({ layout:'classic', primaryColor:'#0f4c75', showGst:true, showDoctorName:true });

  useEffect(() => {
    Promise.all([
      authFetch(`/api/invoices/${id}/print`).then(r => r.json()),
      authFetch('/api/invoicetemplate').then(r => r.json()),
    ]).then(([inv, tmpl]) => {
      setInvoice(inv);
      if (tmpl) setTemplate(tmpl);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="loading"><div className="spinner"></div></div>;
  if (!invoice || invoice.error) return <div className="page"><p>Invoice not found.</p></div>;

  const currency = invoice.currency || 'INR';
  const fmt = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n || 0);

  const invoiceNumber  = invoice.invoice_number  || invoice.invoiceNumber;
  const issueDate      = invoice.issue_date       || invoice.issueDate;
  const dueDate        = invoice.due_date         || invoice.dueDate;
  const taxRate        = invoice.tax_rate         ?? invoice.taxRate ?? 18;
  const taxAmount      = invoice.tax_amount       ?? invoice.taxAmount ?? 0;
  const paymentMethod  = invoice.payment_method   || invoice.paymentMethod;
  const paidAt         = invoice.paid_at          || invoice.paidAt;
  const clinicName     = invoice.clinic_name      || invoice.clinicName;
  const clinicAddress  = invoice.clinic_address   || invoice.clinicAddress;
  const clinicPhone    = invoice.clinic_phone     || invoice.clinicPhone;
  const clinicEmail    = invoice.clinic_email     || invoice.clinicEmail;
  const clinicGst      = invoice.clinic_gst       || invoice.clinicGst;
  const clinicTagline  = invoice.clinic_tagline   || invoice.clinicTagline;
  const clinicLogo     = invoice.clinic_logo      || invoice.clinicLogo;
  const patientName    = invoice.patient_name     || invoice.patientId?.name    || 'Walk-in Patient';
  const patientPhone   = invoice.patient_phone    || invoice.patientId?.phone;
  const patientEmail   = invoice.patient_email    || invoice.patientId?.email;
  const patientAddress = invoice.patient_address  || invoice.patientId?.address;

  const statusColor = { draft: '#6b7280', sent: '#1565c0', paid: '#2e7d32', cancelled: '#b91c1c' };

  return (
    <div className="ip-page">

      {/* ── Toolbar (hidden on print) ── */}
      <div className="ip-toolbar no-print">
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
        <div style={{ display: 'flex', gap: 8 }}>
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <button className="btn btn-secondary" onClick={() => navigate(`/admin/invoices/${id}/edit`)}>✏️ Edit</button>
          )}
          <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Print / Save PDF</button>
        </div>
      </div>

      {/* ── Invoice document ── */}
      <div className="ip-doc" data-layout={template.layout} style={{ "--tmpl-color": template.primaryColor || "#0f4c75" }}>

        {/* Header: clinic left, invoice meta right */}
        <div className="ip-header">
          <div className="ip-clinic">
            {(template.logoData || clinicLogo) && <img src={template.logoData ? `data:image/png;base64,${template.logoData}` : clinicLogo} alt="logo" className="ip-logo" />}
            <div className="ip-clinic-name">{clinicName}</div>
            {clinicTagline && <div className="ip-clinic-tag">{clinicTagline}</div>}
            {clinicAddress && <div className="ip-clinic-line">{clinicAddress}</div>}
            <div className="ip-clinic-contact">
              {clinicPhone && <span>{clinicPhone}</span>}
              {clinicPhone && clinicEmail && <span className="ip-dot">·</span>}
              {clinicEmail && <span>{clinicEmail}</span>}
            </div>
            {clinicGst && template.showGst && <div className="ip-clinic-gst">GSTIN: {clinicGst}</div>}
          {template.showDoctorName && template.doctorName && <div className="ip-clinic-gst" style={{ marginTop:4 }}>{template.doctorName}{template.doctorDegree ? `, ${template.doctorDegree}` : ''}{template.regNumber ? ` | Reg: ${template.regNumber}` : ''}</div>}
          {template.headerNote && <div style={{ fontSize:12, color:'#475569', marginTop:4 }}>{template.headerNote}</div>}
          </div>

          <div className="ip-meta">
            <div className="ip-title-word">INVOICE</div>
            <div className="ip-number">{invoiceNumber}</div>
            <table className="ip-meta-tbl">
              <tbody>
                <tr><td>Issue Date</td><td>{issueDate}</td></tr>
                {dueDate && <tr><td>Due Date</td><td>{dueDate}</td></tr>}
                <tr>
                  <td>Status</td>
                  <td>
                    <span className="ip-status-pill" style={{ background: statusColor[invoice.status] + '18', color: statusColor[invoice.status], border: `1px solid ${statusColor[invoice.status]}40` }}>
                      {invoice.status?.toUpperCase()}
                    </span>
                  </td>
                </tr>
                {paidAt && <tr><td>Paid On</td><td>{String(paidAt).split('T')[0]}</td></tr>}
                {paymentMethod && <tr><td>Via</td><td style={{ textTransform: 'capitalize' }}>{paymentMethod}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Divider */}
        <div className="ip-rule" />

        {/* Bill To */}
        <div className="ip-bill-section">
          <div className="ip-section-label">BILL TO</div>
          <div className="ip-patient-name">{patientName}</div>
          {patientPhone   && <div className="ip-patient-line">📱 {patientPhone}</div>}
          {patientEmail   && <div className="ip-patient-line">✉️ {patientEmail}</div>}
          {patientAddress && <div className="ip-patient-line">📍 {patientAddress}</div>}
        </div>

        {/* Items table */}
        <table className="ip-items">
          <thead>
            <tr>
              <th className="ip-col-no">#</th>
              <th className="ip-col-desc">Description</th>
              <th className="ip-col-cat">Category</th>
              <th className="ip-col-qty">Qty</th>
              <th className="ip-col-price">Unit Price</th>
              <th className="ip-col-amt">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, i) => (
              <tr key={i}>
                <td className="ip-col-no ip-muted">{i + 1}</td>
                <td className="ip-col-desc ip-item-desc">{item.description}</td>
                <td className="ip-col-cat ip-muted ip-cap">{item.category}</td>
                <td className="ip-col-qty">{item.quantity}</td>
                <td className="ip-col-price">{fmt(item.unitPrice ?? item.unit_price ?? 0)}</td>
                <td className="ip-col-amt ip-bold">{fmt(item.amount)}</td>
              </tr>
            ))}
            {/* Empty state */}
            {(!invoice.items || invoice.items.length === 0) && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#aaa' }}>No items</td></tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className="ip-totals-wrap">
          <table className="ip-totals">
            <tbody>
              <tr>
                <td>Subtotal</td>
                <td>{fmt(invoice.subtotal)}</td>
              </tr>
              {(() => {
                const discountVal = invoice.discount || 0;
                if (!discountVal) return null;
                const discountAmt = invoice.discount_type === 'percent' ? (invoice.subtotal * discountVal) / 100 : discountVal;
                return (
                  <tr className="ip-discount">
                    <td>Discount {invoice.discount_type === 'percent' ? `(${discountVal}%)` : ''}</td>
                    <td>− {fmt(discountAmt)}</td>
                  </tr>
                );
              })()}
              <tr>
                <td>GST ({taxRate}%)</td>
                <td>{fmt(taxAmount)}</td>
              </tr>
              <tr className="ip-total-row">
                <td>Total</td>
                <td>{fmt(invoice.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="ip-notes">
            <div className="ip-section-label">NOTES</div>
            <p>{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="ip-footer">
          {template.footerNote || `Thank you for choosing ${clinicName}. Please retain this invoice for your records.`}
        </div>

      </div>
    </div>
  );
}

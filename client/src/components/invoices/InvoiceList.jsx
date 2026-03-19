import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const STATUS_BADGE = { draft: 'gray', sent: 'info', paid: 'success', cancelled: 'danger' };

export default function InvoiceList() {
  const { authFetch } = useContext(AuthContext);
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats]   = useState({});
  const [total, setTotal]   = useState(0);
  const [filter, setFilter] = useState({ status: '', from: '', to: '' });
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(true);
  const LIMIT = 20;

  const fetch_ = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (filter.status) params.set('status', filter.status);
      if (filter.from)   params.set('from',   filter.from);
      if (filter.to)     params.set('to',     filter.to);

      const r = await authFetch(`/api/invoices?${params}`);
      const d = await r.json();
      if (!r.ok) { console.error('Invoices error:', d.error); setLoading(false); return; }
      setInvoices(d.invoices || []);
      setTotal(d.total   || 0);
      setStats(d.stats   || {});
    } catch (err) { console.error('Invoices fetch failed:', err); }
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, [filter, page]);

  const updateStatus = async (id, status) => {
    let payment_method = null;
    if (status === 'paid') {
      payment_method = window.prompt('Payment method? (cash / card / upi / insurance)', 'cash');
      if (!payment_method) return;
    }
    await authFetch(`/api/invoices/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, payment_method }),
    });
    fetch_();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    await authFetch(`/api/invoices/${id}`, { method: 'DELETE' });
    fetch_();
  };

  const fmt = n => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n || 0);

  // Helper — server returns both camelCase and snake_case aliases; pick whichever exists
  const field = (inv, snake, camel) => inv[snake] ?? inv[camel] ?? '—';

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Invoices</h1>
          <p>{total} total</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/admin/invoices/new')}>
          + New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', maxWidth: 460 }}>
        <div className="stat-card green">
          <div className="stat-label">Collected</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmt(stats.collected)}</div>
          <div className="stat-sub">{stats.paid_count || 0} paid</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Pending</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmt(stats.pending)}</div>
          <div className="stat-sub">{stats.pending_count || 0} outstanding</div>
        </div>
      </div>

      <div className="card">
        {/* Filters */}
        <div className="card-header">
          <div className="filter-row" style={{ margin: 0 }}>
            <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input type="date" value={filter.from} onChange={e => setFilter(f => ({ ...f, from: e.target.value }))} />
            <input type="date" value={filter.to}   onChange={e => setFilter(f => ({ ...f, to:   e.target.value }))} />
            {(filter.status || filter.from || filter.to) && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setFilter({ status: '', from: '', to: '' }); setPage(1); }}>
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading"><div className="spinner"></div></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Subtotal</th>
                  <th>GST</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!invoices.length && (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div className="icon">💰</div>
                        <p>No invoices found</p>
                      </div>
                    </td>
                  </tr>
                )}
                {invoices.map(inv => {
                  // Support both snake_case (server alias) and camelCase (raw Mongoose)
                  const invoiceNumber = inv.invoice_number || inv.invoiceNumber;
                  const issueDate     = inv.issue_date     || inv.issueDate;
                  const taxAmount     = inv.tax_amount     ?? inv.taxAmount ?? 0;
                  const patientName   = inv.patient_name   || inv.patientName;
                  const patientPhone  = inv.patient_phone  || inv.patientPhone;

                  return (
                    <tr key={inv.id}>
                      <td
                        style={{ fontFamily: 'monospace', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                        onClick={() => navigate(`/admin/invoices/${inv.id}`)}
                      >
                        {invoiceNumber}
                      </td>
                      <td>
                        <strong>{patientName}</strong>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{patientPhone}</div>
                      </td>
                      <td style={{ fontSize: 13 }}>{issueDate}</td>
                      <td>{fmt(inv.subtotal)}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmt(taxAmount)}</td>
                      <td><strong>{fmt(inv.total)}</strong></td>
                      <td>
                        <span className={`badge badge-${STATUS_BADGE[inv.status] || 'gray'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-icon" title="View/Print" onClick={() => navigate(`/admin/invoices/${inv.id}`)}>🖨️</button>
                          {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                            <button className="btn-icon" title="Edit" onClick={() => navigate(`/admin/invoices/${inv.id}/edit`)}>✏️</button>
                          )}
                          {inv.status === 'draft' && (
                            <button className="btn-icon" title="Mark as Sent" onClick={() => updateStatus(inv.id, 'sent')}>📤</button>
                          )}
                          {inv.status === 'sent' && (
                            <button className="btn btn-sm btn-success" onClick={() => updateStatus(inv.id, 'paid')}>✓ Paid</button>
                          )}
                          {inv.status !== 'paid' && (
                            <button className="btn-icon" title="Delete" onClick={() => handleDelete(inv.id)}>🗑️</button>
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

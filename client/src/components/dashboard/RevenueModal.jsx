import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

const fmt = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function RevenueModal({ onClose, timeframe, setTimeframe, data }) {
  if (!data) return null;
  const { chartData = [], kpis = {}, insights = {} } = data;
  const isPositive = kpis.growth >= 0;

  return (
    <div className="cp-modal-overlay" onClick={onClose} style={{ zIndex: 3000, padding: 20 }}>
      <div className="cp-modal" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 1000, height: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="cp-modal-header" style={{ padding: '24px 32px' }}>
          <div>
            <h2 style={{ fontSize: 22, margin: 0 }}>Advanced Revenue Analytics</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>Deep dive into your clinic's financial performance</p>
          </div>
          <button className="cp-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="cp-modal-body" style={{ flex: 1, overflowY: 'auto', padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: 24, background: '#f8fafc' }}>
          {/* Top Controls & Main KPI */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
            <div className="filter-row" style={{ margin: 0 }}>
              {['daily', 'weekly', 'monthly'].map(t => (
                <button
                  key={t}
                  className={`btn ${timeframe === t ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTimeframe(t)}
                  style={{ padding: '8px 20px', fontSize: 14 }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Collected ({timeframe})</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--primary)', lineHeight: 1.2 }}>{fmt(kpis.totalRevenue)}</div>
            </div>
          </div>

          {/* Expanded Chart */}
          <div className="card" style={{ padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: 'none' }}>
            <div style={{ height: 400, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                    dy={12}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(val) => `₹${val >= 1000 ? (val/1000) + 'k' : val}`}
                    width={80}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', padding: '16px 20px' }}
                    labelStyle={{ fontWeight: 700, color: '#0f172a', marginBottom: 8, fontSize: 15 }}
                    formatter={(value) => [fmt(value), 'Revenue']}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]} animationDuration={1200}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.revenue === insights.maxRev ? 'var(--primary)' : 'var(--primary-light)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Analytics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            <div className="card" style={{ padding: '20px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Growth</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: isPositive ? 'var(--success)' : 'var(--danger)', marginTop: 8 }}>
                {isPositive ? '+' : ''}{kpis.growth}%
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>vs previous {timeframe} ({fmt(kpis.prevRevenue)})</div>
            </div>

            <div className="card" style={{ padding: '20px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Average Invoice</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginTop: 8 }}>{fmt(kpis.avgInvoiceValue)}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Across {kpis.totalInvoices} paid invoices</div>
            </div>

            <div className="card" style={{ padding: '20px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Pending Pipeline</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--warning)', marginTop: 8 }}>{fmt(kpis.pendingRevenue)}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Awaiting collection</div>
            </div>

            <div className="card" style={{ padding: '20px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Performance</div>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>Best Day:</span>
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>{insights.topDay || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>Peak Rev:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{fmt(insights.maxRev)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

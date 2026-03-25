import React, { useState, useEffect, useContext } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AuthContext } from '../../context/AuthContext';
import RevenueModal from './RevenueModal';
import './Dashboard.css';

const fmt = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function RevenueChart() {
  const { authFetch } = useContext(AuthContext);
  const [timeframe, setTimeframe] = useState('monthly');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    authFetch(`/api/clinic/revenue-analytics?timeframe=${timeframe}`)
      .then(r => r.json())
      .then(d => {
        if (active) {
          setData(d);
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [timeframe, authFetch]);

  if (loading && !data) {
    return (
      <div className="card">
        <div className="card-header"><h2>📈 Revenue Analytics</h2></div>
        <div className="card-body loading" style={{ height: 300 }}><div className="spinner"></div></div>
      </div>
    );
  }

  const { chartData = [], kpis = {} } = data || {};
  const isPositive = kpis.growth >= 0;

  return (
    <>
      <div className="card revenue-analytics-card">
        <div className="card-header" style={{ alignItems: 'flex-start' }}>
          <div>
            <h2>📈 Revenue Analytics</h2>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-main)' }}>{fmt(kpis.totalRevenue)}</div>
                <div style={{ fontSize: 13, color: isPositive ? 'var(--success)' : 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{isPositive ? '↗' : '↘'}</span> {Math.abs(kpis.growth)}% vs last period
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
            <div className="filter-row" style={{ margin: 0 }}>
              {['daily', 'weekly', 'monthly'].map(t => (
                <button
                  key={t}
                  className={`btn btn-sm ${timeframe === t ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTimeframe(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowModal(true)}>
              ⤢ Expand Analytics
            </button>
          </div>
        </div>
        
        <div className="card-body" style={{ padding: '0 20px 20px' }}>
          <div style={{ height: 260, width: '100%', marginTop: 20 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  dy={10}
                  tickFormatter={(val) => {
                    if (timeframe === 'monthly') return val.split('-')[1]; // Just show month num or ideally formatted
                    if (timeframe === 'daily') return val.split('-')[2];   // Just day
                    return val.split('-W')[1]; // Just week num
                  }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `₹${val >= 1000 ? (val/1000) + 'k' : val}`}
                  width={60}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '12px 16px' }}
                  labelStyle={{ fontWeight: 600, color: '#0f172a', marginBottom: 4 }}
                  formatter={(value) => [fmt(value), 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="var(--primary)" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Mini KPIs Footer */}
          <div className="revenue-mini-kpis" style={{ display: 'flex', gap: 20, marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Avg Invoice</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{fmt(kpis.avgInvoiceValue)}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Invoices</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{kpis.totalInvoices}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Pending</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--warning)', marginTop: 4 }}>{fmt(kpis.pendingRevenue)}</div>
            </div>
          </div>
        </div>
      </div>
      
      {showModal && (
        <RevenueModal 
          onClose={() => setShowModal(false)} 
          timeframe={timeframe} 
          setTimeframe={setTimeframe}
          data={data}
        />
      )}
    </>
  );
}

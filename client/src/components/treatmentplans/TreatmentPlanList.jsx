import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const STATUS_COLOR = { active:'info', completed:'success', cancelled:'danger' };

export default function TreatmentPlanList() {
  const { authFetch } = useContext(AuthContext);
  const navigate = useNavigate();
  const [plans, setPlans]   = useState([]);
  const [total, setTotal]   = useState(0);
  const [filter, setFilter] = useState('active');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: 50 });
    if (filter !== 'all') params.set('status', filter);
    const r = await authFetch(`/api/treatmentplans?${params}`);
    const d = await r.json();
    setPlans(d.plans || []);
    setTotal(d.total || 0);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  const fmt = n => new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 }).format(n||0);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left"><h1>Treatment Plans</h1><p>{total} plans</p></div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="filter-row" style={{ margin:0 }}>
            {['all','active','completed','cancelled'].map(s => (
              <button key={s} className={`btn btn-sm ${filter===s?'btn-primary':'btn-secondary'}`} onClick={()=>setFilter(s)}>
                {s.charAt(0).toUpperCase()+s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="table-container">
          {loading ? <div className="loading"><div className="spinner"></div></div> : (
            <table>
              <thead><tr><th>Patient</th><th>Plan</th><th>Progress</th><th>Estimate</th><th>Status</th><th>Started</th></tr></thead>
              <tbody>
                {!plans.length && <tr><td colSpan={6}><div className="empty-state"><div className="icon">🗓</div><p>No treatment plans found</p></div></td></tr>}
                {plans.map(plan => {
                  const done  = plan.items?.filter(i => i.status === 'completed').length || 0;
                  const total = plan.items?.length || 0;
                  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <tr key={plan.id} style={{ cursor:'pointer' }} onClick={() => navigate(`/admin/patients/${plan.patientId}?tab=treatment`)}>
                      <td>
                        <strong style={{ color:'var(--primary)' }}>{plan.patient_name}</strong>
                        <div style={{ fontSize:12, color:'var(--text-muted)' }}>{plan.patient_phone}</div>
                      </td>
                      <td>
                        <strong>{plan.title}</strong>
                        {plan.notes && <div style={{ fontSize:12, color:'var(--text-muted)' }}>{plan.notes}</div>}
                      </td>
                      <td style={{ minWidth:120 }}>
                        <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4 }}>{done}/{total} done · {pct}%</div>
                        <div style={{ height:6, background:'var(--bg-main)', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background: pct===100?'#2d6a4f':'var(--primary)', borderRadius:3 }} />
                        </div>
                      </td>
                      <td style={{ fontWeight:600 }}>{fmt(plan.totalEstimate)}</td>
                      <td><span className={`badge badge-${STATUS_COLOR[plan.status]||'gray'}`}>{plan.status}</span></td>
                      <td style={{ fontSize:12, color:'var(--text-muted)' }}>{plan.startDate || plan.createdAt?.split('T')[0]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

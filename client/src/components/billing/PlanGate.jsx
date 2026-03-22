import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

// ✅ Updated Labels (better positioning)
const PLAN_LABELS = { 
  basic: 'Starter', 
  pro: 'Growth', 
  enterprise: 'Pro Clinic' 
};

// ✅ Updated Pricing (your business model)
const PLAN_PRICES = { 
  basic: '₹1,999', 
  pro: '₹3,999', 
  enterprise: '₹6,999' 
};

// ✅ Upgrade mapping
const UPGRADE_TO  = { basic: 'pro', pro: 'enterprise' };

export default function PlanGate({ feature, children, title, description, inline = false }) {
  const { authFetch, user } = useContext(AuthContext);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    authFetch('/api/subscriptions/me/status')
      .then(r => r.json())
      .then(d => {
        // ✅ Safe normalize (Mongo issues protection)
        if (d?._id && typeof d._id !== 'string') {
          d._id = String(d._id);
        }
        setStatus(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  // ✅ Safe feature check
  const hasFeature = Boolean(status?.features?.[feature]);
  if (hasFeature) return children;

  const plan        = status?.plan || 'basic';
  const upgradePlan = UPGRADE_TO[plan] || 'pro';

  // ✅ Inline badge (small lock)
  if (inline) {
    return (
      <span style={{
        display:'inline-flex',
        alignItems:'center',
        gap:6,
        padding:'2px 10px',
        background:'#fef3c7',
        border:'1px solid #f59e0b',
        borderRadius:20,
        fontSize:12,
        color:'#92400e'
      }}>
        🔒 {PLAN_LABELS[upgradePlan]} only
      </span>
    );
  }

  return (
    <div style={{ position:'relative', minHeight:300 }}>

      {/* Blurred preview */}
      <div style={{
        filter:'blur(3px)',
        pointerEvents:'none',
        opacity:0.4,
        userSelect:'none'
      }}>
        {children}
      </div>

      {/* Lock overlay */}
      <div style={{
        position:'absolute',
        inset:0,
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        background:'rgba(255,255,255,0.05)',
        backdropFilter:'blur(1px)'
      }}>
        <div style={{
          background:'var(--bg-card)',
          border:'1px solid var(--border)',
          borderRadius:16,
          padding:'32px 36px',
          maxWidth:420,
          textAlign:'center',
          boxShadow:'0 8px 32px rgba(0,0,0,0.12)'
        }}>
          
          <div style={{ fontSize:36, marginBottom:12 }}>🔒</div>

          <h2 style={{ margin:'0 0 8px', fontSize:18 }}>
            {title || 'Feature locked'}
          </h2>

          <p style={{
            color:'var(--text-muted)',
            fontSize:14,
            lineHeight:1.7,
            marginBottom:20
          }}>
            {description || `This feature requires the ${PLAN_LABELS[upgradePlan]} plan.`}
          </p>

          {/* Current Plan */}
          <div style={{
            background:'var(--bg-main)',
            borderRadius:10,
            padding:'12px 16px',
            marginBottom:20,
            textAlign:'left'
          }}>
            <div style={{
              fontSize:12,
              color:'var(--text-muted)',
              marginBottom:6,
              fontWeight:600,
              textTransform:'uppercase',
              letterSpacing:'0.5px'
            }}>
              Your plan
            </div>

            <div style={{
              display:'flex',
              justifyContent:'space-between',
              alignItems:'center'
            }}>
              <span style={{ fontSize:15, fontWeight:600 }}>
                {PLAN_LABELS[plan]}
              </span>

              <span className="badge badge-info">
                {PLAN_PRICES[plan]}/month
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display:'flex', gap:8, flexDirection:'column' }}>
            
            <button
              className="btn btn-primary"
              onClick={() => navigate('/admin/settings?tab=billing')}
            >
              Upgrade to {PLAN_LABELS[upgradePlan]} — {PLAN_PRICES[upgradePlan]}/month
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => navigate('/pricing')}
            >
              View all plans
            </button>

          </div>

          {/* Super Admin */}
          {user?.role === 'super_admin' && (
            <p style={{
              fontSize:12,
              color:'var(--text-muted)',
              marginTop:12
            }}>
              Super admin: assign plan from{' '}
              <button
                className="btn-link"
                onClick={() => navigate('/admin/superadmin')}
              >
                Super Admin panel
              </button>
            </p>
          )}

        </div>
      </div>
    </div>
  );
}
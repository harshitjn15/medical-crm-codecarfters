import React, { useContext, useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './Layout.css';

const CLINIC_NAV = [
  { to:'/admin/dashboard',     icon:'📊', label:'Dashboard' },
  { to:'/admin/patients',      icon:'👥', label:'Patients' },
  { to:'/admin/appointments',  icon:'📅', label:'Appointments' },
  { to:'/admin/prescriptions', icon:'💊', label:'Prescriptions' },
  { to:'/admin/followups',     icon:'🔔', label:'Follow-ups' },
  { to:'/admin/treatmentplans',icon:'🗓', label:'Treatment Plans' },
  { to:'/admin/procedures',    icon:'🔬', label:'Procedures' },
  { to:'/admin/invoices',      icon:'💰', label:'Invoices' },
  { to:'/admin/bot',           icon:'🤖', label:'WhatsApp Bot', planBadge: 'pro' },
  { to:'/admin/settings',      icon:'⚙️',  label:'Settings' },
];

const SUPER_ADMIN_ITEM = { to:'/admin/superadmin', icon:'🛡️', label:'Super Admin', highlight:true };

export default function Layout() {
  const { user, logout, authFetch } = useContext(AuthContext);
  const navigate   = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    authFetch('/api/subscriptions/me/status')
      .then(r => r.json())
      .then(d => setPlan(d.plan || 'basic'))
      .catch(() => setPlan('basic'));
  }, []);

  const isSuperAdmin = user?.role === 'super_admin';
  const navItems = [...CLINIC_NAV, ...(isSuperAdmin ? [SUPER_ADMIN_ITEM] : [])];

  const specialty = user?.specialty || 'general';
  const specialtyLabel = {
    general:'General Medicine', dental:'Dental', dermatology:'Dermatology',
    cardiology:'Cardiology', orthopedics:'Orthopedics', ent:'ENT',
    gynecology:'Gynecology', pediatrics:'Pediatrics',
    ophthalmology:'Ophthalmology', neurology:'Neurology', psychiatry:'Psychiatry',
  }[specialty] || specialty;

  const PLAN_COLOR = { basic:'#6b7280', pro:'#7c3aed', enterprise:'#0369a1' };
  const planColor  = PLAN_COLOR[plan] || '#6b7280';

  return (
    <div className={`layout ${collapsed?'collapsed':''}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <button className="collapse-btn" onClick={()=>setCollapsed(c=>!c)}>{collapsed?'→':'←'}</button>
          {!collapsed && (
            <div className="sidebar-brand">
              <span className="brand-icon">🏥</span>
              <div>
                <div className="brand-name">{user?.clinic_name||'Medical CRM'}</div>
                <div className="brand-sub">{specialtyLabel}</div>
              </div>
            </div>
          )}
          {collapsed && <span className="brand-icon-sm">🏥</span>}
        </div>

        {/* Plan badge */}
        {!collapsed && plan && (
          <div style={{ margin:'0 12px 8px', padding:'5px 10px', background:`${planColor}18`, border:`1px solid ${planColor}40`, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:11, fontWeight:600, color:planColor, textTransform:'capitalize' }}>{plan} plan</span>
            {plan !== 'enterprise' && (
              <button onClick={() => navigate('/pricing')} style={{ fontSize:10, color:planColor, background:'none', border:'none', cursor:'pointer', textDecoration:'underline', padding:0 }}>Upgrade</button>
            )}
          </div>
        )}

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({isActive})=>`nav-item ${isActive?'active':''} ${item.highlight?'nav-highlight':''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && (
                <span className="nav-label" style={{ display:'flex', alignItems:'center', gap:6, flex:1 }}>
                  {item.label}
                  {item.planBadge && plan === 'basic' && (
                    <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', background:'#7c3aed', color:'#e9d5ff', borderRadius:8 }}>PRO</span>
                  )}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.username?.[0]?.toUpperCase()||'A'}</div>
            {!collapsed && (
              <div className="user-details">
                <div className="user-name">{user?.username}</div>
                <div className="user-role" style={{ textTransform:'capitalize' }}>{user?.role}</div>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={()=>{ logout(); navigate('/login'); }}>
            {collapsed?'🚪':'🚪 Logout'}
          </button>
        </div>
      </aside>
      <main className="main-content"><Outlet /></main>
    </div>
  );
}

import React, { useContext, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './Layout.css';

// Nav items for ALL authenticated users
const CLINIC_NAV = [
  { to:'/admin/dashboard',     icon:'📊', label:'Dashboard' },
  { to:'/admin/patients',      icon:'👥', label:'Patients' },
  { to:'/admin/appointments',  icon:'📅', label:'Appointments' },
  { to:'/admin/prescriptions', icon:'💊', label:'Prescriptions' },
  { to:'/admin/followups',     icon:'🔔', label:'Follow-ups' },
  { to:'/admin/treatmentplans',icon:'🗓', label:'Treatment Plans' },
  { to:'/admin/procedures',    icon:'🔬', label:'Procedures' },
  { to:'/admin/invoices',      icon:'💰', label:'Invoices' },
  { to:'/admin/settings',      icon:'⚙️',  label:'Settings' },
];

const SUPER_ADMIN_ITEM = { to:'/admin/superadmin', icon:'🛡️', label:'Super Admin', highlight:true };

export default function Layout() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';
  const specialty    = user?.specialty || 'general';

  const navItems = [
    ...CLINIC_NAV,
    ...(isSuperAdmin ? [SUPER_ADMIN_ITEM] : []),
  ];

  // Specialty label shown under clinic name
  const specialtyLabel = {
    general:'General Medicine', dental:'Dental', dermatology:'Dermatology',
    cardiology:'Cardiology', orthopedics:'Orthopedics', ent:'ENT',
    gynecology:'Gynecology', pediatrics:'Pediatrics',
    ophthalmology:'Ophthalmology', neurology:'Neurology', psychiatry:'Psychiatry',
  }[specialty] || specialty;

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

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({isActive})=>`nav-item ${isActive?'active':''} ${item.highlight?'nav-highlight':''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
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

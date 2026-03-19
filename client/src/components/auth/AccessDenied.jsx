import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

export default function AccessDenied() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '70vh', gap: 16, padding: 24,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 56 }}>🔒</div>
      <h1 style={{ fontSize: 24, margin: 0 }}>Access Denied</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 380, lineHeight: 1.7 }}>
        This page is restricted to <strong>super administrators</strong> only.
        Your account (<strong>{user?.username}</strong>) has the role <strong>{user?.role}</strong>,
        which does not have permission to view this page.
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button className="btn btn-primary" onClick={() => navigate('/admin/dashboard')}>
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}

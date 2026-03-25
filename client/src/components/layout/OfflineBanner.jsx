/**
 * OfflineBanner.jsx
 * Persistent banner shown when offline. Shows sync progress on reconnect.
 */
import React, { useState, useEffect } from 'react';
import { getPendingCount } from '../../utils/offlineDB';
import { onSyncUpdate } from '../../utils/syncQueue';
import './OfflineBanner.css';

export default function OfflineBanner() {
  const [online, setOnline]         = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncState, setSyncState]   = useState(null); // { status, total, done }

  useEffect(() => {
    const updateCount = async () => setPendingCount(await getPendingCount());
    updateCount();

    const handleOnline  = () => { setOnline(true);  updateCount(); };
    const handleOffline = () => { setOnline(false); updateCount(); };

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    onSyncUpdate((data) => {
      setSyncState(data);
      if (data.status === 'done') {
        updateCount();
        setTimeout(() => setSyncState(null), 3000);
      }
    });

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online && !syncState && pendingCount === 0) return null;

  if (!online) {
    return (
      <div className="offline-banner offline-banner--offline">
        <span>📵 You are offline</span>
        {pendingCount > 0 && <span className="offline-badge">{pendingCount} pending sync</span>}
        <span className="offline-hint">Prescriptions and invoices created now will sync when you reconnect.</span>
      </div>
    );
  }

  if (syncState?.status === 'syncing') {
    return (
      <div className="offline-banner offline-banner--syncing">
        <span>🔄 Syncing… {syncState.done}/{syncState.total}</span>
        <div className="offline-progress">
          <div className="offline-progress-bar" style={{ width: `${(syncState.done / syncState.total) * 100}%` }} />
        </div>
      </div>
    );
  }

  if (syncState?.status === 'done') {
    return (
      <div className="offline-banner offline-banner--done">
        ✅ {syncState.done} item{syncState.done !== 1 ? 's' : ''} synced successfully
        {syncState.errors > 0 && <span style={{ marginLeft: 8, color: '#fca5a5' }}>({syncState.errors} failed)</span>}
      </div>
    );
  }

  if (online && pendingCount > 0) {
    return (
      <div className="offline-banner offline-banner--pending">
        🕐 {pendingCount} offline item{pendingCount !== 1 ? 's' : ''} waiting to sync
      </div>
    );
  }

  return null;
}

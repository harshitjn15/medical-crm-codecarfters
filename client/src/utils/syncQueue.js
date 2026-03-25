/**
 * utils/syncQueue.js
 * Auto-sync manager — flushes offline queue when internet is restored.
 * Usage: call startSyncListener(authFetch, onSyncComplete) once in App.js
 */
import { getPendingItems, removeSyncItem } from './offlineDB';

let isSyncing = false;
let syncCallbacks = [];

export const onSyncUpdate = (cb) => { syncCallbacks.push(cb); };
const notifyCallbacks = (data) => syncCallbacks.forEach(cb => cb(data));

/**
 * Flush all pending offline items to the server.
 * @param {Function} authFetch - authenticated fetch function from AuthContext
 */
export const flushQueue = async (authFetch) => {
  if (isSyncing || !navigator.onLine) return;
  isSyncing = true;

  const pending = await getPendingItems();
  if (!pending.length) { isSyncing = false; return; }

  notifyCallbacks({ status: 'syncing', total: pending.length, done: 0 });

  let done = 0;
  const errors = [];

  for (const item of pending) {
    try {
      const r = await authFetch(item.endpoint, {
        method: item.method || 'POST',
        body: JSON.stringify(item.payload),
      });
      if (r.ok || r.status === 409) {
        // 201/200 = success. 409 = conflict — still remove to avoid re-sending
        await removeSyncItem(item.tempId);
        done++;
        notifyCallbacks({ status: 'syncing', total: pending.length, done });
      } else {
        errors.push({ item, status: r.status });
      }
    } catch (err) {
      errors.push({ item, error: err.message });
    }
  }

  isSyncing = false;
  notifyCallbacks({ status: 'done', total: pending.length, done, errors: errors.length });
};

/**
 * Start listening for online events and trigger sync.
 * @param {Function} authFetch
 */
export const startSyncListener = (authFetch) => {
  const handler = () => {
    if (navigator.onLine) {
      setTimeout(() => flushQueue(authFetch), 1500); // small delay to ensure connection is stable
    }
  };
  window.addEventListener('online', handler);
  // Try immediately on startup too (in case page was loaded offline and came back)
  if (navigator.onLine) flushQueue(authFetch);
  return () => window.removeEventListener('online', handler);
};

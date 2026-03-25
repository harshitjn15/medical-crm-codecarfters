/**
 * utils/offlineDB.js
 * IndexedDB schema using the `idb` library.
 * Stores offline-created prescriptions and invoices when the device is disconnected.
 */
import { openDB } from 'idb';

const DB_NAME    = 'medicalCrmOffline';
const DB_VERSION = 2; // Bumped to 2 for apiCache

let dbPromise = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Pending outbound API calls
        if (!db.objectStoreNames.contains('syncQueue')) {
          const store = db.createObjectStore('syncQueue', { keyPath: 'tempId', autoIncrement: false });
          store.createIndex('by_synced', 'synced');
          store.createIndex('by_type',   'type');
        }
        // Cache for GET requests
        if (!db.objectStoreNames.contains('apiCache')) {
          db.createObjectStore('apiCache');
        }
      },
    });
  }
  return dbPromise;
};

/**
 * Add a pending operation to the sync queue.
 * @param {Object} item - { tempId, type, endpoint, method, payload, clinicId }
 */
export const enqueueSyncItem = async (item) => {
  const db = await getDB();
  await db.put('syncQueue', {
    ...item,
    synced:    false,
    createdAt: new Date().toISOString(),
    retries:   0,
  });
};

/** Get all pending (unsynced) items */
export const getPendingItems = async () => {
  const db    = await getDB();
  const all   = await db.getAll('syncQueue');
  return all.filter(i => !i.synced);
};

/** Mark an item as synced (remove from queue) */
export const removeSyncItem = async (tempId) => {
  const db = await getDB();
  await db.delete('syncQueue', tempId);
};

/** Get count of pending items */
export const getPendingCount = async () => {
  const items = await getPendingItems();
  return items.length;
};

/** ── GET Request Caching ────────────────────────────────────────────────── */
export const cacheApiData = async (url, data) => {
  try {
    const db = await getDB();
    await db.put('apiCache', data, url);
  } catch (err) { console.error('Cache API error', err); }
};

export const getCachedApiData = async (url) => {
  try {
    const db = await getDB();
    return await db.get('apiCache', url);
  } catch (err) { return null; }
};

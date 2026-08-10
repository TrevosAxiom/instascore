import { ApiError, type ApiClient } from '../api/client';
import type { LiveMatchState } from '../types/api';

export type QueueSyncState = 'pending' | 'synced' | 'failed' | 'conflict';

export interface QueuedScoreEvent {
  id?: number;
  clientEventId: string;
  fixtureUuid: string;
  payload: Record<string, unknown>;
  deviceTimestamp: string;
  user: { uuid: string; displayName: string } | null;
  baseRevision: number;
  retryCount: number;
  syncState: QueueSyncState;
  error?: string;
  serverRevision?: number;
  updatedAt: string;
}

export interface QueueSummary {
  pending: number;
  synced: number;
  failed: number;
  conflict: number;
}

const DB_NAME = 'instascore-match-day';
const DB_VERSION = 1;
const STORE_NAME = 'scoreEvents';
const memoryStore = new Map<number, QueuedScoreEvent>();
let memoryId = 1;

function supportsIndexedDb() {
  return typeof indexedDB !== 'undefined';
}

async function openDb(): Promise<IDBDatabase | null> {
  if (!supportsIndexedDb()) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('fixtureUuid', 'fixtureUuid');
        store.createIndex('clientEventId', 'clientEventId', { unique: true });
        store.createIndex('syncState', 'syncState');
      }
    };
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed.'));
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  if (!db) {
    throw new Error('IndexedDB is unavailable.');
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = callback(transaction.objectStore(STORE_NAME));
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
    request.onsuccess = () => resolve(request.result);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    };
  });
}

export async function enqueueScoreEvent(
  event: Omit<QueuedScoreEvent, 'id' | 'retryCount' | 'syncState' | 'updatedAt'>,
): Promise<QueuedScoreEvent> {
  const now = new Date().toISOString();
  const record: QueuedScoreEvent = {
    ...event,
    retryCount: 0,
    syncState: 'pending',
    updatedAt: now,
  };

  if (!supportsIndexedDb()) {
    const existing = [...memoryStore.values()].find(
      (item) => item.clientEventId === record.clientEventId,
    );
    if (existing) {
      return existing;
    }
    const id = memoryId++;
    const saved = { ...record, id };
    memoryStore.set(id, saved);
    return saved;
  }

  try {
    const id = await withStore<number>(
      'readwrite',
      (store) => store.add(record) as IDBRequest<number>,
    );
    return { ...record, id };
  } catch (error) {
    if (isConstraintError(error)) {
      const duplicate = await findByClientEventId(record.clientEventId);
      if (duplicate) {
        return duplicate;
      }
    }
    throw error;
  }
}

export async function listQueuedScoreEvents(fixtureUuid?: string): Promise<QueuedScoreEvent[]> {
  if (!supportsIndexedDb()) {
    return [...memoryStore.values()].filter(
      (item) => !fixtureUuid || item.fixtureUuid === fixtureUuid,
    );
  }

  const db = await openDb();
  if (!db) {
    return [];
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed.'));
    request.onsuccess = () => {
      const rows = (request.result as QueuedScoreEvent[]).filter(
        (item) => !fixtureUuid || item.fixtureUuid === fixtureUuid,
      );
      resolve(rows);
    };
    transaction.oncomplete = () => db.close();
  });
}

export async function summarizeQueue(fixtureUuid?: string): Promise<QueueSummary> {
  const rows = await listQueuedScoreEvents(fixtureUuid);
  return rows.reduce<QueueSummary>(
    (summary, row) => ({ ...summary, [row.syncState]: summary[row.syncState] + 1 }),
    { pending: 0, synced: 0, failed: 0, conflict: 0 },
  );
}

export async function markQueuedScoreEvent(
  record: QueuedScoreEvent,
  patch: Partial<QueuedScoreEvent>,
): Promise<QueuedScoreEvent> {
  const updated = { ...record, ...patch, updatedAt: new Date().toISOString() };
  if (!updated.id) {
    return updated;
  }

  if (!supportsIndexedDb()) {
    memoryStore.set(updated.id, updated);
    return updated;
  }

  await withStore<IDBValidKey>('readwrite', (store) => store.put(updated));
  return updated;
}

export async function syncQueuedScoreEvents(
  api: Pick<ApiClient, 'appendMatchEvent'>,
  fixtureUuid?: string,
): Promise<{
  submitted: number;
  conflicts: number;
  failed: number;
  latestState: LiveMatchState | null;
}> {
  const rows = (await listQueuedScoreEvents(fixtureUuid))
    .filter((row) => row.syncState === 'pending' || row.syncState === 'failed')
    .sort((a, b) => a.deviceTimestamp.localeCompare(b.deviceTimestamp));
  let submitted = 0;
  let conflicts = 0;
  let failed = 0;
  let latestState: LiveMatchState | null = null;

  for (const row of rows) {
    try {
      const state = await api.appendMatchEvent(row.fixtureUuid, row.payload);
      submitted += 1;
      latestState = state;
      await markQueuedScoreEvent(row, {
        syncState: 'synced',
        error: '',
        serverRevision: state.revision,
      });
    } catch (error) {
      const retryCount = row.retryCount + 1;
      if (error instanceof ApiError && error.status === 409) {
        conflicts += 1;
        await markQueuedScoreEvent(row, {
          retryCount,
          syncState: 'conflict',
          error: error.message,
        });
      } else {
        failed += 1;
        await markQueuedScoreEvent(row, {
          retryCount,
          syncState: 'failed',
          error: error instanceof Error ? error.message : 'Sync failed.',
        });
      }
    }
  }

  return { submitted, conflicts, failed, latestState };
}

async function findByClientEventId(clientEventId: string): Promise<QueuedScoreEvent | null> {
  const rows = await listQueuedScoreEvents();
  return rows.find((row) => row.clientEventId === clientEventId) ?? null;
}

function isConstraintError(error: unknown) {
  return error instanceof DOMException && error.name === 'ConstraintError';
}

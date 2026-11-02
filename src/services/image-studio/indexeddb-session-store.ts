import { parseStoredSession, parseStoredTurn } from '../../utils/image-studio/schemas';
import { isExpired } from '../../utils/image-studio/session-lifecycle';
import {
  StorageQuotaError,
  type CommitBatch,
  type SessionMeta,
  type SessionStorePort,
  type StoredSession,
  type Turn,
} from '../../utils/image-studio/ports';

/**
 * The IndexedDB implementation of `SessionStorePort` (US-10.1 DD-16, DD-15). Database `cwk-image-studio`, version 1,
 * three object stores:
 *
 *   sessions   key `id`                          the session meta record (small: the list and the cap run without images)
 *   turns      key `[sessionId, id]`, index      one turn exactly as it must be resent
 *   sentBytes  key `[sessionId, fileUri]`, index the bytes uploaded for a file_uri, kept for a FILE_MISSING re-upload
 *
 * Every port method is exactly ONE `IDBTransaction`: the multi-store operations (`commit`, `createWithEviction`,
 * `deleteSession`, `loadAndExpire`) are all-or-nothing, and a failure aborts the transaction. The adapter carries no
 * decision beyond mapping `QuotaExceededError` to the typed `StorageQuotaError`; which sessions to evict is the `pick`
 * callback's, which entries expire is `isExpired`'s. `indexedDB` is touched only when the database is first opened,
 * never at module load.
 */
const DB_NAME = 'cwk-image-studio';
const DB_VERSION = 1;

type StoreName = 'sessions' | 'turns' | 'sentBytes';

interface TurnRecord {
  sessionId: string;
  id: string;
  role: Turn['role'];
  parts: Turn['parts'];
}

interface SentBytesRecord {
  sessionId: string;
  fileUri: string;
  bytes: Uint8Array;
  mimeType: string;
}

/** Resolves with a request's result, rejects with its error. */
function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Resolves when the transaction commits, rejects when it aborts or fails. */
function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new DOMException('Transaction aborted', 'AbortError'));
    tx.onerror = () => reject(tx.error);
  });
}

function isQuotaError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: string }).name === 'QuotaExceededError';
}

export class IndexedDbSessionStore implements SessionStorePort {
  private database: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    this.database ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('sessions', { keyPath: 'id' });
        db.createObjectStore('turns', { keyPath: ['sessionId', 'id'] }).createIndex('sessionId', 'sessionId');
        db.createObjectStore('sentBytes', { keyPath: ['sessionId', 'fileUri'] }).createIndex('sessionId', 'sessionId');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.database;
  }

  /** Runs `work` inside ONE transaction over `stores`; any failure aborts it and a quota failure is typed. */
  private async transact<T>(stores: StoreName[], mode: IDBTransactionMode, work: (tx: IDBTransaction) => Promise<T>): Promise<T> {
    const db = await this.open();
    const tx = db.transaction(stores, mode);
    const done = transactionDone(tx);
    done.catch(() => undefined);
    try {
      const result = await work(tx);
      await done;
      return result;
    } catch (error) {
      try {
        tx.abort();
      } catch {
        // already finished
      }
      throw isQuotaError(error) ? new StorageQuotaError(error instanceof Error ? error.message : undefined) : error;
    }
  }

  private async deleteSessionRows(tx: IDBTransaction, sessionId: string): Promise<void> {
    await requestResult(tx.objectStore('sessions').delete(sessionId));
    for (const name of ['turns', 'sentBytes'] as const) {
      const store = tx.objectStore(name);
      const keys = await requestResult(store.index('sessionId').getAllKeys(sessionId));
      for (const key of keys) await requestResult(store.delete(key as IDBValidKey));
    }
  }

  private async validMetas(tx: IDBTransaction): Promise<SessionMeta[]> {
    const rows = await requestResult(tx.objectStore('sessions').getAll());
    return rows.map((row) => parseStoredSession(row)).filter((meta): meta is SessionMeta => meta !== null);
  }

  async loadAndExpire(now: number): Promise<SessionMeta[]> {
    return this.transact(['sessions', 'turns', 'sentBytes'], 'readwrite', async (tx) => {
      const metas = await this.validMetas(tx);
      const alive: SessionMeta[] = [];
      for (const meta of metas) {
        if (isExpired(meta.lastActivity, now)) await this.deleteSessionRows(tx, meta.id);
        else alive.push(meta);
      }
      return alive;
    });
  }

  async loadSession(id: string): Promise<StoredSession | null> {
    return this.transact(['sessions', 'turns'], 'readonly', async (tx) => {
      const meta = parseStoredSession(await requestResult(tx.objectStore('sessions').get(id)));
      if (!meta) return null;
      const rows = (await requestResult(tx.objectStore('turns').index('sessionId').getAll(id))) as TurnRecord[];
      const byId = new Map<string, Turn>();
      for (const row of rows) {
        const turn = parseStoredTurn({ id: row.id, role: row.role, parts: row.parts });
        if (turn) byId.set(turn.id, turn);
      }
      const turns = meta.turnOrder.map((turnId) => byId.get(turnId)).filter((turn): turn is Turn => turn !== undefined);
      return { meta, turns };
    });
  }

  async createWithEviction(
    newSession: StoredSession,
    pick: (metas: SessionMeta[]) => string[],
  ): Promise<{ created: boolean; evictedIds: string[] }> {
    return this.transact(['sessions', 'turns', 'sentBytes'], 'readwrite', async (tx) => {
      const evictedIds = pick(await this.validMetas(tx));
      for (const id of evictedIds) await this.deleteSessionRows(tx, id);
      await requestResult(tx.objectStore('sessions').put(newSession.meta));
      for (const turn of newSession.turns) {
        await requestResult(tx.objectStore('turns').put(this.turnRecord(newSession.meta.id, turn)));
      }
      return { created: true, evictedIds };
    });
  }

  async commit(sessionId: string, batch: CommitBatch): Promise<void> {
    await this.transact(['sessions', 'turns', 'sentBytes'], 'readwrite', async (tx) => {
      const turns = tx.objectStore('turns');
      const sentBytes = tx.objectStore('sentBytes');
      for (const turnId of batch.deleteTurnIds) {
        const row = (await requestResult(turns.get([sessionId, turnId]))) as TurnRecord | undefined;
        for (const part of row?.parts ?? []) {
          if (part.fileData) await requestResult(sentBytes.delete([sessionId, part.fileData.fileUri]));
        }
        await requestResult(turns.delete([sessionId, turnId]));
      }
      for (const turn of batch.putTurns) await requestResult(turns.put(this.turnRecord(sessionId, turn)));
      await requestResult(tx.objectStore('sessions').put(batch.meta));
    });
  }

  async putSentBytes(sessionId: string, fileUri: string, bytes: Uint8Array, mimeType: string): Promise<void> {
    const record: SentBytesRecord = { sessionId, fileUri, bytes, mimeType };
    await this.transact(['sentBytes'], 'readwrite', (tx) => requestResult(tx.objectStore('sentBytes').put(record)).then(() => undefined));
  }

  async getSentBytes(sessionId: string, fileUri: string): Promise<{ bytes: Uint8Array; mimeType: string } | null> {
    return this.transact(['sentBytes'], 'readonly', async (tx) => {
      const row = (await requestResult(tx.objectStore('sentBytes').get([sessionId, fileUri]))) as SentBytesRecord | undefined;
      return row ? { bytes: row.bytes, mimeType: row.mimeType } : null;
    });
  }

  async remapFileUris(sessionId: string, map: Record<string, string>): Promise<void> {
    await this.transact(['turns', 'sentBytes'], 'readwrite', async (tx) => {
      const turns = tx.objectStore('turns');
      const rows = (await requestResult(turns.index('sessionId').getAll(sessionId))) as TurnRecord[];
      for (const row of rows) {
        let changed = false;
        const parts = row.parts.map((part) => {
          if (part.fileData && map[part.fileData.fileUri]) {
            changed = true;
            return { ...part, fileData: { ...part.fileData, fileUri: map[part.fileData.fileUri] } };
          }
          return part;
        });
        if (changed) await requestResult(turns.put({ ...row, parts }));
      }
      const sentBytes = tx.objectStore('sentBytes');
      for (const [oldUri, newUri] of Object.entries(map)) {
        const row = (await requestResult(sentBytes.get([sessionId, oldUri]))) as SentBytesRecord | undefined;
        if (!row) continue;
        await requestResult(sentBytes.delete([sessionId, oldUri]));
        await requestResult(sentBytes.put({ ...row, fileUri: newUri }));
      }
    });
  }

  async deleteSession(id: string): Promise<void> {
    await this.transact(['sessions', 'turns', 'sentBytes'], 'readwrite', (tx) => this.deleteSessionRows(tx, id));
  }

  private turnRecord(sessionId: string, turn: Turn): TurnRecord {
    return { sessionId, id: turn.id, role: turn.role, parts: turn.parts };
  }
}

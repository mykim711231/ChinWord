/**
 * 필순 데이터 오프라인 캐싱
 * CDN에서 다운로드한 필순 데이터를 IndexedDB에 저장하여
 * 오프라인 상태에서도 재사용 가능하도록 함.
 */

const DB_NAME = "ChinWord-StrokeData";
const STORE_NAME = "strokes";
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      dbInstance = req.result;
      resolve(dbInstance);
    };
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "char" });
      }
    };
  });
}

export async function getStrokeDataFromCache(
  char: string,
): Promise<unknown | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(char);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result?.data ?? null);
    });
  } catch {
    return null;
  }
}

export async function saveStrokeDataToCache(
  char: string,
  data: unknown,
): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ char, data, timestamp: Date.now() });
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  } catch {
    // Fail silently
  }
}

export function isOnline(): boolean {
  return navigator.onLine;
}

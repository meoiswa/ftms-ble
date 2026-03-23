/**
 * Service Worker for handling token refresh in the background
 * and managing secure token storage.
 */

interface TokenData {
  accessToken: string;
  expiresAt: number;
  refreshedAt: number;
}

const DB_NAME = "ftms-auth";
const DB_VERSION = 1;
const STORE_NAME = "tokens";

let db: IDBDatabase | null = null;

// Initialize IndexedDB
function initDB(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const upgradeDB = (event.target as IDBOpenDBRequest).result;
      if (!upgradeDB.objectStoreNames.contains(STORE_NAME)) {
        upgradeDB.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
  });
}

// Get token from IndexedDB
async function getToken(key: string): Promise<TokenData | null> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result;
      if (result) {
        resolve({ ...result });
      } else {
        resolve(null);
      }
    };
  });
}

// Save token to IndexedDB
async function setToken(key: string, data: TokenData): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put({ key, ...data });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Clear token from IndexedDB
async function clearToken(key: string): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Listen for messages from the app
self.addEventListener("message", async (event) => {
  const { type, payload } = event.data;

  if (type === "GET_TOKEN") {
    const token = await getToken("google_token");
    event.ports[0].postMessage({
      success: true,
      token: token?.accessToken ?? null,
      expiresAt: token?.expiresAt,
    });
  } else if (type === "SET_TOKEN") {
    const { accessToken, expiresIn } = payload;
    await setToken("google_token", {
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
      refreshedAt: Date.now(),
    });
    event.ports[0].postMessage({ success: true });
  } else if (type === "CLEAR_TOKEN") {
    await clearToken("google_token");
    event.ports[0].postMessage({ success: true });
  }
});

export {};

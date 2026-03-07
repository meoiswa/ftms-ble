import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { Session } from '../types/session'

const DB_NAME = 'ftms-dashboard'
const DB_VERSION = 1

interface FtmsDB extends DBSchema {
  sessions: {
    key: string
    value: Session
    indexes: { byStartedAt: number }
  }
}

let dbPromise: Promise<IDBPDatabase<FtmsDB>> | null = null

export function getDb(): Promise<IDBPDatabase<FtmsDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FtmsDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('sessions', { keyPath: 'id' })
        store.createIndex('byStartedAt', 'startedAt')
      },
    })
  }
  return dbPromise
}

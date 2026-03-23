import { getDb } from './db'
import type { Session } from '../types/session'

export async function saveSession(session: Session): Promise<void> {
  const db = await getDb()
  const next: Session = {
    ...session,
    updatedAt: session.updatedAt ?? Date.now(),
  }
  await db.put('sessions', next)
}

export async function saveSessionTouched(session: Session): Promise<void> {
  const db = await getDb()
  const next: Session = {
    ...session,
    updatedAt: Date.now(),
  }
  await db.put('sessions', next)
}

export async function getSession(id: string): Promise<Session | undefined> {
  const db = await getDb()
  return db.get('sessions', id)
}

export async function getAllSessions(): Promise<Session[]> {
  const db = await getDb()
  const sessions = await db.getAllFromIndex('sessions', 'byStartedAt')
  return sessions.reverse()
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDb()
  const session = await db.get('sessions', id)
  if (session) {
    session.dataPoints = [] // Clear data points to save space, but keep metadata for sync purposes
    session.deletedAt = Date.now()
    session.updatedAt = Date.now()
    await db.put('sessions', session)
  }
}

export async function removeSession(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('sessions', id)
}

import { useState, useEffect, useCallback } from 'react'
import type { Session } from '../types/session'
import { getAllSessions, deleteSession as dbDeleteSession } from './sessions'

export interface StorageState {
  sessions: Session[]
  loading: boolean
  refresh: () => Promise<void>
  deleteSession: (id: string) => Promise<void>
}

export function useStorage(): StorageState {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const all = await getAllSessions()
      setSessions(all)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const deleteSession = useCallback(async (id: string) => {
    await dbDeleteSession(id)
    await refresh()
  }, [refresh])

  return { sessions, loading, refresh, deleteSession }
}

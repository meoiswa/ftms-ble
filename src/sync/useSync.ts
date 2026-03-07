import { useState, useCallback, useRef, useEffect } from 'react'
import type { SyncState, SyncStatus, Session } from '../types/session'
import { signIn, signOut, silentSignIn, isSignedIn, isGoogleAuthConfigured, wasPreviouslySignedIn } from './auth'
import { uploadSession, downloadAllSessions, deleteRemoteSession as driveDelete } from './googledrive'
import { saveSession, getAllSessions } from '../storage/sessions'

export interface SyncHook {
  syncState: SyncState
  isConfigured: boolean
  isSignedIn: boolean
  signIn: () => Promise<void>
  signOut: () => void
  syncNow: () => Promise<void>
  syncSessionAfterSave: (session: Session) => Promise<void>
  deleteRemoteSession: (sessionId: string) => Promise<void>
}

export function useSync(onSyncComplete?: () => void): SyncHook {
  const [syncState, setSyncState] = useState<SyncState>({ status: 'idle' })
  const [signedIn, setSignedIn] = useState(isSignedIn())
  const syncingRef = useRef(false)

  const setStatus = useCallback((status: SyncStatus, error?: string) => {
    setSyncState({ status, error, lastSyncedAt: status === 'success' ? Date.now() : undefined })
  }, [])

  const syncNow = useCallback(async () => {
    if (syncingRef.current || !isSignedIn()) return
    syncingRef.current = true
    setStatus('syncing')

    try {
      const [local, remote] = await Promise.all([getAllSessions(), downloadAllSessions()])

      const localMap = new Map(local.map(s => [s.id, s]))
      const remoteMap = new Map(remote.map(s => [s.id, s]))
      const now = Date.now()

      // Pull remote sessions not in local (or newer by endedAt)
      for (const remoteSession of remote) {
        const localSession = localMap.get(remoteSession.id)
        if (!localSession || remoteSession.endedAt > localSession.endedAt) {
          await saveSession({ ...remoteSession, syncedAt: now })
        } else if (!localSession.syncedAt) {
          // Session exists locally but was never marked as synced
          await saveSession({ ...localSession, syncedAt: now })
        }
      }

      // Push local sessions not in remote (or newer)
      for (const localSession of local) {
        const remoteSession = remoteMap.get(localSession.id)
        if (!remoteSession || localSession.endedAt > remoteSession.endedAt) {
          const synced = { ...localSession, syncedAt: now }
          await uploadSession(synced)
          await saveSession(synced)  // persist syncedAt locally
        } else if (!localSession.syncedAt) {
          // Already on Drive but local copy lacks syncedAt
          await saveSession({ ...localSession, syncedAt: now })
        }
      }

      setStatus('success')
      onSyncComplete?.()
    } catch (err) {
      setStatus('error', err instanceof Error ? err.message : 'Sync failed')
    } finally {
      syncingRef.current = false
    }
  }, [onSyncComplete, setStatus])

  // On mount, silently restore the token and auto-sync if previously signed in
  useEffect(() => {
    if (!isGoogleAuthConfigured() || !wasPreviouslySignedIn() || isSignedIn()) return
    silentSignIn()
      .then(() => { setSignedIn(true); return syncNow() })
      .catch(() => { signOut(); setSignedIn(false) })
  }, [syncNow])

  const doSignIn = useCallback(async () => {
    try {
      await signIn()
      setSignedIn(true)
      await syncNow()
    } catch (err) {
      setStatus('error', err instanceof Error ? err.message : 'Sign in failed')
    }
  }, [syncNow, setStatus])

  const doSignOut = useCallback(() => {
    signOut()
    setSignedIn(false)
  }, [])

  const syncSessionAfterSave = useCallback(async (session: Session) => {
    if (!isSignedIn()) return
    try {
      const synced = { ...session, syncedAt: Date.now() }
      await uploadSession(synced)
      await saveSession(synced)  // persist syncedAt so the ✓ tag appears immediately
    } catch { /* non-critical; full sync will catch it */ }
  }, [])

  const doDeleteRemote = useCallback(async (sessionId: string) => {
    if (!isSignedIn()) return
    try { await driveDelete(sessionId) } catch { /* best-effort */ }
  }, [])

  return {
    syncState,
    isConfigured: isGoogleAuthConfigured(),
    isSignedIn: signedIn,
    signIn: doSignIn,
    signOut: doSignOut,
    syncNow,
    syncSessionAfterSave,
    deleteRemoteSession: doDeleteRemote,
  }
}

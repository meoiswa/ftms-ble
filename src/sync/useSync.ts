import { useState, useCallback, useRef, useEffect } from "react";
import type { SyncState, SyncStatus, Session } from "../types/session";
import {
  signIn,
  signOut,
  silentSignIn,
  isSignedIn,
  isGoogleAuthConfigured,
  wasPreviouslySignedIn,
} from "./auth";
import {
  uploadSession,
  downloadSessionFile,
  deleteSessionFile,
  loadSyncIndex,
  saveSyncIndex,
  clearDriveCache,
} from "./googledrive";
import {
  saveSession,
  getAllSessions,
  removeSession,
} from "../storage/sessions";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface SyncHook {
  syncState: SyncState;
  isConfigured: boolean;
  isSignedIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
  syncNow: () => Promise<void>;
  syncSessionAfterSave: (session: Session) => Promise<void>;
  deleteRemoteSession: (sessionId: string) => Promise<void>;
}

export function useSync(onSyncComplete?: () => void): SyncHook {
  const [syncState, setSyncState] = useState<SyncState>({ status: "idle" });
  const [signedIn, setSignedIn] = useState(isSignedIn());
  const syncingRef = useRef(false);
  const syncStateRef = useRef(syncState);
  syncStateRef.current = syncState;

  const setStatus = useCallback((status: SyncStatus, error?: string) => {
    setSyncState((prev) => ({
      status,
      error,
      lastSyncedAt: status === "success" ? Date.now() : prev.lastSyncedAt,
    }));
  }, []);

  const syncNow = useCallback(async () => {
    if (syncingRef.current || !isSignedIn()) return;
    syncingRef.current = true;
    setStatus("syncing");

    try {
      const now = Date.now();
      const cutoff = now - THIRTY_DAYS_MS;
      let indexUpdated = false;

      // Load local sessions and the single Drive index in parallel
      const [local, { fileId: indexFileId, index }] = await Promise.all([
        getAllSessions(),
        loadSyncIndex(),
      ]);

      // Remove local sessions that have been deleted on another device but are still present locally (tombstoned in index)
      for (const s of index.sessions.filter((s) => s.deletedAt)) {
        await removeSession(s.id);
      }

      // Pull: sessions in Drive index but missing locally → download
      const localMap = new Map(local.map((s) => [s.id, s]));
      const missingLocally = index.sessions
        .filter((s) => !s.deletedAt)
        .filter((s) => !localMap.has(s.id));

      for (const entry of missingLocally) {
        let remote: Session;
        try {
          remote = await downloadSessionFile(entry.fileId);
        } catch (err) {
          if (err instanceof Error) {
            if (err.message.includes("File not found")) {
              // If the file is missing, add a tombstone to the index to prevent repeated failed attempts
              entry.deletedAt = Date.now();
              indexUpdated = true;
            }
          }
          continue;
        }
        try {
          await saveSession({ ...remote, syncedAt: now });
        } catch (ex) {
          if (ex instanceof Error) {
            /* skip corrupt/missing file — leave in index */
          }
        }
      }

      // Push: local sessions absent from index, not deleted, and at most 30 days old
      const missingRemotely = local.filter((s) => !s.deletedAt && !index.sessions.some((e) => e.id === s.id) && s.startedAt >= cutoff);
      for (const entry of missingRemotely) {
        const synced = { ...entry, syncedAt: now };
        const uploaded = await uploadSession(synced);
        await saveSession(synced);
        index.sessions.push(uploaded);
        indexUpdated = true;
      }

      if (indexUpdated) {
        await saveSyncIndex(indexFileId, index);
      }

      setStatus("success");
      onSyncComplete?.();
    } catch (err) {
      console.log("Sync error:", err);
      setStatus("error", err instanceof Error ? err.message : "Sync failed");
    } finally {
      syncingRef.current = false;
    }
  }, [onSyncComplete, setStatus]);

  // On mount, silently restore the token and auto-sync if previously signed in
  useEffect(() => {
    if (!isGoogleAuthConfigured() || !wasPreviouslySignedIn() || isSignedIn())
      return;
    silentSignIn()
      .then(() => {
        setSignedIn(true);
        return syncNow();
      })
      .catch(() => {
        signOut();
        setSignedIn(false);
      });
  }, [syncNow]);

  const doSignIn = useCallback(async () => {
    try {
      await signIn();
      setSignedIn(true);
      await syncNow();
    } catch (err) {
      setStatus("error", err instanceof Error ? err.message : "Sign in failed");
    }
  }, [syncNow, setStatus]);

  const doSignOut = useCallback(() => {
    signOut();
    clearDriveCache();
    setSignedIn(false);
  }, []);

  const syncSessionAfterSave = useCallback(async (session: Session) => {
    if (!isSignedIn()) return;
    try {
      const { fileId: indexFileId, index } = await loadSyncIndex();
      const existing = index.sessions.find((e) => e.id === session.id);
      const synced = { ...session, syncedAt: Date.now() };
      const entry = await uploadSession(synced, existing?.fileId ?? null);
      await saveSession(synced);
      const updatedSessions = index.sessions.filter((e) => e.id !== session.id);
      updatedSessions.push(entry);
      await saveSyncIndex(indexFileId, { ...index, sessions: updatedSessions });
    } catch {
      /* non-critical; full sync will catch it */
    }
  }, []);

  const doDeleteRemote = useCallback(async (sessionId: string) => {
    if (!isSignedIn()) return;

    const prevState = syncStateRef.current;
    setSyncState((s) => ({ ...s, status: "syncing" }));
    try {
      const { fileId: indexFileId, index } = await loadSyncIndex();
      const entry = index.sessions.find((e) => e.id === sessionId);
      if (entry) {
        entry.deletedAt = Date.now(); // update tombstone in index
        try {
          await deleteSessionFile(entry.fileId);
        } catch {
          /* may already be gone */
        }
      }

      index.sessions = index.sessions.filter(
        (e) => e.deletedAt == null || e.deletedAt > Date.now() - THIRTY_DAYS_MS,
      ); // prune old sessions from index
      await saveSyncIndex(indexFileId, index);
    } catch {
      /* best-effort; tombstone stays in pending for next sync */
    }
    setSyncState(prevState);
  }, []);

  return {
    syncState,
    isConfigured: isGoogleAuthConfigured(),
    isSignedIn: signedIn,
    signIn: doSignIn,
    signOut: doSignOut,
    syncNow,
    syncSessionAfterSave,
    deleteRemoteSession: doDeleteRemote,
  };
}

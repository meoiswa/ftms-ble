import { useState, useCallback, useRef } from "react";
import type { SyncState, SyncStatus, Session } from "../types/session";
import {
  signIn,
  signOut,
  isSignedIn,
  isGoogleAuthConfigured,
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
const UNIX_EPOCH = 0;

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

      // Normalize missing remote timestamps to unix epoch.
      for (const remoteEntry of index.sessions) {
        if (remoteEntry.updatedAt == null) {
          remoteEntry.updatedAt = UNIX_EPOCH;
          indexUpdated = true;
        }
      }

      // Normalize missing local timestamps to unix epoch and persist.
      const localNormalized: Session[] = [];
      for (const s of local) {
        if (s.updatedAt == null) {
          const normalized = { ...s, updatedAt: UNIX_EPOCH };
          await saveSession(normalized);
          localNormalized.push(normalized);
        } else {
          localNormalized.push(s);
        }
      }

      // Remove local sessions that have been deleted on another device but are still present locally (tombstoned in index)
      for (const s of index.sessions.filter((s) => s.deletedAt)) {
        await removeSession(s.id);
      }

      // Two-way reconcile based on updatedAt for all indexed (non-deleted) sessions.
      const localMap = new Map(localNormalized.map((s) => [s.id, s]));
      for (const entry of index.sessions.filter((s) => !s.deletedAt)) {
        const localSession = localMap.get(entry.id);
        const remoteUpdatedAt = entry.updatedAt ?? UNIX_EPOCH;

        // Missing local copy -> pull from remote.
        if (!localSession) {
          try {
            const remote = await downloadSessionFile(entry.fileId);
            const remoteSession: Session = {
              ...remote,
              updatedAt: remote.updatedAt ?? remoteUpdatedAt,
              syncedAt: now,
            };
            await saveSession(remoteSession);
          } catch (err) {
            if (err instanceof Error && err.message.includes("File not found")) {
              entry.deletedAt = Date.now();
              indexUpdated = true;
            }
          }
          continue;
        }

        const localUpdatedAt = localSession.updatedAt ?? UNIX_EPOCH;

        if (localUpdatedAt > remoteUpdatedAt) {
          // Local is newer -> overwrite remote file and index timestamp.
          const localForUpload: Session = { ...localSession, syncedAt: now };
          const uploaded = await uploadSession(localForUpload, entry.fileId);
          entry.fileId = uploaded.fileId;
          entry.fileName = uploaded.fileName;
          entry.startedAt = uploaded.startedAt;
          entry.updatedAt = uploaded.updatedAt ?? localUpdatedAt;
          await saveSession(localForUpload);
          indexUpdated = true;
        } else if (localUpdatedAt < remoteUpdatedAt) {
          // Remote is newer -> overwrite local.
          try {
            const remote = await downloadSessionFile(entry.fileId);
            const remoteSession: Session = {
              ...remote,
              updatedAt: remote.updatedAt ?? remoteUpdatedAt,
              syncedAt: now,
            };
            await saveSession(remoteSession);
          } catch {
            // Leave for future sync attempts.
          }
        }
      }

      // Push local sessions absent from index, not deleted, and at most 30 days old.
      const missingRemotely = localNormalized.filter(
        (s) => !s.deletedAt && !index.sessions.some((e) => e.id === s.id) && s.startedAt >= cutoff,
      );
      for (const session of missingRemotely) {
        const localUpdatedAt = session.updatedAt ?? UNIX_EPOCH;
        const localForUpload: Session = { ...session, updatedAt: localUpdatedAt, syncedAt: now };
        const uploaded = await uploadSession(localForUpload);
        await saveSession(localForUpload);
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
      const synced: Session = {
        ...session,
        updatedAt: session.updatedAt ?? Date.now(),
        syncedAt: Date.now(),
      };
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

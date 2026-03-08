import { getAccessToken } from './auth'
import type { Session } from '../types/session'
import { getMachineLabel } from '../bluetooth/ftms'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
const FOLDER_NAME = 'FTMS Dashboard'
const MIME_JSON = 'application/json'
const MIME_GZIP = 'application/gzip'
const INDEX_FILE = 'index.json.gz'

export interface SessionIndexEntry {
  id: string
  deletedAt: number | null
  startedAt: number
  fileName: string
  fileId: string  // Drive file ID for direct download — no search needed
}

/** Single file that tracks both what's on Drive and what's been deleted. */
export interface SyncIndex {
  version: number,
  sessions: SessionIndexEntry[]
}

// ── Shared helpers ────────────────────────────────────────────────────────────

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken()
  if (!token) throw new Error('Not signed in to Google')
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers ?? {}), Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    let message = `Google API error ${res.status}`
    try { const err = await res.clone().json(); message = err?.error?.message ?? message } catch { /* ignore */ }
    throw new Error(message)
  }
  return res
}

// Shared Promise so concurrent callers don't race to create the folder
let folderIdPromise: Promise<string> | null = null

function getOrCreateFolder(): Promise<string> {
  if (!folderIdPromise) {
    folderIdPromise = (async () => {
      const query = `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
      const res = await apiFetch(`${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id)`)
      const json = await res.json()
      if (json.files?.length > 0) return json.files[0].id as string
      const createRes = await apiFetch(`${DRIVE_API}/files`, {
        method: 'POST',
        headers: { 'Content-Type': MIME_JSON },
        body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
      })
      const folder = await createRes.json()
      return folder.id as string
    })()
  }
  return folderIdPromise
}

/** Invalidate the folder cache (e.g. on sign-out). */
export function clearDriveCache(): void { folderIdPromise = null }

function mkMultipartBinary(meta: string, body: Blob, bodyContentType: string): Blob {
  return new Blob([
    `--ftms_boundary\r\nContent-Type: ${MIME_JSON}\r\n\r\n${meta}\r\n`,
    `--ftms_boundary\r\nContent-Type: ${bodyContentType}\r\n\r\n`,
    body,
    `\r\n--ftms_boundary--`,
  ])
}

async function gzipJson(content: unknown): Promise<Blob> {
  const input = new Blob([JSON.stringify(content)], { type: MIME_JSON })
  const compressedStream = input.stream().pipeThrough(new CompressionStream('gzip'))
  return await new Response(compressedStream).blob()
}

async function gunzipJson<T>(content: Blob): Promise<T> {
  const decompressedStream = content.stream().pipeThrough(new DecompressionStream('gzip'))
  const json = await new Response(decompressedStream).json()
  return json as T
}

async function upsertGzipJsonFile(
  folderId: string,
  fileId: string | null,
  fileName: string,
  content: unknown,
): Promise<string> {
  const compressed = await gzipJson(content)
  if (fileId) {
    await apiFetch(`${UPLOAD_API}/files/${fileId}?uploadType=multipart`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'multipart/related; boundary=ftms_boundary' },
      body: mkMultipartBinary('{}', compressed, MIME_GZIP),
    })
    return fileId
  }
  const res = await apiFetch(`${UPLOAD_API}/files?uploadType=multipart`, {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/related; boundary=ftms_boundary' },
    body: mkMultipartBinary(JSON.stringify({ name: fileName, parents: [folderId] }), compressed, MIME_GZIP),
  })
  const json = await res.json()
  return json.id as string
}

async function findFile(folderId: string, name: string): Promise<string | null> {
  const query = `name='${name}' and '${folderId}' in parents and trashed=false`
  const res = await apiFetch(`${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id)`)
  const json = await res.json()
  return json.files?.[0]?.id ?? null
}

function driveFileName(session: Session): string {
  const d = new Date(session.startedAt)
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const time = `${pad(d.getHours())}${pad(d.getMinutes())}`
  return `${date}_${time}_${getMachineLabel(session.machineType).replace(/\s+/g, '')}_${session.id}.json.gz`
}

// ── Sync index ────────────────────────────────────────────────────────────────

/**
 * Load the combined sync index from Drive.
 * Returns an empty index (not null) when no index file exists yet — the caller
 * should pass the returned fileId (null) to saveSyncIndex to create it.
 */
export async function loadSyncIndex(): Promise<{ fileId: string | null; index: SyncIndex }> {
  const folderId = await getOrCreateFolder()
  const fileId = await findFile(folderId, INDEX_FILE)
  if (!fileId) return { fileId: null, index: { version: 0, sessions: [] } }
  try {
    const res = await apiFetch(`${DRIVE_API}/files/${fileId}?alt=media`)
    const compressed = await res.blob()
    const index = await gunzipJson<SyncIndex>(compressed)
    if (index.version === 0) {
      return { fileId, index };
    }
  } catch (err) {
    console.warn('Failed to load sync index, starting fresh', err);
  }
  return { fileId, index: { version: 0, sessions: [] } }
}

export async function saveSyncIndex(fileId: string | null, index: SyncIndex): Promise<void> {
  const folderId = await getOrCreateFolder()
  await upsertGzipJsonFile(folderId, fileId, INDEX_FILE, index)
}

// ── Session files ─────────────────────────────────────────────────────────────

/** Upload (create or update) a session file. Returns the resulting index entry. */
export async function uploadSession(session: Session, existingFileId: string | null = null): Promise<SessionIndexEntry> {
  const folderId = await getOrCreateFolder()
  const fileName = driveFileName(session)
  const fileId = await upsertGzipJsonFile(folderId, existingFileId, fileName, session)
  return { id: session.id, deletedAt: null, startedAt: session.startedAt, fileName, fileId }
}

/** Download a session file directly by Drive file ID — no search request needed. */
export async function downloadSessionFile(fileId: string): Promise<Session> {
  const res = await apiFetch(`${DRIVE_API}/files/${fileId}?alt=media`)
  const compressed = await res.blob()
  return await gunzipJson<Session>(compressed)
}

/** Delete a session file by its Drive file ID. */
export async function deleteSessionFile(fileId: string): Promise<void> {
  await apiFetch(`${DRIVE_API}/files/${fileId}`, { method: 'DELETE' })
}



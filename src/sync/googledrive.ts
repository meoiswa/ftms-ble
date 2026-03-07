import { getAccessToken } from './auth'
import type { Session } from '../types/session'
import { getMachineLabel } from '../bluetooth/ftms'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
const FOLDER_NAME = 'FTMS Dashboard'
const MIME_JSON = 'application/json'

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken()
  if (!token) throw new Error('Not signed in to Google')
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) {
    let message = `Google API error ${res.status}`
    try {
      const err = await res.clone().json()
      message = err?.error?.message ?? message
    } catch { /* ignore parse failure */ }
    throw new Error(message)
  }
  return res
}

async function getOrCreateFolder(): Promise<string> {
  const query = `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const res = await apiFetch(`${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id)`)
  const json = await res.json()
  if (json.files?.length > 0) return json.files[0].id

  const createRes = await apiFetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: { 'Content-Type': MIME_JSON },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  })
  const folder = await createRes.json()
  return folder.id
}

function driveFileName(session: Session): string {
  const d = new Date(session.startedAt)
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const time = `${pad(d.getHours())}${pad(d.getMinutes())}`
  const label = getMachineLabel(session.machineType).replace(/\s+/g, '')
  return `${date}_${time}_${label}_${session.id}.json`
}

async function findRemoteFile(folderId: string, sessionId: string): Promise<string | null> {
  // Use `contains` to match both old format ({id}.json) and new descriptive names
  const query = `name contains '${sessionId}' and '${folderId}' in parents and trashed=false`
  const res = await apiFetch(`${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id)`)
  const json = await res.json()
  return json.files?.[0]?.id ?? null
}

export async function uploadSession(session: Session): Promise<void> {
  const folderId = await getOrCreateFolder()
  const existingFileId = await findRemoteFile(folderId, session.id)
  const body = JSON.stringify(session)
  const fileName = driveFileName(session)
  const meta = { name: fileName, parents: existingFileId ? undefined : [folderId] }

  if (existingFileId) {
    await apiFetch(`${UPLOAD_API}/files/${existingFileId}?uploadType=multipart`, {
      method: 'PATCH',
      headers: { 'Content-Type': `multipart/related; boundary=ftms_boundary` },
      body: `--ftms_boundary\r\nContent-Type: ${MIME_JSON}\r\n\r\n${JSON.stringify({})}\r\n--ftms_boundary\r\nContent-Type: ${MIME_JSON}\r\n\r\n${body}\r\n--ftms_boundary--`,
    })
  } else {
    await apiFetch(`${UPLOAD_API}/files?uploadType=multipart`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=ftms_boundary` },
      body: `--ftms_boundary\r\nContent-Type: ${MIME_JSON}\r\n\r\n${JSON.stringify(meta)}\r\n--ftms_boundary\r\nContent-Type: ${MIME_JSON}\r\n\r\n${body}\r\n--ftms_boundary--`,
    })
  }
}

export async function deleteRemoteSession(sessionId: string): Promise<void> {
  const folderId = await getOrCreateFolder()
  const fileId = await findRemoteFile(folderId, sessionId)
  if (!fileId) return // not on Drive, nothing to do
  await apiFetch(`${DRIVE_API}/files/${fileId}`, { method: 'DELETE' })
}

export async function downloadAllSessions(): Promise<Session[]> {
  const folderId = await getOrCreateFolder()
  const query = `'${folderId}' in parents and trashed=false and mimeType='${MIME_JSON}'`
  const res = await apiFetch(`${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime)&pageSize=1000`)
  const json = await res.json()
  const files: { id: string; name: string; modifiedTime: string }[] = json.files ?? []

  const sessions: Session[] = []
  for (const file of files) {
    try {
      const contentRes = await apiFetch(`${DRIVE_API}/files/${file.id}?alt=media`)
      const session = await contentRes.json() as Session
      sessions.push(session)
    } catch {
      // skip corrupt files
    }
  }
  return sessions
}

import { useState, useRef, useCallback } from 'react'
import { MachineType } from '../types/ftms'
import type { MachineData } from '../types/ftms'
import type { Session, ActiveSession, DataPoint } from '../types/session'
import { saveSession } from '../storage/sessions'
import { broadcastDataPoint, broadcastSessionEnd } from '../plugins/registry'
import { computeStats } from '../session/stats'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Fields indicating active exercise — used to trim resting periods and detect activity
export const INSTANTANEOUS_FIELDS = new Set([
  'instantaneousSpeed',
  'instantaneousPower',
  'instantaneousCadence',
  'strokeRate',
  'stepRate',
  'powerOutput',
])

function isActivePoint(dp: DataPoint): boolean {
  const d = dp.data as Record<string, number | undefined>
  for (const key of INSTANTANEOUS_FIELDS) {
    if ((d[key] ?? 0) > 0) return true
  }
  return false
}

/** Trims leading and trailing "at rest" data points, keeping one resting point
 *  on each side so the chart shows the session starting/ending from zero. */
function trimResting(points: DataPoint[]): DataPoint[] {
  let start = 0
  while (start < points.length && !isActivePoint(points[start])) start++
  let end = points.length - 1
  while (end > start && !isActivePoint(points[end])) end--
  // Preserve one resting point at each boundary (clamped to array bounds)
  const trimStart = Math.max(0, start - 1)
  const trimEnd = Math.min(points.length - 1, end + 1)
  return points.slice(trimStart, trimEnd + 1)
}


export interface SessionState {
  active: ActiveSession | null
  isRecording: boolean
  startSession: (machineType: MachineType, deviceName?: string | null) => void
  stopSession: () => Promise<Session | null>
  addDataPoint: (machineType: MachineType, data: MachineData) => void
}

export function useSession(onSessionSaved?: (session: Session) => void): SessionState {
  const [active, setActive] = useState<ActiveSession | null>(null)
  const activeRef = useRef<ActiveSession | null>(null)

  const startSession = useCallback((machineType: MachineType, deviceName?: string | null) => {
    const session: ActiveSession = {
      id: generateId(),
      deviceId: deviceName,
      deviceName,
      machineType,
      startedAt: Date.now(),
      dataPoints: [],
    }
    activeRef.current = session
    setActive(session)
  }, [])

  const stopSession = useCallback(async (): Promise<Session | null> => {
    const current = activeRef.current
    if (!current) return null

    // Trim resting periods from both ends before computing final stats
    const trimmed = trimResting(current.dataPoints)
    const endedAt = trimmed.length > 0
      ? trimmed[trimmed.length - 1].timestamp
      : Date.now()
    const startedAt = trimmed.length > 0
      ? trimmed[0].timestamp
      : current.startedAt
    const duration = Math.round((endedAt - startedAt) / 1000)
    const stats = computeStats(trimmed)

    const session: Session = {
      id: current.id,
      deletedAt: null,
      deviceId: current.deviceId ?? null,
      deviceName: current.deviceName ?? current.deviceId ?? null,
      machineType: current.machineType,
      startedAt,
      endedAt,
      duration,
      stats,
      dataPoints: trimmed,
    }

    activeRef.current = null
    setActive(null)

    await saveSession(session)
    await broadcastSessionEnd(session)
    onSessionSaved?.(session)
    return session
  }, [onSessionSaved])

  const addDataPoint = useCallback((machineType: MachineType, data: MachineData) => {
    if (!activeRef.current) return

    const point: DataPoint = { timestamp: Date.now(), data }
    activeRef.current = {
      ...activeRef.current,
      machineType,
      dataPoints: [...activeRef.current.dataPoints, point],
    }
    setActive(activeRef.current)
    broadcastDataPoint(point, activeRef.current)
  }, [])

  return {
    active,
    isRecording: active !== null,
    startSession,
    stopSession,
    addDataPoint,
  }
}

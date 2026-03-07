import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import { MachineType } from '../types/ftms'
import type { MachineData } from '../types/ftms'
import type { Session, ActiveSession, DataPoint } from '../types/session'
import { useBluetooth } from '../bluetooth/useBluetooth'
import type { ConnectionStatus } from '../bluetooth/useBluetooth'
import { useSession, INSTANTANEOUS_FIELDS } from '../hooks/useSession'
import { filterSentinelValues } from '../bluetooth/filterSentinels'
import { useSync } from '../sync/useSync'
import type { SyncHook } from '../sync/useSync'

// ─── Banned fields persistence ───────────────────────────────────────────────

const BANNED_FIELDS_KEY = 'ftms_banned_fields'

function loadBannedFields(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(BANNED_FIELDS_KEY) ?? '{}') }
  catch { return {} }
}

function saveBannedFields(banned: Record<string, string[]>): void {
  localStorage.setItem(BANNED_FIELDS_KEY, JSON.stringify(banned))
}

// ─── Context value type ───────────────────────────────────────────────────────

export interface AppContextValue {
  bluetooth: {
    status: ConnectionStatus
    machineType: MachineType
    /** Sentinel-filtered, ban-filtered, confirmed-fields-only data for display */
    liveData: MachineData | null
    /** Rolling 30-second buffer of confirmed data points for the live chart */
    liveBuffer: DataPoint[]
    /** True when any instantaneous field is currently non-zero */
    isActive: boolean
    error: string | null
    deviceName: string | null
    connect: () => Promise<void>
    /** Disconnects BLE and auto-stops any active session */
    disconnect: () => void
  }
  session: {
    active: ActiveSession | null
    isRecording: boolean
    startSession: (machineType: MachineType) => void
    stopSession: () => Promise<Session | null>
  }
  /** Fields that have reported at least 2 different values (safe to display/record) */
  confirmedFields: Set<string>
  devicePrefs: {
    /** Fields banned for the currently connected device */
    bannedFields: string[]
    /** All non-sentinel fields the current device has ever reported */
    observedFields: string[]
    banField: (field: string) => void
    unbanField: (field: string) => void
  }
  sync: SyncHook
}

const AppContext = createContext<AppContextValue | null>(null)

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  // Session hook
  const sessionHook = useSession()
  // Stable ref so handleData never has a stale "is recording?" check
  const isRecordingRef = useRef(false)
  isRecordingRef.current = sessionHook.isRecording

  // Sync hook — single instance shared via context
  const sync = useSync()

  // Expose startSession so DashboardPage can trigger it explicitly
  const startSession = useCallback((machineType: MachineType) => {
    isRecordingRef.current = true
    sessionHook.startSession(machineType)
  }, [sessionHook.startSession])

  const stopSession = useCallback(async (): Promise<Session | null> => {
    isRecordingRef.current = false
    const session = await sessionHook.stopSession()
    if (session) sync.syncSessionAfterSave(session)
    return session
  }, [sessionHook.stopSession, sync.syncSessionAfterSave])

  // ── Field change detection ──────────────────────────────────────────────────
  // prevDataRef holds the *first* non-sentinel value seen for each field.
  // Once a field reports a *different* value, it is "confirmed" and shown/recorded.
  const prevDataRef = useRef<Record<string, unknown>>({})
  const confirmedFieldsRef = useRef(new Set<string>())
  const [confirmedFields, setConfirmedFields] = useState(new Set<string>())
  const [observedFields, setObservedFields] = useState<string[]>([])
  const [liveData, setLiveData] = useState<MachineData | null>(null)
  const [liveBuffer, setLiveBuffer] = useState<DataPoint[]>([])
  const [isActive, setIsActive] = useState(false)

  // ── Banned fields ───────────────────────────────────────────────────────────
  const [allBanned, setAllBanned] = useState<Record<string, string[]>>(loadBannedFields)
  const currentDeviceNameRef = useRef<string | null>(null)

  const banField = useCallback((field: string) => {
    const dev = currentDeviceNameRef.current
    if (!dev) return
    setAllBanned(prev => {
      const next = {
        ...prev,
        [dev]: [...new Set([...(prev[dev] ?? []), field])],
      }
      saveBannedFields(next)
      return next
    })
  }, [])

  const unbanField = useCallback((field: string) => {
    const dev = currentDeviceNameRef.current
    if (!dev) return
    setAllBanned(prev => {
      const next = { ...prev, [dev]: (prev[dev] ?? []).filter(f => f !== field) }
      saveBannedFields(next)
      return next
    })
  }, [])

  // ── Main data handler (called by BLE on every characteristic notification) ──
  const allBannedRef = useRef(allBanned)
  allBannedRef.current = allBanned

  const handleData = useCallback((machineType: MachineType, rawData: MachineData) => {
    const devName = currentDeviceNameRef.current
    const banned = new Set(devName ? (allBannedRef.current[devName] ?? []) : [])

    // 1. Filter sentinel ("not implemented") values
    const filtered = filterSentinelValues(rawData as Record<string, unknown>)

    // 2. Strip banned fields
    for (const field of banned) delete filtered[field]

    // 3. Track which fields have changed from their initial value
    const newlyObserved: string[] = []
    const newlyConfirmed: string[] = []

    for (const [key, val] of Object.entries(filtered)) {
      if (val === undefined) continue
      if (confirmedFieldsRef.current.has(key)) continue

      if (!(key in prevDataRef.current)) {
        prevDataRef.current[key] = val
        newlyObserved.push(key)
      } else if (prevDataRef.current[key] !== val) {
        newlyConfirmed.push(key)
      }
    }

    if (newlyObserved.length > 0) {
      setObservedFields(prev => [...new Set([...prev, ...newlyObserved])])
    }

    if (newlyConfirmed.length > 0) {
      const next = new Set([...confirmedFieldsRef.current, ...newlyConfirmed])
      confirmedFieldsRef.current = next
      setConfirmedFields(next)
    }

    // 4. Build display data (confirmed fields only)
    const display: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(filtered)) {
      if (confirmedFieldsRef.current.has(key)) display[key] = val
    }
    setLiveData(display as MachineData)

    // 4b. Maintain rolling 30-second buffer for the live chart (always, regardless of recording)
    if (Object.keys(display).length > 0) {
      const now = Date.now()
      const point: DataPoint = { timestamp: now, data: display as MachineData }
      setLiveBuffer(prev => {
        const cutoff = now - 30_000
        return [...prev.filter(p => p.timestamp >= cutoff), point]
      })
    }

    // 5. Track whether the machine is actively moving (any instantaneous field > 0)
    const d = filtered as Record<string, unknown>
    const active = [...INSTANTANEOUS_FIELDS].some(f => (d[f] as number ?? 0) > 0)
    setIsActive(active)

    // 6. Record data points only when a session is in progress
    if (isRecordingRef.current && Object.keys(display).length > 0) {
      sessionHook.addDataPoint(machineType, display as MachineData)
    }
  }, [sessionHook.addDataPoint])

  // ── BLE hook ────────────────────────────────────────────────────────────────
  const { status, machineType, error, deviceName, connect, disconnect: bleDisconnect } = useBluetooth(handleData)

  // Sync device name into ref so handleData can read it without stale closures
  useEffect(() => { currentDeviceNameRef.current = deviceName }, [deviceName])

  // Auto-stop session and reset field tracking on disconnect
  useEffect(() => {
    if (status === 'disconnected') {
      if (isRecordingRef.current) stopSession()
      prevDataRef.current = {}
      confirmedFieldsRef.current = new Set()
      setConfirmedFields(new Set())
      setObservedFields([])
      setLiveData(null)
      setLiveBuffer([])
      setIsActive(false)
    }
  }, [status, stopSession])

  // Disconnect BLE and stop session together
  const disconnect = useCallback(() => {
    if (isRecordingRef.current) {
      isRecordingRef.current = false
      sessionHook.stopSession()
    }
    bleDisconnect()
  }, [bleDisconnect, sessionHook.stopSession])

  // ── Context value ────────────────────────────────────────────────────────────
  const currentBanned = deviceName ? (allBanned[deviceName] ?? []) : []

  const value: AppContextValue = {
    bluetooth: { status, machineType, liveData, liveBuffer, isActive, error, deviceName, connect, disconnect },
    session: { active: sessionHook.active, isRecording: sessionHook.isRecording, startSession, stopSession },
    confirmedFields,
    devicePrefs: { bannedFields: currentBanned, observedFields, banField, unbanField },
    sync,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

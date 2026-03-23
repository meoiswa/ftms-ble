import type { MachineType, MachineData } from './ftms'

export interface DataPoint {
  timestamp: number   // ms since epoch
  data: MachineData
}

export interface SessionStats {
  avgPower?: number
  maxPower?: number
  avgHeartRate?: number
  maxHeartRate?: number
  avgSpeed?: number
  maxSpeed?: number
  avgCadence?: number
  totalDistance?: number
  totalCalories?: number
}

export interface Session {
  id: string
  deletedAt: number | null // ms since epoch, set when user deletes a session (used for Drive sync)
  updatedAt?: number // ms since epoch, used for two-way sync conflict resolution
  deviceId?: string | null // Legacy field: BLE device name/identifier captured when recording starts
  deviceName?: string | null // Human-readable BLE device name captured when recording starts
  machineType: MachineType
  startedAt: number    // ms since epoch
  endedAt: number      // ms since epoch
  duration: number     // seconds
  stats: SessionStats
  dataPoints: DataPoint[]
  fixApplied?: boolean
  appliedFixes?: string[]
  syncedAt?: number    // ms since epoch, set after Google Drive sync
  importedFrom?: string // plugin name if imported
}

export interface ActiveSession {
  id: string
  deviceId?: string | null
  deviceName?: string | null
  machineType: MachineType
  startedAt: number
  dataPoints: DataPoint[]
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success'

export interface SyncState {
  status: SyncStatus
  lastSyncedAt?: number
  error?: string
}

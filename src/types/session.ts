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
  machineType: MachineType
  startedAt: number    // ms since epoch
  endedAt: number      // ms since epoch
  duration: number     // seconds
  stats: SessionStats
  dataPoints: DataPoint[]
  syncedAt?: number    // ms since epoch, set after Google Drive sync
  importedFrom?: string // plugin name if imported
}

export interface ActiveSession {
  id: string
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

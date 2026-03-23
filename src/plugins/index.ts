import type { Session, ActiveSession, DataPoint } from '../types/session'
import type { MachineData, MachineType } from '../types/ftms'

export interface PluginResult {
  ok: boolean
  err?: string
}

export interface PluginLogger {
  info(msg: string): void
  warn(msg: string): void
  error(msg: string): void
}

export interface PluginLogEntry {
  level: 'info' | 'warn' | 'error'
  msg: string
  ts: number
}

export interface LivePatchContext {
  machineType: MachineType
  deviceName: string | null
}

export interface SavedSessionPatchContext {
  source: 'saved-session'
}

export interface FtmsPlugin {
  name: string
  description: string
  /** Injected by the registry at registration time */
  log: PluginLogger

  /** User-triggered: plugin decides what to do (download file, upload to server, etc.) */
  export?(session: Session): Promise<PluginResult>
  /** User-triggered: plugin fetches/parses data and returns sessions to import */
  import?(): Promise<PluginResult & { sessions?: Session[] }>
  /** Called live with each new data point during a session */
  onDataPoint?(dataPoint: DataPoint, session: ActiveSession): Promise<PluginResult>
  /** Called automatically when a session ends */
  onSessionEnd?(session: Session): Promise<PluginResult>
  /** Called for each BLE payload before dashboard/session processing */
  patchLiveData?(data: MachineData, context: LivePatchContext): MachineData
  /** Optional predicate to decide if saved-session fix action should be offered */
  canPatchSavedSession?(session: Session): boolean
  /** Called manually to patch an already-saved session */
  patchSavedSession?(session: Session, context: SavedSessionPatchContext): Session
}

import type { Session, ActiveSession, DataPoint } from '../types/session'

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
}

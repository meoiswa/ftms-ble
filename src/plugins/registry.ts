import type { FtmsPlugin, PluginLogEntry, PluginResult } from './index'
import type { Session, ActiveSession, DataPoint } from '../types/session'

interface RegisteredPlugin {
  plugin: FtmsPlugin
  logs: PluginLogEntry[]
}

const registry: RegisteredPlugin[] = []

function createLogger(logs: PluginLogEntry[]) {
  return {
    info: (msg: string) => logs.push({ level: 'info', msg, ts: Date.now() }),
    warn: (msg: string) => logs.push({ level: 'warn', msg, ts: Date.now() }),
    error: (msg: string) => logs.push({ level: 'error', msg, ts: Date.now() }),
  }
}

export function registerPlugin(plugin: FtmsPlugin): void {
  const logs: PluginLogEntry[] = []
  plugin.log = createLogger(logs)
  registry.push({ plugin, logs })
}

export function getPlugins(): FtmsPlugin[] {
  return registry.map(r => r.plugin)
}

export function getPluginLogs(pluginName: string): PluginLogEntry[] {
  return registry.find(r => r.plugin.name === pluginName)?.logs ?? []
}

export async function broadcastDataPoint(dataPoint: DataPoint, session: ActiveSession): Promise<void> {
  for (const { plugin } of registry) {
    if (plugin.onDataPoint) {
      try {
        await plugin.onDataPoint(dataPoint, session)
      } catch (err) {
        plugin.log.error(`onDataPoint threw: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }
}

export async function broadcastSessionEnd(session: Session): Promise<PluginResult[]> {
  const results: PluginResult[] = []
  for (const { plugin } of registry) {
    if (plugin.onSessionEnd) {
      try {
        const result = await plugin.onSessionEnd(session)
        results.push(result)
        if (!result.ok) {
          plugin.log.error(`onSessionEnd failed: ${result.err}`)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        plugin.log.error(`onSessionEnd threw: ${msg}`)
        results.push({ ok: false, err: msg })
      }
    }
  }
  return results
}

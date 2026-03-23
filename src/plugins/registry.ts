import type {
  FtmsPlugin,
  PluginLogEntry,
  PluginResult,
  LivePatchContext,
  SavedSessionPatchContext,
} from './index'
import type { Session, ActiveSession, DataPoint } from '../types/session'
import type { MachineData } from '../types/ftms'

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
  // Avoid duplicate registrations when modules are re-evaluated (e.g., HMR in dev).
  if (registry.some(r => r.plugin.name === plugin.name)) return

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

export function applyLiveDataPatches(data: MachineData, context: LivePatchContext): MachineData {
  let patched = data
  for (const { plugin } of registry) {
    if (!plugin.patchLiveData) continue
    try {
      patched = plugin.patchLiveData(patched, context)
    } catch (err) {
      plugin.log.error(`patchLiveData threw: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return patched
}

export function applySavedSessionPatches(session: Session): Session {
  let patched = session
  const context: SavedSessionPatchContext = { source: 'saved-session' }
  for (const { plugin } of registry) {
    if (!plugin.patchSavedSession) continue
    try {
      patched = plugin.patchSavedSession(patched, context)
    } catch (err) {
      plugin.log.error(`patchSavedSession threw: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return patched
}

export function hasApplicableSavedSessionPatch(session: Session): boolean {
  const alreadyApplied = new Set(session.appliedFixes ?? [])

  for (const { plugin } of registry) {
    if (!plugin.patchSavedSession) continue
    if (alreadyApplied.has(plugin.name)) continue
    if (!plugin.canPatchSavedSession) continue
    try {
      if (plugin.canPatchSavedSession(session)) return true
    } catch (err) {
      plugin.log.error(`canPatchSavedSession threw: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return false
}

export function applySavedSessionPatchesWithMeta(session: Session): { session: Session, appliedBy: string[] } {
  let patched = session
  const appliedBy: string[] = []
  const alreadyApplied = new Set(session.appliedFixes ?? [])
  const context: SavedSessionPatchContext = { source: 'saved-session' }

  for (const { plugin } of registry) {
    if (!plugin.patchSavedSession) continue
    if (alreadyApplied.has(plugin.name)) continue
    if (plugin.canPatchSavedSession && !plugin.canPatchSavedSession(patched)) continue

    try {
      const before = JSON.stringify(patched)
      const next = plugin.patchSavedSession(patched, context)
      const after = JSON.stringify(next)
      if (before !== after) {
        patched = next
        appliedBy.push(plugin.name)
      }
    } catch (err) {
      plugin.log.error(`patchSavedSession threw: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return { session: patched, appliedBy }
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

import type { Session } from '../../types/session'
import { getMachineLabel } from '../../bluetooth/ftms'

interface SessionCardProps {
  session: Session
  onClick: () => void
}

function fmt(n: number | undefined, decimals = 0): string {
  if (n === undefined) return '—'
  return n.toFixed(decimals)
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function SessionCard({ session, onClick }: SessionCardProps) {
  const date = new Date(session.startedAt)
  const dateStr = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  const deviceName = session.deviceName ?? session.deviceId

  return (
    <button
      onClick={onClick}
      className="panel glow-border-amber w-full text-left p-4 hover:bg-amber-glow/5 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-amber-glow text-sm tracking-wider uppercase">
              {getMachineLabel(session.machineType)}
            </span>
            {deviceName && (
              <span className="text-amber-dim text-xs tracking-wide truncate max-w-[16rem]">
                {deviceName}
              </span>
            )}
            {session.syncedAt && (
              <span className="text-green-dim text-xs tracking-wide shrink-0">✓ synced</span>
            )}
            {session.importedFrom && (
              <span className="text-teal-accent text-xs tracking-wide shrink-0">↓ {session.importedFrom}</span>
            )}
          </div>
          <div className="text-amber-dim text-xs mt-0.5">
            {dateStr} · {timeStr}
          </div>
        </div>
        <div className="text-amber-bright lcd text-xl glow-amber leading-none shrink-0">
          {fmtDuration(session.duration)}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        {session.stats.avgPower !== undefined && (
          <div>
            <div className="text-amber-dim opacity-60 uppercase tracking-wide">Avg Power</div>
            <div className="lcd text-amber-glow">{fmt(session.stats.avgPower)}W</div>
          </div>
        )}
        {session.stats.avgHeartRate !== undefined && (
          <div>
            <div className="text-amber-dim opacity-60 uppercase tracking-wide">Avg HR</div>
            <div className="lcd text-amber-glow">{fmt(session.stats.avgHeartRate)} bpm</div>
          </div>
        )}
        {session.stats.totalDistance !== undefined && (
          <div>
            <div className="text-amber-dim opacity-60 uppercase tracking-wide">Distance</div>
            <div className="lcd text-amber-glow">{(session.stats.totalDistance / 1000).toFixed(2)} km</div>
          </div>
        )}
        {session.stats.avgSpeed !== undefined && (
          <div>
            <div className="text-amber-dim opacity-60 uppercase tracking-wide">Avg Speed</div>
            <div className="lcd text-amber-glow">{fmt(session.stats.avgSpeed, 1)} km/h</div>
          </div>
        )}
        {session.stats.totalCalories !== undefined && (
          <div>
            <div className="text-amber-dim opacity-60 uppercase tracking-wide">Calories</div>
            <div className="lcd text-amber-glow">{fmt(session.stats.totalCalories)} kcal</div>
          </div>
        )}
      </div>
    </button>
  )
}

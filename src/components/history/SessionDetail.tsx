import { useState } from 'react'
import type { Session } from '../../types/session'
import { getMachineLabel } from '../../bluetooth/ftms'
import { getPlugins } from '../../plugins/registry'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend,
} from 'recharts'

interface SessionDetailProps {
  session: Session
  onBack: () => void
  onDelete: (id: string) => void
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

export function SessionDetail({ session, onBack, onDelete }: SessionDetailProps) {
  const [exportStatus, setExportStatus] = useState<Record<string, string>>({})
  const [importStatus, setImportStatus] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  const exportPlugins = getPlugins().filter(p => p.export)
  const importPlugins = getPlugins().filter(p => p.import)

  const handleExport = async (pluginName: string) => {
    const plugin = exportPlugins.find(p => p.name === pluginName)
    if (!plugin?.export) return
    setExportStatus(s => ({ ...s, [pluginName]: 'running' }))
    const result = await plugin.export(session)
    setExportStatus(s => ({ ...s, [pluginName]: result.ok ? 'ok' : `err: ${result.err}` }))
  }

  const handleImport = async (pluginName: string, onImport: (sessions: Session[]) => void) => {
    const plugin = importPlugins.find(p => p.name === pluginName)
    if (!plugin?.import) return
    setImportStatus(s => ({ ...s, [pluginName]: 'running' }))
    const result = await plugin.import()
    if (result.ok && result.sessions) {
      onImport(result.sessions)
      setImportStatus(s => ({ ...s, [pluginName]: `ok: ${result.sessions!.length} sessions` }))
    } else {
      setImportStatus(s => ({ ...s, [pluginName]: `err: ${result.err}` }))
    }
  }

  const handleJsonExport = () => {
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const date = new Date(session.startedAt)
    const pad = (n: number) => String(n).padStart(2, '0')
    a.download = `ftms_${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}_${session.id}.json`
    a.href = url
    a.click()
    URL.revokeObjectURL(url)
  }

  const chartData = session.dataPoints.map((dp, i) => {
    const d = dp.data as Record<string, number | undefined>
    return {
      t: i,
      power: d.instantaneousPower,
      hr: d.heartRate,
      speed: d.instantaneousSpeed,
      cadence: d.instantaneousCadence,
    }
  })

  const date = new Date(session.startedAt)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button className="btn text-xs" onClick={onBack}>← BACK</button>
          <div>
            <div className="text-amber-glow tracking-wider uppercase text-sm">
              {getMachineLabel(session.machineType)}
            </div>
            <div className="text-amber-dim text-xs">
              {date.toLocaleDateString()} · {date.toLocaleTimeString()} · {fmtDuration(session.duration)}
            </div>
          </div>
        </div>
        <button className="btn text-xs" onClick={handleJsonExport}>↓ JSON</button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Avg Power', val: session.stats.avgPower, unit: 'W' },
          { label: 'Max Power', val: session.stats.maxPower, unit: 'W' },
          { label: 'Avg HR', val: session.stats.avgHeartRate, unit: 'bpm' },
          { label: 'Max HR', val: session.stats.maxHeartRate, unit: 'bpm' },
          { label: 'Avg Speed', val: session.stats.avgSpeed, unit: 'km/h' },
          { label: 'Distance', val: session.stats.totalDistance != null ? session.stats.totalDistance / 1000 : undefined, unit: 'km' },
          { label: 'Calories', val: session.stats.totalCalories, unit: 'kcal' },
          { label: 'Avg Cadence', val: session.stats.avgCadence, unit: 'rpm' },
        ].filter(s => s.val !== undefined).map(s => (
          <div key={s.label} className="panel p-3">
            <div className="text-xs uppercase tracking-widest text-amber-dim opacity-60">{s.label}</div>
            <div className="lcd text-amber-glow text-xl glow-amber leading-none">{s.val!.toFixed(1)} <span className="text-xs text-amber-dim">{s.unit}</span></div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="panel p-2 scanlines" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <XAxis dataKey="t" hide />
              <YAxis tick={{ fill: '#a06800', fontSize: 10, fontFamily: 'Share Tech Mono' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={{ background: '#111116', border: '1px solid #1e1e2a', fontFamily: 'Share Tech Mono', fontSize: 11, color: '#ffb020' }} />
              <Legend wrapperStyle={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: '#a06800' }} />
              <Line type="monotone" dataKey="power" name="Power (W)" stroke="#ffb020" dot={false} strokeWidth={1.5} connectNulls />
              <Line type="monotone" dataKey="hr" name="HR (bpm)" stroke="#ff3030" dot={false} strokeWidth={1.5} connectNulls />
              <Line type="monotone" dataKey="speed" name="Speed (km/h)" stroke="#00e87a" dot={false} strokeWidth={1.5} connectNulls />
              <Line type="monotone" dataKey="cadence" name="Cadence" stroke="#00c8c8" dot={false} strokeWidth={1.5} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Export */}
      {exportPlugins.length > 0 && (
        <div className="panel p-3 space-y-2">
          <div className="text-xs uppercase tracking-widest text-amber-dim opacity-60 mb-2">Export</div>
          <div className="flex flex-wrap gap-2">
            {exportPlugins.map(p => (
              <div key={p.name} className="flex items-center gap-2">
                <button
                  className="btn text-xs"
                  onClick={() => handleExport(p.name)}
                  disabled={exportStatus[p.name] === 'running'}
                >
                  {p.name}
                </button>
                {exportStatus[p.name] && (
                  <span className={`text-xs ${exportStatus[p.name].startsWith('err') ? 'text-red-warn' : 'text-green-glow'}`}>
                    {exportStatus[p.name]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import */}
      {importPlugins.length > 0 && (
        <div className="panel p-3 space-y-2">
          <div className="text-xs uppercase tracking-widest text-amber-dim opacity-60 mb-2">Import Sessions</div>
          <div className="flex flex-wrap gap-2">
            {importPlugins.map(p => (
              <div key={p.name} className="flex items-center gap-2">
                <button
                  className="btn text-xs"
                  onClick={() => handleImport(p.name, () => {})}
                  disabled={importStatus[p.name] === 'running'}
                >
                  {p.name}
                </button>
                {importStatus[p.name] && (
                  <span className={`text-xs ${importStatus[p.name].startsWith('err') ? 'text-red-warn' : 'text-green-glow'}`}>
                    {importStatus[p.name]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete */}
      <div className="panel p-3">
        {confirmDelete ? (
          <div className="flex items-center gap-3">
            <span className="text-red-warn text-xs tracking-wide">DELETE THIS SESSION?</span>
            <button className="btn btn-danger text-xs" onClick={() => onDelete(session.id)}>YES, DELETE</button>
            <button className="btn text-xs" onClick={() => setConfirmDelete(false)}>CANCEL</button>
          </div>
        ) : (
          <button className="btn btn-danger text-xs" onClick={() => setConfirmDelete(true)}>DELETE SESSION</button>
        )}
      </div>
    </div>
  )
}

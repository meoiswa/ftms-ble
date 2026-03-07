import { useCallback, useState, useEffect } from 'react'
import { MachineType } from '../types/ftms'
import { useAppContext } from '../context/AppContext'
import { getMachineLabel } from '../bluetooth/ftms'
import { MetricCard } from '../components/dashboard/MetricCard'
import { SessionTimer } from '../components/dashboard/SessionTimer'
import { LiveChart } from '../components/dashboard/LiveChart'

// Machine-specific metric definitions
function getMetrics(machineType: MachineType) {
  const base = [
    { label: 'Heart Rate', key: 'heartRate', unit: 'bpm', green: true },
    { label: 'Calories', key: 'totalEnergy', unit: 'kcal' },
    { label: 'Elapsed', key: 'elapsedTime', unit: 's' },
  ]

  switch (machineType) {
    case MachineType.IndoorBike:
      return [
        { label: 'Power', key: 'instantaneousPower', unit: 'W', highlight: true },
        { label: 'Cadence', key: 'instantaneousCadence', unit: 'rpm' },
        { label: 'Speed', key: 'instantaneousSpeed', unit: 'km/h' },
        { label: 'Avg Power', key: 'averagePower', unit: 'W' },
        { label: 'Distance', key: 'totalDistance', unit: 'm' },
        { label: 'Resistance', key: 'resistanceLevel', unit: '' },
        ...base,
      ]
    case MachineType.Treadmill:
      return [
        { label: 'Speed', key: 'instantaneousSpeed', unit: 'km/h', highlight: true },
        { label: 'Incline', key: 'inclination', unit: '%' },
        { label: 'Pace', key: 'instantaneousPace', unit: 'min/km' },
        { label: 'Distance', key: 'totalDistance', unit: 'm' },
        { label: 'Power', key: 'powerOutput', unit: 'W' },
        ...base,
      ]
    case MachineType.Rower:
      return [
        { label: 'Stroke Rate', key: 'strokeRate', unit: 'spm', highlight: true },
        { label: 'Power', key: 'instantaneousPower', unit: 'W' },
        { label: 'Pace', key: 'instantaneousPace', unit: 's/500m' },
        { label: 'Distance', key: 'totalDistance', unit: 'm' },
        { label: 'Strokes', key: 'strokeCount', unit: '' },
        ...base,
      ]
    case MachineType.CrossTrainer:
      return [
        { label: 'Step Rate', key: 'stepRate', unit: 'spm', highlight: true },
        { label: 'Power', key: 'instantaneousPower', unit: 'W' },
        { label: 'Speed', key: 'instantaneousSpeed', unit: 'km/h' },
        { label: 'Distance', key: 'totalDistance', unit: 'm' },
        { label: 'Resistance', key: 'resistanceLevel', unit: '' },
        ...base,
      ]
    case MachineType.StairClimber:
      return [
        { label: 'Step Rate', key: 'stepRate', unit: 'spm', highlight: true },
        { label: 'Power', key: 'instantaneousPower', unit: 'W' },
        { label: 'Floors', key: 'floorClimbed', unit: '' },
        { label: 'Resistance', key: 'resistanceLevel', unit: '' },
        ...base,
      ]
    default:
      return base
  }
}

function fmt(v: number | undefined, key: string): string | undefined {
  if (v === undefined) return undefined
  if (key === 'instantaneousSpeed' || key === 'averageSpeed') return v.toFixed(1)
  if (key === 'instantaneousCadence' || key === 'averageCadence') return v.toFixed(0)
  if (key === 'inclination') return v.toFixed(1)
  return String(Math.round(v))
}

type DashboardMode = 'live' | 'autostart' | 'recording'

export default function DashboardPage() {
  const { bluetooth, session, confirmedFields } = useAppContext()
  const { status, machineType, liveData, liveBuffer, isActive, error } = bluetooth
  const { active, isRecording, startSession, stopSession } = session

  const [mode, setMode] = useState<DashboardMode>('live')

  // Sync mode with session state (e.g. after disconnect stops a session)
  useEffect(() => {
    if (!isRecording && mode === 'recording') setMode('live')
  }, [isRecording, mode])

  // Reset to live when device disconnects
  useEffect(() => {
    if (status === 'disconnected') setMode('live')
  }, [status])

  // Auto-start when in autostart mode and machine becomes active
  useEffect(() => {
    if (mode === 'autostart' && isActive) {
      startSession(machineType)
      setMode('recording')
    }
  }, [mode, isActive, startSession, machineType])

  const handleRecord = useCallback(() => setMode('autostart'), [])
  const handleCancel = useCallback(() => setMode('live'), [])
  const handleStart = useCallback(() => {
    startSession(machineType)
    setMode('recording')
  }, [startSession, machineType])
  const handleStop = useCallback(async () => {
    await stopSession()
    setMode('live')
  }, [stopSession])

  const rawData = (liveData ?? {}) as Record<string, number | undefined>
  const metrics = getMetrics(machineType).filter(m => confirmedFields.has(m.key))

  return (
    <div className="grid-bg min-h-[calc(100vh-3rem)]">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Header bar — only shown when connected */}
        {status !== 'disconnected' && (
          <div className="flex flex-wrap items-center justify-between gap-4">

            {/* Left: machine label */}
            <div className="min-w-[8rem]">
              <div className="text-xs uppercase tracking-widest text-amber-dim opacity-60">Machine</div>
              <div className="text-amber-glow tracking-wider uppercase text-sm glow-amber">
                {getMachineLabel(machineType)}
              </div>
            </div>

            {/* Center: session timer (autostart shows frozen 00:00, recording shows live) */}
            <div className="flex-1 flex justify-center">
              {(mode === 'autostart' || mode === 'recording') && (
                <SessionTimer
                  startedAt={mode === 'recording' ? (active?.startedAt ?? null) : null}
                  running={mode === 'recording'}
                />
              )}
            </div>

            {/* Right: mode controls */}
            <div className="min-w-[8rem] flex flex-col items-end gap-1">
              {mode === 'live' && status === 'connected' && (
                <button className="btn btn-green text-xs px-4" onClick={handleRecord}>
                  ● RECORD
                </button>
              )}
              {mode === 'autostart' && (
                <>
                  <button className="btn btn-green text-xs px-4" onClick={handleStart}>
                    ▶ START
                  </button>
                  <button className="btn text-xs px-4" onClick={handleCancel}>
                    ✕ CANCEL
                  </button>
                </>
              )}
              {mode === 'recording' && (
                <button className="btn btn-danger text-xs px-4" onClick={handleStop}>
                  ■ STOP
                </button>
              )}
            </div>
          </div>
        )}

        {/* Autostart hint */}
        {mode === 'autostart' && (
          <div className="panel p-3 text-center text-amber-dim text-xs tracking-widest animate-pulse">
            START EXERCISING TO BEGIN RECORDING
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="panel border-red-warn/40 p-3 text-red-warn text-xs tracking-wide">
            ⚠ {error}
          </div>
        )}

        {/* Disconnected state */}
        {status === 'disconnected' && (
          <div className="panel scanlines flex flex-col items-center justify-center py-20 text-amber-dim opacity-40">
            <div className="text-6xl mb-4 glow-amber">◈</div>
            <div className="text-xs uppercase tracking-widest">No device connected</div>
          </div>
        )}

        {/* Calibrating */}
        {status === 'connected' && metrics.length === 0 && (
          <div className="panel p-4 text-amber-dim text-xs tracking-widest text-center animate-pulse">
            CALIBRATING — WAITING FOR SENSOR CHANGES...
          </div>
        )}

        {/* Metrics grid */}
        {metrics.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {metrics.map(m => (
              <MetricCard
                key={m.key}
                label={m.label}
                value={fmt(rawData[m.key], m.key)}
                unit={m.unit}
                highlight={(m as { highlight?: boolean }).highlight}
                green={(m as { green?: boolean }).green}
              />
            ))}
          </div>
        )}

        {/* Live chart — always shown when buffer has data, rolling 30s window */}
        {liveBuffer.length > 1 && (
          <LiveChart dataPoints={liveBuffer} />
        )}
      </div>
    </div>
  )
}

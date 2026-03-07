import { useEffect, useState } from 'react'

interface SessionTimerProps {
  startedAt: number | null
  running: boolean
  /** Compact inline mode for navbar display — smaller font, no label */
  compact?: boolean
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function SessionTimer({ startedAt, running, compact = false }: SessionTimerProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!running || startedAt === null) {
      setElapsed(0)
      return
    }
    setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    )
    return () => clearInterval(id)
  }, [running, startedAt])

  if (compact) {
    return (
      <span className="lcd text-sm glow-amber text-amber-bright leading-none flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-red-warn animate-pulse inline-block" />
        {formatTime(elapsed)}
      </span>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs uppercase tracking-widest text-amber-dim opacity-70">Session Time</span>
      <span className={`lcd text-5xl glow-amber text-amber-bright leading-none ${running ? '' : 'opacity-40'}`}>
        {formatTime(elapsed)}
      </span>
    </div>
  )
}

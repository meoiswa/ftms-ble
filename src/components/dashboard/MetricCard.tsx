interface MetricCardProps {
  label: string
  value: number | string | undefined
  unit?: string
  highlight?: boolean
  green?: boolean
  large?: boolean
}

export function MetricCard({ label, value, unit, highlight, green, large }: MetricCardProps) {
  const hasValue = value !== undefined && value !== null

  const glowClass = green ? 'glow-green' : highlight ? 'glow-amber' : ''
  const colorClass = green
    ? 'text-green-glow'
    : highlight
    ? 'text-amber-bright'
    : 'text-amber-glow'
  const borderClass = green ? 'glow-border-green' : highlight ? 'glow-border-amber' : ''

  return (
    <div className={`panel ${borderClass} p-3 flex flex-col gap-1`}>
      <span className="text-xs uppercase tracking-widest text-amber-dim opacity-70">{label}</span>
      <div className={`lcd ${glowClass} ${colorClass} ${large ? 'text-4xl' : 'text-2xl'} leading-none`}>
        {hasValue ? String(value) : '—'}
      </div>
      {unit && <span className="text-xs text-amber-dim tracking-wider">{unit}</span>}
    </div>
  )
}

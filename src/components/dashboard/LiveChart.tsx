import { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'
import type { DataPoint } from '../../types/session'

interface LiveChartProps {
  dataPoints: DataPoint[]
  maxPoints?: number
}

const CHART_SERIES = [
  { key: 'instantaneousPower', color: '#ffb020', label: 'Power (W)' },
  { key: 'heartRate', color: '#ff3030', label: 'HR (bpm)' },
  { key: 'instantaneousSpeed', color: '#00e87a', label: 'Speed (km/h)' },
  { key: 'instantaneousCadence', color: '#00c8c8', label: 'Cadence (rpm)' },
]

export function LiveChart({ dataPoints, maxPoints = 120 }: LiveChartProps) {
  const data = useMemo(() => {
    const slice = dataPoints.slice(-maxPoints)
    const now = slice[slice.length - 1]?.timestamp ?? Date.now()
    return slice.map(dp => {
      const d = dp.data as Record<string, number | undefined>
      return {
        // Show time as negative offset from "now" so chart reads right-to-left naturally
        t: Math.round((dp.timestamp - now) / 1000),
        ...CHART_SERIES.reduce((acc, s) => ({ ...acc, [s.key]: d[s.key] }), {}),
      }
    })
  }, [dataPoints, maxPoints])

  if (data.length < 2) {
    return (
      <div className="panel h-48 flex items-center justify-center text-amber-dim text-xs tracking-widest opacity-50">
        NO SIGNAL
      </div>
    )
  }

  return (
    <div className="panel p-2 scanlines" style={{ height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <XAxis
            dataKey="t"
            tick={{ fill: '#a06800', fontSize: 10, fontFamily: 'Share Tech Mono' }}
            tickFormatter={v => v === 0 ? 'now' : `${v}s`}
            axisLine={{ stroke: '#1e1e2a' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#a06800', fontSize: 10, fontFamily: 'Share Tech Mono' }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{
              background: '#111116',
              border: '1px solid #1e1e2a',
              fontFamily: 'Share Tech Mono',
              fontSize: 11,
              color: '#ffb020',
            }}
            labelFormatter={v => v === 0 ? 'now' : `${v}s`}
          />
          <Legend
            wrapperStyle={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: '#a06800' }}
          />
          {CHART_SERIES.map(s => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              dot={false}
              strokeWidth={1.5}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

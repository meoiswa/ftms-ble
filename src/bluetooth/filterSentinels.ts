const UINT8_MAX = 255
const UINT16_MAX = 65535
const INT16_MAX = 32767

// Fields whose raw FTMS encoding is uint8
const UINT8_FIELDS = new Set(['heartRate'])

// Fields whose raw encoding is uint16 (no scaling, direct value)
const UINT16_FIELDS = new Set([
  'elapsedTime', 'remainingTime', 'strokeCount', 'totalEnergy',
  'energyPerHour', 'floorClimbed', 'stepRate', 'averageStepRate', 'strideCount',
])

// uint16 scaled by 0.01 (speed km/h) — sentinel = 655.35
const SPEED_FIELDS = new Set(['instantaneousSpeed', 'averageSpeed'])

// uint16 scaled by 0.5 (cadence/strokeRate) — sentinel = 32767.5
const CADENCE_FIELDS = new Set(['instantaneousCadence', 'averageCadence', 'strokeRate', 'averageStrokeRate'])

// int16 (power W) — sentinel = 32767
const POWER_FIELDS = new Set(['instantaneousPower', 'averagePower'])

export function isSentinelValue(field: string, value: number): boolean {
  if (UINT8_FIELDS.has(field)) return value >= UINT8_MAX
  if (UINT16_FIELDS.has(field)) return value >= UINT16_MAX
  if (SPEED_FIELDS.has(field)) return value >= UINT16_MAX * 0.01   // 655.35 km/h
  if (CADENCE_FIELDS.has(field)) return value >= UINT16_MAX * 0.5  // 32767.5 rpm
  if (POWER_FIELDS.has(field)) return Math.abs(value) >= INT16_MAX
  if (field === 'metabolicEquivalent') return value >= UINT8_MAX * 0.1 // 25.5
  return false
}

export function filterSentinelValues(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'number' && isSentinelValue(key, value)) continue
    result[key] = value
  }
  return result
}

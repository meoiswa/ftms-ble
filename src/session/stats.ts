import type { DataPoint, SessionStats } from '../types/session'

export function computeStats(dataPoints: DataPoint[]): SessionStats {
  const powers: number[] = []
  const heartRates: number[] = []
  const speeds: number[] = []
  const cadences: number[] = []
  let totalDistance: number | undefined
  let totalCalories: number | undefined

  for (const dp of dataPoints) {
    const d = dp.data as Record<string, number | undefined>
    if (d.instantaneousPower != null) powers.push(d.instantaneousPower)
    if (d.heartRate != null) heartRates.push(d.heartRate)
    if (d.instantaneousSpeed != null) speeds.push(d.instantaneousSpeed)
    if (d.instantaneousCadence != null) cadences.push(d.instantaneousCadence)
    if (d.totalDistance != null) totalDistance = d.totalDistance
    if (d.totalEnergy != null) totalCalories = d.totalEnergy
  }

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : undefined
  const max = (arr: number[]) => arr.length ? Math.max(...arr) : undefined

  return {
    avgPower: avg(powers),
    maxPower: max(powers),
    avgHeartRate: avg(heartRates),
    maxHeartRate: max(heartRates),
    avgSpeed: avg(speeds),
    maxSpeed: max(speeds),
    avgCadence: avg(cadences),
    totalDistance,
    totalCalories,
  }
}

import type { FtmsPlugin, PluginResult } from '../index'
import type { Session } from '../../types/session'
import { MachineType } from '../../types/ftms'

function formatDate(ms: number): string {
  return new Date(ms).toISOString().replace('.000Z', 'Z')
}

function getSportType(machineType: MachineType): string {
  switch (machineType) {
    case MachineType.Treadmill: return 'Running'
    case MachineType.IndoorBike: return 'Biking'
    case MachineType.Rower: return 'OtherSport'
    case MachineType.CrossTrainer: return 'OtherSport'
    case MachineType.StairClimber: return 'OtherSport'
    default: return 'OtherSport'
  }
}

function buildTcx(session: Session): string {
  const sport = getSportType(session.machineType)
  const startTime = formatDate(session.startedAt)

  const trackpoints = session.dataPoints.map(dp => {
    const d = dp.data as Record<string, number | undefined>
    const time = formatDate(dp.timestamp)
    const hr = d.heartRate != null ? `<HeartRateBpm><Value>${d.heartRate}</Value></HeartRateBpm>` : ''
    const power = d.instantaneousPower != null ? `<Extensions><TPX xmlns="http://www.garmin.com/xmlschemas/ActivityExtension/v2"><Watts>${d.instantaneousPower}</Watts></TPX></Extensions>` : ''
    const cadence = d.instantaneousCadence != null ? `<Cadence>${Math.round(d.instantaneousCadence)}</Cadence>` : ''
    const speed = d.instantaneousSpeed != null ? `<Extensions><TPX xmlns="http://www.garmin.com/xmlschemas/ActivityExtension/v2"><Speed>${(d.instantaneousSpeed / 3.6).toFixed(3)}</Speed></TPX></Extensions>` : ''
    const dist = d.totalDistance != null ? `<DistanceMeters>${d.totalDistance}</DistanceMeters>` : ''
    return `      <Trackpoint><Time>${time}</Time>${hr}${cadence}${dist}${power}${speed}</Trackpoint>`
  }).join('\n')

  const totalDist = session.stats.totalDistance != null ? `<DistanceMeters>${session.stats.totalDistance}</DistanceMeters>` : ''
  const totalCal = session.stats.totalCalories != null ? `<Calories>${session.stats.totalCalories}</Calories>` : ''
  const avgHr = session.stats.avgHeartRate != null ? `<AverageHeartRateBpm><Value>${Math.round(session.stats.avgHeartRate)}</Value></AverageHeartRateBpm>` : ''
  const maxHr = session.stats.maxHeartRate != null ? `<MaximumHeartRateBpm><Value>${session.stats.maxHeartRate}</Value></MaximumHeartRateBpm>` : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>
    <Activity Sport="${sport}">
      <Id>${startTime}</Id>
      <Lap StartTime="${startTime}">
        <TotalTimeSeconds>${session.duration}</TotalTimeSeconds>
        ${totalDist}
        ${totalCal}
        ${avgHr}
        ${maxHr}
        <Intensity>Active</Intensity>
        <TriggerMethod>Manual</TriggerMethod>
        <Track>
${trackpoints}
        </Track>
      </Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`
}

export const tcxPlugin: FtmsPlugin = {
  name: 'TCX Export',
  description: 'Export session as a Garmin Training Center XML (.tcx) file',
  log: null!, // injected by registry

  async export(session: Session): Promise<PluginResult> {
    try {
      const tcx = buildTcx(session)
      const blob = new Blob([tcx], { type: 'application/vnd.garmin.tcx+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const date = new Date(session.startedAt).toISOString().slice(0, 10)
      a.href = url
      a.download = `ftms-${session.machineType}-${date}.tcx`
      a.click()
      URL.revokeObjectURL(url)
      this.log.info(`Exported session ${session.id} as TCX`)
      return { ok: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.log.error(`Export failed: ${msg}`)
      return { ok: false, err: msg }
    }
  },
}

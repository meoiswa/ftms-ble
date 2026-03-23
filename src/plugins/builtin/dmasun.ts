import type { MachineData } from '../../types/ftms'
import type { DataPoint, Session } from '../../types/session'
import type { FtmsPlugin, LivePatchContext } from '../index'
import { computeStats } from '../../session/stats'

interface DeviceDataFixer {
  id: string
  patchLiveData?: (data: MachineData, deviceName: string) => MachineData
  patchSavedSession?: (session: Session) => Session
}

const distanceOffsetByDevice = new Map<string, number>()

function patchDistanceOffsetLive(data: MachineData, deviceName: string): MachineData {
  const record = data as Record<string, number | undefined>
  const rawDistance = record.totalDistance
  if (rawDistance == null) return data

  let offset = distanceOffsetByDevice.get(deviceName)
  if (offset == null || rawDistance < offset) {
    offset = rawDistance
    distanceOffsetByDevice.set(deviceName, offset)
  }

  const normalizedDistance = Math.max(0, rawDistance - offset)
  return { ...data, totalDistance: normalizedDistance }
}

function patchDistanceOffsetSavedSession(session: Session): Session {
  let firstDistance: number | undefined
  let changed = false

  const patchedPoints = session.dataPoints.map((dp): DataPoint => {
    const row = dp.data as Record<string, number | undefined>
    const rawDistance = row.totalDistance
    if (rawDistance == null) return dp

    if (firstDistance == null) firstDistance = rawDistance
    const normalizedDistance = Math.max(0, rawDistance - firstDistance)
    if (normalizedDistance !== rawDistance) changed = true

    return {
      ...dp,
      data: {
        ...dp.data,
        totalDistance: normalizedDistance,
      },
    }
  })

  if (!changed) return session

  return {
    ...session,
    dataPoints: patchedPoints,
    stats: computeStats(patchedPoints),
  }
}

const deviceFixerRepository: Array<{ prefix: string, fixers: DeviceDataFixer[] }> = [
  {
    prefix: 'DMASUN-8715C',
    fixers: [
      {
        id: 'distance-offset',
        patchLiveData: patchDistanceOffsetLive,
        patchSavedSession: patchDistanceOffsetSavedSession,
      },
    ],
  },
]

function getFixersForDevice(deviceName: string | null | undefined): DeviceDataFixer[] {
  if (!deviceName) return []

  const matched: DeviceDataFixer[] = []
  for (const repo of deviceFixerRepository) {
    if (deviceName.startsWith(repo.prefix)) {
      matched.push(...repo.fixers)
    }
  }
  return matched
}

function applyLiveFixers(data: MachineData, context: LivePatchContext): MachineData {
  const fixers = getFixersForDevice(context.deviceName)
  if (fixers.length === 0 || !context.deviceName) return data

  let patched = data
  for (const fixer of fixers) {
    if (fixer.patchLiveData) {
      patched = fixer.patchLiveData(patched, context.deviceName)
    }
  }
  return patched
}

function applySavedFixers(session: Session): Session {
  const fixers = getFixersForDevice(session.deviceId ?? null)
  if (fixers.length === 0) return session

  let patched = session
  for (const fixer of fixers) {
    if (fixer.patchSavedSession) {
      patched = fixer.patchSavedSession(patched)
    }
  }
  return patched
}

export const dmasunPlugin: FtmsPlugin = {
  name: 'DMASUN Device Fixes',
  description: 'Applies DMASUN-specific data fixes (live and saved sessions).',
  log: null!,
  canPatchSavedSession(session) {
    return getFixersForDevice(session.deviceName ?? session.deviceId ?? null).length > 0
  },
  patchLiveData(data, context) {
    return applyLiveFixers(data, context)
  },
  patchSavedSession(session, context) {
    void context
    return applySavedFixers(session)
  },
}

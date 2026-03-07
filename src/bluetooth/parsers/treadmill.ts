import type { TreadmillData } from '../../types/ftms'

/**
 * Parses Treadmill Data characteristic (0x2ACD).
 */
export function parseTreadmillData(buffer: DataView): TreadmillData {
  const flags = buffer.getUint16(0, true)
  let offset = 2
  const data: TreadmillData = {}

  const moreDataPresent = (flags & 0x0001) === 0
  if (moreDataPresent) {
    data.instantaneousSpeed = buffer.getUint16(offset, true) * 0.01
    offset += 2
    data.averageSpeed = buffer.getUint16(offset, true) * 0.01
    offset += 2
  }

  if (flags & 0x0002) {
    data.totalDistance = (buffer.getUint8(offset) | (buffer.getUint8(offset + 1) << 8) | (buffer.getUint8(offset + 2) << 16))
    offset += 3
  }

  if (flags & 0x0004) {
    data.inclination = buffer.getInt16(offset, true) * 0.1
    offset += 2
    data.rampAngle = buffer.getInt16(offset, true) * 0.1
    offset += 2
  }

  if (flags & 0x0008) {
    data.positiveElevationGain = buffer.getUint16(offset, true) * 0.1
    offset += 2
    data.negativeElevationGain = buffer.getUint16(offset, true) * 0.1
    offset += 2
  }

  if (flags & 0x0010) {
    data.instantaneousPace = buffer.getUint8(offset) * 0.1
    offset += 1
    data.averagePace = buffer.getUint8(offset) * 0.1
    offset += 1
  }

  if (flags & 0x0020) {
    data.totalEnergy = buffer.getUint16(offset, true)
    offset += 2
    data.energyPerHour = buffer.getUint16(offset, true)
    offset += 2
    data.energyPerMinute = buffer.getUint8(offset)
    offset += 1
  }

  if (flags & 0x0040) {
    data.heartRate = buffer.getUint8(offset)
    offset += 1
  }

  if (flags & 0x0080) {
    data.metabolicEquivalent = buffer.getUint8(offset) * 0.1
    offset += 1
  }

  if (flags & 0x0100) {
    data.elapsedTime = buffer.getUint16(offset, true)
    offset += 2
  }

  if (flags & 0x0200) {
    data.remainingTime = buffer.getUint16(offset, true)
    offset += 2
  }

  if (flags & 0x0400) {
    data.forceOnBelt = buffer.getInt16(offset, true) * 0.1
    offset += 2
    data.powerOutput = buffer.getInt16(offset, true)
  }

  return data
}

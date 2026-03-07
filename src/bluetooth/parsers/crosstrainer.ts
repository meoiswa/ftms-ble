import type { CrossTrainerData } from '../../types/ftms'

/**
 * Parses Cross Trainer Data characteristic (0x2ACE).
 * Note: flags span 3 bytes (24 bits) per the FTMS spec.
 */
export function parseCrossTrainerData(buffer: DataView): CrossTrainerData {
  const flags = buffer.getUint8(0) | (buffer.getUint8(1) << 8) | (buffer.getUint8(2) << 16)
  let offset = 3
  const data: CrossTrainerData = {}

  const moreDataPresent = (flags & 0x000001) === 0
  if (moreDataPresent) {
    data.instantaneousSpeed = buffer.getUint16(offset, true) * 0.01
    offset += 2
    data.averageSpeed = buffer.getUint16(offset, true) * 0.01
    offset += 2
  }

  if (flags & 0x000002) {
    data.totalDistance = (buffer.getUint8(offset) | (buffer.getUint8(offset + 1) << 8) | (buffer.getUint8(offset + 2) << 16))
    offset += 3
  }

  if (flags & 0x000004) {
    data.stepRate = buffer.getUint16(offset, true)
    offset += 2
    data.averageStepRate = buffer.getUint16(offset, true)
    offset += 2
  }

  if (flags & 0x000008) {
    data.strideCount = buffer.getUint16(offset, true)
    offset += 2
  }

  if (flags & 0x000010) {
    data.positiveElevationGain = buffer.getUint16(offset, true) * 0.1
    offset += 2
    data.negativeElevationGain = buffer.getUint16(offset, true) * 0.1
    offset += 2
  }

  if (flags & 0x000020) {
    data.inclination = buffer.getInt16(offset, true) * 0.1
    offset += 2
    data.rampAngle = buffer.getInt16(offset, true) * 0.1
    offset += 2
  }

  if (flags & 0x000040) {
    data.resistanceLevel = buffer.getInt16(offset, true)
    offset += 2
  }

  if (flags & 0x000080) {
    data.instantaneousPower = buffer.getInt16(offset, true)
    offset += 2
    data.averagePower = buffer.getInt16(offset, true)
    offset += 2
  }

  if (flags & 0x000100) {
    data.totalEnergy = buffer.getUint16(offset, true)
    offset += 2
    data.energyPerHour = buffer.getUint16(offset, true)
    offset += 2
    data.energyPerMinute = buffer.getUint8(offset)
    offset += 1
  }

  if (flags & 0x000200) {
    data.heartRate = buffer.getUint8(offset)
    offset += 1
  }

  if (flags & 0x000400) {
    data.metabolicEquivalent = buffer.getUint8(offset) * 0.1
    offset += 1
  }

  if (flags & 0x000800) {
    data.elapsedTime = buffer.getUint16(offset, true)
    offset += 2
  }

  if (flags & 0x001000) {
    data.remainingTime = buffer.getUint16(offset, true)
  }

  return data
}

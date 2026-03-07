import type { StairClimberData } from '../../types/ftms'

/**
 * Parses Step/Stair Climber Data characteristic (0x2AD0).
 */
export function parseStairClimberData(buffer: DataView): StairClimberData {
  const flags = buffer.getUint16(0, true)
  let offset = 2
  const data: StairClimberData = {}

  const moreDataPresent = (flags & 0x0001) === 0
  if (moreDataPresent) {
    data.floorClimbed = buffer.getUint16(offset, true)
    offset += 2
    data.stepRate = buffer.getUint16(offset, true)
    offset += 2
    data.averageStepRate = buffer.getUint16(offset, true)
    offset += 2
  }

  if (flags & 0x0002) {
    data.strideCount = buffer.getUint16(offset, true)
    offset += 2
  }

  if (flags & 0x0004) {
    data.positiveElevationGain = buffer.getUint16(offset, true) * 0.1
    offset += 2
  }

  if (flags & 0x0008) {
    data.resistanceLevel = buffer.getInt16(offset, true)
    offset += 2
  }

  if (flags & 0x0010) {
    data.instantaneousPower = buffer.getInt16(offset, true)
    offset += 2
    data.averagePower = buffer.getInt16(offset, true)
    offset += 2
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
  }

  return data
}

import type { RowerData } from '../../types/ftms'

/**
 * Parses Rower Data characteristic (0x2AD1).
 */
export function parseRowerData(buffer: DataView): RowerData {
  const flags = buffer.getUint16(0, true)
  let offset = 2
  const data: RowerData = {}

  const moreDataPresent = (flags & 0x0001) === 0
  if (moreDataPresent) {
    data.strokeRate = buffer.getUint8(offset) * 0.5
    offset += 1
    data.strokeCount = buffer.getUint16(offset, true)
    offset += 2
  }

  if (flags & 0x0002) {
    data.averageStrokeRate = buffer.getUint8(offset) * 0.5
    offset += 1
  }

  if (flags & 0x0004) {
    data.totalDistance = (buffer.getUint8(offset) | (buffer.getUint8(offset + 1) << 8) | (buffer.getUint8(offset + 2) << 16))
    offset += 3
  }

  if (flags & 0x0008) {
    data.instantaneousPace = buffer.getUint16(offset, true)
    offset += 2
  }

  if (flags & 0x0010) {
    data.averagePace = buffer.getUint16(offset, true)
    offset += 2
  }

  if (flags & 0x0020) {
    data.instantaneousPower = buffer.getInt16(offset, true)
    offset += 2
  }

  if (flags & 0x0040) {
    data.averagePower = buffer.getInt16(offset, true)
    offset += 2
  }

  if (flags & 0x0080) {
    data.resistanceLevel = buffer.getInt16(offset, true)
    offset += 2
  }

  if (flags & 0x0100) {
    data.totalEnergy = buffer.getUint16(offset, true)
    offset += 2
    data.energyPerHour = buffer.getUint16(offset, true)
    offset += 2
    data.energyPerMinute = buffer.getUint8(offset)
    offset += 1
  }

  if (flags & 0x0200) {
    data.heartRate = buffer.getUint8(offset)
    offset += 1
  }

  if (flags & 0x0400) {
    data.metabolicEquivalent = buffer.getUint8(offset) * 0.1
    offset += 1
  }

  if (flags & 0x0800) {
    data.elapsedTime = buffer.getUint16(offset, true)
    offset += 2
  }

  if (flags & 0x1000) {
    data.remainingTime = buffer.getUint16(offset, true)
  }

  return data
}

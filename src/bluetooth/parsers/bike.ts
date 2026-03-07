import type { BikeData } from '../../types/ftms'

/**
 * Parses Indoor Bike Data characteristic (0x2AD2).
 * Flags field (uint16) determines which optional fields are present.
 */
export function parseIndoorBikeData(buffer: DataView): BikeData {
  const flags = buffer.getUint16(0, true)
  let offset = 2
  const data: BikeData = {}

  const moreDataPresent = (flags & 0x0001) === 0
  if (moreDataPresent) {
    data.instantaneousSpeed = buffer.getUint16(offset, true) * 0.01
    offset += 2
    data.averageSpeed = buffer.getUint16(offset, true) * 0.01
    offset += 2
  }

  if (flags & 0x0002) {
    data.instantaneousCadence = buffer.getUint16(offset, true) * 0.5
    offset += 2
    data.averageCadence = buffer.getUint16(offset, true) * 0.5
    offset += 2
  }

  if (flags & 0x0004) {
    data.totalDistance = (buffer.getUint8(offset) | (buffer.getUint8(offset + 1) << 8) | (buffer.getUint8(offset + 2) << 16))
    offset += 3
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

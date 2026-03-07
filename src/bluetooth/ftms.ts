import {
  MachineType,
  FTMS_SERVICE_UUID,
  INDOOR_BIKE_DATA_UUID,
  TREADMILL_DATA_UUID,
  ROWER_DATA_UUID,
  CROSS_TRAINER_DATA_UUID,
  STAIR_CLIMBER_DATA_UUID,
  STEP_CLIMBER_DATA_UUID,
} from '../types/ftms'
import { parseIndoorBikeData } from './parsers/bike'
import { parseTreadmillData } from './parsers/treadmill'
import { parseRowerData } from './parsers/rower'
import { parseCrossTrainerData } from './parsers/crosstrainer'
import { parseStairClimberData } from './parsers/stairclimber'

export type { MachineType }

export interface FtmsCharacteristicInfo {
  uuid: number
  machineType: MachineType
  parse: (view: DataView) => object
}

export const FTMS_CHARACTERISTICS: FtmsCharacteristicInfo[] = [
  { uuid: INDOOR_BIKE_DATA_UUID, machineType: MachineType.IndoorBike, parse: parseIndoorBikeData },
  { uuid: TREADMILL_DATA_UUID, machineType: MachineType.Treadmill, parse: parseTreadmillData },
  { uuid: ROWER_DATA_UUID, machineType: MachineType.Rower, parse: parseRowerData },
  { uuid: CROSS_TRAINER_DATA_UUID, machineType: MachineType.CrossTrainer, parse: parseCrossTrainerData },
  { uuid: STAIR_CLIMBER_DATA_UUID, machineType: MachineType.StairClimber, parse: parseStairClimberData },
  { uuid: STEP_CLIMBER_DATA_UUID, machineType: MachineType.StairClimber, parse: parseStairClimberData },
]

export function getMachineLabel(type: MachineType): string {
  switch (type) {
    case MachineType.IndoorBike: return 'Indoor Bike'
    case MachineType.Treadmill: return 'Treadmill'
    case MachineType.Rower: return 'Rowing Machine'
    case MachineType.CrossTrainer: return 'Cross Trainer'
    case MachineType.StairClimber: return 'Stair Climber'
    default: return 'Fitness Machine'
  }
}

export const FTMS_SERVICE_UUID_FULL = `0000${FTMS_SERVICE_UUID.toString(16)}-0000-1000-8000-00805f9b34fb`

export function toFullUuid(short: number): string {
  return `0000${short.toString(16).padStart(4, '0')}-0000-1000-8000-00805f9b34fb`
}

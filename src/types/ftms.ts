export const MachineType = {
  IndoorBike: 'indoor_bike',
  Treadmill: 'treadmill',
  Rower: 'rower',
  CrossTrainer: 'cross_trainer',
  StairClimber: 'stair_climber',
  Unknown: 'unknown',
} as const
export type MachineType = typeof MachineType[keyof typeof MachineType]

export interface BikeData {
  instantaneousSpeed?: number        // km/h × 0.01
  averageSpeed?: number              // km/h × 0.01
  instantaneousCadence?: number      // rpm × 0.5
  averageCadence?: number            // rpm × 0.5
  totalDistance?: number             // meters
  resistanceLevel?: number
  instantaneousPower?: number        // watts
  averagePower?: number              // watts
  totalEnergy?: number               // kcal
  energyPerHour?: number             // kcal/h
  energyPerMinute?: number           // kcal/min
  heartRate?: number                 // bpm
  metabolicEquivalent?: number       // × 0.1
  elapsedTime?: number               // seconds
  remainingTime?: number             // seconds
}

export interface TreadmillData {
  instantaneousSpeed?: number        // km/h × 0.01
  averageSpeed?: number
  totalDistance?: number             // meters
  inclination?: number               // % × 0.1
  rampAngle?: number                 // degrees × 0.1
  positiveElevationGain?: number     // meters × 0.1
  negativeElevationGain?: number
  instantaneousPace?: number         // min/km × 0.1
  averagePace?: number
  totalEnergy?: number               // kcal
  energyPerHour?: number
  energyPerMinute?: number
  heartRate?: number                 // bpm
  metabolicEquivalent?: number
  elapsedTime?: number               // seconds
  remainingTime?: number
  forceOnBelt?: number               // N × 0.1
  powerOutput?: number               // watts
}

export interface RowerData {
  strokeRate?: number                // strokes/min × 0.5
  strokeCount?: number
  averageStrokeRate?: number
  totalDistance?: number             // meters
  instantaneousPace?: number         // s/500m
  averagePace?: number               // s/500m
  instantaneousPower?: number        // watts
  averagePower?: number
  resistanceLevel?: number
  totalEnergy?: number               // kcal
  energyPerHour?: number
  energyPerMinute?: number
  heartRate?: number                 // bpm
  metabolicEquivalent?: number
  elapsedTime?: number               // seconds
  remainingTime?: number
}

export interface CrossTrainerData {
  instantaneousSpeed?: number        // km/h × 0.01
  averageSpeed?: number
  totalDistance?: number             // meters
  stepRate?: number                  // steps/min
  averageStepRate?: number
  strideCount?: number
  positiveElevationGain?: number     // meters × 0.1
  negativeElevationGain?: number
  inclination?: number
  rampAngle?: number
  resistanceLevel?: number
  instantaneousPower?: number        // watts
  averagePower?: number
  totalEnergy?: number               // kcal
  energyPerHour?: number
  energyPerMinute?: number
  heartRate?: number                 // bpm
  metabolicEquivalent?: number
  elapsedTime?: number               // seconds
  remainingTime?: number
}

export interface StairClimberData {
  floorClimbed?: number
  stepRate?: number                  // steps/min
  averageStepRate?: number
  positiveElevationGain?: number
  strideCount?: number
  resistanceLevel?: number
  instantaneousPower?: number        // watts
  averagePower?: number
  totalEnergy?: number               // kcal
  energyPerHour?: number
  energyPerMinute?: number
  heartRate?: number                 // bpm
  metabolicEquivalent?: number
  elapsedTime?: number               // seconds
  remainingTime?: number
}

export type MachineData =
  | BikeData
  | TreadmillData
  | RowerData
  | CrossTrainerData
  | StairClimberData

// FTMS Bluetooth service and characteristic UUIDs
export const FTMS_SERVICE_UUID = 0x1826
export const FITNESS_MACHINE_FEATURE_UUID = 0x2acc
export const TREADMILL_DATA_UUID = 0x2acd
export const CROSS_TRAINER_DATA_UUID = 0x2ace
export const STEP_CLIMBER_DATA_UUID = 0x2acf
export const STAIR_CLIMBER_DATA_UUID = 0x2ad0
export const ROWER_DATA_UUID = 0x2ad1
export const INDOOR_BIKE_DATA_UUID = 0x2ad2
export const TRAINING_STATUS_UUID = 0x2ad3
export const SUPPORTED_SPEED_RANGE_UUID = 0x2ad4
export const FITNESS_MACHINE_STATUS_UUID = 0x2ada
export const FITNESS_MACHINE_CONTROL_POINT_UUID = 0x2ad9

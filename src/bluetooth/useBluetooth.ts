import { useState, useCallback, useRef, useEffect } from 'react'
import { MachineType } from '../types/ftms'
import type { MachineData } from '../types/ftms'
import { FTMS_SERVICE_UUID } from '../types/ftms'
import { FTMS_CHARACTERISTICS, toFullUuid } from './ftms'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface BluetoothState {
  status: ConnectionStatus
  machineType: MachineType
  data: MachineData | null
  error: string | null
  deviceName: string | null
  connect: () => Promise<void>
  disconnect: () => void
}

export function useBluetooth(onData?: (machineType: MachineType, data: MachineData) => void): BluetoothState {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [machineType, setMachineType] = useState<MachineType>(MachineType.Unknown)
  const [data, setData] = useState<MachineData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const deviceRef = useRef<BluetoothDevice | null>(null)

  // Keep a ref to onData so event listeners always call the latest callback
  // without needing to re-subscribe on every render
  const onDataRef = useRef(onData)
  useEffect(() => { onDataRef.current = onData })

  const disconnect = useCallback(() => {
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect()
    }
    deviceRef.current = null
    setStatus('disconnected')
    setData(null)
    setDeviceName(null)
    setMachineType(MachineType.Unknown)
  }, [])

  const connect = useCallback(async () => {
    if (!navigator.bluetooth) {
      setError('Web Bluetooth is not supported in this browser.')
      setStatus('error')
      return
    }

    setStatus('connecting')
    setError(null)

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [FTMS_SERVICE_UUID] }],
        optionalServices: FTMS_CHARACTERISTICS.map(c => toFullUuid(c.uuid)),
      })

      deviceRef.current = device
      setDeviceName(device.name ?? null)

      device.addEventListener('gattserverdisconnected', () => {
        setStatus('disconnected')
        setData(null)
        setDeviceName(null)
      })

      const server = await device.gatt!.connect()
      const service = await server.getPrimaryService(FTMS_SERVICE_UUID)

      let detectedType: MachineType = MachineType.Unknown
      let subscribed = false

      for (const charInfo of FTMS_CHARACTERISTICS) {
        try {
          const characteristic = await service.getCharacteristic(toFullUuid(charInfo.uuid))
          await characteristic.startNotifications()

          if (!subscribed) {
            detectedType = charInfo.machineType
            subscribed = true
          }

          characteristic.addEventListener('characteristicvaluechanged', (event: Event) => {
            const target = event.target as BluetoothRemoteGATTCharacteristic
            if (!target.value) return
            const parsed = charInfo.parse(target.value) as MachineData
            setMachineType(charInfo.machineType)
            setData(parsed)
            // Always call the latest onData callback via ref — no stale closures
            onDataRef.current?.(charInfo.machineType, parsed)
          })
        } catch {
          // characteristic not present on this device — skip
        }
      }

      setMachineType(detectedType)
      setStatus('connected')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed'
      setError(msg)
      setStatus('error')
    }
  }, []) // no deps — onData is accessed via ref

  return { status, machineType, data, error, deviceName, connect, disconnect }
}

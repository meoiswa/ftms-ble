import type { ConnectionStatus } from '../../bluetooth/useBluetooth'

interface ConnectButtonProps {
  status: ConnectionStatus
  onConnect: () => void
  onDisconnect: () => void
  /** Compact mode for use in the navbar — smaller text and padding */
  compact?: boolean
}

const statusLabels: Record<ConnectionStatus, string> = {
  disconnected: 'CONNECT',
  connecting: 'CONNECTING...',
  connected: 'DISCONNECT',
  error: 'RETRY',
}

const statusLabelsFull: Record<ConnectionStatus, string> = {
  disconnected: 'CONNECT DEVICE',
  connecting: 'CONNECTING...',
  connected: 'DISCONNECT',
  error: 'RETRY',
}

export function ConnectButton({ status, onConnect, onDisconnect, compact = false }: ConnectButtonProps) {
  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting'
  const labels = compact ? statusLabels : statusLabelsFull

  return (
    <button
      className={`btn ${isConnected ? 'btn-danger' : 'btn-green'} ${compact ? 'text-xs px-3 py-1' : 'text-sm px-6 py-2'}`}
      onClick={isConnected ? onDisconnect : onConnect}
      disabled={isConnecting}
    >
      {isConnecting && <span className="animate-pulse mr-1">●</span>}
      {labels[status]}
    </button>
  )
}

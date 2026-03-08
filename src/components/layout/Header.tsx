import { Link, useLocation } from 'react-router-dom'
import { useTheme } from './ThemeProvider'
import { useAppContext } from '../../context/AppContext'
import { ConnectButton } from '../dashboard/ConnectButton'
import { SessionTimer } from '../dashboard/SessionTimer'

export function Header() {
  const location = useLocation()
  const { theme, toggle } = useTheme()
  const { bluetooth, session } = useAppContext()
  const { isRecording, active } = session
  const isOnLive = location.pathname === '/'

  const navLink = (to: string, label: string) => {
    const isActive = location.pathname === to
    const isLive = to === '/'
    const recording = isLive && isRecording

    return (
      <Link
        to={to}
        className={`relative text-xs uppercase tracking-widest px-3 py-1 border rounded transition-all ${
          isActive
            ? 'border-amber-glow text-amber-bright glow-amber'
            : 'border-transparent text-amber-dim hover:text-amber-glow'
        }`}
      >
        {recording && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-warn animate-pulse" />
        )}
        {label}
      </Link>
    )
  }

  return (
    <header className="border-b border-cockpit-border bg-cockpit-dark sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
        {/* Left: logo + homepage link + dashboard label */}
        <div className="flex items-center gap-3 flex-grow-1">
          <span className="text-amber-glow glow-amber font-mono text-sm tracking-widest uppercase font-bold">
            ◈ FTMS
          </span>
          <a
            href={`${import.meta.env.BASE_URL}home.html`}
            className="text-amber-dim text-xs hidden sm:block tracking-wider hover:text-amber-glow transition-colors"
            title="Homepage"
          >
            Home
          </a>
          <span className="text-amber-dim text-xs hidden sm:block tracking-wider">DASHBOARD</span>
        </div>

        {/* Center: connect button */}
        <ConnectButton
          status={bluetooth.status}
          onConnect={bluetooth.connect}
          onDisconnect={bluetooth.disconnect}
          compact
        />

        {/* Right: session timer + nav + theme toggle */}
        <nav className="flex items-center gap-2 flex-grow-1 justify-end">
          {isRecording && !isOnLive && (
            <SessionTimer startedAt={active?.startedAt ?? null} running compact />
          )}
          {navLink('/', 'Live')}
          {navLink('/history', 'History')}
          {navLink('/settings', 'Settings')}
          <button
            className="btn text-xs px-2"
            onClick={toggle}
            title="Toggle theme"
          >
            {theme === 'dark' ? '◑' : '◐'}
          </button>
        </nav>
      </div>
    </header>
  )
}

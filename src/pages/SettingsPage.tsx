import { useTheme } from '../components/layout/ThemeProvider'
import { getPlugins, getPluginLogs } from '../plugins/registry'
import { useState } from 'react'
import { useAppContext } from '../context/AppContext'

// Human-readable labels for known FTMS fields
const FIELD_LABELS: Record<string, string> = {
  instantaneousSpeed: 'Speed (instant)',
  averageSpeed: 'Speed (avg)',
  instantaneousCadence: 'Cadence (instant)',
  averageCadence: 'Cadence (avg)',
  instantaneousPower: 'Power (instant)',
  averagePower: 'Power (avg)',
  heartRate: 'Heart Rate',
  totalDistance: 'Distance',
  totalEnergy: 'Calories',
  energyPerHour: 'Calories/hr',
  energyPerMinute: 'Calories/min',
  elapsedTime: 'Elapsed Time',
  remainingTime: 'Remaining Time',
  resistanceLevel: 'Resistance',
  inclination: 'Incline',
  rampAngle: 'Ramp Angle',
  positiveElevationGain: 'Elevation Gain',
  negativeElevationGain: 'Elevation Loss',
  instantaneousPace: 'Pace (instant)',
  averagePace: 'Pace (avg)',
  metabolicEquivalent: 'MET',
  strokeRate: 'Stroke Rate',
  averageStrokeRate: 'Stroke Rate (avg)',
  strokeCount: 'Stroke Count',
  stepRate: 'Step Rate',
  averageStepRate: 'Step Rate (avg)',
  strideCount: 'Stride Count',
  floorClimbed: 'Floors Climbed',
  forceOnBelt: 'Belt Force',
  powerOutput: 'Power Output',
}

export default function SettingsPage() {
  const { sync, bluetooth, devicePrefs } = useAppContext()
  const { syncState, isConfigured, isSignedIn, signIn, signOut, syncNow } = sync
  const { theme, toggle } = useTheme()
  const [activePluginLog, setActivePluginLog] = useState<string | null>(null)

  const plugins = getPlugins()

  const syncStatusColor = {
    idle: 'text-amber-dim',
    syncing: 'text-teal-accent animate-pulse',
    success: 'text-green-glow',
    error: 'text-red-warn',
  }[syncState.status]

  return (
    <div className="grid-bg min-h-[calc(100vh-3rem)]">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-amber-glow glow-amber text-sm uppercase tracking-widest">Settings</h1>

        {/* Theme */}
        <div className="panel p-4 space-y-3">
          <div className="text-xs uppercase tracking-widest text-amber-dim opacity-60">Display</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-amber-glow tracking-wide">Theme</span>
            <button className="btn text-xs" onClick={toggle}>
              {theme === 'dark' ? '◑ Dark Mode' : '◐ Light Mode'}
            </button>
          </div>
        </div>

        {/* Google Drive Sync */}
        <div className="panel p-4 space-y-3">
          <div className="text-xs uppercase tracking-widest text-amber-dim opacity-60">Google Drive Sync</div>

          {!isConfigured ? (
            <div className="text-amber-dim text-xs tracking-wide">
              Set <code className="text-teal-accent">VITE_GOOGLE_CLIENT_ID</code> in <code className="text-teal-accent">.env</code> to enable sync.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-glow tracking-wide">
                  {isSignedIn ? '● Connected' : '○ Not connected'}
                </span>
                <button
                  className={`btn text-xs ${isSignedIn ? 'btn-danger' : 'btn-green'}`}
                  onClick={isSignedIn ? signOut : signIn}
                >
                  {isSignedIn ? 'SIGN OUT' : 'SIGN IN'}
                </button>
              </div>

              {isSignedIn && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className={`text-xs tracking-wide ${syncStatusColor}`}>
                      Status: {syncState.status.toUpperCase()}
                      {syncState.error && ` — ${syncState.error}`}
                    </div>
                    {syncState.lastSyncedAt && (
                      <div className="text-xs text-amber-dim opacity-60">
                        Last synced: {new Date(syncState.lastSyncedAt).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn text-xs"
                    onClick={syncNow}
                    disabled={syncState.status === 'syncing'}
                  >
                    {syncState.status === 'syncing' ? 'SYNCING...' : 'SYNC NOW'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Plugin registry */}
        <div className="panel p-4 space-y-3">
          <div className="text-xs uppercase tracking-widest text-amber-dim opacity-60">Plugins</div>

          {plugins.length === 0 ? (
            <div className="text-amber-dim text-xs opacity-60">No plugins registered.</div>
          ) : (
            <div className="space-y-3">
              {plugins.map(p => {
                const caps = [
                  p.export && 'export',
                  p.import && 'import',
                  p.onDataPoint && 'live-data',
                  p.onSessionEnd && 'session-end',
                ].filter(Boolean).join(' · ')

                const logs = getPluginLogs(p.name)
                const hasErrors = logs.some(l => l.level === 'error')

                return (
                  <div key={p.name} className="border-b border-cockpit-border pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`text-sm tracking-wide ${hasErrors ? 'text-red-warn' : 'text-amber-glow'}`}>
                          {p.name} {hasErrors && '⚠'}
                        </div>
                        <div className="text-xs text-amber-dim opacity-60">{p.description}</div>
                        <div className="text-xs text-teal-accent opacity-70 mt-0.5">{caps}</div>
                      </div>
                      {logs.length > 0 && (
                        <button
                          className="btn text-xs"
                          onClick={() => setActivePluginLog(activePluginLog === p.name ? null : p.name)}
                        >
                          {activePluginLog === p.name ? 'HIDE LOG' : `LOG (${logs.length})`}
                        </button>
                      )}
                    </div>
                    {activePluginLog === p.name && (
                      <div className="mt-2 bg-cockpit-dark border border-cockpit-border rounded p-2 max-h-32 overflow-y-auto space-y-0.5">
                        {logs.map((l, i) => (
                          <div key={i} className={`text-xs font-mono ${l.level === 'error' ? 'text-red-warn' : l.level === 'warn' ? 'text-amber-glow' : 'text-amber-dim'}`}>
                            [{new Date(l.ts).toLocaleTimeString()}] {l.level.toUpperCase()}: {l.msg}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Device field preferences */}
        <div className="panel p-4 space-y-3">
          <div className="text-xs uppercase tracking-widest text-amber-dim opacity-60">Device Field Preferences</div>

          {!bluetooth.deviceName && devicePrefs.observedFields.length === 0 ? (
            <div className="text-amber-dim text-xs opacity-60">
              Connect a device and start a session to configure which fields to track.
            </div>
          ) : (
            <>
              {bluetooth.deviceName && (
                <div className="text-xs text-teal-accent tracking-wide mb-2">
                  Device: <span className="text-amber-glow">{bluetooth.deviceName}</span>
                </div>
              )}
              {devicePrefs.observedFields.length === 0 ? (
                <div className="text-amber-dim text-xs opacity-60 animate-pulse">
                  Waiting for field data from device...
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-amber-dim opacity-50 mb-1">
                    Disable a field to stop displaying and recording it for this device.
                  </div>
                  {devicePrefs.observedFields.map(field => {
                    const isBanned = devicePrefs.bannedFields.includes(field)
                    const label = FIELD_LABELS[field] ?? field
                    return (
                      <label
                        key={field}
                        className="flex items-center justify-between py-1 border-b border-cockpit-border last:border-0 cursor-pointer group"
                      >
                        <span className={`text-xs tracking-wide transition-opacity ${isBanned ? 'line-through text-amber-dim opacity-40' : 'text-amber-glow'}`}>
                          {label}
                        </span>
                        {/* Toggle switch */}
                        <span
                          role="switch"
                          aria-checked={!isBanned}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isBanned ? 'bg-cockpit-border' : 'bg-teal-accent'}`}
                          onClick={() => isBanned ? devicePrefs.unbanField(field) : devicePrefs.banField(field)}
                        >
                          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-cockpit-dark transition-transform ${isBanned ? 'translate-x-1' : 'translate-x-4'}`} />
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* About */}
        <div className="panel p-4">
          <div className="text-xs uppercase tracking-widest text-amber-dim opacity-60 mb-2">About</div>
          <div className="text-xs text-amber-dim space-y-1">
            <div className="opacity-50">FTMS Dashboard — Web Bluetooth fitness machine tracker</div>
            <div className="opacity-50">
              {plugins.length > 0
                ? `Loaded plugins: ${plugins.map(p => p.name).join(', ')}`
                : 'No plugins loaded.'}
            </div>
            <div className="flex gap-3 pt-1">
              <a
                href={`${import.meta.env.BASE_URL}privacy.html`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-dim hover:text-amber-glow transition-colors tracking-wide"
              >
                Privacy Policy
              </a>
              <span className="opacity-30">·</span>
              <a
                href={`${import.meta.env.BASE_URL}terms.html`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-dim hover:text-amber-glow transition-colors tracking-wide"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { HashRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './components/layout/ThemeProvider'
import { Header } from './components/layout/Header'
import { AppProvider, useAppContext } from './context/AppContext'
import DashboardPage from './pages/DashboardPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import { registerPlugin } from './plugins/registry'
import { plugins } from './plugins/plugins.config'

plugins.forEach(registerPlugin)

function SyncOverlay() {
  const { sync } = useAppContext()
  if (sync.syncState.status !== 'syncing') return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="panel border border-amber-glow/40 px-10 py-8 flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-amber-glow border-t-transparent rounded-full animate-spin" />
        <div className="text-amber-glow text-sm tracking-widest uppercase glow-amber">Syncing…</div>
      </div>
    </div>
  )
}

export default function App() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return (
    <HashRouter>
      <ThemeProvider>
        <AppProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </main>
            <footer className="border-t border-cockpit-border bg-cockpit-dark py-2 px-4">
              <div className="max-w-6xl mx-auto flex items-center justify-center gap-4">
                <a
                  href={`${base}/privacy.html`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-dim hover:text-amber-glow text-xs tracking-wider transition-colors"
                >
                  Privacy Policy
                </a>
                <span className="text-amber-dim/40 text-xs">·</span>
                <a
                  href={`${base}/terms.html`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-dim hover:text-amber-glow text-xs tracking-wider transition-colors"
                >
                  Terms of Service
                </a>
              </div>
            </footer>
          </div>
          <SyncOverlay />
        </AppProvider>
      </ThemeProvider>
    </HashRouter>
  )
}

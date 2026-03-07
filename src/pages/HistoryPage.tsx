import { useState, useEffect } from 'react'
import type { Session } from '../types/session'
import { useStorage } from '../storage/useStorage'
import { useAppContext } from '../context/AppContext'
import { SessionList } from '../components/history/SessionList'
import { SessionDetail } from '../components/history/SessionDetail'
import { getPlugins } from '../plugins/registry'
import { saveSession } from '../storage/sessions'

export default function HistoryPage() {
  const { sessions, loading, refresh, deleteSession } = useStorage()
  const { sync } = useAppContext()
  const { isSignedIn, deleteRemoteSession, syncState } = sync
  const [selected, setSelected] = useState<Session | null>(null)
  const [importStatus, setImportStatus] = useState<Record<string, string>>({})

  // Refresh the local list whenever a cloud sync completes
  useEffect(() => {
    if (syncState.lastSyncedAt) refresh()
  }, [syncState.lastSyncedAt, refresh])

  const importPlugins = getPlugins().filter(p => p.import)

  const handleImport = async (pluginName: string) => {
    const plugin = importPlugins.find(p => p.name === pluginName)
    if (!plugin?.import) return
    setImportStatus(s => ({ ...s, [pluginName]: 'running' }))
    const result = await plugin.import!()
    if (result.ok && result.sessions) {
      for (const session of result.sessions) {
        await saveSession({ ...session, importedFrom: pluginName })
      }
      await refresh()
      setImportStatus(s => ({ ...s, [pluginName]: `✓ ${result.sessions!.length} imported` }))
    } else {
      setImportStatus(s => ({ ...s, [pluginName]: `⚠ ${result.err}` }))
    }
  }

  const handleDelete = async (id: string) => {
    if (isSignedIn) await deleteRemoteSession(id)
    await deleteSession(id)
    setSelected(null)
  }

  if (selected) {
    return (
      <div className="grid-bg min-h-[calc(100vh-3rem)]">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <SessionDetail
            session={selected}
            onBack={() => setSelected(null)}
            onDelete={handleDelete}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="grid-bg min-h-[calc(100vh-3rem)]">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        <div className="flex items-center justify-between">
          <h1 className="text-amber-glow glow-amber text-sm uppercase tracking-widest">Session History</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {importPlugins.map(p => (
              <div key={p.name} className="flex items-center gap-1">
                <button
                  className="btn text-xs"
                  onClick={() => handleImport(p.name)}
                  disabled={importStatus[p.name] === 'running'}
                >
                  ↓ {p.name}
                </button>
                {importStatus[p.name] && (
                  <span className={`text-xs ${importStatus[p.name].startsWith('⚠') ? 'text-red-warn' : 'text-green-glow'}`}>
                    {importStatus[p.name]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-amber-dim text-xs tracking-widest text-center py-12 animate-pulse">
            LOADING...
          </div>
        ) : (
          <SessionList sessions={sessions} onSelect={setSelected} />
        )}
      </div>
    </div>
  )
}

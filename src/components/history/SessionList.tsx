import type { Session } from '../../types/session'
import { SessionCard } from './SessionCard'

interface SessionListProps {
  sessions: Session[]
  onSelect: (session: Session) => void
}

export function SessionList({ sessions, onSelect }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-amber-dim opacity-40">
        <div className="text-4xl mb-4">◈</div>
        <div className="text-xs uppercase tracking-widest">No sessions recorded</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sessions.filter(s => !s.deletedAt).map(s => (
        <SessionCard key={s.id} session={s} onClick={() => onSelect(s)} />
      ))}
    </div>
  )
}

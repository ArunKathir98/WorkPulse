import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, StickyNote, BellRing } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import Board from '../components/Board.jsx'
import NotesBoard from '../components/NotesBoard.jsx'
import RemindersBoard from '../components/RemindersBoard.jsx'
import DailyQuote from '../components/DailyQuote.jsx'

const KINDS = [
  { value: 'tasks', label: 'Tasks', I: LayoutDashboard },
  { value: 'notes', label: 'Notes', I: StickyNote },
  { value: 'reminders', label: 'Reminders', I: BellRing }
]
const KEY = 'workpulse.boardKind'
const readKind = () => {
  try {
    const k = localStorage.getItem(KEY)
    return k === 'notes' || k === 'reminders' ? k : 'tasks'
  } catch { return 'tasks' }
}

export default function Home() {
  const { data } = useData()
  const [kind, setKind] = useState(readKind)
  const hasLists = data.settings.columns.some((c) => c.type === 'list')

  const choose = (k) => {
    setKind(k)
    try { localStorage.setItem(KEY, k) } catch {}
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col px-3 py-3 md:px-4">
      <DailyQuote />

      <div role="tablist" aria-label="Board type" className="mb-3 flex shrink-0 gap-1 border-b border-line">
        {KINDS.map(({ value, label, I }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={kind === value}
            onClick={() => choose(value)}
            className={
              '-mb-px flex h-10 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors ' +
              (kind === value ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink')
            }
          >
            <I size={16} /> {label}
          </button>
        ))}
      </div>

      {kind === 'notes' ? (
        <NotesBoard />
      ) : kind === 'reminders' ? (
        <RemindersBoard />
      ) : hasLists ? (
        <Board />
      ) : (
        <div className="card mx-auto mt-10 max-w-md p-6 text-center">
          <h1 className="font-display text-xl font-bold">Your board has no columns</h1>
          <p className="mt-2 text-muted">Add a List column in Settings to start placing tasks.</p>
          <Link to="/settings" className="btn btn-primary mt-4">Open settings</Link>
        </div>
      )}
    </div>
  )
}

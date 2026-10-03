import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, LayoutDashboard, StickyNote, BellRing, KeyRound, Settings, UserRound, CornerDownLeft
} from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { formatWhen } from '../lib/reminders.js'
import { cls } from './Cards.jsx'

const PAGES = [
  { label: 'Tasks board', to: '/?tab=tasks', icon: LayoutDashboard, words: 'board tasks todo kanban columns lists date day month' },
  { label: 'Notes', to: '/?tab=notes', icon: StickyNote, words: 'notes sticky' },
  { label: 'Reminders', to: '/?tab=reminders', icon: BellRing, words: 'reminders alarm snooze notification' },
  { label: 'Credentials', to: '/credentials', icon: KeyRound, words: 'credentials passwords logins sites vault' },
  { label: 'Settings', to: '/settings', icon: Settings, words: 'settings theme colors columns security key recovery appearance' },
  { label: 'Profile', to: '/profile', icon: UserRound, words: 'profile account name picture log out' }
]

const GROUPS = [
  { key: 'pages', label: 'Pages' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'notes', label: 'Notes' },
  { key: 'reminders', label: 'Reminders' },
  { key: 'credentials', label: 'Credentials' }
]
const PER_GROUP = 6

const terms = (q) => q.toLowerCase().split(/\s+/).filter(Boolean)
// Every keyword must appear somewhere in the text.
const matches = (hay, ts) => {
  const h = hay.toLowerCase()
  return ts.every((t) => h.includes(t))
}

function Highlight({ text, ts }) {
  if (!ts.length) return text
  const re = new RegExp(`(${ts.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig')
  return text.split(re).map((part, i) =>
    ts.includes(part.toLowerCase()) ? <mark key={i} className="rounded bg-accent/25 px-0.5 text-ink">{part}</mark> : part
  )
}

export default function GlobalSearch() {
  const { data } = useData()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Ctrl/Cmd+K anywhere, or "/" when not typing in a field.
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
      } else if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setQ('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const results = useMemo(() => {
    const ts = terms(q)
    if (!ts.length) return []
    const cols = data.settings.columns
    const dateCol = cols.find((c) => c.type === 'date')
    const listName = (id) => cols.find((c) => c.id === id)?.title || ''
    const dateOf = (item) => {
      const rid = dateCol && item.fields?.[dateCol.id]
      const d = (dateCol?.rows || []).find((r) => r.id === rid)?.date
      return d ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''
    }
    const out = []
    const push = (group, arr) => arr.slice(0, PER_GROUP).forEach((r) => out.push({ group, ...r }))

    push('pages', PAGES.filter((p) => matches(`${p.label} ${p.words}`, ts)).map((p) => ({ id: p.to, title: p.label, sub: 'Go to page', icon: p.icon, to: p.to })))
    push('tasks', data.items
      .map((i) => ({ i, sub: [listName(i.columnId), dateOf(i)].filter(Boolean).join(' · ') }))
      .filter(({ i, sub }) => matches(`${i.text} ${sub}`, ts))
      .map(({ i, sub }) => ({ id: i.id, title: i.text, sub, icon: LayoutDashboard, to: '/?tab=tasks' })))
    push('notes', (data.notes || [])
      .filter((n) => matches(n.text, ts))
      .map((n) => ({ id: n.id, title: n.text.split('\n')[0] || '(empty note)', sub: n.text.includes('\n') ? n.text.split('\n').slice(1).join(' ').slice(0, 80) : '', icon: StickyNote, to: '/?tab=notes' })))
    push('reminders', (data.reminders || [])
      .filter((r) => matches(`${r.title} ${r.notes}`, ts))
      .map((r) => ({ id: r.id, title: r.title, sub: `${formatWhen(r.at)}${r.done ? ' · Done' : ''}`, icon: BellRing, to: '/?tab=reminders' })))
    // Passwords are never searched; only the visible details of a credential.
    push('credentials', (data.credentials || [])
      .filter((c) => matches(`${c.name} ${c.url} ${c.username} ${c.notes}`, ts))
      .map((c) => ({ id: c.id, title: c.name, sub: [c.url, c.username].filter(Boolean).join(' · '), icon: KeyRound, to: `/credentials?q=${encodeURIComponent(q.trim())}` })))
    return out
  }, [q, data])

  const ts = terms(q)
  const go = (r) => {
    if (!r) return
    setOpen(false)
    navigate(r.to)
  }

  useEffect(() => setActive(0), [q])
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const onKeyDown = (e) => {
    if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]) }
  }

  let flat = -1
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search (Ctrl+K)"
        title="Search (Ctrl+K or /)"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink"
      >
        <Search size={18} />
      </button>

      {open &&
        createPortal(
        <div
          className="fixed inset-0 z-[65] grid place-items-start bg-ink/40 p-3 pt-[8vh] sm:place-items-start sm:justify-center"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div role="dialog" aria-modal="true" aria-label="Search" className="card flex max-h-[80dvh] w-full max-w-xl flex-col overflow-hidden shadow-2xl">
            <div className="flex shrink-0 items-center gap-2 border-b border-line px-3">
              <Search size={18} className="shrink-0 text-muted" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search tasks, notes, reminders, credentials..."
                aria-label="Search"
                autoComplete="off"
                className="h-12 min-w-0 flex-1 bg-transparent outline-none focus-visible:outline-none placeholder:text-muted"
              />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close search" className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink">
                <X size={16} />
              </button>
            </div>

            <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
              {!ts.length ? (
                <p className="px-3 py-8 text-center text-sm text-muted">Type a keyword. Several words narrow the results.</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted">No results for "{q.trim()}".</p>
              ) : (
                GROUPS.map((g) => {
                  const items = results.filter((r) => r.group === g.key)
                  if (!items.length) return null
                  return (
                    <div key={g.key} className="mb-1">
                      <p className="px-2.5 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-muted">{g.label}</p>
                      {items.map((r) => {
                        flat += 1
                        const idx = flat
                        const I = r.icon
                        return (
                          <button
                            key={`${g.key}:${r.id}`}
                            type="button"
                            data-active={idx === active}
                            onMouseEnter={() => setActive(idx)}
                            onClick={() => go(r)}
                            className={cls('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left', idx === active ? 'bg-sunken' : 'hover:bg-sunken/60')}
                          >
                            <I size={16} className="shrink-0 text-accent" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold"><Highlight text={r.title} ts={ts} /></span>
                              {r.sub && <span className="block truncate text-xs text-muted"><Highlight text={r.sub} ts={ts} /></span>}
                            </span>
                            {idx === active && <CornerDownLeft size={14} className="shrink-0 text-muted" />}
                          </button>
                        )
                      })}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

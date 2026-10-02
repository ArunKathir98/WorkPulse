import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, Bot } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { uid, NOTE_COLORS } from '../lib/store.js'
import { parseWhen, reminderMoment, friendlyDay } from '../lib/chatParser.js'
import { firedFor, formatWhen } from '../lib/reminders.js'
import { cls } from './Cards.jsx'

// A free, built-in assistant: no server, no API key, nothing leaves the browser.
// It understands a fixed set of commands and common phrasings (see HELP).

const HELP = [
  'I can manage your data. Try:',
  '• add task call the bank tomorrow',
  '• add task fix login bug to In progress',
  '• add note buy gift for Sam',
  '• remind me to drink water in 30 minutes',
  '• remind me to submit report on 12 oct at 5pm, 10 minutes before',
  '• show tasks today / show notes / show reminders',
  '• move call the bank to Completed',
  '• done reminder submit report',
  '• delete task call the bank'
].join('\n')

const SUGGESTIONS = ['help', 'show tasks today', 'show reminders', 'add note ']

const clean = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
const tidy = (s) => s.replace(/\s+/g, ' ').trim()
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s)

// exact, then starts-with, then contains
function findByText(items, query, get) {
  const q = clean(query)
  if (!q) return []
  const exact = items.filter((i) => clean(get(i)) === q)
  if (exact.length) return exact
  const starts = items.filter((i) => clean(get(i)).startsWith(q))
  if (starts.length) return starts
  return items.filter((i) => clean(get(i)).includes(q))
}

function matchList(listCols, name) {
  const q = clean(name || '')
  if (!q) return null
  return (
    listCols.find((c) => clean(c.title) === q) ||
    listCols.find((c) => clean(c.title).includes(q) || q.includes(clean(c.title))) ||
    null
  )
}

export default function ChatBot() {
  const { data, update } = useData()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([{ role: 'bot', text: "Hi! I'm your WorkPulse assistant. I can add tasks, notes and reminders, and show what's coming up. Type \"help\" to see examples." }])
  const [input, setInput] = useState('')
  const pending = useRef(null) // follow-up we are waiting on
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [msgs, open])
  useEffect(() => {
    if (open) inputRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && open && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const columns = data.settings.columns
  const listCols = columns.filter((c) => c.type === 'list')
  const dateCol = columns.find((c) => c.type === 'date')

  const rowDate = (item) => {
    const id = dateCol && item.fields?.[dateCol.id]
    return (dateCol?.rows || []).find((r) => r.id === id)?.date || ''
  }
  const listTitle = (id) => columns.find((c) => c.id === id)?.title || ''

  // ---- actions ---------------------------------------------------------------------------

  const addTask = (rest) => {
    if (!listCols.length) return 'You have no list columns yet. Add one in Settings first.'
    // "... to <list>" or "... in <list>" picks the list when the name matches one.
    let text = rest
    let target = null
    const re = /\s+(?:to|in|into)\s+(?:the\s+)?/gi
    let hit
    while ((hit = re.exec(rest))) {
      const cand = matchList(listCols, rest.slice(hit.index + hit[0].length).replace(/\s+(?:list|column)$/i, ''))
      if (cand) {
        target = cand
        text = rest.slice(0, hit.index)
        break
      }
    }
    const p = parseWhen(text)
    const title = cap(tidy(p.text))
    if (!title) return 'What should the task say? For example: add task call the bank tomorrow'
    const list = target || listCols[0]
    let note = ''
    let ymd = p.ymd
    if (ymd && ymd < parseWhen('today').ymd) return 'That date is in the past. Tasks can only be dated today or later.'
    if (ymd && !dateCol) { note = ' There is no Date column, so I left the date off.'; ymd = null }
    update((d) => {
      const dc = d.settings.columns.find((c) => c.type === 'date')
      let columnsNext = d.settings.columns
      const fields = {}
      if (ymd && dc) {
        const rows = dc.rows || []
        const found = rows.find((r) => r.date === ymd)
        const rowId = found ? found.id : uid('r')
        if (!found) {
          columnsNext = columnsNext.map((c) => (c.id === dc.id ? { ...c, rows: [...rows, { id: rowId, date: ymd }] } : c))
        }
        fields[dc.id] = rowId
      }
      return {
        ...d,
        settings: { ...d.settings, columns: columnsNext },
        items: [...d.items, { id: uid('t'), text: title, columnId: list.id, createdAt: Date.now(), fields }]
      }
    })
    return `Added task "${title}" to ${list.title}${ymd ? ` for ${friendlyDay(ymd)}` : ''}.${note}`
  }

  const addNote = (rest) => {
    const text = tidy(rest)
    if (!text) return 'What should the note say? For example: add note buy gift for Sam'
    update((d) => {
      const notes = d.notes || []
      const color = NOTE_COLORS[notes.length % NOTE_COLORS.length].value
      return { ...d, notes: [{ id: uid('n'), text, color, createdAt: Date.now() }, ...notes] }
    })
    return `Saved your note: "${text}".`
  }

  const createReminder = (title, at, offsets) => {
    if (!(at > new Date())) return 'That time has already passed. Give me a time in the future.'
    const ts = at.getTime()
    update((d) => ({
      ...d,
      reminders: [
        ...(d.reminders || []),
        { id: uid('r'), title, notes: '', at: ts, offsets, fired: firedFor(ts, offsets), snoozedUntil: null, done: false, createdAt: Date.now() }
      ]
    }))
    const before = offsets[0] ? ` I'll remind you ${offsets[0]} minutes before.` : ''
    return `Reminder set: "${title}" on ${formatWhen(ts)}.${before}`
  }

  const addReminder = (rest) => {
    // "10 minutes before" / "5 min before" chooses the lead time (only 5 or 10 are supported).
    let offsets = [0]
    let note = ''
    const mb = rest.match(/\b(\d+)\s*min(?:ute)?s?\s+(?:before|early|ahead)\b/i)
    let text = rest
    if (mb) {
      text = rest.replace(mb[0], ' ')
      const n = Number(mb[1])
      if (n === 5 || n === 10) offsets = [n]
      else note = ' (I only support 5 or 10 minutes before, so I used on time.)'
    }
    const p = parseWhen(text)
    const title = cap(tidy(p.text.replace(/\bon time\b/i, '')))
    if (!title) return 'What should I remind you about? For example: remind me to call mom tomorrow at 6pm'
    const at = reminderMoment(p)
    if (!at) {
      pending.current = { type: 'reminderTime', title, offsets }
      return `When should I remind you about "${title}"? For example: tomorrow at 5pm, in 30 minutes, or friday 9am.`
    }
    return createReminder(title, at, offsets) + note
  }

  const listTasks = (t) => {
    const p = parseWhen(t)
    const list = matchList(listCols, t.replace(/\b(show|list|me|my|all|the|tasks?|todos?|to-?dos?|what|are|is|due|on|for|in)\b/gi, ' '))
    let items = data.items
    if (p.ymd && dateCol) items = items.filter((i) => rowDate(i) === p.ymd)
    if (list && !p.ymd) items = items.filter((i) => i.columnId === list.id)
    const scope = p.ymd ? ` for ${friendlyDay(p.ymd)}` : list ? ` in ${list.title}` : ''
    if (!items.length) return `You have no tasks${scope}.`
    const lines = items.slice(0, 15).map((i) => `• ${i.text} (${listTitle(i.columnId)}${rowDate(i) && !p.ymd ? `, ${friendlyDay(rowDate(i))}` : ''})`)
    return `Tasks${scope} (${items.length}):\n${lines.join('\n')}${items.length > 15 ? `\n...and ${items.length - 15} more` : ''}`
  }

  const listNotes = () => {
    const notes = data.notes || []
    if (!notes.length) return 'You have no notes yet.'
    return `Notes (${notes.length}):\n${notes.slice(0, 10).map((n) => `• ${n.text.split('\n')[0].slice(0, 80) || '(empty note)'}`).join('\n')}`
  }

  const listReminders = (t) => {
    const p = parseWhen(t)
    let rs = (data.reminders || []).filter((r) => !r.done)
    if (p.ymd) rs = rs.filter((r) => new Date(r.at).toDateString() === new Date(`${p.ymd}T00:00:00`).toDateString())
    rs = [...rs].sort((a, b) => a.at - b.at)
    const scope = p.ymd ? ` for ${friendlyDay(p.ymd)}` : ''
    if (!rs.length) return `You have no active reminders${scope}.`
    return `Reminders${scope} (${rs.length}):\n${rs.slice(0, 12).map((r) => `• ${r.title} — ${formatWhen(r.at)}`).join('\n')}`
  }

  const agenda = (t) => `${listTasks(t)}\n\n${listReminders(t)}`

  const moveTask = (what, where) => {
    const target = matchList(listCols, where.replace(/\s+(?:list|column)$/i, ''))
    if (!target) return `I couldn't find a list called "${where}". Your lists: ${listCols.map((c) => c.title).join(', ') || 'none'}.`
    const hits = findByText(data.items, what, (i) => i.text)
    if (!hits.length) return `I couldn't find a task matching "${what}".`
    if (hits.length > 1) return `Several tasks match "${what}":\n${hits.slice(0, 6).map((i) => `• ${i.text}`).join('\n')}\nBe a bit more specific.`
    const item = hits[0]
    update((d) => ({ ...d, items: d.items.map((i) => (i.id === item.id ? { ...i, columnId: target.id } : i)) }))
    return `Moved "${item.text}" to ${target.title}.`
  }

  const doneThing = (what) => {
    const rHits = findByText((data.reminders || []).filter((r) => !r.done), what, (r) => r.title)
    if (rHits.length === 1) {
      update((d) => ({ ...d, reminders: (d.reminders || []).map((r) => (r.id === rHits[0].id ? { ...r, done: true, snoozedUntil: null } : r)) }))
      return `Marked reminder "${rHits[0].title}" as done.`
    }
    if (rHits.length > 1) return `Several reminders match "${what}":\n${rHits.slice(0, 6).map((r) => `• ${r.title}`).join('\n')}\nBe a bit more specific.`
    const doneList = listCols.find((c) => /done|complete|finish/i.test(c.title)) || listCols[listCols.length - 1]
    if (doneList) return moveTask(what, doneList.title)
    return `I couldn't find a reminder or task matching "${what}".`
  }

  const askDelete = (kind, what) => {
    const pool =
      kind === 'task' ? data.items.map((i) => ({ id: i.id, label: i.text }))
      : kind === 'note' ? (data.notes || []).map((n) => ({ id: n.id, label: n.text.split('\n')[0] }))
      : (data.reminders || []).map((r) => ({ id: r.id, label: r.title }))
    const hits = findByText(pool, what, (x) => x.label)
    if (!hits.length) return `I couldn't find a ${kind} matching "${what}".`
    if (hits.length > 1) return `Several ${kind}s match "${what}":\n${hits.slice(0, 6).map((x) => `• ${x.label}`).join('\n')}\nBe a bit more specific.`
    pending.current = { type: 'confirmDelete', kind, id: hits[0].id, label: hits[0].label }
    return `Delete ${kind} "${hits[0].label}"? This can't be undone. Reply "yes" to confirm or "no" to cancel.`
  }

  const runDelete = ({ kind, id, label }) => {
    update((d) =>
      kind === 'task' ? { ...d, items: d.items.filter((i) => i.id !== id) }
      : kind === 'note' ? { ...d, notes: (d.notes || []).filter((n) => n.id !== id) }
      : { ...d, reminders: (d.reminders || []).filter((r) => r.id !== id) }
    )
    return `Deleted ${kind} "${label}".`
  }

  // ---- understanding ---------------------------------------------------------------------

  const respond = (raw) => {
    const t = tidy(raw)
    const lower = t.toLowerCase()

    const p = pending.current
    if (p) {
      pending.current = null
      if (p.type === 'confirmDelete') {
        if (/^(y|yes|yep|yeah|sure|confirm|ok|okay|do it)\b/.test(lower)) return runDelete(p)
        if (/^(n|no|nope|cancel|stop|don'?t)\b/.test(lower)) return 'Okay, I did not delete anything.'
      } else if (p.type === 'reminderTime') {
        if (/^(cancel|never ?mind|stop|no)\b/.test(lower)) return 'Okay, no reminder created.'
        const at = reminderMoment(parseWhen(t))
        if (at) return createReminder(p.title, at, p.offsets)
        pending.current = p
        return `I couldn't read that as a time. Try "tomorrow at 5pm", "in 30 minutes" or "friday 9am", or say "cancel".`
      }
      // Anything else is a fresh command.
    }

    if (!t) return ''
    if (/\b(password|credential|security key|secret key|recovery code|\bpin\b)/i.test(t))
      return "I can't handle credentials or your security key. Those stay on the Credentials page, where you control them."
    if (/^(help|\?|what can you do|commands|how do i use you|examples?)\b/.test(lower)) return HELP
    if (/^(hi|hello|hey|yo|good (morning|afternoon|evening))\b/.test(lower)) return 'Hello! What would you like to do? Type "help" for ideas.'
    if (/^(thanks|thank you|thx|cheers)\b/.test(lower)) return "You're welcome!"
    if (/^(who are you|what are you)\b/.test(lower)) return "I'm a simple built-in assistant for WorkPulse. I work offline and only understand the commands in \"help\"."

    let m
    if ((m = t.match(/^(?:please\s+)?(?:remind me|set (?:a )?reminder|add (?:a )?reminder|create (?:a )?reminder|new reminder)\s*(?:to|about|that|for|:)?\s*(.*)$/i))) return addReminder(m[1])
    if ((m = t.match(/^(?:please\s+)?(?:add|create|new|make)\s+(?:a\s+)?(?:task|to-?do)\s*(?:to|:|-|that)?\s*(.*)$/i)) || (m = t.match(/^(?:task|todo)\s*[:\-]\s*(.*)$/i))) return addTask(m[1])
    if ((m = t.match(/^(?:please\s+)?(?:add|create|new|take|write|make|save)\s+(?:a\s+)?note\s*(?:to|:|-|that|saying)?\s*(.*)$/i)) || (m = t.match(/^note\s*[:\-]\s*(.*)$/i))) return addNote(m[1])
    if ((m = t.match(/^(?:move|put|shift)\s+(?:task\s+)?(.+?)\s+(?:to|into|in)\s+(.+)$/i))) return moveTask(m[1], m[2])
    if ((m = t.match(/^(?:mark\s+)?(?:done|complete|completed|finish|finished)\s+(?:with\s+)?(?:reminder\s+|task\s+)?(.+)$/i))) return doneThing(m[1])
    if ((m = t.match(/^(?:delete|remove)\s+(?:the\s+)?(task|note|reminder)\s+(.+)$/i))) return askDelete(m[1].toLowerCase(), m[2])
    if (/^(?:show|list|display|see|what(?:'s| are| is)?|whats)\b/.test(lower) || /\b(?:due|coming up|agenda|schedule)\b/.test(lower)) {
      if (/\bnotes?\b/.test(lower)) return listNotes()
      if (/\breminders?\b/.test(lower)) return listReminders(t)
      if (/\b(tasks?|todos?|to-?dos?)\b/.test(lower)) return listTasks(t)
      return agenda(t)
    }

    return `Sorry, I didn't understand that. I only know a few commands.\n\n${HELP}`
  }

  const send = (text) => {
    const t = tidy(text)
    if (!t) return
    setMsgs((ms) => [...ms, { role: 'user', text: t }, { role: 'bot', text: respond(t) }])
    setInput('')
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open assistant"
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-3 z-[55] grid h-12 w-12 place-items-center rounded-full bg-accent text-accentink shadow-lg hover:bg-accent/90 md:bottom-5 md:right-5"
        >
          <MessageCircle size={22} />
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="Assistant"
          className="fixed inset-x-2 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[55] flex h-[min(34rem,calc(100dvh-8rem))] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl md:inset-x-auto md:bottom-5 md:right-5 md:w-[24rem]"
        >
          <header className="flex shrink-0 items-center gap-2 border-b border-line bg-sunken px-3 py-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-accent/15 text-accent"><Bot size={17} /></span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[15px] font-bold leading-tight">Assistant</h2>
              <p className="text-xs text-muted">Built in. Works offline.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-line/50 hover:text-ink">
              <X size={17} />
            </button>
          </header>

          <div role="log" aria-live="polite" className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
            {msgs.map((m, i) => (
              <div key={i} className={cls('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <p
                  className={cls(
                    'max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-snug',
                    m.role === 'user' ? 'rounded-br-md bg-accent text-accentink' : 'rounded-bl-md bg-sunken'
                  )}
                >
                  {m.text}
                </p>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="flex shrink-0 gap-1.5 overflow-x-auto px-3 pb-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => (s.endsWith(' ') ? (setInput(s), inputRef.current?.focus()) : send(s))}
                className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-muted hover:text-ink"
              >
                {s.trim()}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input) }}
            className="flex shrink-0 items-center gap-2 border-t border-line p-2.5"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a command, e.g. add task..."
              aria-label="Message"
              autoComplete="off"
              className="field h-10"
            />
            <button type="submit" disabled={!input.trim()} aria-label="Send" className="btn btn-primary h-10 w-10 shrink-0 px-0">
              <Send size={16} />
            </button>
          </form>
        </section>
      )}
    </>
  )
}

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { Plus, Bell, BellOff, BellRing, Pencil, Trash2, Check, AlarmClockOff, Undo2 } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { uid } from '../lib/store.js'
import {
  OFFSETS, SNOOZES, snoozeLabel, offsetLabel, toTimestamp, dateInputValue, timeInputValue,
  formatWhen, formatTime, firedFor, countdown, notificationsSupported
} from '../lib/reminders.js'
import { useConfirm } from './ConfirmDialog.jsx'
import { cls } from './Cards.jsx'

function useNow(ms = 30000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

function ReminderForm({ initial, onSave, onClose }) {
  const start = initial?.at || Date.now() + 3600000
  const [title, setTitle] = useState(initial?.title || '')
  const [date, setDate] = useState(dateInputValue(start))
  const [time, setTime] = useState(timeInputValue(start))
  const [offsets, setOffsets] = useState(initial?.offsets || [0])
  const [notes, setNotes] = useState(initial?.notes || '')
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggle = (v) => setOffsets((o) => (o.includes(v) ? o.filter((x) => x !== v) : [...o, v].sort((a, b) => a - b)))

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) return setError('Give the reminder a title.')
    if (!date || !time) return setError('Choose a date and a time.')
    if (!offsets.length) return setError('Choose when to remind you: on time, 5 or 10 minutes before.')
    const at = toTimestamp(date, time)
    if (!(at > Date.now())) return setError('Pick a date and time in the future.')
    onSave({
      id: initial?.id || uid('r'),
      createdAt: initial?.createdAt || Date.now(),
      title: title.trim(),
      notes: notes.trim(),
      at,
      offsets,
      fired: firedFor(at, offsets),
      snoozedUntil: null,
      done: false
    })
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label={initial ? 'Edit reminder' : 'Add reminder'}
        className="card max-h-[calc(100dvh-2rem)] w-full max-w-md space-y-4 overflow-y-auto rounded-xl p-5 shadow-2xl"
      >
        <h2 className="font-display text-xl font-bold">{initial ? 'Edit reminder' : 'Add reminder'}</h2>

        <div>
          <label htmlFor="r-title" className="mb-1.5 block text-sm font-semibold">Title</label>
          <input id="r-title" autoFocus className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Call the bank" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="r-date" className="mb-1.5 block text-sm font-semibold">Date</label>
            <input id="r-date" type="date" className="field" min={dateInputValue(Date.now())} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label htmlFor="r-time" className="mb-1.5 block text-sm font-semibold">Time</label>
            <input id="r-time" type="time" className="field" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">Remind me</legend>
          <div className="space-y-1.5">
            {OFFSETS.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3 py-2 has-[:checked]:border-accent has-[:checked]:bg-accent/10">
                <input
                  type="checkbox"
                  checked={offsets.includes(o.value)}
                  onChange={() => toggle(o.value)}
                  className="h-4 w-4 accent-[rgb(var(--accent))]"
                />
                <span className="text-sm font-semibold">{o.label}</span>
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted">You can pick more than one. You can snooze when the reminder appears.</p>
        </fieldset>

        <div>
          <label htmlFor="r-notes" className="mb-1.5 block text-sm font-semibold">Additional information</label>
          <textarea id="r-notes" rows={3} className="field h-auto resize-none py-2" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn">Cancel</button>
          <button type="submit" className="btn btn-primary">Save</button>
        </div>
      </form>
    </div>,
    document.body
  )
}

function statusOf(r, now) {
  if (r.done) return { label: 'Done', tone: 'muted' }
  if (r.snoozedUntil && r.snoozedUntil > now) return { label: `Snoozed until ${formatTime(r.snoozedUntil)}`, tone: 'warn' }
  if (r.at <= now) return { label: 'Due', tone: 'danger' }
  return { label: `Upcoming, ${countdown(r.at, now)}`, tone: 'accent' }
}

const TONES = {
  muted: 'bg-sunken text-muted',
  warn: 'bg-orange-500/15 text-orange-600 dark:text-orange-300',
  danger: 'bg-danger/15 text-danger',
  accent: 'bg-accent/15 text-accent'
}

function NotificationBar() {
  const [perm, setPerm] = useState(() => (notificationsSupported() ? Notification.permission : 'unsupported'))
  const ask = async () => {
    try { setPerm(await Notification.requestPermission()) } catch { setPerm(Notification.permission) }
  }
  return (
    <div className="mb-3 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm">
      {perm === 'granted' ? (
        <span className="flex items-center gap-2 font-semibold text-accent"><Bell size={16} /> Notifications on</span>
      ) : perm === 'default' ? (
        <>
          <span className="flex items-center gap-2 font-semibold"><BellOff size={16} className="text-muted" /> Notifications off</span>
          <button type="button" className="btn h-8 text-sm" onClick={ask}>Enable notifications</button>
        </>
      ) : (
        <span className="flex items-center gap-2 text-muted">
          <BellOff size={16} />
          {perm === 'denied'
            ? 'Notifications are blocked in your browser settings. You will still get an alert inside the app.'
            : 'This browser has no notifications. You will still get an alert inside the app.'}
        </span>
      )}
      <span className="text-xs text-muted sm:ml-auto">Reminders only fire while WorkPulse is open, in a tab or as the installed app.</span>
    </div>
  )
}

export default function RemindersBoard() {
  const { data, update } = useData()
  const list = data.reminders || []
  const now = useNow()
  const [form, setForm] = useState(null) // { initial }
  const [confirm, confirmDialog] = useConfirm()

  const setList = (fn) => update((d) => ({ ...d, reminders: fn(d.reminders || []) }))
  const patch = (id, p) => setList((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)))

  const save = (rec) => {
    setList((rs) => (rs.some((r) => r.id === rec.id) ? rs.map((r) => (r.id === rec.id ? rec : r)) : [...rs, rec]))
    setForm(null)
  }

  const remove = async (r) => {
    const ok = await confirm({
      title: `Delete "${r.title}"?`,
      message: 'This reminder will be permanently deleted and will not alert you. This cannot be undone.',
      confirmLabel: 'Delete reminder'
    })
    if (ok) setList((rs) => rs.filter((x) => x.id !== r.id))
  }

  // Active ones by next alert time, finished ones last.
  const sorted = [...list].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    const ta = a.snoozedUntil && a.snoozedUntil > now ? a.snoozedUntil : a.at
    const tb = b.snoozedUntil && b.snoozedUntil > now ? b.snoozedUntil : b.at
    return ta - tb
  })

  return (
    <div className="flex flex-col md:min-h-0 md:flex-1">
      <NotificationBar />

      <div className="shrink-0 pb-3">
        <button type="button" onClick={() => setForm({ initial: null })} className="btn btn-primary">
          <Plus size={16} /> Add reminder
        </button>
      </div>

      <div className="rounded-xl border border-line bg-surface p-3 md:min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain">
        {sorted.length === 0 ? (
          <div className="grid h-full min-h-[30vh] place-items-center text-center">
            <div className="max-w-xs space-y-2">
              <BellRing className="mx-auto text-muted" size={28} />
              <p className="font-display text-lg font-bold">No reminders yet</p>
              <p className="text-sm text-muted">Add one with a date and time. Choose to be reminded on time, 5 or 10 minutes before, and snooze it when it appears.</p>
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] items-start gap-3">
            {sorted.map((r) => {
              const st = statusOf(r, now)
              const due = !r.done && r.at <= now && !(r.snoozedUntil && r.snoozedUntil > now)
              return (
                <li key={r.id} className={cls('card flex flex-col gap-3 p-4', r.done && 'opacity-60')}>
                  <div className="flex items-start gap-2">
                    <h2 className={cls('min-w-0 flex-1 break-words font-display text-lg font-bold leading-snug', r.done && 'line-through')}>{r.title}</h2>
                    <span className={cls('shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold', TONES[st.tone])}>{st.label}</span>
                  </div>
                  <p className="text-sm">{formatWhen(r.at)}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {r.offsets.map((o) => (
                      <span key={o} className="rounded-md bg-sunken px-1.5 py-0.5 text-xs text-muted">{offsetLabel(o)}</span>
                    ))}
                  </div>
                  {r.notes && <p className="whitespace-pre-wrap break-words text-sm text-muted">{r.notes}</p>}

                  {(due || (r.snoozedUntil && r.snoozedUntil > now)) && (
                    <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-2">
                      <span className="text-xs font-semibold text-muted">Snooze</span>
                      {SNOOZES.slice(0, 4).map((m) => (
                        <button key={m} type="button" className="btn h-7 px-2 text-xs" onClick={() => patch(r.id, { snoozedUntil: Date.now() + m * 60000 })}>
                          {snoozeLabel(m)}
                        </button>
                      ))}
                      {r.snoozedUntil > now && (
                        <button type="button" className="btn h-7 px-2 text-xs" onClick={() => patch(r.id, { snoozedUntil: null })}>
                          <AlarmClockOff size={13} /> Cancel snooze
                        </button>
                      )}
                    </div>
                  )}

                  <div className="mt-auto flex justify-end gap-1 border-t border-line pt-2">
                    {r.done ? (
                      <button type="button" className="btn h-8 px-2.5 text-sm" onClick={() => patch(r.id, { done: false })}>
                        <Undo2 size={14} /> Undo
                      </button>
                    ) : (
                      <button type="button" className="btn h-8 px-2.5 text-sm" onClick={() => patch(r.id, { done: true, snoozedUntil: null })}>
                        <Check size={14} /> Done
                      </button>
                    )}
                    <button type="button" className="btn h-8 px-2.5 text-sm" onClick={() => setForm({ initial: r })}>
                      <Pencil size={14} /> Edit
                    </button>
                    <button type="button" className="btn btn-danger h-8 px-2.5 text-sm" onClick={() => remove(r)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {form && <ReminderForm initial={form.initial} onSave={save} onClose={() => setForm(null)} />}
      {confirmDialog}
    </div>
  )
}

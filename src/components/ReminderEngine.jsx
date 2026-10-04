import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { BellRing } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { SNOOZES, snoozeLabel, formatWhen, showSystemNotification, advanceReminder, firedFor } from '../lib/reminders.js'

const TICK_MS = 10000

// Mounted once in the layout, so reminders fire on every page while the app is open.
export default function ReminderEngine() {
  const { data, update } = useData()
  const [queue, setQueue] = useState([]) // [{ key, id, body }]
  const [snooze, setSnooze] = useState(10)
  const dataRef = useRef(data)
  const seen = useRef(new Set())
  dataRef.current = data

  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const list = dataRef.current.reminders || []
      const alerts = []
      const patches = {}

      for (const r of list) {
        if (r.done) continue
        if (r.snoozedUntil) {
          if (now >= r.snoozedUntil) {
            patches[r.id] = { snoozedUntil: null }
            alerts.push({ key: `${r.id}:snooze:${r.snoozedUntil}`, id: r.id, body: 'Snoozed reminder is due again.' })
          }
          continue
        }
        const due = r.offsets.filter((o) => !r.fired?.[o] && now >= r.at - o * 60000)
        let patch = null
        if (due.length) {
          const fired = { ...r.fired }
          due.forEach((o) => { fired[o] = true })
          patch = { fired }
          const mins = Math.ceil((r.at - now) / 60000)
          alerts.push({
            key: `${r.id}:${due.join(',')}:${r.at}`,
            id: r.id,
            at: r.at,
            repeats: !!r.repeat,
            body: mins <= 0 ? "It's time." : `Starts in ${mins} minute${mins === 1 ? '' : 's'}.`
          })
        }
        // A repeating reminder moves on to its next occurrence once this one has come around.
        if (r.repeat && now >= r.at) {
          const next = advanceReminder(r, now)
          // Past the end date: stay as a normal one-off until it is marked done, so the final alert is not lost.
          patch = next
            ? { at: next, fired: firedFor(next, r.offsets, now), snoozedUntil: null }
            : { ...(patch || {}), repeat: null }
        }
        if (patch) patches[r.id] = patch
      }

      if (Object.keys(patches).length)
        update((d) => ({
          ...d,
          reminders: (d.reminders || []).map((r) => (patches[r.id] ? { ...r, ...patches[r.id] } : r))
        }))

      const fresh = alerts.filter((a) => !seen.current.has(a.key))
      if (!fresh.length) return
      fresh.forEach((a) => {
        seen.current.add(a.key)
        const r = list.find((x) => x.id === a.id)
        showSystemNotification(r?.title || 'Reminder', a.body, a.id)
      })
      setQueue((q) => [...q, ...fresh])
    }

    tick()
    const t = setInterval(tick, TICK_MS)
    // Timers are throttled in background tabs, so catch up the moment the tab is visible again.
    const onVis = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [update])

  const current = queue[0]
  const reminder = current && (data.reminders || []).find((r) => r.id === current.id)

  // Skip alerts whose reminder was deleted or finished in the meantime.
  useEffect(() => {
    if (current && (!reminder || reminder.done)) setQueue((q) => q.slice(1))
  }, [current, reminder])

  if (!current || !reminder || reminder.done) return null

  const next = () => setQueue((q) => q.slice(1))
  const patch = (p) =>
    update((d) => ({ ...d, reminders: (d.reminders || []).map((r) => (r.id === reminder.id ? { ...r, ...p } : r)) }))

  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/40 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="rem-title"
        aria-describedby="rem-body"
        className="card max-h-[calc(100dvh-2rem)] w-full max-w-sm space-y-4 overflow-y-auto rounded-xl p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
            <BellRing size={20} />
          </span>
          <div className="min-w-0">
            <h2 id="rem-title" className="break-words font-display text-lg font-bold">{reminder.title}</h2>
            <p id="rem-body" className="mt-0.5 text-sm text-muted">{current.body}</p>
            <p className="text-xs text-muted">{formatWhen(current.at ?? reminder.at)}</p>
            {reminder.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{reminder.notes}</p>}
            {queue.length > 1 && <p className="mt-2 text-xs font-semibold text-accent">{queue.length - 1} more waiting</p>}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-semibold">Snooze for</p>
          <div role="radiogroup" aria-label="Snooze duration" className="flex flex-wrap gap-1.5">
            {SNOOZES.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={snooze === m}
                onClick={() => setSnooze(m)}
                className={
                  'h-8 rounded-lg border px-3 text-sm font-semibold ' +
                  (snooze === m ? 'border-accent bg-accent/10 text-ink' : 'border-line text-muted hover:text-ink')
                }
              >
                {snoozeLabel(m)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn" onClick={next}>Dismiss</button>
          <button
            type="button"
            className="btn"
            onClick={() => { patch({ snoozedUntil: Date.now() + snooze * 60000 }); next() }}
          >
            Snooze {snoozeLabel(snooze)}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => { patch({ done: true, snoozedUntil: null }); next() }}>
            {current.repeats ? 'Stop repeating' : 'Mark done'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

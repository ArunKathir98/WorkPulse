export const OFFSETS = [
  { value: 0, label: 'On time' },
  { value: 5, label: '5 minutes before' },
  { value: 10, label: '10 minutes before' }
]
export const SNOOZES = [5, 10, 15, 30, 60]

export const offsetLabel = (o) => OFFSETS.find((x) => x.value === o)?.label || `${o} minutes before`
export const snoozeLabel = (m) => (m >= 60 ? `${m / 60} hour` : `${m} min`)

export const toTimestamp = (date, time) => new Date(`${date}T${time}`).getTime()

const pad = (n) => String(n).padStart(2, '0')
export const dateInputValue = (ts) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export const timeInputValue = (ts) => {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const formatWhen = (ts) =>
  new Date(ts).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
  })
export const formatTime = (ts) => new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

// Reminder times that have already passed when it is saved are marked fired, so they never alert late.
export const firedFor = (at, offsets, now = Date.now()) =>
  Object.fromEntries(offsets.filter((o) => now >= at - o * 60000).map((o) => [o, true]))

export function countdown(ts, now = Date.now()) {
  const mins = Math.round((ts - now) / 60000)
  if (mins < 1) return 'in less than a minute'
  if (mins < 60) return `in ${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h < 24) return m ? `in ${h} h ${m} min` : `in ${h} h`
  const d = Math.floor(h / 24)
  return `in ${d} day${d > 1 ? 's' : ''}`
}

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window

// Uses the service worker when there is one: mobile browsers do not allow `new Notification()`.
export async function showSystemNotification(title, body, tag) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) return await reg.showNotification(title, { body, tag, icon: 'icon-192.png', renotify: true })
    new Notification(title, { body, tag, icon: 'icon-192.png' })
  } catch {
    // The in-app alert still shows.
  }
}

// ---- Repeating reminders -----------------------------------------------------------------------
// repeat = { type: 'daily' | 'weekly' | 'monthly', days: [0-6] (weekly, 0 = Sunday), dom: 1-31 (monthly),
//            until: 'YYYY-MM-DD' | null }
// `at` on a reminder is always its NEXT occurrence; the engine moves it forward after it has fired.

export const WEEKDAYS = [
  { value: 1, short: 'Mon', long: 'Monday' },
  { value: 2, short: 'Tue', long: 'Tuesday' },
  { value: 3, short: 'Wed', long: 'Wednesday' },
  { value: 4, short: 'Thu', long: 'Thursday' },
  { value: 5, short: 'Fri', long: 'Friday' },
  { value: 6, short: 'Sat', long: 'Saturday' },
  { value: 0, short: 'Sun', long: 'Sunday' }
]

const ymdOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const daysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()

function matchesDay(rep, d) {
  if (rep.type === 'daily') return true
  if (rep.type === 'weekly') return rep.days.includes(d.getDay())
  // A month shorter than the chosen day (31st in April) uses its last day.
  return d.getDate() === Math.min(rep.dom, daysInMonth(d))
}

// First occurrence strictly after `fromTs` at the given time of day, or null once past `until`.
export function nextOccurrence(rep, fromTs, h, m) {
  const start = new Date(fromTs)
  start.setHours(0, 0, 0, 0)
  for (let i = 0; i < 800; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const cand = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0)
    if (cand.getTime() <= fromTs) continue
    if (rep.until && ymdOf(cand) > rep.until) return null
    if (matchesDay(rep, d)) return cand.getTime()
  }
  return null
}

// What to move a fired reminder to: the next match after both its own time and now, so a long
// absence skips the missed days instead of replaying them one by one.
export function advanceReminder(r, now = Date.now()) {
  const d = new Date(r.at)
  return nextOccurrence(r.repeat, Math.max(r.at, now), d.getHours(), d.getMinutes())
}

export function describeRepeat(rep) {
  if (!rep) return ''
  const until = rep.until
    ? ` until ${new Date(`${rep.until}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
    : ''
  if (rep.type === 'daily') return `Every day${until}`
  if (rep.type === 'weekly') {
    const names = WEEKDAYS.filter((w) => rep.days.includes(w.value)).map((w) => w.short)
    return `Every ${names.join(', ')}${until}`
  }
  const n = rep.dom
  const suffix = n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'
  return `Monthly on the ${n}${suffix}${until}`
}

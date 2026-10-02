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

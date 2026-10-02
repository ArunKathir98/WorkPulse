// Tiny date/time phrase parser for the built-in assistant. No network, no AI: pattern matching only.
const pad = (n) => String(n).padStart(2, '0')
const ymdOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const hmOf = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const MONTH_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
const monthIndex = (s) => MONTHS.indexOf(s.slice(0, 3).toLowerCase())

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
const addDays = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

// Returns { text, ymd, hm, at }. `text` is the input with the date/time phrases removed.
// ymd = 'YYYY-MM-DD' or null, hm = 'HH:MM' or null, at = Date for relative times ("in 30 minutes").
export function parseWhen(input, now = new Date()) {
  let s = ` ${input} `
  let date = null
  let hm = null
  let at = null

  const take = (re, fn) => {
    const m = s.match(re)
    if (!m) return false
    s = s.replace(re, ' ')
    fn(m)
    return true
  }

  // "in 30 minutes", "in 2 hours", "in 3 days"
  take(/\bin\s+(\d+|an?|half an?)\s*(min(?:ute)?s?|hours?|hrs?|days?|weeks?)\b/i, (m) => {
    const raw = m[1].toLowerCase()
    const n = raw.startsWith('half') ? 0.5 : /^an?$/.test(raw) ? 1 : Number(raw)
    const unit = m[2].toLowerCase()
    if (unit.startsWith('min')) at = new Date(now.getTime() + n * 60000)
    else if (unit.startsWith('h')) at = new Date(now.getTime() + n * 3600000)
    else date = addDays(startOfDay(now), unit.startsWith('w') ? n * 7 : n)
  })

  if (!at) {
    take(/\b(day after tomorrow)\b/i, () => { date = addDays(startOfDay(now), 2) })
    if (!date) take(/\b(tomorrow|tmrw|tomorow)\b/i, () => { date = addDays(startOfDay(now), 1) })
    if (!date) take(/\b(today|tonight)\b/i, (m) => {
      date = startOfDay(now)
      if (/tonight/i.test(m[1])) hm = hm || '20:00'
    })

    if (!date) {
      take(/\b(\d{4})-(\d{2})-(\d{2})\b/, (m) => { date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) })
    }
    if (!date) {
      const re1 = new RegExp(`\\b(?:on\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH_RE}(?:,?\\s+(\\d{4}))?\\b`, 'i')
      const re2 = new RegExp(`\\b(?:on\\s+)?${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, 'i')
      const build = (day, mon, yr) => {
        let d = new Date(yr ? Number(yr) : now.getFullYear(), monthIndex(mon), Number(day))
        // No year given and the date already passed this year: assume next year.
        if (!yr && startOfDay(d) < startOfDay(now)) d = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate())
        date = d
      }
      take(re1, (m) => build(m[1], m[2], m[3]))
      if (!date) take(re2, (m) => build(m[2], m[1], m[3]))
    }
    if (!date) {
      const full = '(sunday|monday|tuesday|wednesday|thursday|friday|saturday)'
      const abbr = '(sun|mon|tues?|wed|thu(?:rs?)?|fri|sat)'
      const pick = (name, prefix) => {
        const idx = DAYS.findIndex((d) => d.startsWith(name.slice(0, 3).toLowerCase()))
        let diff = (idx - now.getDay() + 7) % 7
        if (prefix && prefix.toLowerCase() === 'next' && diff === 0) diff = 7
        date = addDays(startOfDay(now), diff)
      }
      // Short names only count after next/this/on, so ordinary words are not misread.
      take(new RegExp(`\\b(?:(next|this|on)\\s+)?${full}\\b`, 'i'), (m) => pick(m[2], m[1]))
      if (!date) take(new RegExp(`\\b(next|this|on)\\s+${abbr}\\b`, 'i'), (m) => pick(m[2], m[1]))
    }

    // Times
    take(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)(?!\w)/i, (m) => {
      let h = Number(m[1]) % 12
      if (/^p/i.test(m[3])) h += 12
      hm = `${pad(h)}:${m[2] || '00'}`
    })
    if (!hm) take(/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/, (m) => { hm = `${pad(Number(m[1]))}:${m[2]}` })
    if (!hm) take(/\b(noon|midday)\b/i, () => { hm = '12:00' })
    if (!hm) take(/\bmidnight\b/i, () => { hm = '23:59' })
    if (!hm) take(/\bat\s+(\d{1,2})\b(?!\s*(?:min|hour|day))/i, (m) => {
      // "at 5" is ambiguous: 1 to 6 read as the afternoon, 7 to 11 as the morning.
      const h = Number(m[1])
      hm = `${pad(h >= 1 && h <= 6 ? h + 12 : h % 24)}:00`
    })
    if (!hm) take(/\b(this\s+)?(morning|afternoon|evening)\b/i, (m) => {
      hm = { morning: '09:00', afternoon: '15:00', evening: '18:00' }[m[2].toLowerCase()]
    })
  }

  const text = s
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:to|that|about|for|on|at|by)\s+/i, '')
    .replace(/\s+(?:on|at|for|by|in|to|this|next)$/i, '')
    .trim()

  if (at) return { text, ymd: ymdOf(at), hm: hmOf(at), at }
  return { text, ymd: date ? ymdOf(date) : null, hm, at: null }
}

// Reminder moment from parsed parts: a bare time means today, or tomorrow if it has passed.
export function reminderMoment(p, now = new Date()) {
  if (p.at) return p.at
  if (p.ymd) return new Date(`${p.ymd}T${p.hm || '09:00'}`)
  if (p.hm) {
    const d = new Date(`${ymdOf(now)}T${p.hm}`)
    return d <= now ? new Date(d.getTime() + 86400000) : d
  }
  return null
}

export const friendlyDay = (ymd, now = new Date()) => {
  const diff = Math.round((startOfDay(new Date(`${ymd}T00:00:00`)) - startOfDay(now)) / 86400000)
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  return new Date(`${ymd}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

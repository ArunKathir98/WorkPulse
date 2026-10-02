import { getStoredTheme } from './theme.js'

export const uid = (prefix = 'x') => `${prefix}_${Math.random().toString(36).slice(2, 10)}`

export const COLUMN_TYPES = [
  { value: 'list', label: 'List', hint: 'Holds tasks you drag between columns' },
  { value: 'date', label: 'Date field', hint: 'A date on every task, e.g. due date' },
  { value: 'text', label: 'Text field', hint: 'A short note on every task' },
  { value: 'number', label: 'Number field', hint: 'A number on every task, e.g. estimate' }
]

// Tints for alternate rows (dates) and alternate list columns in the date grid.
export const STRIPE_THEMES = [
  { value: 'none', label: 'None', row: null, col: null },
  { value: 'ocean', label: 'Ocean', row: '56 140 230', col: '14 160 150' },
  { value: 'forest', label: 'Forest', row: '70 160 90', col: '170 160 60' },
  { value: 'sunset', label: 'Sunset', row: '240 140 60', col: '230 80 110' },
  { value: 'berry', label: 'Berry', row: '150 90 220', col: '225 90 170' },
  { value: 'slate', label: 'Slate', row: '120 130 145', col: '90 110 140' }
]

// Sticky-note paper colors (shown the same in light and dark mode).
export const NOTE_COLORS = [
  { value: 'yellow', label: 'Yellow', bg: '#fff3a3', edge: '#e6d56a' },
  { value: 'pink', label: 'Pink', bg: '#ffc9d9', edge: '#ee9db6' },
  { value: 'blue', label: 'Blue', bg: '#bfe3ff', edge: '#8fc3ee' },
  { value: 'green', label: 'Green', bg: '#c9f0c0', edge: '#98d48c' },
  { value: 'orange', label: 'Orange', bg: '#ffd9a8', edge: '#efb470' },
  { value: 'purple', label: 'Purple', bg: '#e1d0ff', edge: '#bfa3ee' }
]

export function defaultData() {
  const todo = uid('c'), doing = uid('c'), done = uid('c')
  return {
    version: 1,
    settings: {
      theme: getStoredTheme(),
      stripes: 'ocean',
      columns: [
        { id: todo, title: 'To do', icon: 'ListTodo', type: 'list' },
        { id: doing, title: 'In progress', icon: 'Clock', type: 'list' },
        { id: done, title: 'Completed', icon: 'CircleCheck', type: 'list' }
      ]
    },
    items: [
      { id: uid('t'), text: 'Drag me to Completed', columnId: todo, createdAt: Date.now(), fields: {} }
    ],
    notes: [],
    credentials: [],
    reminders: [],
    profile: { displayName: '', customPicture: null }
  }
}

// Fill in anything missing so older/partial files never crash the app.
export function normalize(raw) {
  const base = defaultData()
  const d = raw && typeof raw === 'object' ? raw : {}
  let columns = Array.isArray(d.settings?.columns) ? d.settings.columns : base.settings.columns
  const ids = new Set(columns.map((c) => c.id))
  let items = (Array.isArray(d.items) ? d.items : []).filter((i) => ids.has(i.columnId))
  items = items.map((i) => ({ ...i, fields: i.fields || {} }))
  // Older files stored dates as plain strings on tasks (+ column.dates); convert to row ids.
  const firstDate = columns.find((c) => c.type === 'date')
  if (firstDate && !Array.isArray(firstDate.rows)) {
    const byDate = new Map()
    const rowFor = (date) => {
      if (!byDate.has(date)) byDate.set(date, { id: uid('r'), date })
      return byDate.get(date).id
    }
    ;(firstDate.dates || []).forEach(rowFor)
    items = items.map((i) => {
      const v = i.fields[firstDate.id]
      return v ? { ...i, fields: { ...i.fields, [firstDate.id]: rowFor(v) } } : i
    })
    const { dates: _old, ...rest } = firstDate
    columns = columns.map((c) => (c === firstDate ? { ...rest, rows: [...byDate.values()] } : c))
  }
  return {
    version: 1,
    settings: {
      theme: d.settings?.theme === 'dark' ? 'dark' : d.settings?.theme === 'light' ? 'light' : base.settings.theme,
      security:
        typeof d.settings?.security?.salt === 'string' && typeof d.settings?.security?.verifier === 'string'
          ? {
              salt: d.settings.security.salt,
              verifier: d.settings.security.verifier,
              pub: d.settings.security.pub || null,
              wrapped: d.settings.security.wrapped || null,
              recovery:
                d.settings.security.recovery?.salt && d.settings.security.recovery?.verifier && d.settings.security.recovery?.wrapped
                  ? d.settings.security.recovery
                  : null
            }
          : null,
      stripes: STRIPE_THEMES.some((t) => t.value === d.settings?.stripes) ? d.settings.stripes : base.settings.stripes,
      columns
    },
    items,
    credentials: (Array.isArray(d.credentials) ? d.credentials : []).map((c) => ({
      id: c.id || uid('k'),
      name: String(c.name || ''),
      url: String(c.url || ''),
      username: String(c.username || ''),
      password: typeof c.password === 'string' ? c.password : '',
      protected: !!c.protected && !!c.enc,
      enc: c.enc && c.enc.iv && c.enc.ct ? { iv: c.enc.iv, ct: c.enc.ct, ek: c.enc.ek || null } : null,
      notes: String(c.notes || ''),
      lost: !!c.lost && !c.enc && !c.password,
      createdAt: c.createdAt || Date.now()
    })),
    reminders: (Array.isArray(d.reminders) ? d.reminders : [])
      .filter((r) => Number.isFinite(r?.at))
      .map((r) => {
        const offsets = (Array.isArray(r.offsets) ? r.offsets : [0]).filter((o) => [0, 5, 10].includes(o))
        return {
          id: r.id || uid('r'),
          title: String(r.title || ''),
          notes: String(r.notes || ''),
          at: r.at,
          offsets: offsets.length ? offsets : [0],
          fired: r.fired && typeof r.fired === 'object' ? r.fired : {},
          snoozedUntil: Number.isFinite(r.snoozedUntil) ? r.snoozedUntil : null,
          done: !!r.done,
          createdAt: r.createdAt || Date.now()
        }
      }),
    notes: (Array.isArray(d.notes) ? d.notes : []).map((n) => ({
      id: n.id || uid('n'),
      text: typeof n.text === 'string' ? n.text : '',
      color: NOTE_COLORS.some((c) => c.value === n.color) ? n.color : 'yellow',
      createdAt: n.createdAt || Date.now()
    })),
    profile: { displayName: '', customPicture: null, ...(d.profile || {}) }
  }
}

export function formatField(col, value) {
  if (col.type === 'date') {
    const d = new Date(`${value}T00:00:00`)
    return isNaN(d) ? value : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  return String(value)
}

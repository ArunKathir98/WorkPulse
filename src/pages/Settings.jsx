import { useState } from 'react'
import { ArrowUp, ArrowDown, Pencil, Trash2, Plus, Sun, Moon } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { Icon } from '../lib/icons.jsx'
import IconPicker from '../components/IconPicker.jsx'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import SecurityKeySettings from '../components/SecurityKeySettings.jsx'
import { COLUMN_TYPES, STRIPE_THEMES, uid } from '../lib/store.js'

function ColumnForm({ initial, onSubmit, onCancel }) {
  const editing = Boolean(initial)
  const [title, setTitle] = useState(initial?.title || '')
  const [icon, setIcon] = useState(initial?.icon || 'ListTodo')
  const [type, setType] = useState(initial?.type || 'list')
  const hint = COLUMN_TYPES.find((t) => t.value === type)?.hint

  const submit = (e) => {
    e.preventDefault()
    if (title.trim()) onSubmit({ title: title.trim(), icon, type })
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-sunken p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="col-title" className="mb-1.5 block text-sm font-semibold">Title</label>
          <input id="col-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className="field" placeholder="e.g. Blocked" />
        </div>
        <div>
          <label htmlFor="col-type" className="mb-1.5 block text-sm font-semibold">Type</label>
          <select id="col-type" value={type} disabled={editing} onChange={(e) => setType(e.target.value)} className="field">
            {COLUMN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <p className="mt-1 text-xs text-muted">
            {editing ? 'The type cannot change after a column is created.' : hint}
          </p>
        </div>
      </div>
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Icon</span>
        <IconPicker value={icon} onChange={setIcon} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn">Cancel</button>
        <button type="submit" disabled={!title.trim()} className="btn btn-primary">
          {editing ? 'Save column' : 'Add column'}
        </button>
      </div>
    </form>
  )
}

export default function Settings() {
  const { data, update } = useData()
  const { columns, theme } = data.settings
  const [editingId, setEditingId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [confirm, confirmDialog] = useConfirm()

  const setColumns = (fn) =>
    update((d) => ({ ...d, settings: { ...d.settings, columns: fn(d.settings.columns) } }))

  const move = (idx, dir) =>
    setColumns((cols) => {
      const next = [...cols]
      const j = idx + dir
      if (j < 0 || j >= next.length) return cols
      ;[next[idx], next[j]] = [next[j], next[idx]]
      return next
    })

  const remove = async (col) => {
    const count = data.items.filter((i) => i.columnId === col.id).length
    const kind = { list: 'list column', date: 'date column', text: 'text field', number: 'number field' }[col.type]
    let message
    if (col.type === 'list' && count)
      message = `This deletes the ${kind} and permanently deletes its ${count} task${count > 1 ? 's' : ''}. This cannot be undone.`
    else if (col.type === 'list') message = `This deletes the empty ${kind}.`
    else message = `This deletes the ${kind} and removes its value from every task. The tasks themselves are kept.`
    const ok = await confirm({ title: `Delete "${col.title}"?`, message, confirmLabel: 'Delete column' })
    if (!ok) return
    update((d) => ({
      ...d,
      settings: { ...d.settings, columns: d.settings.columns.filter((c) => c.id !== col.id) },
      items: d.items
        .filter((i) => i.columnId !== col.id)
        .map((i) => {
          if (!(col.id in i.fields)) return i
          const { [col.id]: _drop, ...rest } = i.fields
          return { ...i, fields: rest }
        })
    }))
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-6">
      <h1 className="font-display text-2xl font-bold">Settings</h1>

      <fieldset className="card p-5">
        <legend className="px-1 font-display text-lg font-bold">Appearance</legend>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {[
            { v: 'light', label: 'Light', I: Sun },
            { v: 'dark', label: 'Dark', I: Moon }
          ].map(({ v, label, I }) => (
            <label key={v} className="relative cursor-pointer">
              <input
                type="radio"
                name="theme"
                value={v}
                checked={theme === v}
                onChange={() => update((d) => ({ ...d, settings: { ...d.settings, theme: v } }))}
                className="peer sr-only"
              />
              <span className="flex h-12 items-center gap-2.5 rounded-lg border border-line px-4 font-semibold peer-checked:border-accent peer-checked:bg-accent/10 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                <span className="grid h-4 w-4 place-items-center rounded-full border border-muted peer-checked:border-accent">
                  {theme === v && <span className="h-2 w-2 rounded-full bg-accent" />}
                </span>
                <I size={16} /> {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="card p-5">
        <legend className="px-1 font-display text-lg font-bold">Grid colors</legend>
        <p className="text-sm text-muted">Tints alternate date rows and alternate list columns in the date grid.</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {STRIPE_THEMES.map((t) => (
            <label key={t.value} className="relative cursor-pointer">
              <input
                type="radio"
                name="stripes"
                value={t.value}
                checked={(data.settings.stripes || 'ocean') === t.value}
                onChange={() => update((d) => ({ ...d, settings: { ...d.settings, stripes: t.value } }))}
                className="peer sr-only"
              />
              <span className="flex h-12 items-center gap-2.5 rounded-lg border border-line px-3 font-semibold peer-checked:border-accent peer-checked:bg-accent/10 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                <span className="flex overflow-hidden rounded border border-line">
                  <span className="h-5 w-3.5" style={{ background: t.row ? `rgb(${t.row} / 0.55)` : 'transparent' }} />
                  <span className="h-5 w-3.5" style={{ background: t.col ? `rgb(${t.col} / 0.55)` : 'transparent' }} />
                </span>
                {t.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <SecurityKeySettings />

      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Columns</h2>
            <p className="text-sm text-muted">Lists hold tasks. Date, text and number columns add a field to every task.</p>
          </div>
          {!adding && (
            <button className="btn btn-primary shrink-0" onClick={() => { setAdding(true); setEditingId(null) }}>
              <Plus size={16} /> Add column
            </button>
          )}
        </div>

        <ul className="mt-4 space-y-2">
          {columns.map((col, idx) => (
            <li key={col.id}>
              {editingId === col.id ? (
                <ColumnForm
                  initial={col}
                  onCancel={() => setEditingId(null)}
                  onSubmit={({ title, icon }) => {
                    setColumns((cols) => cols.map((c) => (c.id === col.id ? { ...c, title, icon } : c)))
                    setEditingId(null)
                  }}
                />
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                  <Icon name={col.icon} size={18} className="shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{col.title}</p>
                    <p className="text-xs text-muted">{COLUMN_TYPES.find((t) => t.value === col.type)?.label}</p>
                  </div>
                  <button aria-label={`Move ${col.title} up`} disabled={idx === 0} onClick={() => move(idx, -1)} className="btn h-9 w-9 px-0"><ArrowUp size={16} /></button>
                  <button aria-label={`Move ${col.title} down`} disabled={idx === columns.length - 1} onClick={() => move(idx, 1)} className="btn h-9 w-9 px-0"><ArrowDown size={16} /></button>
                  <button aria-label={`Edit ${col.title}`} onClick={() => { setEditingId(col.id); setAdding(false) }} className="btn h-9 w-9 px-0"><Pencil size={16} /></button>
                  <button aria-label={`Delete ${col.title}`} onClick={() => remove(col)} className="btn btn-danger h-9 w-9 px-0"><Trash2 size={16} /></button>
                </div>
              )}
            </li>
          ))}
        </ul>

        {adding && (
          <div className="mt-3">
            <ColumnForm
              onCancel={() => setAdding(false)}
              onSubmit={(c) => {
                setColumns((cols) => [...cols, { id: uid('c'), ...c }])
                setAdding(false)
              }}
            />
          </div>
        )}
      </section>

      {confirmDialog}
    </div>
  )
}

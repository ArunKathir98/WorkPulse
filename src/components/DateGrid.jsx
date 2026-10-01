import { useCallback, useState, useSyncExternalStore } from 'react'
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors,
  closestCorners, useDroppable
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Plus, X, CalendarPlus, ChevronLeft, ChevronRight, ChevronsLeftRight, ChevronsRightLeft } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { Icon } from '../lib/icons.jsx'
import { uid, STRIPE_THEMES } from '../lib/store.js'
import TaskDialog from './TaskDialog.jsx'
import { useConfirm } from './ConfirmDialog.jsx'
import { CardBody, TaskCard, cls } from './Cards.jsx'

// Date-grid layout: one row per date, one column per list. The date is stored on
// each task in its Date field holds a row id; dateCol.rows is [{ id, date }], so a
// row's date can be edited (or left blank) without touching the tasks.
const todayStr = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
// Phones get stacked sections (lists top to bottom) instead of a wide table.
const MOBILE_QUERY = '(max-width: 767px)'
const isMobileNow = () => typeof window !== 'undefined' && window.matchMedia?.(MOBILE_QUERY).matches
function useIsMobile() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(MOBILE_QUERY)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    isMobileNow,
    () => false
  )
}

const pad = (n) => String(n).padStart(2, '0')
const shiftDay = (day, n) => {
  const d = new Date(`${day}T00:00:00`)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const shiftMonth = (ym, n) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}
const monthTitle = (ym) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
const VIEWS = [
  { value: 'all', label: 'All' },
  { value: 'month', label: 'Month' },
  { value: 'day', label: 'Day' }
]
const cellId = (day, colId) => `${day}|${colId}`

function rowTitle(row) {
  if (!row.id) return 'No date'
  if (!row.date) return 'a row with no date'
  const d = new Date(`${row.date}T00:00:00`)
  return isNaN(d) ? row.date : d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
}

// Each non-empty line becomes its own task.
function CellAdd({ onAdd, label }) {
  const [text, setText] = useState('')
  const submit = (e) => {
    e.preventDefault()
    const lines = text.split('\n').map((t) => t.trim()).filter(Boolean)
    if (!lines.length) return
    onAdd(lines)
    setText('')
  }
  return (
    <form onSubmit={submit} className="mt-auto space-y-1.5 pt-1">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Add tasks, one per line"
        aria-label={`Add tasks to ${label}`}
        className="field h-auto resize-none bg-transparent py-1.5 text-sm"
      />
      <button type="submit" className="btn h-8 w-full text-sm" disabled={!text.trim()}>
        <Plus size={14} /> Add
      </button>
    </form>
  )
}

function Cell({ day, label, col, items, fieldCols, onEdit, onAdd, tint, collapsed, virtual, readOnly, compact }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell:${cellId(day, col.id)}`,
    data: { type: 'cell', day, columnId: col.id },
    disabled: virtual
  })
  if (collapsed)
    return (
      <div
        ref={setNodeRef}
        style={tint}
        title={`${items.length} task${items.length === 1 ? '' : 's'} in ${col.title}. Expand the column to see them.`}
        className={cls('flex min-h-[8rem] justify-center border-b border-r border-line pt-3 transition-colors', isOver && 'bg-accent/5')}
      >
        <span className="text-xs font-semibold tabular-nums text-muted">{items.length}</span>
      </div>
    )
  return (
    <div
      ref={setNodeRef}
      style={tint}
      className={cls(
        'flex flex-col gap-2 border-b border-line p-2 transition-colors',
        compact ? 'min-h-[5rem]' : 'min-h-[8rem] border-r',
        isOver && 'bg-accent/5'
      )}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <TaskCard key={item.id} item={item} fieldCols={fieldCols} onEdit={onEdit} />
        ))}
      </SortableContext>
      {!readOnly && <CellAdd onAdd={onAdd} label={`${col.title}, ${label}`} />}
    </div>
  )
}

function Row({ row, rowIdx, stripe, listCols, items, fieldCols, onEdit, onAdd, onRemove, onDate, mobile }) {
  const virtual = !!row.virtual
  const readOnly = virtual && row.date < todayStr()
  const day = row.id
  const rowTint = stripe?.row && rowIdx % 2 === 1 ? `rgb(${stripe.row} / 0.14)` : null
  const headerEl = (
      <div
        style={rowTint ? { backgroundImage: `linear-gradient(${rowTint}, ${rowTint})` } : undefined}
        className={
          mobile
            ? 'relative flex items-start justify-between gap-1 border-b border-line bg-sunken p-3'
            : 'sticky left-0 z-10 flex items-start justify-between gap-1 border-b border-r border-line bg-sunken p-3'
        }
      >
        {day ? (
          <div className="min-w-0 flex-1 space-y-1.5 pr-5">
            {row.date ? (
              <div className="leading-tight">
                <div className="font-display text-base font-bold">
                  {new Date(`${row.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long' })}
                </div>
                <div className="text-sm text-muted">
                  {new Date(`${row.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            ) : (
              <div className="font-display text-base font-bold leading-tight text-muted">Pick a date</div>
            )}
            {!virtual && (
              <input
                type="date"
                value={row.date}
                min={todayStr()}
                onChange={(e) => onDate(e.target.value)}
                aria-label="Row date"
                className="field h-8 w-full min-w-0 px-2 text-sm"
              />
            )}
          </div>
        ) : (
          <span className="font-display text-base font-bold leading-snug">No date</span>
        )}
        {day && !virtual && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove row ${rowTitle(row)}`}
            className="absolute right-1.5 top-1.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted hover:bg-line/50 hover:text-ink"
          >
            <X size={14} />
          </button>
        )}
      </div>
  )
  const cellEls = listCols.map((col, ci) => {
        const colTint = stripe?.col && ci % 2 === 1 ? `rgb(${stripe.col} / 0.12)` : null
        const layers = [rowTint, colTint].filter(Boolean).map((c) => `linear-gradient(${c}, ${c})`)
        return (
        <Cell
          tint={layers.length ? { backgroundImage: layers.join(', ') } : undefined}
          key={col.id}
          day={day}
          virtual={virtual}
          readOnly={readOnly}
          compact={mobile}
          collapsed={!mobile && col.width === 'collapsed'}
          label={rowTitle(row)}
          col={col}
          items={items.filter((i) => i.columnId === col.id)}
          fieldCols={fieldCols}
          onEdit={onEdit}
          onAdd={(lines) => onAdd(row, col.id, lines)}
        />
        )
      })

  if (!mobile)
    return (
      <>
        {headerEl}
        {cellEls}
      </>
    )

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface">
      {headerEl}
      {listCols.map((col, ci) => (
        <div key={col.id}>
          <div className="flex items-center gap-2 border-b border-line bg-sunken/60 px-3 py-1.5">
            <Icon name={col.icon} size={15} className="shrink-0 text-accent" />
            <span className="truncate text-sm font-bold">{col.title}</span>
            <span className="text-xs tabular-nums text-muted">{items.filter((i) => i.columnId === col.id).length}</span>
          </div>
          {cellEls[ci]}
        </div>
      ))}
    </section>
  )
}

export default function DateGrid({ dateCol }) {
  const { data, update } = useData()
  const columns = data.settings.columns
  const listCols = columns.filter((c) => c.type === 'list')
  // The date is the row header, so it never shows as a label or in the edit dialog.
  const fieldCols = columns.filter((c) => c.type !== 'list' && c.id !== dateCol.id)
  const [active, setActive] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const mobile = useIsMobile()
  // Phones open on today's day view; wider screens open on the full table.
  const [view, setView] = useState(() => (isMobileNow() ? 'day' : 'all')) // all | month | day
  const [month, setMonth] = useState(() => todayStr().slice(0, 7))
  const [dayPick, setDayPick] = useState(todayStr)
  const [confirm, confirmDialog] = useConfirm()

  const dateRows = dateCol.rows || []
  const rowIds = new Set(dateRows.map((r) => r.id))
  // Tasks whose row is missing fall into a "No date" row, shown only when needed.
  const dayOf = (i) => (rowIds.has(i.fields?.[dateCol.id]) ? i.fields[dateCol.id] : '')
  const sortedRows = [...dateRows].sort((a, b) =>
    a.date && b.date ? a.date.localeCompare(b.date) : a.date ? -1 : b.date ? 1 : 0
  )
  let rows
  if (view === 'month') {
    // Only that month's dated rows; an empty month is just an empty grid.
    rows = sortedRows.filter((r) => r.date.startsWith(month))
  } else if (view === 'day') {
    rows = sortedRows.filter((r) => r.date === dayPick)
    // No row for that day yet: show an empty one that is created when a task is added.
    if (!rows.length) rows = [{ id: 'virtual', date: dayPick, virtual: true }]
  } else {
    rows = data.items.some((i) => !dayOf(i)) ? [{ id: '', date: '' }, ...sortedRows] : sortedRows
  }
  const stripe = STRIPE_THEMES.find((t) => t.value === data.settings.stripes)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const collisionDetection = useCallback(
    (args) =>
      closestCorners({
        ...args,
        droppableContainers: args.droppableContainers.filter((c) => ['item', 'cell'].includes(c.data.current?.type))
      }),
    []
  )

  const setRows = (fn) =>
    update((d) => ({
      ...d,
      settings: {
        ...d.settings,
        columns: d.settings.columns.map((c) => (c.id === dateCol.id ? { ...c, rows: fn(c.rows || []) } : c))
      }
    }))

  const withDay = (item, day, columnId) => {
    const fields = { ...item.fields }
    if (day) fields[dateCol.id] = day
    else delete fields[dateCol.id]
    return { ...item, columnId, fields }
  }

  const addRow = () => {
    // In month view, start the new row inside that month (never in the past).
    let date = ''
    if (view === 'month') date = month === todayStr().slice(0, 7) ? todayStr() : `${month}-01`
    setRows((rs) => [...rs, { id: uid('r'), date }])
  }

  const setRowDate = (id, date) => {
    if (date && date < todayStr()) return
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, date } : r)))
  }

  const removeDay = async (row) => {
    const day = row.id
    const n = data.items.filter((i) => dayOf(i) === day).length
    const ok = await confirm({
      title: row.date ? `Delete ${rowTitle(row)}?` : 'Delete this row?',
      message: n
        ? `This removes the row and permanently deletes its ${n} task${n > 1 ? 's' : ''} across all lists. This cannot be undone.`
        : 'This removes the row. It has no tasks.',
      confirmLabel: 'Delete date'
    })
    if (!ok) return
    update((d) => ({
      ...d,
      settings: {
        ...d.settings,
        columns: d.settings.columns.map((c) =>
          c.id === dateCol.id ? { ...c, rows: (c.rows || []).filter((r) => r.id !== day) } : c
        )
      },
      items: d.items.filter((i) => i.fields?.[dateCol.id] !== day)
    }))
  }

  const addTasks = (row, columnId, lines) =>
    update((d) => {
      let rowId = row.id
      let settings = d.settings
      if (row.virtual) {
        rowId = uid('r')
        settings = {
          ...settings,
          columns: settings.columns.map((c) =>
            c.id === dateCol.id ? { ...c, rows: [...(c.rows || []), { id: rowId, date: row.date }] } : c
          )
        }
      }
      return {
        ...d,
        settings,
        items: [
          ...d.items,
          ...lines.map((text) => withDay({ id: uid('t'), text, createdAt: Date.now(), fields: {} }, rowId, columnId))
        ]
      }
    })

  const onDragOver = ({ active, over }) => {
    if (!over || active.data.current?.type !== 'item') return
    update((d) => {
      const a = d.items.find((i) => i.id === active.id)
      if (!a) return d
      let day, columnId, overItemId = null
      if (over.data.current?.type === 'item') {
        const o = d.items.find((i) => i.id === over.id)
        if (!o) return d
        day = dayOf(o)
        columnId = o.columnId
        overItemId = o.id
      } else {
        day = over.data.current.day
        columnId = over.data.current.columnId
      }
      if (dayOf(a) === day && a.columnId === columnId) return d
      const rest = d.items.filter((i) => i.id !== a.id)
      const moved = withDay(a, day, columnId)
      if (overItemId) rest.splice(rest.findIndex((i) => i.id === overItemId), 0, moved)
      else rest.push(moved)
      return { ...d, items: rest }
    })
  }

  const onDragEnd = ({ active, over }) => {
    setActive(null)
    if (!over || active.id === over.id || over.data.current?.type !== 'item') return
    update((d) => {
      const a = d.items.find((i) => i.id === active.id)
      const o = d.items.find((i) => i.id === over.id)
      if (!a || !o || a.columnId !== o.columnId || dayOf(a) !== dayOf(o)) return d
      return { ...d, items: arrayMove(d.items, d.items.indexOf(a), d.items.indexOf(o)) }
    })
  }

  const rowEls = rows.map((row, rowIdx) => (
    <Row
      key={row.id || 'none'}
      row={row}
      mobile={mobile}
      onDate={(date) => setRowDate(row.id, date)}
      rowIdx={rowIdx}
      stripe={stripe}
      listCols={listCols}
      items={data.items.filter((i) => dayOf(i) === row.id)}
      fieldCols={fieldCols}
      onEdit={setEditingId}
      onAdd={addTasks}
      onRemove={() => removeDay(row)}
    />
  ))

  const editing = data.items.find((i) => i.id === editingId)
  const activeItem = active ? data.items.find((i) => i.id === active) : null
  // px is set by dragging a header's right edge; `drag` holds the live width until release.
  const [drag, setDrag] = useState(null)
  const widthOf = (c) =>
    c.width === 'collapsed'
      ? '3.5rem'
      : drag?.id === c.id
        ? `${drag.px}px`
        : c.px
          ? `${c.px}px`
          : 'minmax(15rem, 1fr)'
  const cols = `10.5rem ${listCols.map(widthOf).join(' ')}`
  const startResize = (e, col) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = e.currentTarget.parentElement.getBoundingClientRect().width
    const clamp = (x) => Math.round(Math.min(720, Math.max(200, startW + x - startX)))
    const move = (ev) => setDrag({ id: col.id, px: clamp(ev.clientX) })
    const up = (ev) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      setDrag(null)
      setPx(col.id, clamp(ev.clientX))
    }
    setDrag({ id: col.id, px: Math.round(startW) })
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }
  const setPx = (id, px) =>
    update((d) => ({
      ...d,
      settings: { ...d.settings, columns: d.settings.columns.map((c) => (c.id === id ? { ...c, px } : c)) }
    }))
  const setWidth = (id, width) =>
    update((d) => ({
      ...d,
      settings: { ...d.settings, columns: d.settings.columns.map((c) => (c.id === id ? { ...c, width } : c)) }
    }))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 pb-3">
        <div role="group" aria-label="Board view" className="flex rounded-lg border border-line bg-surface p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              aria-pressed={view === v.value}
              onClick={() => setView(v.value)}
              className={cls(
                'h-8 rounded-md px-3 text-sm font-semibold transition-colors',
                view === v.value ? 'bg-accent text-accentink' : 'text-muted hover:text-ink'
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        {view === 'month' && (
          <div className="flex items-center gap-1">
            <button type="button" className="btn h-8 w-8 px-0" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[9.5rem] text-center font-display text-base font-bold">{monthTitle(month)}</span>
            <button type="button" className="btn h-8 w-8 px-0" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>
              <ChevronRight size={16} />
            </button>
            <button type="button" className="btn ml-1 h-8" onClick={() => setMonth(todayStr().slice(0, 7))}>This month</button>
          </div>
        )}

        {view === 'day' && (
          <div className="flex items-center gap-1">
            <button type="button" className="btn h-8 w-8 px-0" aria-label="Previous day" onClick={() => setDayPick(shiftDay(dayPick, -1))}>
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              value={dayPick}
              onChange={(e) => e.target.value && setDayPick(e.target.value)}
              aria-label="Show day"
              className="field h-8 w-auto px-2 text-sm"
            />
            <button type="button" className="btn h-8 w-8 px-0" aria-label="Next day" onClick={() => setDayPick(shiftDay(dayPick, 1))}>
              <ChevronRight size={16} />
            </button>
            <button type="button" className="btn ml-1 h-8" onClick={() => setDayPick(todayStr())}>Today</button>
          </div>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={({ active }) => setActive(active.id)}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActive(null)}
      >
        {mobile ? (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain">
            {rowEls}
            {rows.length === 0 && (
              <p className="px-1 py-10 text-center text-sm text-muted">No dates in this month yet.</p>
            )}
          </div>
        ) : (
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-xl border border-line bg-surface">
          <div className="grid min-w-max" style={{ gridTemplateColumns: cols }}>
            <div className="sticky left-0 top-0 z-30 flex h-12 items-center gap-2 border-b border-r border-line bg-sunken px-3">
              <Icon name={dateCol.icon} size={17} className="shrink-0 text-accent" />
              <span className="truncate font-display text-[15px] font-bold">{dateCol.title}</span>
            </div>
            {listCols.map((col) => {
              const collapsed = col.width === 'collapsed'
              const count = data.items.filter((i) => i.columnId === col.id).length
              const btn = 'grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted hover:bg-line/50 hover:text-ink'
              return (
                <div
                  key={col.id}
                  className={cls(
                    'sticky top-0 z-20 flex h-12 items-center border-b border-r border-line bg-sunken',
                    collapsed ? 'flex-col justify-center gap-0.5 px-0' : 'gap-1.5 px-3'
                  )}
                >
                  {collapsed ? (
                    <button type="button" onClick={() => setWidth(col.id, undefined)} aria-label={`Expand ${col.title} column`} title={`Expand ${col.title}`} className={btn}>
                      <ChevronsLeftRight size={15} />
                    </button>
                  ) : (
                    <>
                      <Icon name={col.icon} size={17} className="shrink-0 text-accent" />
                      <span className="truncate font-display text-[15px] font-bold">{col.title}</span>
                      <span className="text-xs tabular-nums text-muted">{count}</span>
                      <span className="ml-auto flex shrink-0">
                        <button type="button" onClick={() => setWidth(col.id, 'collapsed')} aria-label={`Collapse ${col.title} column`} title="Collapse" className={btn}>
                          <ChevronsRightLeft size={15} />
                        </button>
                      </span>
                      <div
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={`Resize ${col.title} column. Double-click to reset.`}
                        title="Drag to resize. Double-click to reset."
                        onPointerDown={(e) => startResize(e, col)}
                        onDoubleClick={() => setPx(col.id, undefined)}
                        className="group absolute -right-1.5 top-0 z-20 flex h-full w-3 cursor-col-resize touch-none items-center justify-center"
                      >
                        <span className={cls('h-6 w-1 rounded-full transition-colors group-hover:bg-accent', drag?.id === col.id ? 'bg-accent' : 'bg-line')} />
                      </div>
                    </>
                  )}
                </div>
              )
            })}

            {rowEls}
          </div>
        </div>
        )}

        <DragOverlay>{activeItem && <CardBody item={activeItem} fieldCols={fieldCols} lifted />}</DragOverlay>
      </DndContext>

      {(view === 'all' || (view === 'month' && month >= todayStr().slice(0, 7))) && (
        <div className="shrink-0 pt-3">
          <button type="button" onClick={addRow} className="btn">
            <CalendarPlus size={16} /> Add row
          </button>
        </div>
      )}

      {confirmDialog}

      {editing && (
        <TaskDialog
          item={editing}
          fieldCols={fieldCols}
          onClose={() => setEditingId(null)}
          onSave={(patch) => {
            update((d) => ({ ...d, items: d.items.map((i) => (i.id === editing.id ? { ...i, ...patch } : i)) }))
            setEditingId(null)
          }}
          onDelete={() => {
            update((d) => ({ ...d, items: d.items.filter((i) => i.id !== editing.id) }))
            setEditingId(null)
          }}
        />
      )}
    </div>
  )
}

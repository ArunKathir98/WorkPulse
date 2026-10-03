import { useCallback, useState } from 'react'
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors,
  closestCorners, closestCenter, useDroppable
} from '@dnd-kit/core'
import {
  SortableContext, rectSortingStrategy, verticalListSortingStrategy, useSortable,
  arrayMove, sortableKeyboardCoordinates
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ArrowUpDown, ArrowDownAZ, ArrowUpAZ, Plus } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { Icon } from '../lib/icons.jsx'
import { uid } from '../lib/store.js'
import TaskDialog from './TaskDialog.jsx'
import DateGrid from './DateGrid.jsx'
import { CardBody, TaskCard, cls } from './Cards.jsx'

// Put the reordered list columns back into their slots in the full columns array.
function applyListOrder(all, orderedIds) {
  const byId = Object.fromEntries(all.map((c) => [c.id, c]))
  let i = 0
  return all.map((c) => (c.type === 'list' ? byId[orderedIds[i++]] : c))
}

function AddTask({ onAdd, label }) {
  const [text, setText] = useState('')
  const submit = (e) => {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    onAdd(t)
    setText('')
  }
  return (
    <form onSubmit={submit} className="flex items-center gap-1.5 pt-1">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a task"
        aria-label={`Add a task to ${label}`}
        className="field h-9 bg-transparent"
      />
      <button type="submit" aria-label="Add task" className="btn h-9 w-9 shrink-0 px-0" disabled={!text.trim()}>
        <Plus size={16} />
      </button>
    </form>
  )
}

function Lane({ col, items, sort, onSort, fieldCols, onEdit, onAdd }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: col.id, data: { type: 'column' } })
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `lane:${col.id}`,
    data: { type: 'lane', columnId: col.id }
  })
  const SortIcon = sort === 'az' ? ArrowDownAZ : sort === 'za' ? ArrowUpAZ : ArrowUpDown
  const sortLabel =
    sort === 'az' ? 'sorted A to Z' : sort === 'za' ? 'sorted Z to A' : 'in your own order'

  return (
    <section
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        minWidth: 0
      }}
      aria-label={col.title}
      className={cls(
        'flex flex-col border-b border-line last:border-b-0 md:flex-[1_0_17rem] md:border-b-0 md:border-r md:last:border-r-0',
        isDragging && 'opacity-40'
      )}
    >
      <header className="flex h-12 items-center gap-1 border-b border-line bg-sunken px-1.5">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Move ${col.title} column`}
          className="grid h-8 w-7 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted hover:text-ink"
        >
          <GripVertical size={16} />
        </button>
        <button
          type="button"
          onClick={onSort}
          aria-label={`${col.title}, ${sortLabel}. Activate to change sorting`}
          title={sort ? 'Sorted. Drag-reordering is paused inside this column.' : 'Click to sort'}
          className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 text-left hover:bg-line/50"
        >
          <Icon name={col.icon} size={17} className="shrink-0 text-accent" />
          <span className="truncate font-display text-[15px] font-bold">{col.title}</span>
          <span className="text-xs tabular-nums text-muted">{items.length}</span>
          <SortIcon size={15} className={cls('ml-auto shrink-0', sort ? 'text-accent' : 'text-muted')} />
        </button>
      </header>

      <div
        ref={setDropRef}
        className={cls('flex flex-1 flex-col gap-2 p-2 min-h-[8rem] md:min-h-[42vh] transition-colors', isOver && 'bg-accent/5')}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <TaskCard key={item.id} item={item} fieldCols={fieldCols} onEdit={onEdit} />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <p className="px-1 py-6 text-center text-sm text-muted">Nothing here. Drop a task or add one.</p>
        )}
        <div className="mt-auto"><AddTask onAdd={onAdd} label={col.title} /></div>
      </div>
    </section>
  )
}

function ListBoard() {
  const { data, update } = useData()
  const columns = data.settings.columns
  const listCols = columns.filter((c) => c.type === 'list')
  const fieldCols = columns.filter((c) => c.type !== 'list')
  const [sorts, setSorts] = useState({})
  const [active, setActive] = useState(null)
  const [editingId, setEditingId] = useState(null)

  // Long-press (220 ms) starts a drag on touch so normal swipes still scroll.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const collisionDetection = useCallback((args) => {
    const isColumn = args.active.data.current?.type === 'column'
    const wanted = isColumn ? ['column'] : ['item', 'lane']
    const droppableContainers = args.droppableContainers.filter((c) =>
      wanted.includes(c.data.current?.type)
    )
    return isColumn
      ? closestCenter({ ...args, droppableContainers })
      : closestCorners({ ...args, droppableContainers })
  }, [])

  const laneItems = (col) => {
    const arr = data.items.filter((i) => i.columnId === col.id)
    const s = sorts[col.id]
    if (!s) return arr
    const sorted = [...arr].sort((a, b) => a.text.localeCompare(b.text, undefined, { sensitivity: 'base' }))
    return s === 'za' ? sorted.reverse() : sorted
  }

  const cycleSort = (colId) =>
    setSorts((s) => {
      const next = { ...s }
      const cur = s[colId]
      if (!cur) next[colId] = 'az'
      else if (cur === 'az') next[colId] = 'za'
      else delete next[colId]
      return next
    })

  const onDragStart = ({ active }) =>
    setActive({ type: active.data.current?.type, id: active.id })

  const onDragOver = ({ active, over }) => {
    if (!over || active.data.current?.type !== 'item') return
    const overType = over.data.current?.type
    update((d) => {
      const a = d.items.find((i) => i.id === active.id)
      if (!a) return d
      let target
      let overItemId = null
      if (overType === 'item') {
        const o = d.items.find((i) => i.id === over.id)
        if (!o) return d
        target = o.columnId
        overItemId = o.id
      } else if (overType === 'lane') {
        target = over.data.current.columnId
      } else return d
      if (a.columnId === target) return d
      const rest = d.items.filter((i) => i.id !== a.id)
      const moved = { ...a, columnId: target }
      if (overItemId) rest.splice(rest.findIndex((i) => i.id === overItemId), 0, moved)
      else rest.push(moved)
      return { ...d, items: rest }
    })
  }

  const onDragEnd = ({ active, over }) => {
    setActive(null)
    if (!over || active.id === over.id) return
    const type = active.data.current?.type
    if (type === 'column') {
      const ids = listCols.map((c) => c.id)
      const from = ids.indexOf(active.id)
      const to = ids.indexOf(over.id)
      if (from < 0 || to < 0) return
      update((d) => ({
        ...d,
        settings: {
          ...d.settings,
          columns: applyListOrder(d.settings.columns, arrayMove(ids, from, to))
        }
      }))
    } else if (type === 'item' && over.data.current?.type === 'item') {
      update((d) => {
        const a = d.items.find((i) => i.id === active.id)
        const o = d.items.find((i) => i.id === over.id)
        if (!a || !o || a.columnId !== o.columnId || sorts[a.columnId]) return d
        return { ...d, items: arrayMove(d.items, d.items.indexOf(a), d.items.indexOf(o)) }
      })
    }
  }

  const addTask = (columnId, text) =>
    update((d) => ({
      ...d,
      items: [...d.items, { id: uid('t'), text, columnId, createdAt: Date.now(), fields: {} }]
    }))

  const editing = data.items.find((i) => i.id === editingId)
  const activeItem = active?.type === 'item' ? data.items.find((i) => i.id === active.id) : null
  const activeCol = active?.type === 'column' ? listCols.find((c) => c.id === active.id) : null

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActive(null)}
      >
        <div className="rounded-xl border border-line bg-surface md:overflow-x-auto">
          <SortableContext items={listCols.map((c) => c.id)} strategy={rectSortingStrategy}>
            <div className="flex min-w-full flex-col md:flex-row">
              {listCols.map((col) => (
                <Lane
                  key={col.id}
                  col={col}
                  items={laneItems(col)}
                  sort={sorts[col.id]}
                  onSort={() => cycleSort(col.id)}
                  fieldCols={fieldCols}
                  onEdit={setEditingId}
                  onAdd={(t) => addTask(col.id, t)}
                />
              ))}
            </div>
          </SortableContext>
        </div>

        <DragOverlay>
          {activeItem && <CardBody item={activeItem} fieldCols={fieldCols} lifted />}
          {activeCol && (
            <div className="flex h-12 items-center gap-2 rounded-lg border border-accent bg-sunken px-3 shadow-xl">
              <Icon name={activeCol.icon} size={17} className="text-accent" />
              <span className="font-display text-[15px] font-bold">{activeCol.title}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

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
    </>
  )
}

export default function Board() {
  const { data } = useData()
  const dateCol = data.settings.columns.find((c) => c.type === 'date')
  return dateCol ? <DateGrid dateCol={dateCol} /> : <ListBoard />
}

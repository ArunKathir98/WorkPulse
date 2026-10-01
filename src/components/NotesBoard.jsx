import { useEffect, useRef, useState } from 'react'
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, closestCenter
} from '@dnd-kit/core'
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Trash2, StickyNote } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { uid, NOTE_COLORS } from '../lib/store.js'
import { useConfirm } from './ConfirmDialog.jsx'
import { cls } from './Cards.jsx'

const colorOf = (key) => NOTE_COLORS.find((c) => c.value === key) || NOTE_COLORS[0]

function NoteBody({ note, lifted, onText, onColor, onDelete, handleProps, autoFocus }) {
  const c = colorOf(note.color)
  const ref = useRef(null)

  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  // Grow the textarea with its content so every note shows all of its text.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 112)}px`
  }, [note.text])

  return (
    <div
      style={{ background: c.bg, borderColor: c.edge, color: '#26231b' }}
      className={cls(
        'flex flex-col rounded-lg border p-2 shadow-sm',
        lifted && 'rotate-1 shadow-xl ring-2 ring-accent/40'
      )}
    >
      <div className="mb-1 flex items-center gap-1">
        <button
          type="button"
          aria-label="Move note"
          {...handleProps}
          className="grid h-7 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-md opacity-60 hover:opacity-100"
        >
          <GripVertical size={16} />
        </button>
        <div role="radiogroup" aria-label="Note color" className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {NOTE_COLORS.map((nc) => (
            <button
              key={nc.value}
              type="button"
              role="radio"
              aria-checked={nc.value === c.value}
              aria-label={nc.label}
              title={nc.label}
              onClick={() => onColor(nc.value)}
              style={{ background: nc.bg, borderColor: nc.edge }}
              className={cls(
                'h-4 w-4 rounded-full border',
                nc.value === c.value && 'ring-2 ring-[#26231b]/60 ring-offset-1 ring-offset-transparent'
              )}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Delete note"
          onClick={onDelete}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md opacity-60 hover:bg-black/10 hover:opacity-100"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <textarea
        ref={ref}
        value={note.text}
        onChange={(e) => onText(e.target.value)}
        placeholder="Write a note..."
        aria-label="Note text"
        rows={3}
        className="w-full resize-none bg-transparent px-1 text-[15px] leading-snug outline-none placeholder:text-[#26231b]/50"
      />
    </div>
  )
}

function SortableNote({ note, ...rest }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: note.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cls(isDragging && 'opacity-30')}
    >
      <NoteBody
        note={note}
        handleProps={{ ref: setActivatorNodeRef, ...attributes, ...listeners }}
        {...rest}
      />
    </div>
  )
}

export default function NotesBoard() {
  const { data, update } = useData()
  const notes = data.notes || []
  const [active, setActive] = useState(null)
  const [freshId, setFreshId] = useState(null)
  const [confirm, confirmDialog] = useConfirm()

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const setNotes = (fn) => update((d) => ({ ...d, notes: fn(d.notes || []) }))

  const addNote = () => {
    const id = uid('n')
    // Cycle through the palette so neighbouring notes differ.
    const color = NOTE_COLORS[notes.length % NOTE_COLORS.length].value
    setNotes((ns) => [{ id, text: '', color, createdAt: Date.now() }, ...ns])
    setFreshId(id)
  }

  const patch = (id, p) => setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, ...p } : n)))

  const remove = async (note) => {
    const has = note.text.trim().length > 0
    if (has) {
      const ok = await confirm({
        title: 'Delete this note?',
        message: 'The note and everything written on it will be permanently deleted. This cannot be undone.',
        confirmLabel: 'Delete note'
      })
      if (!ok) return
    }
    setNotes((ns) => ns.filter((n) => n.id !== note.id))
  }

  const onDragEnd = ({ active, over }) => {
    setActive(null)
    if (!over || active.id === over.id) return
    setNotes((ns) => {
      const from = ns.findIndex((n) => n.id === active.id)
      const to = ns.findIndex((n) => n.id === over.id)
      return from < 0 || to < 0 ? ns : arrayMove(ns, from, to)
    })
  }

  const activeNote = notes.find((n) => n.id === active)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 pb-3">
        <button type="button" onClick={addNote} className="btn btn-primary">
          <Plus size={16} /> Add note
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface p-3">
        {notes.length === 0 ? (
          <div className="grid h-full min-h-[40vh] place-items-center text-center">
            <div className="max-w-xs space-y-2">
              <StickyNote className="mx-auto text-muted" size={28} />
              <p className="font-display text-lg font-bold">No notes yet</p>
              <p className="text-sm text-muted">Add a sticky note to jot something down. Drag notes to reorder them.</p>
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={({ active }) => setActive(active.id)}
            onDragEnd={onDragEnd}
            onDragCancel={() => setActive(null)}
          >
            <SortableContext items={notes.map((n) => n.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] items-start gap-3">
                {notes.map((n) => (
                  <SortableNote
                    key={n.id}
                    note={n}
                    autoFocus={n.id === freshId}
                    onText={(text) => patch(n.id, { text })}
                    onColor={(color) => patch(n.id, { color })}
                    onDelete={() => remove(n)}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>{activeNote && <NoteBody note={activeNote} lifted onText={() => {}} onColor={() => {}} onDelete={() => {}} />}</DragOverlay>
          </DndContext>
        )}
      </div>

      {confirmDialog}
    </div>
  )
}

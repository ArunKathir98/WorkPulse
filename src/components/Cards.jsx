import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRef } from 'react'
import { GripVertical } from 'lucide-react'
import { Icon } from '../lib/icons.jsx'
import { formatField } from '../lib/store.js'

export const cls = (...a) => a.filter(Boolean).join(' ')

export function CardBody({ item, fieldCols, lifted }) {
  const chips = fieldCols
    .map((fc) => ({ fc, v: item.fields?.[fc.id] }))
    .filter(({ v }) => v !== undefined && v !== '')
  return (
    <div
      className={cls(
        'rounded-lg border border-line bg-surface px-3 py-2.5 text-[15px] leading-snug',
        lifted && 'shadow-xl ring-2 ring-accent/40 rotate-1'
      )}
    >
      {/* Text stays selectable: dragging is only from the grip, editing is by double-click. */}
      <p className="cursor-text select-text whitespace-pre-wrap break-words pl-5 pr-2">{item.text}</p>
      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 pl-5">
          {chips.map(({ fc, v }) => (
            <span
              key={fc.id}
              className="inline-flex items-center gap-1 rounded-md bg-sunken px-1.5 py-0.5 text-xs text-muted"
              title={fc.title}
            >
              <Icon name={fc.icon} size={12} />
              {formatField(fc, v)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function TaskCard({ item, fieldCols, onEdit }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: 'item' }
  })
  // Touch screens have no reliable double-click, so two quick taps do the same thing.
  const lastTap = useRef({ t: 0, x: 0, y: 0 })
  const edit = () => {
    window.getSelection()?.removeAllRanges() // the double-click also selected a word; drop it
    onEdit(item.id)
  }
  const onPointerUp = (e) => {
    if (e.pointerType !== 'touch' || e.target.closest('button')) return
    const now = Date.now()
    const l = lastTap.current
    if (now - l.t < 350 && Math.hypot(e.clientX - l.x, e.clientY - l.y) < 30) {
      lastTap.current = { t: 0, x: 0, y: 0 }
      edit()
    } else lastTap.current = { t: now, x: e.clientX, y: e.clientY }
  }
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      role="group"
      tabIndex={0}
      aria-label={`Task: ${item.text}. Press Enter to edit.`}
      title="Double-click to edit"
      onDoubleClick={(e) => { if (!e.target.closest('button')) edit() }}
      onPointerUp={onPointerUp}
      onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onEdit(item.id) }}
      className={cls('group relative rounded-lg [touch-action:manipulation]', isDragging && 'opacity-30')}
    >
      <CardBody item={item} fieldCols={fieldCols} />
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Move task: ${item.text}`}
        title="Drag to move"
        className="absolute left-1 top-2 grid h-7 w-6 cursor-grab touch-none place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink"
      >
        <GripVertical size={15} />
      </button>
    </div>
  )
}

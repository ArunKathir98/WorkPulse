import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Pencil } from 'lucide-react'
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
      <p className="whitespace-pre-wrap break-words pr-6">{item.text}</p>
      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: 'item' }
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => onEdit(item.id)}
      className={cls('group relative cursor-grab select-none [-webkit-touch-callout:none]', isDragging && 'opacity-30')}
    >
      <CardBody item={item} fieldCols={fieldCols} />
      <button
        type="button"
        aria-label={`Edit task: ${item.text}`}
        onClick={(e) => { e.stopPropagation(); onEdit(item.id) }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Pencil size={14} />
      </button>
    </div>
  )
}

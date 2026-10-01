import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Icon } from '../lib/icons.jsx'

export default function TaskDialog({ item, fieldCols, onSave, onDelete, onClose }) {
  const [text, setText] = useState(item.text)
  const [fields, setFields] = useState(item.fields || {})

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const canSave = text.trim().length > 0
  const submit = (e) => {
    e.preventDefault()
    if (canSave) onSave({ text: text.trim(), fields })
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-ink/40 p-0 sm:place-items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label="Edit task"
        className="card w-full max-w-md space-y-4 rounded-b-none p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-b-xl"
      >
        <div>
          <label htmlFor="task-text" className="mb-1.5 block text-sm font-semibold">Task</label>
          <textarea
            id="task-text"
            autoFocus
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="field h-auto resize-none py-2"
          />
        </div>

        {fieldCols.map((fc) => (
          <div key={fc.id}>
            <label htmlFor={`f-${fc.id}`} className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
              <Icon name={fc.icon} size={14} className="text-accent" /> {fc.title}
            </label>
            <input
              id={`f-${fc.id}`}
              type={fc.type === 'date' ? 'date' : fc.type === 'number' ? 'number' : 'text'}
              value={fields[fc.id] ?? ''}
              onChange={(e) => setFields({ ...fields, [fc.id]: e.target.value })}
              className="field"
            />
          </div>
        ))}

        <div className="flex items-center gap-2 pt-1">
          <button type="button" onClick={onDelete} className="btn btn-danger">
            <Trash2 size={16} /> Delete
          </button>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="btn">Cancel</button>
            <button type="submit" disabled={!canSave} className="btn btn-primary">Save task</button>
          </div>
        </div>
      </form>
    </div>
  )
}

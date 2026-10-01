import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', danger = true, onConfirm, onCancel }) {
  const cancelRef = useRef(null)

  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-end bg-ink/40 p-0 sm:place-items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="card w-full max-w-sm space-y-4 rounded-b-none p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-b-xl"
      >
        <div className="flex items-start gap-3">
          {danger && (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
              <AlertTriangle size={18} />
            </span>
          )}
          <div>
            <h2 id="confirm-title" className="font-display text-lg font-bold">{title}</h2>
            <p id="confirm-message" className="mt-1 text-sm text-muted">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button ref={cancelRef} type="button" onClick={onCancel} className="btn">Cancel</button>
          <button
            type="button"
            onClick={onConfirm}
            className={danger ? 'btn border-transparent bg-danger text-white hover:bg-danger/90' : 'btn btn-primary'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// const [confirm, confirmDialog] = useConfirm()
// if (await confirm({ title, message, confirmLabel })) ...   (render {confirmDialog} in the component)
export function useConfirm() {
  const [req, setReq] = useState(null)
  const confirm = useCallback((opts) => new Promise((resolve) => setReq({ ...opts, resolve })), [])
  const close = (result) => {
    req.resolve(result)
    setReq(null)
  }
  const dialog = req && (
    <ConfirmDialog {...req} onConfirm={() => close(true)} onCancel={() => close(false)} />
  )
  return [confirm, dialog]
}

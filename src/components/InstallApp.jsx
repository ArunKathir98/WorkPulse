import { useEffect, useState, useSyncExternalStore } from 'react'
import { Download, Smartphone, Share, CircleCheck } from 'lucide-react'
import { subscribe, canPrompt, isInstalled, isIOS, promptInstall } from '../lib/pwaInstall.js'

// Settings section. Shows an Install button when the browser offers one, otherwise the exact
// manual steps for this device, so the option is never missing the way the browser prompt can be.
export default function InstallApp() {
  const promptable = useSyncExternalStore(subscribe, canPrompt, () => false)
  const [installed, setInstalled] = useState(isInstalled)
  const [result, setResult] = useState('')

  useEffect(() => {
    const m = window.matchMedia?.('(display-mode: standalone)')
    const sync = () => setInstalled(isInstalled())
    m?.addEventListener('change', sync)
    window.addEventListener('appinstalled', sync)
    return () => {
      m?.removeEventListener('change', sync)
      window.removeEventListener('appinstalled', sync)
    }
  }, [])

  const install = async () => {
    const r = await promptInstall()
    if (r === 'accepted') setResult('Installing. Look for WorkPulse on your home screen or app list.')
    else if (r === 'dismissed') setResult('Install was cancelled. You can try again any time.')
    else setResult('Your browser did not offer the install prompt. Use the steps below instead.')
  }

  const ios = isIOS()

  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <Smartphone size={18} className="text-accent" /> Install app
      </h2>

      {installed ? (
        <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-accent">
          <CircleCheck size={16} /> WorkPulse is installed on this device. You are using the installed app.
        </p>
      ) : (
        <div className="mt-2 space-y-3">
          <p className="text-sm text-muted">
            Install WorkPulse to open it from your home screen like an app, full screen and without the browser bar.
          </p>

          {promptable && (
            <button type="button" onClick={install} className="btn btn-primary">
              <Download size={16} /> Install WorkPulse
            </button>
          )}
          {result && <p role="status" className="text-sm font-semibold text-accent">{result}</p>}

          {!promptable && (
            <div className="rounded-lg border border-line bg-sunken p-3 text-sm">
              <p className="font-semibold">
                {ios ? 'On iPhone or iPad, install it from Safari:' : 'Your browser has not offered a one-tap install, so install it manually:'}
              </p>
              {ios ? (
                <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-muted">
                  <li>Open this page in <strong>Safari</strong>.</li>
                  <li>Tap the <Share size={14} className="inline align-text-bottom" /> <strong>Share</strong> button.</li>
                  <li>Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
                </ol>
              ) : (
                <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-muted">
                  <li><strong>Android Chrome:</strong> tap the <strong>{'⋮'}</strong> menu, then <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                  <li><strong>Desktop Chrome or Edge:</strong> click the install icon at the right end of the address bar, or the menu, then <strong>Install WorkPulse</strong>.</li>
                  <li><strong>Firefox and some other browsers</strong> cannot install web apps. Open this page in Chrome, Edge or Safari.</li>
                </ol>
              )}
              {!ios && (
                <p className="mt-2 text-xs text-muted">
                  Why no button? Browsers only offer it when the app is not already installed and they decide it is
                  ready, and they may hold it back after you dismiss it. If you installed WorkPulse before, open it from
                  your home screen or app list instead of the browser.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

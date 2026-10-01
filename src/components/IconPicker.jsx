import { ICON_NAMES, Icon } from '../lib/icons.jsx'

export default function IconPicker({ value, onChange }) {
  return (
    <div
      role="radiogroup"
      aria-label="Icon"
      className="grid max-h-40 grid-cols-7 gap-1 overflow-y-auto rounded-lg border border-line bg-sunken p-1.5 sm:grid-cols-10"
    >
      {ICON_NAMES.map((name) => (
        <button
          key={name}
          type="button"
          role="radio"
          aria-checked={value === name}
          aria-label={name}
          title={name}
          onClick={() => onChange(name)}
          className={
            'grid h-9 place-items-center rounded-md ' +
            (value === name ? 'bg-accent text-accentink' : 'text-muted hover:bg-line/60 hover:text-ink')
          }
        >
          <Icon name={name} size={18} />
        </button>
      ))}
    </div>
  )
}

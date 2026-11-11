interface Props<T extends string> {
  /** What is being chosen, for assistive technology. */
  label: string
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}

/** A choice among a few views of the same panel. */
export default function Segmented<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <div className="segments" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={o.id === value} className="segment">
          {o.label}
        </button>
      ))}
    </div>
  )
}

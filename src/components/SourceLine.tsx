import type { Definition } from '../lib/definitions'
import { downloadCsv, type CsvRow } from '../lib/csv'
import { usePageHref } from '../lib/range'

export interface SourceLink {
  label: string
  /** Null where there is nowhere to link on this network: the link is left out. */
  href: string | null
}

interface Props {
  /** Who computed the figures: `Arch Prime Analytics`, `Arch Explorer`. */
  from: string
  /** Where the same figures can be read first-hand. */
  links?: SourceLink[]
  definition?: Definition
  /** The figures shown, to keep: built when asked for. */
  csv?: { filename: string; rows: () => CsvRow[] }
}

/** Beneath a panel: where its figures come from and how to check them. */
export default function SourceLine({ from, links = [], definition, csv }: Props) {
  const href = usePageHref()
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
      <span>Source: {from}</span>
      {links.map(
        (l) =>
          l.href && (
            <a key={l.label} className="link" href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ),
      )}
      {definition && (
        <a className="link" href={href('methodology', definition.id)}>
          Definition: {definition.term}
        </a>
      )}
      {csv && (
        <button type="button" className="link" onClick={() => downloadCsv(csv.filename, csv.rows())}>
          Download CSV
        </button>
      )}
    </p>
  )
}

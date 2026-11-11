import type { ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  /** Figures sit right; names and text left. */
  align?: 'left' | 'right'
  cell: (row: T) => ReactNode
  /** On a narrow screen: shown beside the row's name. The rest open on demand. */
  primary?: boolean
}

type Breakpoint = 'sm' | 'md' | 'lg'

interface Props<T> {
  /** The first column names the row. */
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** The width from which there is room for the table. */
  tableFrom?: Breakpoint
  caption?: string
}

// Tailwind reads class names from the source, so each breakpoint is spelled out.
const TABLE_AT: Record<Breakpoint, string> = { sm: 'hidden sm:block', md: 'hidden md:block', lg: 'hidden lg:block' }
const ROWS_UNTIL: Record<Breakpoint, string> = { sm: 'sm:hidden', md: 'md:hidden', lg: 'lg:hidden' }

/** Side padding of a cell: none on the table's outer edges, so its text starts and ends on the panel's own edges. */
const edge = (index: number, count: number) => (index === 0 ? 'pr-2' : index === count - 1 ? 'pl-2' : 'px-2')

/** A two-line cell: a figure with a smaller line beneath it. */
export function Stacked({ top, sub }: { top: ReactNode; sub?: ReactNode }) {
  return (
    <>
      {top}
      {sub && <span className="block text-xs font-normal text-ink-2">{sub}</span>}
    </>
  )
}

/** A table where there is room for one, and compact rows where there is not:
 * each row's name with its key figures, the rest behind a tap. */
export default function DataTable<T>({ columns, rows, rowKey, tableFrom = 'md', caption }: Props<T>) {
  const [name, ...rest] = columns
  const primary = rest.filter((c) => c.primary)
  const detail = rest.filter((c) => !c.primary)
  return (
    <>
      <div className={`${TABLE_AT[tableFrom]} overflow-x-auto`}>
        <table className="w-full text-left text-[13px]">
          {caption && <caption className="pb-1 text-left text-xs font-medium text-ink-2">{caption}</caption>}
          <thead>
            <tr className="border-b border-line text-xs text-ink-2">
              {columns.map((c, i) => (
                <th
                  key={c.key}
                  className={`${edge(i, columns.length)} py-2 font-medium ` + (c.align === 'left' || c === name ? '' : 'text-right')}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="align-top">
                {columns.map((c, i) => (
                  <td
                    key={c.key}
                    className={
                      `${edge(i, columns.length)} py-2 ` + (c === name ? 'font-medium' : c.align === 'left' ? '' : 'text-right')
                    }
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`${ROWS_UNTIL[tableFrom]} divide-y divide-line text-[13px]`}>
        {caption && <div className="pb-1 text-xs font-medium text-ink-2">{caption}</div>}
        {rows.map((row) => (
          <CompactRow key={rowKey(row)} row={row} name={name} primary={primary} detail={detail} />
        ))}
      </div>
    </>
  )
}

function CompactRow<T>({
  row,
  name,
  primary,
  detail,
}: {
  row: T
  name: Column<T>
  primary: Column<T>[]
  detail: Column<T>[]
}) {
  const summary = (
    <>
      <span className="block font-medium">{name.cell(row)}</span>
      {primary.length > 0 && <Pairs columns={primary} row={row} className="mt-2 grid-cols-3" />}
    </>
  )
  if (detail.length === 0) return <div className="py-2">{summary}</div>
  return (
    // A row that opens is a tap target, so it is padded as one.
    <details className="group py-3">
      <summary className="relative cursor-pointer list-none pr-6 [&::-webkit-details-marker]:hidden">
        {summary}
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className="absolute right-0 top-0.5 size-4 text-ink-2 transition-transform group-open:rotate-180"
        >
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <Pairs columns={detail} row={row} className="mt-3 grid-cols-2 rounded-control bg-soft p-3" />
    </details>
  )
}

/** Columns as label and value pairs in a grid. Each pair shares its two rows
 * with the pairs beside it, so a label that wraps does not push its value
 * below theirs. Spans, since the pairs also sit inside a `summary`, which
 * takes phrasing content only. */
function Pairs<T>({ columns, row, className }: { columns: Column<T>[]; row: T; className: string }) {
  return (
    <span className={`grid gap-x-3 gap-y-2 ${className}`}>
      {columns.map((c) => (
        <span key={c.key} className="row-span-2 grid min-w-0 grid-rows-subgrid gap-y-0">
          <span className="self-end text-xs text-ink-2">{c.header}</span>
          <span className="num">{c.cell(row)}</span>
        </span>
      ))}
    </span>
  )
}

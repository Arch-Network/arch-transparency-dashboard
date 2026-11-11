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
          {caption && <caption className="px-2 pb-1 text-left text-xs font-medium text-ink-2">{caption}</caption>}
          <thead>
            <tr className="border-b border-line text-xs text-ink-2">
              {columns.map((c) => (
                <th key={c.key} className={'px-2 py-2 font-medium ' + (c.align === 'left' || c === name ? '' : 'text-right')}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="align-top">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={'px-2 py-2 ' + (c === name ? 'font-medium' : c.align === 'left' ? '' : 'text-right')}
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
      {primary.length > 0 && <Pairs columns={primary} row={row} className="mt-1.5 grid-cols-3" />}
    </>
  )
  if (detail.length === 0) return <div className="py-2.5">{summary}</div>
  return (
    <details className="group py-2.5">
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
      <Pairs columns={detail} row={row} className="mt-2.5 grid-cols-2 rounded-control bg-soft p-2.5" />
    </details>
  )
}

/** Columns as label and value pairs in a grid. Spans, since the pairs also
 * sit inside a `summary`, which takes phrasing content only. */
function Pairs<T>({ columns, row, className }: { columns: Column<T>[]; row: T; className: string }) {
  return (
    <span className={`grid gap-x-3 gap-y-2 ${className}`}>
      {columns.map((c) => (
        <span key={c.key} className="block min-w-0">
          <span className="block text-xs text-ink-2">{c.header}</span>
          <span className="num block">{c.cell(row)}</span>
        </span>
      ))}
    </span>
  )
}

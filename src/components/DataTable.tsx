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

/** Edge-to-edge horizontal cell padding matching arch-prime's 24px card inset. */
const cellPad = (index: number, count: number) =>
  index === 0
    ? 'pl-5 pr-3 sm:pl-6'
    : index === count - 1
      ? 'pl-3 pr-5 sm:pr-6'
      : 'px-3'

/** A two-line cell: a figure with a smaller muted line beneath it. */
export function Stacked({ top, sub }: { top: ReactNode; sub?: ReactNode }) {
  return (
    <>
      <span className="block">{top}</span>
      {sub && <span className="mt-0.5 block font-sans text-[12px] font-normal text-ink-3">{sub}</span>}
    </>
  )
}

/**
 * Arch Prime v2 data table:
 * - No underline beneath column headers (arch-prime v2.css #165)
 * - Row dividers bleed edge-to-edge across the enclosing Panel
 * - Figures in IBM Plex Sans tabular numerals, right-aligned at weight 500
 * - Quiet opacity dimming on row hover
 * - Compact expandable rows below `tableFrom`
 */
export default function DataTable<T>({ columns, rows, rowKey, tableFrom = 'md', caption }: Props<T>) {
  const [name, ...rest] = columns
  const primary = rest.filter((c) => c.primary)
  const detail = rest.filter((c) => !c.primary)
  return (
    <>
      <div className={`${TABLE_AT[tableFrom]} -mx-5 overflow-x-auto sm:-mx-6`}>
        <table className="ap-table">
          {caption && <caption className="subhead px-5 pb-2 text-left sm:px-6">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th
                  key={c.key}
                  className={
                    `${cellPad(i, columns.length)} ` +
                    (c.align === 'left' || c === name ? 'text-left' : 'text-right')
                  }
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((c, i) => {
                  const isNumeric = c !== name && c.align !== 'left'
                  return (
                    <td
                      key={c.key}
                      className={
                        `${cellPad(i, columns.length)} ` +
                        (c === name
                          ? 'font-medium text-ink'
                          : isNumeric
                            ? 'num text-right font-medium text-ink'
                            : 'text-left text-ink')
                      }
                    >
                      {c.cell(row)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`${ROWS_UNTIL[tableFrom]} -mx-5 divide-y divide-line text-[13.5px] sm:-mx-6`}>
        {caption && <div className="subhead px-5 pb-2 sm:px-6">{caption}</div>}
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
      <span className="block font-medium text-ink">{name.cell(row)}</span>
      {primary.length > 0 && <Pairs columns={primary} row={row} className="mt-2.5 grid-cols-3" />}
    </>
  )
  if (detail.length === 0) return <div className="px-5 py-3.5 sm:px-6">{summary}</div>
  return (
    <details className="group px-5 py-3.5 sm:px-6">
      <summary className="relative cursor-pointer list-none pr-6 [&::-webkit-details-marker]:hidden">
        {summary}
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className="absolute right-0 top-0.5 size-4 text-ink-3 transition-transform duration-200 group-open:rotate-180"
        >
          <path
            d="M4 6l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      <Pairs columns={detail} row={row} className="mt-3 grid-cols-2 rounded-[14px] bg-soft p-3.5" />
    </details>
  )
}

/** Columns as label and value pairs in a grid. */
function Pairs<T>({ columns, row, className }: { columns: Column<T>[]; row: T; className: string }) {
  return (
    <span className={`grid gap-x-3 gap-y-2.5 ${className}`}>
      {columns.map((c) => (
        <span key={c.key} className="row-span-2 grid min-w-0 grid-rows-subgrid gap-y-0.5">
          <span className="self-end text-[11.5px] font-medium text-ink-3">{c.header}</span>
          <span className="num text-[13px] font-medium text-ink">{c.cell(row)}</span>
        </span>
      ))}
    </span>
  )
}

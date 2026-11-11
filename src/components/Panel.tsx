import type { ReactNode } from 'react'
import type { Definition } from '../lib/definitions'
import { DefinitionTip } from './InfoTooltip'

interface Props {
  /** Makes the panel addressable: `#<page>/<id>` scrolls to it. */
  id?: string
  title: string
  /** One short line: what is shown and its one key qualification. */
  subtitle?: ReactNode
  definition?: Definition
  chip?: string
  /** Controls at the end of the title row. */
  actions?: ReactNode
  /** Where the figures come from and how to check them: a `SourceLine`. */
  source?: ReactNode
  children: ReactNode
}

/** A section of a page: title row with its definition and controls, a short
 * sub-line, the chart or table, and the source beneath. */
export default function Panel({ id, title, subtitle, definition, chip, actions, source, children }: Props) {
  return (
    <section id={id} className="card min-w-0 scroll-mt-28 p-4">
      <div className="flex flex-wrap items-center gap-x-0.5 gap-y-2">
        <h3 className="text-[15px] font-medium">{title}</h3>
        {definition && <DefinitionTip definition={definition} />}
        {chip && <span className="chip ml-2">{chip}</span>}
        {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {subtitle && <p className="mt-0.5 max-w-3xl text-[13px] text-ink-2">{subtitle}</p>}
      <div className="mt-3">{children}</div>
      {source && <div className="mt-3 border-t border-line pt-2.5">{source}</div>}
    </section>
  )
}

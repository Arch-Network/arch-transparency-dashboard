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
  /** Controls at the end of the title row (range toggles, badges, links). */
  actions?: ReactNode
  /** Where the figures come from and how to check them: a `SourceLine`. */
  source?: ReactNode
  children: ReactNode
}

/**
 * Crisp bordered data panel (9031wyb82 structure + Arch Prime typography and surfaces).
 */
export default function Panel({ id, title, subtitle, definition, chip, actions, source, children }: Props) {
  return (
    <section id={id} className="card flex min-w-0 scroll-mt-20 flex-col p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
            <h3 className="font-heading text-[15px] font-semibold leading-[1.3] tracking-[-0.01em] text-ink">
              {title}
            </h3>
            {definition && <DefinitionTip definition={definition} />}
            {chip && <span className="chip ml-1">{chip}</span>}
          </div>
          {subtitle && <p className="mt-0.5 max-w-3xl text-[12px] leading-[1.4] text-ink-3">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="mt-3.5 flex-1">{children}</div>
      {source && (
        <div className="-mx-4 mt-4 border-t border-line px-4 pt-3 sm:-mx-5 sm:px-5">
          {source}
        </div>
      )}
    </section>
  )
}

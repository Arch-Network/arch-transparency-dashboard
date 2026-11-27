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

/**
 * Arch Prime v2 card panel: white (#fff) on light canvas / obsidian (#121214)
 * on dark canvas, 20px corners, 24px internal padding, separated from the canvas
 * by fill alone. Internal source footer divider runs edge-to-edge.
 */
export default function Panel({ id, title, subtitle, definition, chip, actions, source, children }: Props) {
  return (
    <section id={id} className="card flex min-w-0 scroll-mt-24 flex-col p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
        <h3 className="font-heading text-[16px] font-medium leading-[1.3] tracking-[-0.012em] text-ink sm:text-[17px]">
          {title}
        </h3>
        {definition && <DefinitionTip definition={definition} />}
        {chip && <span className="chip ml-1.5">{chip}</span>}
        {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {subtitle && <p className="mt-1 max-w-3xl text-[13px] leading-[1.45] text-ink-2">{subtitle}</p>}
      <div className="mt-4 flex-1">{children}</div>
      {source && (
        <div className="-mx-5 mt-5 border-t border-line px-5 pt-3.5 sm:-mx-6 sm:px-6">
          {source}
        </div>
      )}
    </section>
  )
}

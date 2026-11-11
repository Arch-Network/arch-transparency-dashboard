import { useRef } from 'react'
import type { AboutBlock } from '../lib/aboutTokens'
import { definitions } from '../lib/definitions'
import { usePageHref } from '../lib/range'
import { usePanel, type PageId } from '../lib/route'
import SidePanel from './SidePanel'
import SourceLine, { type SourceLink } from './SourceLine'

interface Props {
  /** The panel's address on its page: `#<page>/<id>` opens it. */
  id: string
  title: string
  subtitle: string
  blocks: AboutBlock[]
  /** The other token's panel, to step across to, where its page is shown. */
  other?: { label: string; page: PageId; anchor: string }
  /** The program and the token on the Arch Explorer. */
  links: SourceLink[]
}

/** What a bridged token is, who can create or pause it, and what is not known
 * about it: a button for the page's title row, and the side panel it opens. */
export default function AboutToken({ id, title, subtitle, blocks, other, links }: Props) {
  const href = usePageHref()
  const { open, show, close } = usePanel(id)
  const button = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button ref={button} type="button" className="btn" aria-expanded={open} aria-controls={id} onClick={open ? close : show}>
        {title}
      </button>
      <SidePanel
        id={id}
        title={title}
        subtitle={subtitle}
        open={open}
        onClose={close}
        trigger={button}
        source={
          <SourceLine
            from="The bridge program’s accounts and records on Arch, for the settings and the supply figures"
            links={links}
            definition={definitions.bridgeSettings}
          />
        }
      >
        <div className="space-y-3 text-[14px] leading-normal">
          {blocks.map((block) =>
            typeof block === 'string' ? (
              <p key={block}>{block}</p>
            ) : (
              <div key={block.lead}>
                <p>{block.lead}</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ),
          )}
          {other && (
            <p>
              <a className="btn" href={href(other.page, other.anchor)}>
                {other.label}
              </a>
            </p>
          )}
        </div>
      </SidePanel>
    </>
  )
}

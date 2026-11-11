import type { AboutBlock } from '../lib/aboutTokens'
import { definitions } from '../lib/definitions'
import { usePageHref } from '../lib/range'
import type { PageId } from '../lib/route'
import Panel from './Panel'
import SourceLine, { type SourceLink } from './SourceLine'

interface Props {
  id: string
  title: string
  subtitle: string
  blocks: AboutBlock[]
  /** The other token's section, to step across to, where its page is shown. */
  other?: { label: string; page: PageId; anchor: string }
  /** The program and the token on the Arch Explorer. */
  links: SourceLink[]
}

/** What a bridged token is, who can create or pause it, and what is not known about it. */
export default function AboutToken({ id, title, subtitle, blocks, other, links }: Props) {
  const href = usePageHref()
  return (
    <Panel
      id={id}
      title={title}
      subtitle={subtitle}
      actions={
        other && (
          <a className="btn" href={href(other.page, other.anchor)}>
            {other.label}
          </a>
        )
      }
      source={
        <SourceLine
          from="The bridge program’s accounts and records on Arch, and its documentation and configuration where stated"
          links={links}
          definition={definitions.bridgeSettings}
        />
      }
    >
      <div className="max-w-3xl space-y-3 text-[13px] leading-relaxed">
        {blocks.map((block) =>
          typeof block === 'string' ? (
            <p key={block}>{block}</p>
          ) : (
            <div key={block.lead}>
              <p>{block.lead}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ),
        )}
      </div>
    </Panel>
  )
}

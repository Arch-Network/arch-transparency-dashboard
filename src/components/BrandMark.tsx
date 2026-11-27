import type { PageId } from '../lib/route'

// Exact SVG geometry from Arch-Network/arch-prime (apps/web-v2/shared/kit/shell.tsx).
const ARCH_GLYPH =
  'M92.3 392.3H5.5C1.2 392.3-1.4 387.6.8 384L226.9 24.7C236.7 9.3 253.5 0 272 0s35.3 9.2 45 24.7L543.1 384c2.3 3.6-.3 8.3-4.7 8.3H451.2c-1.9 0-3.7-1-4.7-2.6L306.3 166.2c-3.7-5.9-8.8-10.6-14.7-13.9-5.9-3.3-12.6-5-19.7-5-14.1 0-26.9 7-34.4 18.9L97 389.8c-1 1.6-2.8 2.5-4.7 2.5Z'

const STACKED_MARK =
  'm74.8368 318-70.35401-.007c-3.516212-.001-5.65254-3.816-3.801037-6.763l183.298247-291.1871c7.914-12.53464 21.543-20.04263332 36.521-20.0429 14.979.0002115 28.608 7.4774 36.521 20.0429l183.296 291.1871c1.852 2.947-.283 6.763-3.799 6.763l-70.675.007c-1.538 0-2.984-.777-3.801-2.079l-113.721-181.238c-3.013-4.777-7.127-8.594-11.9-11.231-4.804-2.637-10.237-4.063-15.953-4.063-11.429 0-21.824 5.708-27.854 15.294l-113.9772 181.238c-.8165 1.302-2.2624 2.079-3.801 2.079z'

const STACKED_WORD =
  'm0 477.908v-129.908h47.4408c8.7537 0 16.456 1.627 23.1083 4.882 6.7687 3.139 12.0204 7.789 15.7552 13.95 3.7348 6.045 5.6022 13.311 5.6022 21.797 0 8.37-1.9263 15.577-5.7774 21.622-3.7348 6.045-8.9277 10.695-15.58 13.95s-14.3546 4.883-23.1083 4.883h-26.7843v48.824zm20.6565-67.134h27.31c4.6685 0 8.7524-.93 12.2544-2.79 3.5007-1.86 6.243-4.417 8.2281-7.672 1.9837-3.371 2.975-7.324 2.975-11.857 0-4.534-.9913-8.428-2.975-11.683-1.9851-3.372-4.7274-5.929-8.2281-7.673-3.502-1.86-7.5859-2.79-12.2544-2.79h-27.31zm84.4645 67.134v-94.336h18.906v19.007l-1.751-2.79c2.101-6.161 5.486-10.579 10.153-13.253 4.669-2.79 10.271-4.184 16.807-4.184h5.776v17.96h-8.227c-6.535 0-11.846 2.034-15.93 6.103-3.969 3.953-5.953 9.649-5.953 17.089v54.404zm57.298 0v-94.336h19.782v94.336zm0-107.239v-22.669h19.782v22.669zm36.783 107.239v-94.336h18.907v20.402l-2.452-3.139c1.985-6.394 5.602-11.218 10.854-14.473 5.251-3.255 11.262-4.882 18.032-4.882 7.586 0 14.295 2.034 20.132 6.103 5.951 3.952 9.919 9.242 11.904 15.868l-5.603.523c2.801-7.556 7.061-13.194 12.779-16.914 5.837-3.72 12.489-5.58 19.957-5.58 6.536 0 12.43 1.511 17.681 4.533 5.369 3.023 9.629 7.208 12.779 12.555 3.152 5.348 4.728 11.451 4.728 18.309v61.031h-19.782v-55.625c0-4.766-.876-8.777-2.626-12.032-1.634-3.371-3.969-5.928-7.003-7.672-2.917-1.86-6.36-2.79-10.328-2.79-3.969 0-7.469.93-10.503 2.79-3.035 1.744-5.427 4.301-7.178 7.672s-2.626 7.382-2.626 12.032v55.625h-19.606v-55.625c0-4.766-.877-8.777-2.626-12.032-1.635-3.371-3.969-5.928-7.003-7.672-2.917-1.86-6.419-2.79-10.503-2.79-3.969 0-7.47.93-10.504 2.79-3.035 1.744-5.427 4.301-7.178 7.672-1.633 3.371-2.45 7.382-2.45 12.032v55.625zm199.208 2.092c-9.453 0-17.856-2.151-25.208-6.452-7.237-4.417-12.897-10.346-16.982-17.785-4.084-7.557-6.126-15.985-6.126-25.284 0-9.533 2.042-17.961 6.126-25.285 4.202-7.323 9.804-13.078 16.807-17.263 7.002-4.301 14.938-6.451 23.808-6.451 7.119 0 13.479 1.22 19.082 3.662 5.601 2.441 10.328 5.812 14.179 10.113 3.851 4.185 6.769 9.009 8.753 14.473 2.101 5.464 3.151 11.276 3.151 17.437 0 1.512-.059 3.081-.175 4.709-.117 1.627-.351 3.138-.7 4.533h-75.452v-15.693h64.248l-9.454 7.149c1.168-5.696.759-10.753-1.225-15.171-1.867-4.533-4.785-8.079-8.752-10.636-3.851-2.674-8.404-4.011-13.655-4.011-5.252 0-9.921 1.337-14.006 4.011-4.084 2.557-7.235 6.277-9.452 11.16-2.218 4.766-3.092 10.578-2.626 17.437-.584 6.394.292 11.973 2.626 16.74 2.451 4.766 5.835 8.486 10.153 11.16 4.435 2.673 9.454 4.011 15.056 4.011 5.718 0 10.561-1.279 14.53-3.837 4.084-2.557 7.294-5.87 9.627-9.939l16.106 7.846c-1.868 4.418-4.785 8.428-8.753 12.032-3.851 3.487-8.52 6.277-14.005 8.371-5.369 1.976-11.262 2.963-17.681 2.963z'

/** The standalone Arch chevron mark, filled with currentColor (or brand orange). */
export function ArchMark({ className = 'h-4 w-[22px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 544 393" aria-hidden="true" className={className}>
      <path d={ARCH_GLYPH} fill="currentColor" />
    </svg>
  )
}

/** Stacked rail lockup: orange Arch mark above the PRIME wordmark (40px wide on desktop rail). */
export function ArchPrimeStackedLogo({ className = 'w-10 h-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 442 480" aria-hidden="true" className={className}>
      <path fillRule="evenodd" clipRule="evenodd" d={STACKED_MARK} fill="var(--ap-brand)" />
      <path d={STACKED_WORD} fill="var(--ap-ink)" />
    </svg>
  )
}

/** Horizontal lockup for mobile headers and compact spaces. */
export function ArchPrimeWordmark() {
  return (
    <span className="inline-flex items-center gap-2 font-heading text-[16px] font-medium tracking-[-0.02em] text-ink">
      <ArchMark className="h-[15px] w-[21px] text-brand" />
      <span>Arch Prime</span>
    </span>
  )
}

/** Clean navigation icons for the left rail & mobile tab bar. Supports future sections (perps, custody/theya) gracefully. */
export function NavIcon({ id, className = 'size-[22px]' }: { id: PageId | string; className?: string }) {
  const props = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
    className,
  }

  switch (id) {
    case 'overview':
      return (
        <svg {...props}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
        </svg>
      )
    case 'markets':
      return (
        <svg {...props}>
          <path d="M4 18.5h16" />
          <path d="M5.5 14.5 9.5 10l3.5 2.75L18.5 6.5" />
          <path d="M15.5 6.5h3v3" />
        </svg>
      )
    case 'risk':
      return (
        <svg {...props}>
          <path d="M12 3.25 4.75 6.25v5.25c0 4.65 3.1 8.45 7.25 9.5 4.15-1.05 7.25-4.85 7.25-9.5V6.25L12 3.25Z" />
          <path d="m9.25 12.25 2 2 3.75-4" />
        </svg>
      )
    case 'archusd':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v10" />
          <path d="M14.75 9.5c0-1.15-1.1-2-2.75-2s-2.75.8-2.75 2c0 1.25 1.15 1.8 2.75 2.1 1.6.3 2.75.85 2.75 2.15 0 1.2-1.15 2-2.75 2s-2.75-.8-2.75-2" />
        </svg>
      )
    case 'perps':
      return (
        <svg {...props}>
          <path d="M6 5v14M12 8v11M18 4v15" />
          <rect x="4.25" y="8" width="3.5" height="5.5" rx="1" fill="currentColor" stroke="none" />
          <rect x="10.25" y="10.5" width="3.5" height="5" rx="1" fill="currentColor" stroke="none" />
          <rect x="16.25" y="6.5" width="3.5" height="6" rx="1" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'reserves':
    case 'custody':
    case 'theya':
      return (
        <svg {...props}>
          <rect x="4" y="6" width="16" height="13" rx="2.5" />
          <path d="M8 6V5a4 4 0 0 1 8 0v1" />
          <circle cx="12" cy="12.5" r="1.75" />
        </svg>
      )
    case 'methodology':
      return (
        <svg {...props}>
          <path d="M6 4.5h9.5L19 8v11.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-13.5A1.5 1.5 0 0 1 6.5 4.5Z" />
          <path d="M9 11.5h6M9 15h4.5" />
        </svg>
      )
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 2.5" />
        </svg>
      )
  }
}

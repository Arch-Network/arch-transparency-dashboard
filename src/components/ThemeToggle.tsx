import { useState, type MouseEvent } from 'react'

/** localStorage key; index.html applies a stored choice before first paint. */
const KEY = 'arch-prime-theme'
type Theme = 'light' | 'dark'

/** Light is the default for executive data readability; dark is `data-theme="dark"` on <html>. */
function read(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(read)

  function toggle(e: MouseEvent<HTMLButtonElement>) {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    const apply = () => {
      try {
        localStorage.setItem(KEY, next)
      } catch {
        // Storage unavailable (private mode): the choice lasts for this page only.
      }
      document.documentElement.setAttribute('data-theme', next)
      setTheme(next)
    }

    const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } }
    if (
      typeof doc.startViewTransition === 'function' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      const r = e.currentTarget.getBoundingClientRect()
      const root = document.documentElement
      root.style.setProperty('--ap-vt-x', `${r.left + r.width / 2}px`)
      root.style.setProperty('--ap-vt-y', `${r.top + r.height / 2}px`)
      root.classList.add('ap-theming')
      doc.startViewTransition(apply).finished.finally(() => root.classList.remove('ap-theming'))
    } else {
      apply()
    }
  }

  const dark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={
        'grid size-8 shrink-0 cursor-pointer place-items-center rounded-control border border-line bg-card text-ink-2 transition-colors duration-150 hover:bg-soft hover:text-ink ' +
        className
      }
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-[16px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <line key={deg} x1="12" y1="2.5" x2="12" y2="4.5" transform={`rotate(${deg} 12 12)`} />
            ))}
          </>
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        )}
      </svg>
    </button>
  )
}

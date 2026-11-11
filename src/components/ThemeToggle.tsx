import { useState } from 'react'

/** localStorage key; index.html applies a stored choice before first paint. */
const KEY = 'arch-prime-theme'
type Theme = 'light' | 'dark'

/** Dark is the default: light is the `data-theme="light"` attribute on <html>. */
function read(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(read)

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Storage unavailable (private mode): the choice lasts for this page only.
    }
    document.documentElement.setAttribute('data-theme', next)
    setTheme(next)
  }

  const dark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
      className={
        'grid size-8 shrink-0 cursor-pointer place-items-center rounded-control border border-line-2 text-ink-2 hover:bg-soft-2 hover:text-ink ' +
        className
      }
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
        {dark ? (
          <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <line key={deg} x1="12" y1="2.5" x2="12" y2="4.5" transform={`rotate(${deg} 12 12)`} />
            ))}
          </g>
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="currentColor" />
        )}
      </svg>
    </button>
  )
}

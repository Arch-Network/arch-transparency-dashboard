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
      {/* Drawn on the 16px box the other icons use, in the same 1.5 stroke. */}
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {dark ? (
          <>
            <circle cx="8" cy="8" r="2.75" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <line key={deg} x1="8" y1="1.25" x2="8" y2="2.5" transform={`rotate(${deg} 8 8)`} />
            ))}
          </>
        ) : (
          <path d="M13.25 9.75A5.5 5.5 0 0 1 6.25 2.75a5.5 5.5 0 1 0 7 7Z" />
        )}
      </svg>
    </button>
  )
}

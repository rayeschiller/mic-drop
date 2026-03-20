'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="h-8 w-32" />

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex items-center gap-2 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Toggle theme"
    >
      <span className="text-sm">{isDark ? 'Dark mode' : 'Light mode'}</span>
      {/* Track */}
      <div className={`relative w-10 h-5 rounded-full transition-colors ${isDark ? 'bg-neon-pink/30' : 'bg-secondary border border-border'}`}>
        {/* Thumb */}
        <div className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${isDark ? 'translate-x-5 bg-neon-pink' : 'translate-x-0.5 bg-muted-foreground'}`} />
      </div>
    </button>
  )
}

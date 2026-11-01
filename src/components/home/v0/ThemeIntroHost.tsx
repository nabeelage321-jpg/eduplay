'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef } from 'react'
import { useThemeIntroStore } from '@/lib/store/theme-intro-store'

// Mounted once, inside the Navbar (which is present on every page, so
// both trigger surfaces — the homepage ThemeSection and the Navbar
// palette — can reach it).
//
// The overlay is LAZY-loaded: its code is not in the initial page
// bundle, and it is only imported when a user actually taps a world
// that has an intro. While no intro is pending this renders nothing.
// When the intro ends or is skipped, the store is cleared and the
// overlay unmounts — it is never left hidden-but-running.
//
// This host NEVER requests an intro on its own: no mount effect, no
// page-load autoplay. Only an explicit Kids-world tap calls
// requestIntro (see ThemeSection / ThemeSwitcher).
const ThemeIntroOverlay = dynamic(() => import('./ThemeIntroOverlay'), { ssr: false })
const ThemeIntroWorldOverlay = dynamic(() => import('./ThemeIntroWorldOverlay'), { ssr: false })

export default function ThemeIntroHost() {
  const pendingIntro = useThemeIntroStore((s) => s.pendingIntro)
  const clearIntro = useThemeIntroStore((s) => s.clearIntro)
  const triggerRef = useRef<Element | null>(null)

  // Remember the tapped button so focus can return to it afterwards.
  useEffect(() => {
    if (pendingIntro) triggerRef.current = document.activeElement
  }, [pendingIntro])

  if (!pendingIntro) return null

  const handleDone = () => {
    clearIntro()
    const el = triggerRef.current
    if (el instanceof HTMLElement && document.contains(el)) el.focus()
  }

  // Astronaut keeps its own untouched player; every other world uses
  // the generic player with its own storyboard (ThemeIntroWorlds).
  if (pendingIntro === 'astronaut') return <ThemeIntroOverlay onDone={handleDone} />
  return <ThemeIntroWorldOverlay introId={pendingIntro} onDone={handleDone} />
}

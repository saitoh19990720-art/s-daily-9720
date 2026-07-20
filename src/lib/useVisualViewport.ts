import { useEffect } from 'react'

interface ViewportLike {
  height: number
  offsetTop: number
}

export function updateViewportVariables(
  viewport: ViewportLike | null = window.visualViewport,
  layoutHeight = window.innerHeight,
): void {
  const height = viewport?.height ?? layoutHeight
  const offsetTop = viewport?.offsetTop ?? 0
  const bottom = Math.max(0, layoutHeight - height - offsetTop)
  const style = document.documentElement.style
  style.setProperty('--visual-viewport-height', `${Math.round(height)}px`)
  style.setProperty('--visual-viewport-offset-top', `${Math.max(0, Math.round(offsetTop))}px`)
  style.setProperty('--visual-viewport-bottom', `${Math.round(bottom)}px`)
}

export function useVisualViewport(): void {
  useEffect(() => {
    const viewport = window.visualViewport
    const update = () => updateViewportVariables(viewport)
    update()
    window.addEventListener('resize', update)
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('resize', update)
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
    }
  }, [])
}

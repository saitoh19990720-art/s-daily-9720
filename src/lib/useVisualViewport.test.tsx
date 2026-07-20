// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { useVisualViewport } from './useVisualViewport'

function Harness() {
  useVisualViewport()
  return null
}

describe('VisualViewport', () => {
  let root: Root | null = null
  let container: HTMLDivElement | null = null
  const originalViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport')
  const originalInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight')

  afterEach(() => {
    if (root) act(() => root?.unmount())
    container?.remove()
    root = null
    container = null
    if (originalViewport) Object.defineProperty(window, 'visualViewport', originalViewport)
    else delete (window as { visualViewport?: VisualViewport }).visualViewport
    if (originalInnerHeight) Object.defineProperty(window, 'innerHeight', originalInnerHeight)
    document.documentElement.style.removeProperty('--visual-viewport-height')
    document.documentElement.style.removeProperty('--visual-viewport-offset-top')
    document.documentElement.style.removeProperty('--visual-viewport-bottom')
  })

  it('resize／scrollでCSS変数を更新する', () => {
    const listeners = new Map<string, Set<EventListener>>()
    const viewport = {
      height: 700,
      offsetTop: 20,
      addEventListener(type: string, listener: EventListener) {
        const group = listeners.get(type) ?? new Set<EventListener>()
        group.add(listener)
        listeners.set(type, group)
      },
      removeEventListener(type: string, listener: EventListener) {
        listeners.get(type)?.delete(listener)
      },
    }
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 })
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root?.render(<Harness />))

    expect(document.documentElement.style.getPropertyValue('--visual-viewport-height')).toBe('700px')
    expect(document.documentElement.style.getPropertyValue('--visual-viewport-bottom')).toBe('124px')

    viewport.height = 500
    viewport.offsetTop = 40
    act(() => listeners.get('resize')?.forEach((listener) => listener(new Event('resize'))))
    expect(document.documentElement.style.getPropertyValue('--visual-viewport-height')).toBe('500px')
    expect(document.documentElement.style.getPropertyValue('--visual-viewport-offset-top')).toBe('40px')
    expect(document.documentElement.style.getPropertyValue('--visual-viewport-bottom')).toBe('304px')

    viewport.offsetTop = 50
    act(() => listeners.get('scroll')?.forEach((listener) => listener(new Event('scroll'))))
    expect(document.documentElement.style.getPropertyValue('--visual-viewport-bottom')).toBe('294px')
  })
})

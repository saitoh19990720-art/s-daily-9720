// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider, useApp } from './AppContext'

type AppApi = ReturnType<typeof useApp>
type MediaListener = (event: MediaQueryListEvent) => void

let app: AppApi
let root: Root | null = null
let container: HTMLDivElement | null = null
let dark = false
let listeners: Set<MediaListener>

function Probe() {
  app = useApp()
  return <div>{app.theme}</div>
}

function renderProvider() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root?.render(<AppProvider><Probe /></AppProvider>))
}

function changeSystemTheme(matches: boolean) {
  dark = matches
  act(() => {
    const event = { matches } as MediaQueryListEvent
    listeners.forEach((listener) => listener(event))
  })
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  dark = false
  listeners = new Set()
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      get matches() { return dark },
      addEventListener: (_type: string, listener: MediaListener) => listeners.add(listener),
      removeEventListener: (_type: string, listener: MediaListener) => listeners.delete(listener),
    })),
  })
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  vi.restoreAllMocks()
})

describe('Systemテーマ', () => {
  it('未設定時はSystemとして初期反映し、OS変更へ追従する', () => {
    dark = true
    renderProvider()
    expect(app.themePreference).toBe('system')
    expect(app.theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')

    changeSystemTheme(false)
    expect(app.theme).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('既存の手動Light／Dark設定はOS変更で上書きしない', () => {
    localStorage.setItem('theme', 'light')
    renderProvider()
    changeSystemTheme(true)
    expect(app.themePreference).toBe('light')
    expect(app.theme).toBe('light')

    act(() => app.toggleTheme())
    expect(app.themePreference).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    changeSystemTheme(false)
    expect(app.theme).toBe('dark')
  })
})

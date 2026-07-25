// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Toast from '../components/Toast'
import { DEFAULT_OSHI } from '../lib/repository'
import { AppProvider } from '../state/AppContext'
import Settings from './Settings'

const { compressAvatarImageMock } = vi.hoisted(() => ({
  compressAvatarImageMock: vi.fn(),
}))

vi.mock('../lib/avatarImage', () => ({
  compressAvatarImage: compressAvatarImageMock,
}))

let root: Root | null = null
let container: HTMLDivElement | null = null

function renderSettings() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root?.render(
    <AppProvider>
      <Settings />
      <Toast />
    </AppProvider>,
  ))
}

async function selectFile(file: File) {
  const input = container!.querySelector<HTMLInputElement>('input[type="file"]')!
  Object.defineProperty(input, 'files', { configurable: true, value: [file] })
  await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })))
}

function saveButton(): HTMLButtonElement {
  return [...container!.querySelectorAll<HTMLButtonElement>('button')]
    .find((button) => button.textContent?.includes('この推しで設定する'))!
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  localStorage.setItem('oshi', JSON.stringify({
    ...DEFAULT_OSHI,
    name: 'あかり',
    avatarImg: 'data:image/png;base64,existing',
  }))
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  })
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  vi.clearAllMocks()
})

describe('Settingsのアバター画像', () => {
  it('変換失敗時は既存アバターと保存値を維持し、選び直せる', async () => {
    compressAvatarImageMock.mockRejectedValueOnce(new Error('decode failed'))
    renderSettings()
    await selectFile(new File(['broken'], 'broken.png', { type: 'image/png' }))

    expect(container!.querySelector<HTMLImageElement>('.av-upload img')?.src)
      .toBe('data:image/png;base64,existing')
    expect(container?.textContent).toContain('画像を読み込めませんでした')
    expect(JSON.parse(localStorage.getItem('oshi')!).avatarImg)
      .toBe('data:image/png;base64,existing')

    compressAvatarImageMock.mockResolvedValueOnce('data:image/jpeg;base64,retry')
    await selectFile(new File(['retry'], 'retry.jpg', { type: 'image/jpeg' }))
    expect(container!.querySelector<HTMLImageElement>('.av-upload img')?.src)
      .toBe('data:image/jpeg;base64,retry')
  })

  it('変換成功時は選んだ時点で圧縮済みData URLを保存する（再読み込みで消えない）', async () => {
    compressAvatarImageMock.mockResolvedValueOnce('data:image/jpeg;base64,compressed')
    renderSettings()
    await selectFile(new File(['large'], 'large.jpg', { type: 'image/jpeg' }))

    expect(JSON.parse(localStorage.getItem('oshi')!).avatarImg)
      .toBe('data:image/jpeg;base64,compressed')
    expect(container?.textContent).toContain('画像を保存しました')
  })

  it('保存に失敗した時は画面にも反映せず、保存エラーを知らせる', async () => {
    compressAvatarImageMock.mockResolvedValueOnce('data:image/jpeg;base64,compressed')
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    renderSettings()
    await selectFile(new File(['large'], 'large.jpg', { type: 'image/jpeg' }))
    setItem.mockRestore()

    expect(container!.querySelector<HTMLImageElement>('.av-upload img')?.src)
      .toBe('data:image/png;base64,existing')
    expect(JSON.parse(localStorage.getItem('oshi')!).avatarImg)
      .toBe('data:image/png;base64,existing')
  })

  it('画像を保存したあとに名前を保存しても画像は消えない', async () => {
    compressAvatarImageMock.mockResolvedValueOnce('data:image/jpeg;base64,compressed')
    renderSettings()
    await selectFile(new File(['large'], 'large.jpg', { type: 'image/jpeg' }))
    act(() => saveButton().click())

    expect(JSON.parse(localStorage.getItem('oshi')!).avatarImg)
      .toBe('data:image/jpeg;base64,compressed')
  })
})

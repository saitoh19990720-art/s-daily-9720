// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Toast from '../components/Toast'
import { DEFAULT_OSHI } from '../lib/repository'
import { AppProvider, STORAGE_FAILURE_MESSAGE } from '../state/AppContext'
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

// React管理下のinputへ値を入れる（onChangeを発火させる）
function typeName(value: string) {
  const input = container!.querySelector<HTMLInputElement>('input[placeholder="例：あかり"]')!
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setValue.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

// AppProviderごと破棄する（＝ブラウザの再読み込み相当）
function unmountSettings() {
  if (root) act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
}

function avatarSrc(): string | undefined {
  return container!.querySelector<HTMLImageElement>('.av-upload img')?.src
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

  it('変換成功時は選んだ時点で保存し、再生成しても画面へ復元される', async () => {
    compressAvatarImageMock.mockResolvedValueOnce('data:image/jpeg;base64,compressed')
    renderSettings()
    await selectFile(new File(['large'], 'large.jpg', { type: 'image/jpeg' }))

    expect(JSON.parse(localStorage.getItem('oshi')!).avatarImg)
      .toBe('data:image/jpeg;base64,compressed')
    expect(container?.textContent).toContain('画像を保存しました')

    // AppProviderを破棄して作り直す＝ブラウザの再読み込み相当
    unmountSettings()
    renderSettings()
    expect(avatarSrc()).toBe('data:image/jpeg;base64,compressed')
  })

  it('保存に失敗した時は保存値・画面画像を維持し、保存エラーToastを出す', async () => {
    compressAvatarImageMock.mockResolvedValueOnce('data:image/jpeg;base64,compressed')
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    renderSettings()
    await selectFile(new File(['large'], 'large.jpg', { type: 'image/jpeg' }))
    setItem.mockRestore()

    expect(JSON.parse(localStorage.getItem('oshi')!).avatarImg)
      .toBe('data:image/png;base64,existing')
    expect(avatarSrc()).toBe('data:image/png;base64,existing')
    expect(container?.textContent).toContain(STORAGE_FAILURE_MESSAGE)
  })

  it('圧縮中に名前を保存しても、名前と新しい画像の両方が残る', async () => {
    // 圧縮の完了タイミングをテスト側で制御する（大きい画像＝時間がかかる状況の再現）
    let finishCompress: (dataUrl: string) => void = () => {}
    compressAvatarImageMock.mockReturnValueOnce(
      new Promise<string>((resolve) => { finishCompress = resolve }),
    )
    renderSettings()

    // 1) 圧縮開始 → 2) 圧縮待ちの間に名前を保存
    await selectFile(new File(['large'], 'large.jpg', { type: 'image/jpeg' }))
    typeName('ゆき')
    act(() => saveButton().click())
    expect(JSON.parse(localStorage.getItem('oshi')!).name).toBe('ゆき')

    // 3) 圧縮完了
    await act(async () => {
      finishCompress('data:image/jpeg;base64,compressed')
    })

    // 4) 名前も画像も両方残る（古いoshiで上書きしない）
    const saved = JSON.parse(localStorage.getItem('oshi')!)
    expect(saved.name).toBe('ゆき')
    expect(saved.avatarImg).toBe('data:image/jpeg;base64,compressed')
    expect(avatarSrc()).toBe('data:image/jpeg;base64,compressed')
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

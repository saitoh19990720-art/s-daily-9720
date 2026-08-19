// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AlarmCard, { type AlarmMode, type AlarmState } from './AlarmCard'

let root: Root | null = null
let container: HTMLDivElement | null = null

function render(ui: React.ReactNode) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root?.render(ui))
  return container
}

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
})

const STATES: AlarmState[] = ['scheduled', 'ringing', 'snoozed', 'completed']
const MODES: AlarmMode[] = ['normal', 'omamori']

/** Figma node 152:80 の8 Variantsの期待値 */
const EXPECTED: Record<string, { status: string; texts: string[]; buttons: string[]; toggle: boolean }> = {
  'scheduled/normal': { status: '予定', texts: ['夜タスクを始める', '開始10分前にお知らせ'], buttons: [], toggle: true },
  'ringing/normal': { status: '今です', texts: ['夜タスクを始める時間だよ'], buttons: ['あと10分', '完了'], toggle: false },
  'snoozed/normal': { status: 'スヌーズ中', texts: ['10分後にもう一度お知らせ', 'あと 00:10'], buttons: ['今すぐ戻す'], toggle: false },
  'completed/normal': { status: '完了', texts: ['夜タスクを開始しました', '今日 23:02'], buttons: [], toggle: false },
  'scheduled/omamori': { status: 'お守りモード', texts: ['ゆっくり準備を始めよう', '無理しなくて大丈夫'], buttons: [], toggle: true },
  'ringing/omamori': { status: 'お守りモード', texts: ['できそうなら、ゆっくり始めよう'], buttons: ['あと10分', '完了'], toggle: false },
  'snoozed/omamori': { status: 'お守りモード', texts: ['また声かけるね', 'あと 00:10'], buttons: ['今すぐ戻す'], toggle: false },
  'completed/omamori': { status: 'お守りモード', texts: ['えらい！お疲れさま', '今日 23:02'], buttons: [], toggle: false },
}

describe('AlarmCard — 8 Variants', () => {
  for (const state of STATES) {
    for (const mode of MODES) {
      const key = `${state}/${mode}`
      it(`${key}: Figmaの文言・操作・時刻を出す`, () => {
        const el = render(<AlarmCard state={state} mode={mode} />)
        const expected = EXPECTED[key]
        const text = el.textContent ?? ''

        expect(text).toContain(expected.status)
        expect(text).toContain('22:50')
        for (const t of expected.texts) expect(text).toContain(t)

        const buttons = [...el.querySelectorAll('button')].map((b) => b.textContent)
        expect(buttons).toEqual(expected.buttons)

        const toggle = el.querySelector('input[type="checkbox"]')
        expect(Boolean(toggle)).toBe(expected.toggle)

        // 状態は色だけでなくテキストでも判別できる
        expect(el.querySelector('.alarm-status')?.textContent).toBe(expected.status)
        // 状態/モードが属性で識別できる
        expect(el.querySelector('.alarm-card')?.getAttribute('data-state')).toBe(state)
        expect(el.querySelector('.alarm-card')?.getAttribute('data-mode')).toBe(mode)
      })
    }
  }

  it('Completed は操作を一切出さず、opacityを落とさない', () => {
    for (const mode of MODES) {
      const el = render(<AlarmCard state="completed" mode={mode} />)
      expect(el.querySelectorAll('button')).toHaveLength(0)
      expect(el.querySelector('input[type="checkbox"]')).toBeNull()
      const card = el.querySelector('.alarm-card') as HTMLElement
      expect(card.style.opacity).toBe('')
      act(() => root?.unmount())
      container?.remove()
    }
  })
})

describe('AlarmCard — 操作', () => {
  it('Scheduled: トグルで onToggle が呼ばれる', () => {
    const onToggle = vi.fn()
    const el = render(<AlarmCard state="scheduled" enabled={false} onToggle={onToggle} />)
    const input = el.querySelector('input[type="checkbox"]') as HTMLInputElement
    expect(input.checked).toBe(false)
    act(() => {
      input.click()
    })
    expect(onToggle).toHaveBeenCalledWith(true)
  })

  it('Ringing: あと10分 → onSnooze / 完了 → onComplete', () => {
    const onSnooze = vi.fn()
    const onComplete = vi.fn()
    const el = render(<AlarmCard state="ringing" onSnooze={onSnooze} onComplete={onComplete} />)
    const [snooze, complete] = [...el.querySelectorAll('button')]
    act(() => snooze.click())
    act(() => complete.click())
    expect(onSnooze).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('Snoozed: 今すぐ戻す → onResume', () => {
    const onResume = vi.fn()
    const el = render(<AlarmCard state="snoozed" onResume={onResume} />)
    const btn = el.querySelector('button') as HTMLButtonElement
    expect(btn.textContent).toBe('今すぐ戻す')
    act(() => btn.click())
    expect(onResume).toHaveBeenCalledTimes(1)
  })
})

describe('AlarmCard — アクセシビリティ / レイアウト', () => {
  it('操作要素はキーボードで到達できる本物のbutton/inputである', () => {
    const el = render(<AlarmCard state="ringing" />)
    for (const b of el.querySelectorAll('button')) {
      expect(b.tagName).toBe('BUTTON')
      expect(b.getAttribute('type')).toBe('button')
      expect(b.hasAttribute('disabled')).toBe(false)
    }
  })

  it('トグルには読み上げ用のラベルがある', () => {
    const el = render(<AlarmCard state="scheduled" />)
    const input = el.querySelector('input[type="checkbox"]') as HTMLInputElement
    expect(input.getAttribute('aria-label')).toBeTruthy()
  })

  it('カードは固定幅ではなくコンテナ幅に追従する（横スクロールを出さない）', () => {
    const el = render(<AlarmCard state="scheduled" />)
    const card = el.querySelector('.alarm-card') as HTMLElement
    // インラインで width:358px を焼き込んでいないこと（CSS側で max-width 制御）
    expect(card.style.width).toBe('')
  })

  it('長い文言でも文字が欠けない（省略や固定高さを持たない）', () => {
    const el = render(
      <AlarmCard
        state="scheduled"
        title={'とても長いタイトル'.repeat(6)}
        supportingText={'とても長い補足テキスト'.repeat(6)}
      />,
    )
    const body = el.querySelector('.alarm-body') as HTMLElement
    expect(body.textContent?.length).toBeGreaterThan(50)
    expect(body.style.height).toBe('')
  })
})

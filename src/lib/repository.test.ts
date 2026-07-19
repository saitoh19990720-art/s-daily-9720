// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_OSHI, LocalStorageRepository } from './repository'

describe('LocalStorageRepository', () => {
  const repository = new LocalStorageRepository()

  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('破損JSONを初期値へ復旧する', () => {
    localStorage.setItem('planItems', '{broken')
    localStorage.setItem('hlogs', '[broken')

    expect(repository.getPlanItems()).toBeNull()
    expect(repository.getHealthLogs()).toEqual([])
  })

  it('正しいJSONでもルート構造が不正なら初期値へ復旧する', () => {
    localStorage.setItem('oshi', JSON.stringify(['not-an-oshi']))
    localStorage.setItem('planItems', JSON.stringify({ text: '予定' }))
    localStorage.setItem('hlogs', JSON.stringify('not-an-array'))

    expect(repository.getOshi()).toBeNull()
    expect(repository.getPlanItems()).toBeNull()
    expect(repository.getHealthLogs()).toEqual([])
  })

  it('配列内の不正レコードだけを除外する', () => {
    const validPlan = { text: '配信', time: '20:00', cat: 'fun' }
    const validHealth = {
      date: '07/20',
      mood: '😊',
      pain: 'なし',
      tags: '',
      memo: '元気',
      period: false,
    }
    localStorage.setItem(
      'planItems',
      JSON.stringify([validPlan, null, { ...validPlan, cat: 'invalid' }, { time: '10:00' }]),
    )
    localStorage.setItem(
      'hlogs',
      JSON.stringify([validHealth, 1, { ...validHealth, period: 'false' }]),
    )

    expect(repository.getPlanItems()).toEqual([validPlan])
    expect(repository.getHealthLogs()).toEqual([validHealth])
  })

  it('既存の正常データを値を変えずに読み込む', () => {
    const oshi = { ...DEFAULT_OSHI, name: 'あかり', avatarImg: 'data:image/png;base64,abc' }
    const plans = [
      { text: '作業', time: '10:00', cat: 'task' as const },
      { text: '休憩', time: '', cat: 'rest' as const },
    ]
    localStorage.setItem('oshi', JSON.stringify(oshi))
    localStorage.setItem('planItems', JSON.stringify(plans))

    expect(repository.getOshi()).toEqual(oshi)
    expect(repository.getPlanItems()).toEqual(plans)
  })

  it('localStorage保存例外を成功扱いにしない', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })

    expect(repository.setPlanItems([{ text: '予定', time: '', cat: 'task' }])).toBe(false)
    expect(repository.setOshi(DEFAULT_OSHI)).toBe(false)
  })
})

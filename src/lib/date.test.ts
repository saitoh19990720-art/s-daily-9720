import { describe, expect, it } from 'vitest'
import { tokyoDateInputValue, tokyoShortDate } from './date'

describe('Asia/Tokyoの日付境界', () => {
  it('UTC日付ではなく日本時間の今日を返す', () => {
    expect(tokyoDateInputValue(new Date('2026-01-01T14:59:59Z'))).toBe('2026-01-01')
    expect(tokyoDateInputValue(new Date('2026-01-01T15:00:00Z'))).toBe('2026-01-02')
  })

  it('月末・年末を含めて日本時間の明日を返す', () => {
    expect(tokyoDateInputValue(new Date('2026-01-31T15:30:00Z'), 1)).toBe('2026-02-02')
    expect(tokyoDateInputValue(new Date('2026-12-31T14:30:00Z'), 1)).toBe('2027-01-01')
    expect(tokyoDateInputValue(new Date('2028-02-28T15:30:00Z'), 1)).toBe('2028-03-01')
  })

  it('既存のMM/DD表示形式を維持する', () => {
    expect(tokyoShortDate(new Date('2026-07-20T15:00:00Z'))).toBe('07/21')
  })
})

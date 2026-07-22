const TOKYO_TIME_ZONE = 'Asia/Tokyo'

function tokyoDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TOKYO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  return { year: value('year'), month: value('month'), day: value('day') }
}

export function tokyoDateInputValue(date = new Date(), addDays = 0): string {
  let { year, month, day } = tokyoDateParts(date)
  const daysInMonth = (targetYear: number, targetMonth: number) => {
    if (targetMonth === 2) {
      const leap = targetYear % 4 === 0 && (targetYear % 100 !== 0 || targetYear % 400 === 0)
      return leap ? 29 : 28
    }
    return [4, 6, 9, 11].includes(targetMonth) ? 30 : 31
  }
  let remaining = addDays
  while (remaining > 0) {
    day += 1
    if (day > daysInMonth(year, month)) {
      day = 1
      month += 1
      if (month > 12) {
        month = 1
        year += 1
      }
    }
    remaining -= 1
  }
  while (remaining < 0) {
    day -= 1
    if (day < 1) {
      month -= 1
      if (month < 1) {
        month = 12
        year -= 1
      }
      day = daysInMonth(year, month)
    }
    remaining += 1
  }
  return [
    year,
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-')
}

export function tokyoShortDate(date = new Date()): string {
  return tokyoDateInputValue(date).slice(5).replace('-', '/')
}

// ISO文字列を東京時間の「YYYY/MM/DD HH:mm」で表示する。③-B-2の詳細画面用。
// 不正な日付は空文字（呼び出し側でフォールバック表示）。
export function tokyoDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TOKYO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}/${value('month')}/${value('day')} ${value('hour')}:${value('minute')}`
}

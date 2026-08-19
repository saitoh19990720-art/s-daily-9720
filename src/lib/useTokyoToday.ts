// 東京時間の「今日」（YYYY-MM-DD）を返し、日付が変わったら自動で追従するフック。
// 画面を開いたまま0時をまたぐ／バックグラウンドのまま日付が変わる場合に、
// 前日のままの表示が残らないようにする（定期ポーリングはしない）。
import { useEffect, useState } from 'react'
import { tokyoDateInputValue } from './date'

const DAY_MS = 24 * 60 * 60 * 1000
// タイマーが0時ちょうどより数ミリ秒早く起きても前日のままにならないための余白。
const BOUNDARY_MARGIN_MS = 50

/** 次の東京0時までの残りミリ秒。Asia/Tokyo は夏時間が無いので固定オフセットで計算できる。 */
export function msUntilNextTokyoMidnight(date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0)
  const elapsed =
    ((value('hour') * 60 + value('minute')) * 60 + value('second')) * 1000 + date.getMilliseconds()
  const remaining = DAY_MS - elapsed
  return remaining > 0 ? remaining : DAY_MS
}

export function useTokyoToday(): string {
  const [today, setToday] = useState(() => tokyoDateInputValue())

  useEffect(() => {
    let timer = 0
    // 日付が変わっていなければ state を書き換えない＝余計な再描画を起こさない。
    const sync = () =>
      setToday((prev) => {
        const next = tokyoDateInputValue()
        return next === prev ? prev : next
      })
    // 次の0時に1回だけ起きて、起きたらまた次の0時を予約する（多重予約はしない）。
    const schedule = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        sync()
        schedule()
      }, msUntilNextTokyoMidnight() + BOUNDARY_MARGIN_MS)
    }
    // バックグラウンド中はタイマーが遅延・停止することがあるので、復帰時にも取り直す。
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      sync()
      schedule()
    }

    sync()
    schedule()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return today
}

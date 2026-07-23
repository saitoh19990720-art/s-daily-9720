// かけら → 予定変換モーダル（③-B-3-2）。
// 思想：明示操作（「予定を追加」）でだけ既存PlanItem型の予定を1件作る。元のかけらは変更・削除しない。
// 保存は既存 addPlanItem（Repository層経由）を再利用し、新データ型・新キー・schema変更をしない。
//
// 日付について：既存PlanItem型は { text, time, cat } で「日付」を持たない“今日の予定”モデル。
// 日付フィールドを足すと型・保存形式の互換を壊すため、日付入力は設けない（③-B-3-1 と同じく最小・互換優先）。
// time は既存UIと同じ type="time"（HH:MM文字列・任意）で、UTC変換を挟まないため日付ずれは発生しない。
import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import { useApp } from '../state/AppContext'
import type { Memo, PlanCat } from '../lib/types'
import { TASK_NAME_MAX, deriveTaskName } from '../lib/taskName'

interface Props {
  open: boolean
  memo: Memo
  onClose: () => void
}

// 既存 PlanModal と同一のカテゴリ定義（新しい列挙値を増やさない）。
const CATS: { cat: PlanCat; icon: string; label: string }[] = [
  { cat: 'task', icon: '📋', label: 'タスク' },
  { cat: 'fun', icon: '🎉', label: '楽しみ' },
  { cat: 'care', icon: '🏥', label: '必要' },
  { cat: 'rest', icon: '💤', label: '休憩' },
]

const INITIAL_TIME = ''
const INITIAL_CAT: PlanCat = 'fun' // 既存 PlanModal の既定と一致

export default function PlanConvertModal({ open, memo, onClose }: Props) {
  const { addPlanItem, showToast } = useApp()
  const initialName = deriveTaskName(memo.text)
  const [name, setName] = useState(initialName)
  const [time, setTime] = useState(INITIAL_TIME)
  const [cat, setCat] = useState<PlanCat>(INITIAL_CAT)
  const [discard, setDiscard] = useState(false)
  const [saving, setSaving] = useState(false)
  // 連打・同一処理中の二重作成を防ぐ即時ロック（setStateの非同期を待たない）。
  const savingRef = useRef(false)
  const closeTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => () => {
    if (closeTimerRef.current !== undefined) window.clearTimeout(closeTimerRef.current)
  }, [])

  useEffect(() => {
    if (!open) return
    setName(initialName)
    setTime(INITIAL_TIME)
    setCat(INITIAL_CAT)
    setDiscard(false)
    setSaving(false)
    savingRef.current = false
    if (closeTimerRef.current !== undefined) window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, memo.id])

  if (!open) return null

  const dirty = name !== initialName || time !== INITIAL_TIME || cat !== INITIAL_CAT
  const canSave = name.trim().length > 0 && !saving

  // 閉じる系の共通処理：初期値からの未保存変更があれば破棄確認。連打吸収中は無視。
  const requestClose = () => {
    if (savingRef.current) return
    if (dirty) {
      setDiscard(true)
      return
    }
    onClose()
  }

  const onAdd = () => {
    const val = name.trim()
    if (!val || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    // addPlanItem は成功でのみ true。失敗（保存例外/無料上限）は false＝Modal維持・再試行可。
    const ok = addPlanItem(val, time, cat)
    if (!ok) {
      savingRef.current = false
      setSaving(false)
      return
    }
    showToast('予定に追加しました')
    // 成功直後の連打が背後の詳細操作へ抜けないよう、短時間だけ前面で吸収してから閉じる。
    closeTimerRef.current = window.setTimeout(onClose, 250)
  }

  return (
    <Modal
      open={open}
      onClose={requestClose}
      title="かけらを予定にする"
      description="このかけらの内容をもとに、予定を1件追加します。元のかけらは変更されません。"
    >
      <div className="fd">
        <section className="fd-section">
          <label className="fd-label" htmlFor="plan-name-input">
            予定名
          </label>
          <input
            id="plan-name-input"
            className="f-input"
            type="text"
            value={name}
            maxLength={TASK_NAME_MAX}
            data-autofocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onAdd()
              }
            }}
            placeholder="例：配信を見る"
          />
        </section>

        <section className="fd-section">
          <label className="fd-label" htmlFor="plan-time-input">
            時間（任意）
          </label>
          <input
            id="plan-time-input"
            className="f-input"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </section>

        <section className="fd-section">
          <span className="fd-label" id="plan-cat-label">
            カテゴリ
          </span>
          <div className="plan-cat-select" role="group" aria-labelledby="plan-cat-label">
            {CATS.map((c) => (
              <button
                key={c.cat}
                type="button"
                className={`cat-btn${cat === c.cat ? ' sel' : ''}`}
                onClick={() => setCat(c.cat)}
                aria-pressed={cat === c.cat}
              >
                {c.icon}
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </section>

        <p className="fd-empty">元のかけら本文はそのまま残ります。ここで編集した内容が予定になります。</p>

        <div className="modal-acts">
          <button type="button" className="btn btn-ghost" onClick={requestClose}>
            キャンセル
          </button>
          <button type="button" className="btn btn-primary" onClick={onAdd} disabled={!canSave}>
            予定を追加
          </button>
        </div>
      </div>

      {discard && (
        <Modal
          open
          onClose={() => setDiscard(false)}
          title="入力内容を破棄しますか？"
          description="入力した予定名・時間・カテゴリは保存されません。"
        >
          <p className="fd-confirm-text">保存していない入力内容があります。破棄すると元に戻せません。</p>
          <div className="modal-acts">
            <button type="button" className="btn btn-ghost" data-autofocus onClick={() => setDiscard(false)}>
              編集を続ける
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                setDiscard(false)
                onClose()
              }}
            >
              破棄する
            </button>
          </div>
        </Modal>
      )}
    </Modal>
  )
}

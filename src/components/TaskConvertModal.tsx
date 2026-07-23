// かけら → タスク変換モーダル（③-B-3-1）。
// 思想：明示操作（「タスクを追加」）でだけ既存Task型のタスクを1件作る。元のかけらは変更・削除しない。
// 保存は既存 addTodo（Repository層経由）を再利用し、新データ型・新キー・schema変更をしない。
import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import { useApp } from '../state/AppContext'
import type { Memo } from '../lib/types'
import { TASK_NAME_MAX, deriveTaskName } from '../lib/taskName'

interface Props {
  open: boolean
  memo: Memo
  onClose: () => void
}

export default function TaskConvertModal({ open, memo, onClose }: Props) {
  const { addTodo, showToast } = useApp()
  const initial = deriveTaskName(memo.text)
  const [name, setName] = useState(initial)
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
    setName(initial)
    setDiscard(false)
    setSaving(false)
    savingRef.current = false
    if (closeTimerRef.current !== undefined) window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, memo.id])

  if (!open) return null

  const dirty = name !== initial
  const canSave = name.trim().length > 0 && !saving

  // 閉じる系の共通処理：初期値からの未保存変更があれば破棄確認。
  const requestClose = () => {
    // 保存成功後の連打吸収中は、保存済み入力を未保存として破棄確認しない。
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
    // addTodo は成功でのみ true。失敗（保存例外/お守り上限）は false＝Modal維持・再試行可。
    const ok = addTodo(val, '', 'low')
    if (!ok) {
      savingRef.current = false
      setSaving(false)
      return
    }
    showToast('タスクに追加しました')
    // 成功直後の連打が背後の詳細操作へ抜けないよう、短時間だけ前面で吸収してから閉じる。
    // 保存ボタンは saving=true のため無効のまま。元のかけらと詳細Modalは不変。
    closeTimerRef.current = window.setTimeout(onClose, 250)
  }

  return (
    <Modal
      open={open}
      onClose={requestClose}
      title="かけらをタスクにする"
      description="このかけらの内容をもとに、タスクを1件追加します。元のかけらは変更されません。"
    >
      <div className="fd">
        <section className="fd-section">
          <label className="fd-label" htmlFor="task-name-input">
            タスク名
          </label>
          <input
            id="task-name-input"
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
            placeholder="例：メールを返す"
          />
          <p className="fd-empty">元のかけら本文はそのまま残ります。ここで編集した内容がタスク名になります。</p>
        </section>

        <div className="modal-acts">
          <button type="button" className="btn btn-ghost" onClick={requestClose}>
            キャンセル
          </button>
          <button type="button" className="btn btn-primary" onClick={onAdd} disabled={!canSave}>
            タスクを追加
          </button>
        </div>
      </div>

      {discard && (
        <Modal
          open
          onClose={() => setDiscard(false)}
          title="入力内容を破棄しますか？"
          description="入力したタスク名は保存されません。"
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

// 予定 追加モーダル。Vanilla版 plan-modal を保持。
import { useEffect, useState } from 'react'
import Modal from './Modal'
import { useApp } from '../state/AppContext'
import type { PlanCat } from '../lib/types'

const CATS: { cat: PlanCat; icon: string; label: string }[] = [
  { cat: 'task', icon: '📋', label: 'タスク' },
  { cat: 'fun', icon: '🎉', label: '楽しみ' },
  { cat: 'care', icon: '🏥', label: '必要' },
  { cat: 'rest', icon: '💤', label: '休憩' },
]

export default function PlanModal() {
  const { planModal, closePlanModal, planItems, addPlanItem, editPlanItem, showToast } = useApp()
  const { open, editingIdx } = planModal
  const editing = editingIdx !== null ? planItems[editingIdx] ?? null : null
  const [text, setText] = useState('')
  const [time, setTime] = useState('')
  const [cat, setCat] = useState<PlanCat>('fun')

  useEffect(() => {
    if (open) {
      setText(editing?.text ?? '')
      setTime(editing?.time ?? '')
      setCat(editing?.cat ?? 'fun')
    }
  }, [editing, open])

  const save = () => {
    const t = text.trim()
    if (!t) return
    const saved = editingIdx === null
      ? addPlanItem(t, time, cat)
      : editPlanItem(editingIdx, t, time, cat)
    if (saved) {
      showToast(editingIdx === null ? '予定を追加 🗓' : '予定を更新しました')
      closePlanModal()
    }
  }

  return (
    <Modal
      open={open}
      onClose={closePlanModal}
      title={editing ? '予定を編集' : '予定を追加'}
      description="予定の内容、時間、カテゴリを入力します。"
    >
      <div className="f-group">
        <label className="f-label">内容</label>
        <input
          className="f-input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="例：配信を見る"
        />
      </div>
      <div className="f-group">
        <label className="f-label">時間（任意）</label>
        <input className="f-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <div className="f-group">
        <label className="f-label">カテゴリ</label>
        <div className="plan-cat-select">
          {CATS.map((c) => (
            <button
              key={c.cat}
              className={`cat-btn${cat === c.cat ? ' sel' : ''}`}
              onClick={() => setCat(c.cat)}
              aria-pressed={cat === c.cat}
            >
              {c.icon}
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="modal-acts">
        <button className="btn btn-ghost" onClick={closePlanModal}>
          キャンセル
        </button>
        <button className="btn btn-primary" onClick={save}>
          保存
        </button>
      </div>
    </Modal>
  )
}

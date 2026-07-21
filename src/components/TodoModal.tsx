// タスク追加/編集モーダル。Vanilla版 todo-modal のフォーム・挙動を保持。
import { useEffect, useState } from 'react'
import Modal from './Modal'
import { useApp } from '../state/AppContext'
import type { Prio } from '../lib/types'
import { tokyoDateInputValue } from '../lib/date'

type DueMode = 'today' | 'tomorrow' | 'custom' | 'none'

export default function TodoModal() {
  const { todoModal, closeTodoModal, todos, addTodo, editTodo, checkLimit, showToast } = useApp()
  const { open, editingId } = todoModal
  const editing = editingId ? todos.find((t) => t.id === editingId) ?? null : null

  const [text, setText] = useState('')
  const [dueMode, setDueMode] = useState<DueMode>('none')
  const [dateVal, setDateVal] = useState('')
  const [prio, setPrio] = useState<Prio>('low')

  // Vanilla openTodoModal と同じ初期化（編集でも期限は none にリセット）
  useEffect(() => {
    if (!open) return
    setText(editing?.text ?? '')
    setDateVal('')
    setDueMode('none')
    setPrio(editing?.prio ?? 'low')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId])

  const pickDue = (mode: DueMode) => {
    setDueMode(mode)
    if (mode === 'today') setDateVal(tokyoDateInputValue())
    else if (mode === 'tomorrow') setDateVal(tokyoDateInputValue(new Date(), 1))
    else if (mode === 'none') setDateVal('')
    // custom: 日付は date input で選ぶ
  }

  const save = () => {
    const val = text.trim()
    if (!val) return
    if (editing) {
      // 保存失敗時はモーダルを閉じず入力も残す（成功toastも出さない）。
      if (!editTodo(editing.id, val, dateVal, prio)) return
      showToast('編集したよ 📋')
      closeTodoModal()
      return
    }
    if (!checkLimit('todo', todos.length)) {
      closeTodoModal()
      return
    }
    if (!addTodo(val, dateVal, prio)) return
    showToast('タスクに追加 📋')
    closeTodoModal()
  }

  const dueBtn = (mode: DueMode, label: string) => (
    <button
      className={`due-btn${dueMode === mode ? ' sel' : ''}`}
      onClick={() => pickDue(mode)}
      aria-pressed={dueMode === mode}
    >
      {label}
    </button>
  )
  const prioBtn = (p: Prio, label: string) => (
    <button
      className={`prio-btn${prio === p ? ' sel' : ''}`}
      onClick={() => setPrio(p)}
      aria-pressed={prio === p}
    >
      {label}
    </button>
  )

  return (
    <Modal
      open={open}
      onClose={closeTodoModal}
      title={editing ? 'タスクを編集' : 'タスクを追加'}
      description="タスクの内容、期限、優先度を入力します。"
    >
      <input
        className="f-input"
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="例：メールを返す"
        style={{ fontSize: 15, marginBottom: 10 }}
      />
      <label className="f-label">期限</label>
      <div className="due-quick">
        {dueBtn('today', '今日')}
        {dueBtn('tomorrow', '明日')}
        {dueBtn('custom', '日付')}
        {dueBtn('none', 'なし')}
      </div>
      {dueMode === 'custom' && (
        <input
          className="f-input"
          type="date"
          value={dateVal}
          onChange={(e) => setDateVal(e.target.value)}
          style={{ marginTop: 8 }}
        />
      )}
      <label className="f-label" style={{ marginTop: 12 }}>
        優先度
      </label>
      <div className="priority-select">
        {prioBtn('high', '🔴 高め')}
        {prioBtn('mid', '🟡 ふつう')}
        {prioBtn('low', '⚪️ 低め')}
      </div>
      <div className="modal-acts">
        <button className="btn btn-ghost" onClick={closeTodoModal}>
          キャンセル
        </button>
        <button className="btn btn-primary" onClick={save}>
          保存
        </button>
      </div>
    </Modal>
  )
}

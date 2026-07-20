// 会話のかけら 追加/編集モーダル。Vanilla版 memo-modal を保持。
// 命名決定：保存ボタン=「会話のかけらに残す」。自動保存はしない（このボタン押下＝ユーザー確認）。
import { useEffect, useState } from 'react'
import Modal from './Modal'
import { useApp } from '../state/AppContext'

export default function MemoModal() {
  const { memoModal, closeMemoModal, memos, addMemo, editMemo, checkLimit, showToast } = useApp()
  const { open, editingIdx } = memoModal
  const editing = editingIdx !== null ? memos[editingIdx] ?? null : null

  const [text, setText] = useState('')
  useEffect(() => {
    if (open) setText(editing?.text ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingIdx])

  const save = () => {
    const val = text.trim()
    if (!val) return
    if (editingIdx !== null) {
      editMemo(editingIdx, val)
    } else {
      if (!checkLimit('memo', memos.length)) {
        closeMemoModal()
        return
      }
      addMemo(val)
    }
    showToast('会話のかけらに残しました')
    closeMemoModal()
  }

  return (
    <Modal
      open={open}
      onClose={closeMemoModal}
      title={editing ? '会話のかけらを編集' : '会話のかけらに残す'}
      description="会話のかけらとして残す内容を入力します。"
    >
      <textarea
        className="f-textarea f-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="会話のかけらの内容"
        rows={4}
      />
      <div className="modal-acts">
        <button className="btn btn-ghost" onClick={closeMemoModal}>
          キャンセル
        </button>
        <button className="btn btn-primary" onClick={save}>
          会話のかけらに残す
        </button>
      </div>
    </Modal>
  )
}

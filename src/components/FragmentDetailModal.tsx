// 会話のかけら 詳細モーダル（③-B-2）。
// 役割：保存済みかけらの確認 → 本文/タグ編集 → 破棄確認 → 削除確認。
// 思想：明示操作なしに更新・削除しない／元会話と利用者の本文をラベルと見た目で区別する。
import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import TaskConvertModal from './TaskConvertModal'
import { useApp } from '../state/AppContext'
import { tokyoDateTime } from '../lib/date'
import { FRAGMENT_TAG_MAX_COUNT, FRAGMENT_TAG_MAX_LENGTH, tagsEqual } from '../lib/tags'

type Mode = 'view' | 'edit'
type ConfirmKind = null | 'discard' | 'delete'

export default function FragmentDetailModal() {
  const { fragmentDetail, closeFragmentDetail, memos, updateMemo, deleteMemoById, showToast, oshi, dispName } = useApp()
  const { open, id } = fragmentDetail
  const memo = id ? memos.find((m) => m.id === id) ?? null : null

  const [mode, setMode] = useState<Mode>('view')
  const [text, setText] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [confirm, setConfirm] = useState<ConfirmKind>(null)
  // ③-B-3-1：かけら→タスク変換Modalの開閉。詳細の編集stateとは独立（混同しない）。
  const [converting, setConverting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const taskConvertButtonRef = useRef<HTMLButtonElement>(null)
  const restoreTaskConvertFocusRef = useRef(false)

  // 開いた時・対象が変わった時は必ず view から。編集内容は都度リセット。
  useEffect(() => {
    if (!open) return
    setMode('view')
    setText(memo?.text ?? '')
    setTags(memo?.tags ?? [])
    setTagInput('')
    setConfirm(null)
    setConverting(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, id])

  // 編集に入ったら本文へフォーカス（Modalの初期フォーカスはopen時のみのため手動）。
  useEffect(() => {
    if (mode === 'edit') textareaRef.current?.focus()
  }, [mode])

  // 対象が別経路で削除・初期化された場合は、描画中に親stateを更新せずEffectで閉じる。
  useEffect(() => {
    if (open && id && !memo) closeFragmentDetail()
  }, [closeFragmentDetail, id, memo, open])

  // 変換Modalを閉じた後は、それを開いた「タスクにする」へフォーカスを戻す。
  useEffect(() => {
    if (!converting && restoreTaskConvertFocusRef.current) {
      restoreTaskConvertFocusRef.current = false
      taskConvertButtonRef.current?.focus()
    }
  }, [converting])

  if (!open) return null
  if (!memo) return null

  const isChat = memo.source === 'chat'
  const sourceLabel = isChat ? '会話から' : '手動で追加'
  const oshiLabel = dispName(oshi.name)

  const dirty =
    mode === 'edit' &&
    (text.trim() !== memo.text || !tagsEqual(tags, memo.tags) || tagInput.trim() !== '')

  const enterEdit = () => {
    setText(memo.text)
    setTags(memo.tags)
    setTagInput('')
    setMode('edit')
  }

  const backToView = () => {
    setText(memo.text)
    setTags(memo.tags)
    setTagInput('')
    setMode('view')
  }

  // Escape / 背景クリック / 閉じる の共通ハンドラ。編集中で未保存変更があれば破棄確認。
  const handleClose = () => {
    if (mode === 'edit') {
      if (dirty) {
        setConfirm('discard')
        return
      }
      setMode('view')
      return
    }
    closeFragmentDetail()
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (!t) return
    if (t.length > FRAGMENT_TAG_MAX_LENGTH) {
      showToast(`タグは${FRAGMENT_TAG_MAX_LENGTH}文字までにしてね`)
      return
    }
    if (tags.length >= FRAGMENT_TAG_MAX_COUNT) {
      showToast(`タグは${FRAGMENT_TAG_MAX_COUNT}個までにしてね`)
      return
    }
    if (tags.includes(t)) {
      setTagInput('')
      return
    }
    setTags([...tags, t])
    setTagInput('')
  }

  const removeTag = (index: number) => setTags(tags.filter((_, i) => i !== index))

  const saveEdit = () => {
    const val = text.trim()
    if (!val) {
      showToast('本文を入力してね')
      return
    }
    // 未追加のタグ入力があれば取り込んでから保存（入力の取りこぼしを防ぐ）。
    const pending = tagInput.trim()
    if (pending.length > FRAGMENT_TAG_MAX_LENGTH) {
      showToast(`タグは${FRAGMENT_TAG_MAX_LENGTH}文字までにしてね`)
      return
    }
    if (pending && tags.includes(pending)) {
      showToast('同じタグは追加できません')
      return
    }
    if (pending && tags.length >= FRAGMENT_TAG_MAX_COUNT) {
      showToast(`タグは${FRAGMENT_TAG_MAX_COUNT}個までにしてね`)
      return
    }
    const finalTags = pending ? [...tags, pending] : tags
    const result = updateMemo(memo.id, val, finalTags)
    if (result === 'error') return // 保存失敗：編集維持・Modalも閉じない（トーストはcontext側）
    if (result === 'saved') showToast('会話のかけらを更新しました')
    // 'unchanged' は通知なし
    setTagInput('')
    setMode('view')
  }

  const confirmDelete = () => {
    if (deleteMemoById(memo.id)) {
      showToast('削除しました')
      closeFragmentDetail()
    } else {
      // 削除失敗：詳細・stateを保持。確認だけ閉じて再試行できるようにする。
      setConfirm(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={mode === 'edit' ? 'かけらを編集' : 'かけらの詳細'}
      description={
        mode === 'edit'
          ? '会話のかけらの本文とタグを編集します。'
          : '保存した会話のかけらの内容・タグ・元の会話を確認します。'
      }
    >
      {mode === 'view' ? (
        <div className="fd">
          <section className="fd-section">
            <div className="fd-label">いまの本文</div>
            <p className="fd-text">{memo.text}</p>
          </section>

          <section className="fd-section">
            <div className="fd-label">タグ</div>
            {memo.tags.length === 0 ? (
              <p className="fd-empty">タグはまだありません</p>
            ) : (
              <ul className="fd-tags" aria-label="タグ一覧">
                {memo.tags.map((tag, index) => (
                  <li key={`${index}:${tag}`} className="fd-tag">
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="fd-section">
            <dl className="fd-meta">
              <div className="fd-meta-row">
                <dt>保存日時</dt>
                <dd>{tokyoDateTime(memo.createdAt) || memo.date}</dd>
              </div>
              <div className="fd-meta-row">
                <dt>更新日時</dt>
                <dd>{tokyoDateTime(memo.updatedAt) || memo.date}</dd>
              </div>
              <div className="fd-meta-row">
                <dt>保存元</dt>
                <dd>
                  <span className="fd-source">
                    <span aria-hidden="true">{isChat ? '💬' : '✍️'}</span>
                    {sourceLabel}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          <section className="fd-section">
            <div className="fd-label">元の会話</div>
            {isChat && memo.origin.length > 0 ? (
              <ol className="fd-origin" aria-label="元になった会話">
                {memo.origin.map((message, index) => (
                  <li key={index} className={`fd-origin-msg ${message.role}`}>
                    <span className="fd-origin-who">
                      {message.role === 'user' ? 'あなた' : oshiLabel}
                    </span>
                    <span className="fd-origin-text">{message.content}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="fd-empty">元になった会話はありません（手動で追加したかけら）</p>
            )}
          </section>

          <div className="modal-acts">
            <button type="button" className="btn btn-ghost" onClick={closeFragmentDetail}>
              閉じる
            </button>
            <button type="button" className="btn btn-danger" onClick={() => setConfirm('delete')}>
              削除
            </button>
            <button
              ref={taskConvertButtonRef}
              type="button"
              className="btn btn-task"
              onClick={() => setConverting(true)}
            >
              📋 タスクにする
            </button>
            <button type="button" className="btn btn-primary" onClick={enterEdit}>
              編集
            </button>
          </div>
        </div>
      ) : (
        <div className="fd">
          <section className="fd-section">
            <label className="fd-label" htmlFor="fd-edit-text">
              本文
            </label>
            <textarea
              id="fd-edit-text"
              ref={textareaRef}
              className="f-textarea f-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="かけらの本文"
              rows={4}
            />
          </section>

          <section className="fd-section">
            <label className="fd-label" htmlFor="fd-tag-input">
              タグ（最大{FRAGMENT_TAG_MAX_COUNT}個・各{FRAGMENT_TAG_MAX_LENGTH}文字）
            </label>
            {tags.length > 0 && (
              <ul className="fd-tags fd-tags-edit" aria-label="追加済みタグ">
                {tags.map((tag, index) => (
                  <li key={`${index}:${tag}`} className="fd-tag">
                    <span>{tag}</span>
                    <button
                      type="button"
                      className="fd-tag-remove"
                      onClick={() => removeTag(index)}
                      aria-label={`タグ「${tag}」を削除`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="fd-tag-add">
              <input
                id="fd-tag-input"
                className="f-input"
                type="text"
                value={tagInput}
                maxLength={FRAGMENT_TAG_MAX_LENGTH}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder="タグを追加"
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={addTag}>
                追加
              </button>
            </div>
          </section>

          <div className="modal-acts">
            <button type="button" className="btn btn-ghost" onClick={handleClose}>
              キャンセル
            </button>
            <button type="button" className="btn btn-primary" onClick={saveEdit}>
              保存
            </button>
          </div>
        </div>
      )}

      {confirm === 'discard' && (
        <Modal
          open
          onClose={() => setConfirm(null)}
          title="変更を破棄しますか？"
          description="保存していない本文・タグの変更が失われます。"
        >
          <p className="fd-confirm-text">保存していない変更があります。破棄すると元に戻せません。</p>
          <div className="modal-acts">
            <button type="button" className="btn btn-ghost" data-autofocus onClick={() => setConfirm(null)}>
              編集を続ける
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                setConfirm(null)
                backToView()
              }}
            >
              破棄する
            </button>
          </div>
        </Modal>
      )}

      {confirm === 'delete' && (
        <Modal
          open
          onClose={() => setConfirm(null)}
          title="このかけらを削除しますか？"
          description="削除するとこの会話のかけらは元に戻せません。"
        >
          <p className="fd-confirm-text">このかけらを削除しますか？この操作は元に戻せません。</p>
          <div className="modal-acts">
            <button type="button" className="btn btn-ghost" data-autofocus onClick={() => setConfirm(null)}>
              キャンセル
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmDelete}>
              削除する
            </button>
          </div>
        </Modal>
      )}

      {/* ③-B-3-1：かけら→タスク変換。成功しても詳細は維持（元のかけらは不変）。 */}
      <TaskConvertModal
        open={converting}
        memo={memo}
        onClose={() => {
          restoreTaskConvertFocusRef.current = true
          setConverting(false)
        }}
      />
    </Modal>
  )
}

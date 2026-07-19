// チャット画面。Vanilla版 scr-chat を保持。
// 会話のかけら/タスク/予定は AIが「保存候補」を提案するだけで、保存ボタン押下（ユーザー確認）まで保存しない。
import { useEffect, useRef, useState } from 'react'
import { useApp } from '../state/AppContext'
import { Avatar, OmamoriBadge, ThemeButton } from '../components/TopBits'
import { CANDIDATE_LABELS } from '../lib/constants'

export default function Chat() {
  const { oshi, dispName, chatItems, sendChat, saveCandidate, skipCandidate } = useApp()
  const name = dispName(oshi.name)
  const [input, setInput] = useState('')
  const msgsRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = msgsRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chatItems])

  const send = () => {
    const t = input.trim()
    if (!t) return
    sendChat(t)
    setInput('')
    if (taRef.current) taRef.current.style.height = 'auto'
  }

  return (
    <div className="screen on">
      <div className="topbar">
        <Avatar cls="av-36" img={oshi.avatarImg} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{name}</div>
          <div style={{ fontSize: 10, color: 'var(--accent)' }}>● オンライン</div>
        </div>
        <div className="topbar-right">
          <OmamoriBadge />
          <ThemeButton />
        </div>
      </div>

      <div className="chat-msgs" ref={msgsRef}>
        {chatItems.map((it) => {
          if (it.kind === 'msg') {
            return (
              <div key={it.id} className={`msg ${it.role}`}>
                {it.role === 'oshi' && <Avatar cls="av-26" img={oshi.avatarImg} />}
                <div className="bubble">{it.text}</div>
              </div>
            )
          }
          if (it.kind === 'typing') {
            return (
              <div key={it.id} className="msg oshi">
                <Avatar cls="av-26" img={oshi.avatarImg} />
                <div className="bubble">
                  <div className="typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )
          }
          const { type, text } = it.extract
          return (
            <div
              key={it.id}
              className={`ext t-${type}`}
              style={it.state === 'saved' ? { opacity: 0.4, pointerEvents: 'none' } : undefined}
            >
              <div>
                <span className={`ext-badge ${type}`}>{CANDIDATE_LABELS[type]}</span>
              </div>
              <div className="ext-text">「{text}」</div>
              <div className="ext-acts">
                <button className={`ext-btn s${type[0]}`} onClick={() => saveCandidate(it.id)}>
                  {type === 'memo' ? '会話のかけらに残す' : '保存'}
                </button>
                <button className="ext-btn sk" onClick={() => skipCandidate(it.id)}>
                  スキップ
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="chat-input-area">
        <textarea
          ref={taRef}
          className="ci"
          value={input}
          placeholder="話しかけてみて…"
          rows={1}
          onChange={(e) => {
            setInput(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${e.target.scrollHeight}px`
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <button className="send-btn" onClick={send}>
          ↑
        </button>
      </div>
    </div>
  )
}

// 体調・生理画面（owner限定）。Vanilla版 scr-health を保持。
import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { ThemeButton } from '../components/TopBits'

const MOODS = ['😊', '😐', '😔', '😤', '😢']
const PAINS = ['なし', '少し', 'つらい', 'かなりつらい']
const SYMPTOMS = ['眠気', 'だるさ', '頭痛', 'むくみ', 'イライラ']
const OMAMORI_DETAIL = ['✦ TODO 3つ以下に絞る', '✦ 語気をやさしく', '✦「頑張れ」を使わない', '✦ 休む選択肢を先に出す']

export default function Health() {
  const { periodStart, inPeriod, startPeriod, endPeriod, healthLogs, saveHealth, omamoriOn, setOmamori } =
    useApp()
  const [mood, setMood] = useState<string | null>(null)
  const [pain, setPain] = useState('なし')
  const [symptoms, setSymptoms] = useState<Set<string>>(new Set())
  const [memo, setMemo] = useState('')

  // 生理サイクル表示（Vanilla版 updateCycle）
  let cyNum = '—'
  let cyLabel = '記録を始めてみよう'
  if (inPeriod && periodStart) {
    const d = Math.floor((Date.now() - new Date(periodStart).getTime()) / 864e5) + 1
    cyNum = String(d)
    cyLabel = `生理 ${d}日目`
  } else if (periodStart) {
    const d = Math.floor((Date.now() - new Date(periodStart).getTime()) / 864e5)
    cyNum = String(d)
    cyLabel = `前回から ${d}日`
  }

  const toggleSymptom = (s: string) =>
    setSymptoms((prev) => {
      const n = new Set(prev)
      if (n.has(s)) n.delete(s)
      else n.add(s)
      return n
    })

  const onSave = () => {
    const today = new Date().toLocaleDateString('ja', { month: '2-digit', day: '2-digit' })
    saveHealth({
      date: today,
      mood: mood ?? '—',
      pain,
      tags: [...symptoms].join('・'),
      memo: memo.trim(),
      period: inPeriod,
    })
    setMemo('')
    setSymptoms(new Set())
  }

  return (
    <div className="screen on">
      <div className="topbar">
        <span className="topbar-title">🩸 体調・生理</span>
        <div className="topbar-right">
          <ThemeButton />
        </div>
      </div>
      <div className="scroll">
        <div className="card">
          <div className="card-title">生理サイクル</div>
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div className="cy-num">{cyNum}</div>
            <div className="cy-label">{cyLabel}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {!inPeriod && (
              <button
                className="btn"
                style={{ background: 'linear-gradient(135deg,var(--plan),#e8709a)', color: 'white' }}
                onClick={startPeriod}
              >
                生理開始
              </button>
            )}
            {inPeriod && (
              <button className="btn btn-ghost" onClick={endPeriod}>
                生理終了
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-title">今日の体調</div>
          <label className="f-label">気分</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {MOODS.map((m) => (
              <button key={m} className={`emoji-btn${mood === m ? ' sel' : ''}`} onClick={() => setMood(m)}>
                {m}
              </button>
            ))}
          </div>
          <label className="f-label" style={{ marginTop: 12 }}>
            痛み
          </label>
          <div className="chip-g">
            {PAINS.map((p) => (
              <div key={p} className={`chip${pain === p ? ' sel' : ''}`} onClick={() => setPain(p)}>
                {p}
              </div>
            ))}
          </div>
          <label className="f-label" style={{ marginTop: 12 }}>
            症状
          </label>
          <div className="chip-g">
            {SYMPTOMS.map((s) => (
              <div key={s} className={`chip${symptoms.has(s) ? ' sel' : ''}`} onClick={() => toggleSymptom(s)}>
                {s}
              </div>
            ))}
          </div>
          <div className="f-group" style={{ marginTop: 12 }}>
            <label className="f-label">メモ</label>
            <textarea
              className="f-textarea f-input"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
            />
          </div>
          <button
            className="btn btn-full"
            style={{ background: 'linear-gradient(135deg,var(--plan),#e8709a)', color: 'white', marginTop: 10 }}
            onClick={onSave}
          >
            記録する
          </button>
        </div>

        <div className="card" style={{ borderColor: 'rgba(244,167,185,.35)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#c06080' }}>🧿 お守りモード</div>
              <div style={{ fontSize: 11, color: '#a08090' }}>体調に合わせて推しが動く</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={omamoriOn} onChange={(e) => setOmamori(e.target.checked)} />
              <div className="tg-track" />
              <div className="tg-thumb" />
            </label>
          </div>
          {omamoriOn && (
            <div style={{ fontSize: 12, color: '#c06080', lineHeight: 1.7, marginTop: 8 }}>
              {OMAMORI_DETAIL.map((t, i) => (
                <div key={i}>{t}</div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">最近の記録</div>
          <div>
            {healthLogs.length === 0 ? (
              <div className="empty">まだ記録がないよ。</div>
            ) : (
              healthLogs.slice(0, 5).map((l, i) => (
                <div
                  key={i}
                  style={{ padding: '9px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10 }}
                >
                  <div style={{ fontSize: 10, color: 'var(--soft)', minWidth: 36, marginTop: 2 }}>{l.date}</div>
                  <div>
                    <div style={{ fontSize: 16, lineHeight: 1 }}>
                      {l.mood}
                      {l.period ? ' 🩸' : ''}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {[l.pain !== 'なし' ? '痛み:' + l.pain : '', l.tags].filter(Boolean).join(' · ') || '記録のみ'}
                    </div>
                    {l.memo && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{l.memo}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

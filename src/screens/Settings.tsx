// 設定画面。Vanilla版 scr-settings のフォーム・コピー・owner-only 制御を保持。
import { useEffect, useRef, useState } from 'react'
import { useApp } from '../state/AppContext'
import { ThemeButton } from '../components/TopBits'
import Modal from '../components/Modal'
import { compressAvatarImage } from '../lib/avatarImage'

const RELATIONS = ['推し', '相棒', '恋人未満', '恋人', '友達', '先輩', '執事・メイド', '創作キャラ']
const TONES = ['やさしい', 'クール', '甘い', 'ツンデレ', '明るい', '無口', '丁寧']
const MODES = [
  { icon: '🌅', name: '朝モード', desc: '今日の準備' },
  { icon: '🌙', name: '夜モード', desc: '1日の振り返り' },
  { icon: '😴', name: '安眠モード', desc: '静かに寄り添う' },
  { icon: '⏰', name: '締切前', desc: '集中サポート' },
  { icon: '🎪', name: '現場前', desc: 'テンション上げ' },
  { icon: '🤒', name: '体調不良', desc: 'やさしく寄り添う' },
]

export default function Settings() {
  const {
    oshi,
    saveOshi,
    beginAvatarSelection,
    isLatestAvatarSelection,
    saveAvatar,
    showToast,
    setScreen,
    resetRecordData,
  } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const mountedRef = useRef(true)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    mountedRef.current = true
    // unmountでは世代を進めない。進めると「保存へ進んでよい処理」まで
    // 選び直し扱いで捨ててしまい、画面遷移で画像が保存されなくなるため。
    return () => {
      mountedRef.current = false
    }
  }, [])

  const onReset = () => {
    // 成功時のみモーダルを閉じる。失敗時はresetRecordData側でエラー通知を出し、Modalは開いたまま。
    if (resetRecordData()) setConfirmReset(false)
  }

  const [name, setName] = useState(oshi.name)
  const [callname, setCallname] = useState(oshi.callname)
  const [relation, setRelation] = useState(oshi.relation)
  const [tone, setTone] = useState(oshi.tone)
  const [first, setFirst] = useState(oshi.first)
  const [second, setSecond] = useState(oshi.second)
  const [nowords, setNowords] = useState(oshi.nowords)
  const [core, setCore] = useState(oshi.core)
  const [banned, setBanned] = useState(oshi.banned)
  // 特殊モードは Vanilla版でも保存対象外の見た目トグル（初期は前半3つ選択）
  const [modes, setModes] = useState<Set<number>>(new Set([0, 1, 2]))

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const f = e.target.files?.[0]
    if (!f) return
    input.value = ''
    // 世代IDはProvider側。設定画面を離れて戻っても「最後に選んだ画像」だけが勝つ。
    const requestId = beginAvatarSelection()
    try {
      const avatarDataUrl = await compressAvatarImage(f)
      // 保存は画面を離れたあとでも完了させる（新しい画像が選ばれていた場合だけ捨てる）。
      // 画面表示（トースト）は mount 中に限るので、失敗通知の可否も保存直前に判定させる。
      const result = saveAvatar(avatarDataUrl, requestId, {
        shouldNotifyFailure: () => mountedRef.current,
      })
      if (result === 'saved' && mountedRef.current) showToast('画像を保存しました 🩵')
    } catch {
      if (!mountedRef.current || !isLatestAvatarSelection(requestId)) return
      showToast(f.type.toLowerCase().startsWith('image/')
        ? '画像を読み込めませんでした。別の画像を選んでください'
        : '画像ファイルを選択してください')
    }
  }

  const save = () => {
    saveOshi({
      ...oshi,
      name: name.trim() || '推し',
      callname: callname.trim() || 'きみ',
      relation,
      tone,
      first: first.trim(),
      second: second.trim(),
      nowords: nowords.trim(),
      core: core.trim(),
      banned: banned.trim(),
    })
  }

  const toggleMode = (i: number) =>
    setModes((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  return (
    <div className="screen on">
      <div className="topbar">
        <span className="topbar-title">設定</span>
        <div className="topbar-right">
          <ThemeButton />
        </div>
      </div>
      <div className="scroll">
        <button
          type="button"
          className="card owner-only"
          onClick={() => setScreen('plan')}
          style={{
            cursor: 'pointer',
            background: 'linear-gradient(135deg,var(--accent-p),rgba(184,168,216,.12))',
            borderColor: 'var(--accent-s)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 24 }}>✦</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>プラン管理</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                お守りプラン・体調管理パック
              </div>
            </div>
            <div style={{ fontSize: 18, color: 'var(--muted)' }}>›</div>
          </div>
        </button>

        <div className="card">
          <div className="card-title">アバター画像</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              type="button"
              className="av-upload"
              onClick={() => fileRef.current?.click()}
              aria-label="推しの画像を変更"
            >
              {oshi.avatarImg ? (
                <img src={oshi.avatarImg} alt="" />
              ) : (
                <span style={{ fontSize: 26 }}>🌙</span>
              )}
              <div className="av-hint">変更</div>
            </button>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
              タップして推しの画像を選ぶ。
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
        </div>

        <div className="card">
          <div className="card-title">基本情報</div>
          <div className="f-group">
            <label className="f-label">推しの名前</label>
            <input className="f-input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例：あかり" />
          </div>
          <div className="f-group">
            <label className="f-label">私への呼び方</label>
            <input className="f-input" type="text" value={callname} onChange={(e) => setCallname(e.target.value)} placeholder="例：きみ" />
          </div>
          <div className="f-group">
            <label className="f-label">関係性</label>
            <div className="chip-g">
              {RELATIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`chip${relation === r ? ' sel' : ''}`}
                  onClick={() => setRelation(r)}
                  aria-pressed={relation === r}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">口調・話し方</div>
          <div className="f-group">
            <label className="f-label">トーン</label>
            <div className="chip-g">
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`chip${tone === t ? ' sel' : ''}`}
                  onClick={() => setTone(t)}
                  aria-pressed={tone === t}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="f-row">
            <div className="f-group">
              <label className="f-label">一人称</label>
              <input className="f-input" type="text" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="俺、私、僕" />
            </div>
            <div className="f-group">
              <label className="f-label">二人称</label>
              <input className="f-input" type="text" value={second} onChange={(e) => setSecond(e.target.value)} placeholder="きみ" />
            </div>
          </div>
          <div className="f-group">
            <label className="f-label">使わない言葉</label>
            <input className="f-input" type="text" value={nowords} onChange={(e) => setNowords(e.target.value)} placeholder="例：頑張れ" />
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            深い人格設定{' '}
            <span
              style={{
                fontSize: 9,
                color: 'var(--soft)',
                background: 'var(--accent-p)',
                border: '1px solid var(--accent-s)',
                borderRadius: 9,
                padding: '1px 8px',
                marginLeft: 4,
              }}
            >
              上級者向け
            </span>
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              lineHeight: 1.6,
              padding: '9px 11px',
              background: 'var(--accent-p)',
              borderRadius: 10,
              border: '1px solid var(--accent-s)',
              marginBottom: 12,
            }}
          >
            🤖 AIだけが読む設定。詳しく書くほど精度UP。
          </div>
          <div className="f-group">
            <label className="f-label">性格の核</label>
            <textarea className="f-textarea f-input" value={core} onChange={(e) => setCore(e.target.value)} rows={2} />
          </div>
          <div className="f-group">
            <label className="f-label">禁止事項</label>
            <textarea className="f-textarea f-input" value={banned} onChange={(e) => setBanned(e.target.value)} rows={2} />
          </div>
        </div>

        <div className="card owner-only">
          <div className="card-title">特殊モード</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {MODES.map((m, i) => (
              <button
                key={m.name}
                type="button"
                className={`mode-c${modes.has(i) ? ' sel' : ''}`}
                onClick={() => toggleMode(i)}
                aria-pressed={modes.has(i)}
              >
                <div style={{ fontSize: 16, marginBottom: 3 }}>{m.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 500 }}>{m.name}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-primary btn-full" onClick={save} style={{ marginBottom: 8 }}>
          この推しで設定する
        </button>

        <div className="card">
          <div className="card-title">データ管理</div>
          <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 12 }}>
            タスク・会話のかけら・予定・体調の記録をすべて消して初期状態に戻します。推しの設定やテーマは残ります。
          </p>
          <button type="button" className="btn btn-danger btn-full" onClick={() => setConfirmReset(true)}>
            記録データを初期化
          </button>
        </div>
      </div>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="記録データを初期化しますか？"
        description="タスク・会話のかけら・予定・体調の記録をすべて削除します。この操作は取り消せません。"
      >
        <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.8 }}>
          タスク・会話のかけら・予定・体調の記録をすべて削除します。
          <br />
          この操作は取り消せません。
        </p>
        <div className="modal-acts">
          <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>
            キャンセル
          </button>
          <button className="btn btn-danger" onClick={onReset}>
            削除する
          </button>
        </div>
      </Modal>
    </div>
  )
}

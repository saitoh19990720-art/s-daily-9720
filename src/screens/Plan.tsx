// プラン（課金）画面（owner限定）。Vanilla版 scr-plan を保持。
// ※実課金は行わない。selectPlan は localStorage 上のプラン種別を切り替えるモック（Vanilla版と同一）。
import { useApp } from '../state/AppContext'
import { ThemeButton } from '../components/TopBits'
import type { PlanTier } from '../lib/types'

const LABELS: Record<PlanTier, string> = { free: '無料プラン', once: '体調管理パック', sub: 'お守りプラン' }

export default function Plan() {
  const { planTier, selectPlan } = useApp()
  const freeBtn = planTier === 'free' ? '現在のプラン ✓' : 'ダウングレード'
  const onceBtn =
    planTier === 'once' ? '現在のプラン ✓' : planTier === 'sub' ? '含まれています ✓' : '¥480 で購入'
  const subBtn = planTier === 'sub' ? '現在のプラン ✓' : '¥480 / 月 ではじめる'

  return (
    <div className="screen on">
      <div className="topbar">
        <span className="topbar-title">プラン</span>
        <div className="topbar-right">
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{LABELS[planTier]}</span>
          <ThemeButton />
        </div>
      </div>
      <div className="scroll">
        <div style={{ textAlign: 'center', padding: '14px 0 10px' }}>
          <div style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 20 }}>推しと、もっと深く。</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            記録は全プランで手元に残るよ。
          </div>
        </div>

        <div className="pl-card">
          <div className="pl-name">🌱 無料プラン</div>
          <div className="pl-price">
            ¥0 <span>/ ずっと</span>
          </div>
          <div className="pl-desc">基本体験。</div>
          <button className="pl-btn fr" onClick={() => selectPlan('free')}>
            {freeBtn}
          </button>
        </div>

        <div className="pl-card">
          <div className="pl-name">🩸 体調管理パック</div>
          <div className="pl-price">
            ¥480 <span>/ 買い切り</span>
          </div>
          <div className="pl-desc">生理・体調記録を追加。</div>
          <button className="pl-btn on" onClick={() => selectPlan('once')}>
            {onceBtn}
          </button>
        </div>

        <div className="pl-card rec">
          <div className="pl-badge">✦ おすすめ</div>
          <div className="pl-name">🧿 お守りプラン</div>
          <div className="pl-price">
            ¥480 <span>/ 月</span>
          </div>
          <div className="pl-desc">お守り・チャット200回・深い人格設定。</div>
          <button className="pl-btn sb" onClick={() => selectPlan('sub')}>
            {subBtn}
          </button>
        </div>
      </div>
    </div>
  )
}

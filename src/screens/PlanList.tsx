// 予定画面（owner限定）。Vanilla版 scr-planlist を保持。
import { useApp } from '../state/AppContext'
import { ThemeButton } from '../components/TopBits'
import type { PlanItem } from '../lib/types'

// 推しの予定コメント。Vanilla版 updateScheduleComment の分岐を保持。
function scheduleComment(planItems: PlanItem[]): string {
  if (!planItems.length) return '「今日の予定を教えて。一緒に整えるよ」'
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  let upcoming: PlanItem | null = null
  let minDiff = Infinity
  planItems.forEach((p) => {
    if (!p.time) return
    const [h, m] = p.time.split(':').map(Number)
    const diff = h * 60 + m - nowMin
    if (diff > 0 && diff < minDiff) {
      minDiff = diff
      upcoming = p
    }
  })
  if (upcoming && minDiff <= 120) {
    const dt = minDiff <= 30 ? `あと${minDiff}分` : `あと${Math.round(minDiff / 60)}時間`
    return `「${dt}で${(upcoming as PlanItem).text}。準備しよ」`
  }
  const fun = planItems.find((p) => p.cat === 'fun')
  return fun ? `「${fun.text}楽しみだね。それまでにやること整えよ」` : '「今日の予定、一緒に確認しよ」'
}

export default function PlanList() {
  const { planItems, deletePlanItem, openPlanModal, oshi } = useApp()
  return (
    <div className="screen on">
      <div className="topbar">
        <span className="topbar-title">今日の予定</span>
        <div className="topbar-right">
          <button className="btn btn-primary btn-sm" onClick={openPlanModal}>
            ＋追加
          </button>
          <ThemeButton />
        </div>
      </div>
      <div className="scroll">
        <div className="card">
          <div className="plan-list">
            {planItems.length === 0 ? (
              <div className="empty">まだ予定がないよ。＋で追加してみて。</div>
            ) : (
              planItems.map((p, i) => (
                <div className="pi" key={i}>
                  <div className={`pi-cat-dot ${p.cat}`} />
                  {p.time && <div className="pi-time">{p.time}</div>}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--text)' }}>{p.text}</div>
                  </div>
                  <button
                    className="btn-icon del"
                    onClick={() => deletePlanItem(i)}
                    aria-label={`${p.text}を削除`}
                    style={{ opacity: 0.5 }}
                  >
                    🗑
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="oshi-schedule-comment">
          <div className="osc-av">
            {oshi.avatarImg ? <img src={oshi.avatarImg} alt="" /> : <span>🌙</span>}
          </div>
          <div className="osc-bubble">{scheduleComment(planItems)}</div>
        </div>
      </div>
    </div>
  )
}

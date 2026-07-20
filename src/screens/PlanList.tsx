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

const CAT_LABELS: Record<PlanItem['cat'], string> = {
  task: '📋 タスク',
  fun: '✨ 推し活',
  care: '🏥 ケア',
  rest: '☕ 休憩',
}

export function PlanListContent() {
  const { planItems, deletePlanItem, openPlanModal, oshi } = useApp()
  return (
    <section className="organize-panel" aria-labelledby="organize-tab-schedule">
      <button className="organize-add" onClick={() => openPlanModal()}>
        ＋ 新しい予定を追加
      </button>
      {planItems.length === 0 ? (
        <div className="empty organize-empty">まだ予定はありません</div>
      ) : (
        <div className="plan-list organize-schedule-list">
          {planItems.map((item, index) => (
            <article className="pi organize-schedule-card" key={`${item.text}-${item.time}-${index}`}>
              <div className="pi-time">{item.time || '時間未定'}</div>
              <div className="organize-schedule-body">
                <div className="organize-schedule-title">{item.text}</div>
                <span className={`organize-cat ${item.cat}`}>{CAT_LABELS[item.cat]}</span>
              </div>
              <div className="ti-acts">
                <button className="btn-icon" onClick={() => openPlanModal(index)} aria-label={`${item.text}を編集`}>
                  ✏️
                </button>
                <button className="btn-icon del" onClick={() => deletePlanItem(index)} aria-label={`${item.text}を削除`}>
                  🗑
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="oshi-schedule-comment">
        <div className="osc-av">
          {oshi.avatarImg ? <img src={oshi.avatarImg} alt="" /> : <span>🌙</span>}
        </div>
        <div className="osc-bubble">{scheduleComment(planItems)}</div>
      </div>
    </section>
  )
}

export default function PlanList() {
  const { openPlanModal } = useApp()
  return (
    <div className="screen on">
      <div className="topbar">
        <span className="topbar-title">今日の予定</span>
        <div className="topbar-right">
          <button className="btn btn-primary btn-sm" onClick={() => openPlanModal()}>
            ＋追加
          </button>
          <ThemeButton />
        </div>
      </div>
      <div className="scroll">
        <PlanListContent />
      </div>
    </div>
  )
}

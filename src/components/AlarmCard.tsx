// AlarmCard — Figma正本: node 152:80（推し生活OS — ワイヤーフレーム）
// 4 States × 2 Modes = 8 Variants。文言・色階層はFigmaのまま。
// 配置画面は未定のため、このファイルはどの画面にも接続していない。
// スタイルは index.css から AlarmCard.css へ切り出し済み（この1行だけが差分）。
import './AlarmCard.css'

export type AlarmState = 'scheduled' | 'ringing' | 'snoozed' | 'completed'
export type AlarmMode = 'normal' | 'omamori'

export type AlarmCardProps = {
  state: AlarmState
  mode?: AlarmMode
  /** 見出しの時刻。Figma既定 "22:50" */
  time?: string
  /** Scheduled×Normal の本文。Figma既定 "夜タスクを始める" */
  title?: string
  /** Scheduled×Normal の補足。Figma既定 "開始10分前にお知らせ" */
  supportingText?: string
  /** Scheduled のトグル状態 */
  enabled?: boolean
  onToggle?: (next: boolean) => void
  /** Ringing の「あと10分」 */
  onSnooze?: () => void
  /** Ringing の「完了」 */
  onComplete?: () => void
  /** Snoozed の「今すぐ戻す」 */
  onResume?: () => void
  /** Snoozed の残り表示。Figma既定 "あと 00:10" */
  snoozeRemainingText?: string
  /** Completed の完了時刻。Figma既定 "今日 23:02" */
  completedAtText?: string
  className?: string
}

/** ステータスラベル（色ではなく文字で状態を伝える＝色依存にしない） */
function statusLabel(state: AlarmState, mode: AlarmMode): string {
  if (mode === 'omamori') return 'お守りモード'
  if (state === 'completed') return '完了'
  if (state === 'snoozed') return 'スヌーズ中'
  if (state === 'ringing') return '今です'
  return '予定'
}

/** 本文（15px）。Figmaの文言をそのまま保持する */
function bodyText(state: AlarmState, mode: AlarmMode): string {
  if (mode === 'omamori') {
    if (state === 'completed') return 'えらい！お疲れさま'
    if (state === 'snoozed') return 'また声かけるね'
    if (state === 'ringing') return 'できそうなら、ゆっくり始めよう'
    return 'ゆっくり準備を始めよう'
  }
  if (state === 'completed') return '夜タスクを開始しました'
  if (state === 'snoozed') return '10分後にもう一度お知らせ'
  if (state === 'ringing') return '夜タスクを始める時間だよ'
  return ''
}

export default function AlarmCard({
  state,
  mode = 'normal',
  time = '22:50',
  title = '夜タスクを始める',
  supportingText = '開始10分前にお知らせ',
  enabled = true,
  onToggle,
  onSnooze,
  onComplete,
  onResume,
  snoozeRemainingText = 'あと 00:10',
  completedAtText = '今日 23:02',
  className,
}: AlarmCardProps) {
  const isOmamori = mode === 'omamori'
  const isScheduled = state === 'scheduled'
  const isRinging = state === 'ringing'
  const isSnoozed = state === 'snoozed'
  const isCompleted = state === 'completed'

  // --- ステータスラベルの色（Figmaの分岐をそのまま） ---
  let statusTone = ''
  if (isOmamori && !isCompleted) statusTone = ' alarm-status--oshi'
  else if (isCompleted) statusTone = ' alarm-status--muted'
  else if (isSnoozed) statusTone = ' alarm-status--info'
  else if (isRinging) statusTone = ' alarm-status--accent'

  // --- 時刻の色 ---
  let timeTone = ''
  if (isRinging) timeTone = isOmamori ? ' alarm-time--oshi' : ' alarm-time--accent'

  // --- 本文 / 補足の表示条件（Figmaの分岐をそのまま） ---
  const body = bodyText(state, mode)
  const showBody = body !== ''
  const showSupport = isSnoozed || isCompleted || (isScheduled && isOmamori)
  let support = ''
  if (isScheduled && isOmamori) support = '無理しなくて大丈夫'
  else if (isCompleted) support = completedAtText
  else if (isSnoozed) support = snoozeRemainingText

  const actionTone = isOmamori ? ' alarm-btn--oshi' : ''

  const cardClass = [
    'alarm-card',
    isRinging ? 'alarm-card--ringing' : '',
    isSnoozed ? 'alarm-card--snoozed' : '',
    isCompleted ? 'alarm-card--completed' : '',
    isOmamori ? 'alarm-card--omamori' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article
      className={cardClass}
      data-state={state}
      data-mode={mode}
      aria-label={`アラーム ${time} ${statusLabel(state, mode)}`}
    >
      <div className="alarm-head">
        <p className={`alarm-status${statusTone}`}>{statusLabel(state, mode)}</p>
        {isCompleted && (
          <p className="alarm-check" aria-hidden="true">
            ✓
          </p>
        )}
        <div className="alarm-spacer" />
        <p className={`alarm-time${timeTone}`}>{time}</p>
      </div>

      {showBody && (
        <p className={`alarm-body${isCompleted ? ' alarm-body--muted' : ''}`}>{body}</p>
      )}

      {isScheduled && !isOmamori && <p className="alarm-body">{title}</p>}

      {showSupport && (
        <p className={`alarm-support${isCompleted ? ' alarm-support--muted' : ''}`}>{support}</p>
      )}

      {isScheduled && !isOmamori && <p className="alarm-support">{supportingText}</p>}

      {(isRinging || isSnoozed) && (
        <div className="alarm-actions">
          {isRinging && (
            <>
              <button
                type="button"
                className={`btn alarm-btn${actionTone}`}
                onClick={onSnooze}
              >
                あと10分
              </button>
              <button
                type="button"
                className={`btn alarm-btn${actionTone}`}
                onClick={onComplete}
              >
                完了
              </button>
            </>
          )}
          {isSnoozed && (
            <button
              type="button"
              className={`btn alarm-btn${isOmamori ? ' alarm-btn--oshi' : ' alarm-btn--info'}`}
              onClick={onResume}
            >
              今すぐ戻す
            </button>
          )}
        </div>
      )}

      {isScheduled && (
        <div className="alarm-toggle-row">
          <label className="toggle">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggle?.(e.target.checked)}
              aria-label={`${statusLabel(state, mode)}のアラームを有効にする`}
            />
            <div className="tg-track" />
            <div className="tg-thumb" />
          </label>
        </div>
      )}
    </article>
  )
}

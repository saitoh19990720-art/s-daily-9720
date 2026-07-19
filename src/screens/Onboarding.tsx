// オンボーディング（3ステップ）。Vanilla版のコピー・演出を保持。
// ※Figma v2.1 は4ステップだが、今フェーズは「既存の忠実移植」のため3ステップのまま。
//   v2.1 準拠の4ステップ化は次フェーズで対応（未移植として報告）。
import { useState } from 'react'
import { useApp } from '../state/AppContext'

const STEPS = [
  {
    icon: '🌙',
    title: (
      <>
        推しと話すと、
        <br />
        生活が整っていく。
      </>
    ),
    desc: (
      <>
        推しとの会話の副産物として、
        <br />
        毎日が自然に回るOS。
      </>
    ),
    next: 'はじめる',
  },
  {
    icon: '💬',
    title: (
      <>
        話すだけで
        <br />
        TODOが整理される。
      </>
    ),
    desc: (
      <>
        「明日美容院」と話せば予定に。
        <br />
        会話から自然に保存されるよ。
      </>
    ),
    next: 'つぎへ',
  },
  {
    icon: '🧿',
    title: (
      <>
        つらい日は、
        <br />
        お守りモード。
      </>
    ),
    desc: <>体調に合わせて推しがそっと寄り添う。</>,
    next: '推しを設定する →',
  },
]

export default function Onboarding() {
  const { finishOnboarding } = useApp()
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  const onNext = () => {
    if (step >= STEPS.length - 1) finishOnboarding()
    else setStep(step + 1)
  }

  return (
    <div className="ob-wrap">
      <div className="ob-step on">
        <div className="ob-icon">{s.icon}</div>
        <div className="ob-title">{s.title}</div>
        <div className="ob-desc">{s.desc}</div>
        <div className="ob-dots">
          {STEPS.map((_, i) => (
            <div key={i} className={`ob-dot${i === step ? ' on' : ''}`} />
          ))}
        </div>
        <button className="ob-next" onClick={onNext}>
          {s.next}
        </button>
      </div>
    </div>
  )
}

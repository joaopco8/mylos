'use client'
import { useEffect, useState } from 'react'

const STEPS = [
  '⚽ Fetching live data from TxLINE...',
  '📊 Checking real-time odds...',
  '🤖 Analyzing with Gemini 2.5 Flash...',
  '💡 Preparing your analysis...',
]

export default function ThinkingIndicator() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(prev => (prev + 1) % STEPS.length)
    }, 1200)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-start gap-3 py-2">
      <span className="w-7 h-7 rounded-lg bg-teal-dim border border-teal flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
      </span>
      <div className="flex-1">
        <p className="text-sm text-muted animate-pulse">{STEPS[step]}</p>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-teal animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'

const STEPS_FIXTURE = [
  'Fetching live score from TxLINE...',
  'Checking real-time odds...',
  'Analyzing with Groq Llama 3.3...',
  'Preparing your analysis...',
]

const STEPS_GENERAL = [
  'Fetching general tournament data...',
  'Checking top scorers and results...',
  'Analyzing with Groq Llama 3.3...',
  'Preparing your summary...',
]

interface ThinkingIndicatorProps {
  isGeneral?: boolean
}

export default function ThinkingIndicator({ isGeneral }: ThinkingIndicatorProps) {
  const [step, setStep] = useState(0)
  const steps = isGeneral ? STEPS_GENERAL : STEPS_FIXTURE

  useEffect(() => {
    setStep(0)
    const interval = setInterval(() => {
      setStep(prev => (prev + 1) % steps.length)
    }, 1200)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGeneral])

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex-1">
        <p className="text-sm text-muted animate-pulse">{steps[step]}</p>
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

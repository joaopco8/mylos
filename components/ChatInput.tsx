'use client'
import { useRef } from 'react'

interface ChatInputProps {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  disabled?: boolean
  placeholder?: string
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = 'Send a message...',
}: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 backdrop-blur-xl px-4 pt-3.5 pb-2.5 shadow-2xl shadow-black/50 transition-colors focus-within:border-white/25">
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        disabled={disabled}
        className="w-full bg-transparent text-sm text-text placeholder:text-muted resize-none focus:outline-none focus-visible:outline-none disabled:opacity-50 min-h-[24px] max-h-[120px]"
        onInput={e => {
          const t = e.target as HTMLTextAreaElement
          t.style.height = 'auto'
          t.style.height = Math.min(t.scrollHeight, 120) + 'px'
        }}
      />
      <div className="flex items-center justify-end mt-4">
        <button
          onClick={onSend}
          disabled={!value.trim() || disabled}
          aria-label="Send"
          className="w-8 h-8 rounded-full bg-[#212527] border border-border text-text flex items-center justify-center hover:bg-teal hover:text-black hover:border-teal active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

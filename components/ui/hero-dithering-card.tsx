'use client'

import { useState, Suspense, lazy } from 'react'

const Dithering = lazy(() =>
  import('@paper-design/shaders-react').then((mod) => ({ default: mod.Dithering }))
)

interface DitheringBackgroundProps {
  colorBack?: string
  colorFront?: string
  className?: string
}

export function DitheringBackground({
  colorBack = '#00000000',
  colorFront = '#b45309',
  className = '',
}: DitheringBackgroundProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={`absolute inset-0 z-0 pointer-events-none opacity-25 mix-blend-screen ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Suspense fallback={<div className="absolute inset-0 bg-muted/20" />}>
        <Dithering
          colorBack={colorBack}
          colorFront={colorFront}
          shape="warp"
          type="4x4"
          speed={isHovered ? 0.6 : 0.2}
          className="size-full"
          minPixelRatio={1}
        />
      </Suspense>
    </div>
  )
}

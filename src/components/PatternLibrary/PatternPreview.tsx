import React, { useRef, useEffect, useState } from 'react'
import { Pattern } from '../../types'

interface PatternPreviewProps {
  pattern: Pattern
  size?: number
  selected?: boolean
  onClick?: () => void
  className?: string
}

export const PatternPreview: React.FC<PatternPreviewProps> = ({
  pattern,
  size = 64,
  selected = false,
  onClick,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = size
    canvas.height = size

    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, size, size)

    const cellSize = Math.min(
      Math.floor(size / Math.max(pattern.width, pattern.height)) - 1,
      8
    )
    
    if (cellSize < 1) return

    const offsetX = Math.floor((size - pattern.width * cellSize) / 2)
    const offsetY = Math.floor((size - pattern.height * cellSize) / 2)

    ctx.fillStyle = '#00d4ff'
    for (const cell of pattern.cells) {
      const x = offsetX + cell.x * cellSize
      const y = offsetY + cell.y * cellSize
      ctx.fillRect(x, y, cellSize - 1, cellSize - 1)
    }

    if (selected || isHovered) {
      ctx.strokeStyle = selected ? '#00d4ff' : '#666'
      ctx.lineWidth = selected ? 2 : 1
      ctx.strokeRect(0, 0, size, size)
    }
  }, [pattern, size, selected, isHovered])

  return (
    <div
      className={`pattern-preview ${className} ${selected ? 'selected' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px',
        borderRadius: '8px',
        backgroundColor: selected ? '#1a1a2a' : 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background-color 0.2s',
        minWidth: `${size + 16}px`
      }}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          display: 'block',
          borderRadius: '4px',
          marginBottom: '4px'
        }}
      />
      <span
        style={{
          fontSize: '12px',
          color: '#ccc',
          textAlign: 'center',
          wordBreak: 'break-word',
          maxWidth: `${size + 16}px`
        }}
      >
        {pattern.name}
      </span>
    </div>
  )
}
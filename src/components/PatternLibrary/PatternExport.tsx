import React, { useState } from 'react'
import { PatternExporter, PatternUtils, RLEImporter } from '../../utils/MemoryManager'
import { PatternPreview } from './PatternPreview'

interface PatternExportProps {
  grid: Uint8Array
  gridWidth: number
  gridHeight: number
  rule: string
  generation: number
  canvasRef?: React.RefObject<HTMLCanvasElement> | undefined
  onClose: () => void
  className?: string
}

export const PatternExport: React.FC<PatternExportProps> = ({
  grid,
  gridWidth,
  gridHeight,
  rule,
  generation,
  canvasRef,
  onClose,
  className = ''
}) => {
  const [exportMode, setExportMode] = useState<'json' | 'rle' | 'png'>('json')
  const [patternName, setPatternName] = useState('Custom Pattern')
  const [isExporting, setIsExporting] = useState(false)
  const [success, setSuccess] = useState<string>('')
  const [error, setError] = useState<string>('')
  
  const currentPattern = PatternUtils.gridToPattern(grid, gridWidth, gridHeight, patternName)
  currentPattern.rule = rule

  const handleExport = async () => {
    if (!patternName.trim()) {
      setError('Please enter a pattern name')
      return
    }

    setIsExporting(true)
    setError('')
    setSuccess('')

    try {
      switch (exportMode) {
        case 'json': {
          const exportedPattern = PatternExporter.exportToJSON(
            grid,
            gridWidth,
            gridHeight,
            rule,
            generation,
            patternName
          )
          PatternExporter.exportJSONToFile(exportedPattern)
          setSuccess('JSON file downloaded successfully!')
          break
        }

        case 'rle': {
          const rleContent = RLEImporter.exportToRLE(currentPattern)
          const blob = new Blob([rleContent], { type: 'text/plain' })
          const url = URL.createObjectURL(blob)
          
          const link = document.createElement('a')
          link.href = url
          link.download = `${patternName.replace(/[^a-z0-9\-_]/gi, '_').toLowerCase()}.rle`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          
          URL.revokeObjectURL(url)
          setSuccess('RLE file downloaded successfully!')
          break
        }

        case 'png': {
          if (!canvasRef?.current) {
            setError('Canvas not available for PNG export')
            return
          }
          PatternExporter.exportCanvasToPNG(canvasRef.current, patternName)
          setSuccess('PNG image downloaded successfully!')
          break
        }

        default:
          setError('Invalid export mode')
      }
    } catch (err) {
      setError(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsExporting(false)
    }
  }

  const getExportPreview = () => {
    switch (exportMode) {
      case 'json':
        const exportedPattern = PatternExporter.exportToJSON(
          grid,
          gridWidth,
          gridHeight,
          rule,
          generation,
          patternName
        )
        return JSON.stringify(exportedPattern, null, 2)

      case 'rle':
        return RLEImporter.exportToRLE(currentPattern)

      case 'png':
        return 'PNG image export (visual representation of current grid)'

      default:
        return ''
    }
  }

  const getFileExtension = () => {
    switch (exportMode) {
      case 'json': return '.json'
      case 'rle': return '.rle'
      case 'png': return '.png'
      default: return ''
    }
  }

  const livingCells = currentPattern.cells.length
  const totalCells = gridWidth * gridHeight
  const density = totalCells > 0 ? ((livingCells / totalCells) * 100).toFixed(1) : '0.0'

  return (
    <div
      className={`pattern-export ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        backgroundColor: '#1a1a2a',
        borderRadius: '12px',
        border: '1px solid #333344',
        maxWidth: '700px',
        width: '100%'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>Export Pattern</h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#ccc',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px 8px'
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '16px',
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: '#2a2a3a',
          border: '1px solid #333344'
        }}
      >
        <PatternPreview pattern={currentPattern} size={80} />
        <div style={{ color: '#ccc', fontSize: '14px' }}>
          <div style={{ marginBottom: '8px' }}>
            <strong style={{ color: '#fff' }}>Current Grid</strong>
          </div>
          <div>Size: {gridWidth} × {gridHeight}</div>
          <div>Living Cells: {livingCells}</div>
          <div>Density: {density}%</div>
          <div>Generation: {generation}</div>
          <div>Rule: {rule}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={{ color: '#ccc', fontSize: '14px', fontWeight: 'bold' }}>
          Pattern Name:
        </label>
        <input
          type="text"
          value={patternName}
          onChange={(e) => setPatternName(e.target.value)}
          placeholder="Enter pattern name..."
          style={{
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid #333344',
            backgroundColor: '#2a2a3a',
            color: '#fff',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={{ color: '#ccc', fontSize: '14px', fontWeight: 'bold' }}>
          Export Format:
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['json', 'rle', 'png'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setExportMode(mode)}
              style={{
                padding: '8px 16px',
                border: '1px solid #333344',
                borderRadius: '6px',
                backgroundColor: exportMode === mode ? '#00d4ff' : '#2a2a3a',
                color: exportMode === mode ? '#000' : '#ccc',
                cursor: 'pointer',
                fontSize: '14px',
                textTransform: 'uppercase'
              }}
            >
              {mode}
            </button>
          ))}
        </div>
        <div style={{ color: '#888', fontSize: '12px' }}>
          {exportMode === 'json' && 'CellularLab JSON format (can be imported back)'}
          {exportMode === 'rle' && 'Run Length Encoded format (standard cellular automata format)'}
          {exportMode === 'png' && 'PNG image of current grid visualization'}
        </div>
      </div>

      {exportMode !== 'png' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ color: '#ccc', fontSize: '14px', fontWeight: 'bold' }}>
            Preview:
          </label>
          <textarea
            value={getExportPreview()}
            readOnly
            style={{
              minHeight: '120px',
              maxHeight: '200px',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #333344',
              backgroundColor: '#2a2a3a',
              color: '#ccc',
              fontSize: '12px',
              fontFamily: 'monospace',
              resize: 'vertical'
            }}
          />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ color: '#888', fontSize: '12px' }}>
          File will be saved as: {patternName.replace(/[^a-z0-9\-_]/gi, '_').toLowerCase()}{getFileExtension()}
        </div>
        
        <button
          onClick={handleExport}
          disabled={isExporting || !patternName.trim()}
          style={{
            padding: '12px 24px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: isExporting || !patternName.trim() ? '#444' : '#00d4ff',
            color: isExporting || !patternName.trim() ? '#888' : '#000',
            cursor: isExporting || !patternName.trim() ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {isExporting ? 'Exporting...' : `Export ${exportMode.toUpperCase()}`}
        </button>
      </div>

      {success && (
        <div
          style={{
            padding: '12px',
            borderRadius: '6px',
            backgroundColor: '#1a4a1a',
            border: '1px solid #33aa33',
            color: '#aaffaa',
            fontSize: '14px'
          }}
        >
          {success}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '12px',
            borderRadius: '6px',
            backgroundColor: '#4a1a1a',
            border: '1px solid #aa3333',
            color: '#ffaaaa',
            fontSize: '14px'
          }}
        >
          {error}
        </div>
      )}
    </div>
  )
}
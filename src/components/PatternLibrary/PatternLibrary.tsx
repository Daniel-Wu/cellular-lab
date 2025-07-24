import React, { useState, useMemo } from 'react'
import { Pattern } from '../../types'
import { PatternUtils } from '../../utils/PatternUtils'
import { PatternPreview } from './PatternPreview'
import { PatternImport } from './PatternImport'
import { PatternExport } from './PatternExport'

interface PatternLibraryProps {
  onPatternSelect: (pattern: Pattern) => void
  grid?: Uint8Array
  gridWidth?: number
  gridHeight?: number
  rule?: string
  generation?: number
  canvasRef?: React.RefObject<HTMLCanvasElement>
  className?: string
}

export const PatternLibrary: React.FC<PatternLibraryProps> = ({
  onPatternSelect,
  grid,
  gridWidth = 50,
  gridHeight = 50,
  rule = 'B3/S23',
  generation = 0,
  canvasRef,
  className = ''
}) => {
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [showExport, setShowExport] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')

  const famousPatterns = useMemo(() => PatternUtils.getAllFamousPatterns(), [])

  const filteredPatterns = useMemo(() => {
    if (!searchTerm.trim()) return famousPatterns
    return famousPatterns.filter(pattern =>
      pattern.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [famousPatterns, searchTerm])

  const handlePatternClick = (pattern: Pattern) => {
    setSelectedPattern(pattern)
  }

  const handlePatternSelect = () => {
    if (selectedPattern) {
      onPatternSelect(selectedPattern)
    }
  }

  const handleTransform = (type: 'rotate90' | 'rotate180' | 'rotate270' | 'flipH' | 'flipV') => {
    if (!selectedPattern) return

    let transformedPattern: Pattern

    switch (type) {
      case 'rotate90':
        transformedPattern = PatternUtils.rotatePattern(selectedPattern, 90)
        break
      case 'rotate180':
        transformedPattern = PatternUtils.rotatePattern(selectedPattern, 180)
        break
      case 'rotate270':
        transformedPattern = PatternUtils.rotatePattern(selectedPattern, 270)
        break
      case 'flipH':
        transformedPattern = PatternUtils.flipPatternHorizontal(selectedPattern)
        break
      case 'flipV':
        transformedPattern = PatternUtils.flipPatternVertical(selectedPattern)
        break
      default:
        return
    }

    setSelectedPattern(transformedPattern)
  }

  const handleImportPattern = (pattern: Pattern) => {
    onPatternSelect(pattern)
  }

  return (
    <div
      className={`pattern-library ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        backgroundColor: '#1a1a2a',
        borderRadius: '12px',
        border: '1px solid #333344',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '600px'
      }}
    >
      {showImport && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <PatternImport
            onImport={handleImportPattern}
            onClose={() => setShowImport(false)}
          />
        </div>
      )}

      {showExport && grid && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <PatternExport
            grid={grid}
            gridWidth={gridWidth}
            gridHeight={gridHeight}
            rule={rule}
            generation={generation}
            canvasRef={canvasRef}
            onClose={() => setShowExport(false)}
          />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>Pattern Library</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowImport(true)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #333344',
              backgroundColor: '#2a2a3a',
              color: '#00d4ff',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            Import
          </button>
          {grid && (
            <button
              onClick={() => setShowExport(true)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #333344',
                backgroundColor: '#2a2a3a',
                color: '#00d4ff',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              Export
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          type="text"
          placeholder="Search patterns..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flex: 1,
          overflowY: 'auto'
        }}
      >
        <div style={{ color: '#ccc', fontSize: '14px', fontWeight: 'bold' }}>
          Famous Patterns ({filteredPatterns.length})
        </div>
        
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: '12px',
            padding: '8px'
          }}
        >
          {filteredPatterns.map((pattern) => (
            <PatternPreview
              key={pattern.name}
              pattern={pattern}
              size={80}
              selected={selectedPattern?.name === pattern.name}
              onClick={() => handlePatternClick(pattern)}
            />
          ))}
        </div>

        {filteredPatterns.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: '#888',
              fontSize: '14px',
              padding: '20px'
            }}
          >
            No patterns found matching "{searchTerm}"
          </div>
        )}
      </div>

      {selectedPattern && (
        <div
          style={{
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: '#2a2a3a',
            border: '1px solid #333344'
          }}
        >
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <PatternPreview pattern={selectedPattern} size={100} />
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                  {selectedPattern.name}
                </div>
                <div style={{ color: '#ccc', fontSize: '12px' }}>
                  Size: {selectedPattern.width} × {selectedPattern.height} | 
                  Cells: {selectedPattern.cells.length} | 
                  Rule: {selectedPattern.rule || 'B3/S23'}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ color: '#ccc', fontSize: '12px', fontWeight: 'bold', width: '100%' }}>
                  Transformations:
                </div>
                
                <button
                  onClick={() => handleTransform('rotate90')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #444',
                    backgroundColor: '#3a3a4a',
                    color: '#ccc',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  ↻ 90°
                </button>
                
                <button
                  onClick={() => handleTransform('rotate180')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #444',
                    backgroundColor: '#3a3a4a',
                    color: '#ccc',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  ↻ 180°
                </button>
                
                <button
                  onClick={() => handleTransform('rotate270')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #444',
                    backgroundColor: '#3a3a4a',
                    color: '#ccc',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  ↻ 270°
                </button>
                
                <button
                  onClick={() => handleTransform('flipH')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #444',
                    backgroundColor: '#3a3a4a',
                    color: '#ccc',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  ↔ Flip H
                </button>
                
                <button
                  onClick={() => handleTransform('flipV')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #444',
                    backgroundColor: '#3a3a4a',
                    color: '#ccc',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  ↕ Flip V
                </button>
              </div>

              <button
                onClick={handlePatternSelect}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#00d4ff',
                  color: '#000',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  alignSelf: 'flex-start'
                }}
              >
                Place Pattern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
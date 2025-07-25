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
    >
      {showImport && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
          <PatternImport
            onImport={handleImportPattern}
            onClose={() => setShowImport(false)}
          />
        </div>
      )}

      {showExport && grid && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <div className="w-3 h-3 bg-gradient-to-r from-cell-alive to-primary-400 rounded-full"></div>
          Pattern Library
        </h3>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            Import
          </button>
          {grid && (
            <button
              onClick={() => setShowExport(true)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              Export
            </button>
          )}
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search patterns..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field w-full"
        />
      </div>

      <div className="flex flex-col gap-4 flex-1 overflow-y-auto">
        <div className="flex items-center gap-2 text-text-secondary font-semibold">
          <div className="w-2 h-2 bg-cell-alive rounded-full"></div>
          <span>Famous Patterns ({filteredPatterns.length})</span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-2">
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
          <div className="text-center text-text-tertiary py-12">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-lg mb-2">No patterns found</p>
            <p className="text-sm">Try searching for "{searchTerm}"</p>
          </div>
        )}
      </div>



      {selectedPattern && (
        <div className="mt-6 card-elevated p-6 animate-scale-in">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-shrink-0">
              <PatternPreview pattern={selectedPattern} size={120} />
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <h4 className="text-xl font-bold text-text-primary mb-2">
                  {selectedPattern.name}
                </h4>
                <div className="text-sm text-text-secondary space-y-1">
                  <div>Size: {selectedPattern.width} × {selectedPattern.height}</div>
                  <div>Cells: {selectedPattern.cells.length}</div>
                  <div>Rule: {selectedPattern.rule || 'B3/S23'}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-warning rounded-full"></div>
                  Transformations
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleTransform('rotate90')}
                    className="btn-secondary text-xs px-3 py-1"
                  >
                    ↻ 90°
                  </button>
                  
                  <button
                    onClick={() => handleTransform('rotate180')}
                    className="btn-secondary text-xs px-3 py-1"
                  >
                    ↻ 180°
                  </button>
                  
                  <button
                    onClick={() => handleTransform('rotate270')}
                    className="btn-secondary text-xs px-3 py-1"
                  >
                    ↻ 270°
                  </button>
                  
                  <button
                    onClick={() => handleTransform('flipH')}
                    className="btn-secondary text-xs px-3 py-1"
                  >
                    ↔ Flip H
                  </button>
                  
                  <button
                    onClick={() => handleTransform('flipV')}
                    className="btn-secondary text-xs px-3 py-1"
                  >
                    ↕ Flip V
                  </button>
                </div>
              </div>

              <button
                onClick={handlePatternSelect}
                className="btn-primary flex items-center gap-2"
              >
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                Place Pattern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
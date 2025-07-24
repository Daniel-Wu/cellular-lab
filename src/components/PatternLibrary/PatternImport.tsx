import React, { useState, useRef } from 'react'
import { Pattern } from '../../types'
import { RLEImporter, PatternExporter } from '../../utils/MemoryManager'
import { PatternPreview } from './PatternPreview'

interface PatternImportProps {
  onImport: (pattern: Pattern) => void
  onClose: () => void
  className?: string
}

export const PatternImport: React.FC<PatternImportProps> = ({
  onImport,
  onClose,
  className = ''
}) => {
  const [rleText, setRleText] = useState('')
  const [jsonText, setJsonText] = useState('')
  const [importMode, setImportMode] = useState<'rle' | 'json' | 'file'>('rle')
  const [previewPattern, setPreviewPattern] = useState<Pattern | null>(null)
  const [error, setError] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleRLEImport = () => {
    if (!rleText.trim()) {
      setError('Please enter RLE text')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      const result = RLEImporter.import(rleText)
      if (result.pattern) {
        setPreviewPattern(result.pattern)
        setError('')
      } else {
        setError(result.error || 'Failed to import RLE pattern')
        setPreviewPattern(null)
      }
    } catch (err) {
      setError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setPreviewPattern(null)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleJSONImport = () => {
    if (!jsonText.trim()) {
      setError('Please enter JSON text')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      const result = PatternExporter.importFromJSON(jsonText)
      if (result.pattern) {
        setPreviewPattern(result.pattern)
        setError('')
      } else {
        setError(result.error || 'Failed to import JSON pattern')
        setPreviewPattern(null)
      }
    } catch (err) {
      setError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setPreviewPattern(null)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setError('')

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (!content) {
        setError('Failed to read file')
        setIsProcessing(false)
        return
      }

      try {
        let result: { pattern: Pattern | null; error?: string }

        if (file.name.toLowerCase().endsWith('.rle')) {
          result = RLEImporter.import(content)
        } else if (file.name.toLowerCase().endsWith('.json')) {
          result = PatternExporter.importFromJSON(content)
        } else {
          result = RLEImporter.import(content)
          if (!result.pattern) {
            result = PatternExporter.importFromJSON(content)
          }
        }

        if (result.pattern) {
          setPreviewPattern(result.pattern)
          setError('')
        } else {
          setError(result.error || 'Failed to import file')
          setPreviewPattern(null)
        }
      } catch (err) {
        setError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
        setPreviewPattern(null)
      } finally {
        setIsProcessing(false)
      }
    }

    reader.onerror = () => {
      setError('Failed to read file')
      setIsProcessing(false)
    }

    reader.readAsText(file)
  }

  const handleConfirmImport = () => {
    if (previewPattern) {
      onImport(previewPattern)
      onClose()
    }
  }

  const handleClear = () => {
    setRleText('')
    setJsonText('')
    setPreviewPattern(null)
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div
      className={`pattern-import ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        backgroundColor: '#1a1a2a',
        borderRadius: '12px',
        border: '1px solid #333344',
        maxWidth: '600px',
        width: '100%'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>Import Pattern</h3>
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

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {(['rle', 'json', 'file'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setImportMode(mode)}
            style={{
              padding: '8px 16px',
              border: '1px solid #333344',
              borderRadius: '6px',
              backgroundColor: importMode === mode ? '#00d4ff' : '#2a2a3a',
              color: importMode === mode ? '#000' : '#ccc',
              cursor: 'pointer',
              fontSize: '14px',
              textTransform: 'uppercase'
            }}
          >
            {mode}
          </button>
        ))}
      </div>

      {importMode === 'rle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ color: '#ccc', fontSize: '14px' }}>
            RLE Pattern (e.g. "x = 3, y = 3, rule = B3/S23\nbo$2bo$3o!")
          </label>
          <textarea
            value={rleText}
            onChange={(e) => setRleText(e.target.value)}
            placeholder="Enter RLE pattern..."
            style={{
              minHeight: '120px',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #333344',
              backgroundColor: '#2a2a3a',
              color: '#fff',
              fontSize: '14px',
              fontFamily: 'monospace',
              resize: 'vertical'
            }}
          />
          <button
            onClick={handleRLEImport}
            disabled={isProcessing || !rleText.trim()}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: isProcessing || !rleText.trim() ? '#444' : '#00d4ff',
              color: isProcessing || !rleText.trim() ? '#888' : '#000',
              cursor: isProcessing || !rleText.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {isProcessing ? 'Processing...' : 'Import RLE'}
          </button>
        </div>
      )}

      {importMode === 'json' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ color: '#ccc', fontSize: '14px' }}>
            JSON Pattern (exported from CellularLab)
          </label>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder="Paste JSON pattern..."
            style={{
              minHeight: '120px',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #333344',
              backgroundColor: '#2a2a3a',
              color: '#fff',
              fontSize: '14px',
              fontFamily: 'monospace',
              resize: 'vertical'
            }}
          />
          <button
            onClick={handleJSONImport}
            disabled={isProcessing || !jsonText.trim()}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: isProcessing || !jsonText.trim() ? '#444' : '#00d4ff',
              color: isProcessing || !jsonText.trim() ? '#888' : '#000',
              cursor: isProcessing || !jsonText.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {isProcessing ? 'Processing...' : 'Import JSON'}
          </button>
        </div>
      )}

      {importMode === 'file' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ color: '#ccc', fontSize: '14px' }}>
            Upload File (.rle, .json, or .txt)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".rle,.json,.txt"
            onChange={handleFileImport}
            style={{
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #333344',
              backgroundColor: '#2a2a3a',
              color: '#ccc',
              fontSize: '14px'
            }}
          />
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

      {previewPattern && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '16px',
            borderRadius: '6px',
            backgroundColor: '#2a2a3a',
            border: '1px solid #333344'
          }}
        >
          <div style={{ color: '#ccc', fontSize: '14px', fontWeight: 'bold' }}>
            Preview:
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <PatternPreview pattern={previewPattern} size={80} />
            <div style={{ color: '#ccc', fontSize: '14px' }}>
              <div><strong>{previewPattern.name}</strong></div>
              <div>Size: {previewPattern.width} × {previewPattern.height}</div>
              <div>Cells: {previewPattern.cells.length}</div>
              {previewPattern.rule && <div>Rule: {previewPattern.rule}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleConfirmImport}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#00d4ff',
                color: '#000',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Import Pattern
            </button>
            <button
              onClick={handleClear}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: '1px solid #666',
                backgroundColor: 'transparent',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
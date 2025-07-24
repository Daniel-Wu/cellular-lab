import { MemoryLimits, ErrorType } from '@/types'

export class MemoryManager {
  private static readonly LIMITS: MemoryLimits = {
    maxGridSize: 200 * 200,
    maxGenerations: 999999,
    maxHistorySteps: 0
  }

  private static memoryUsage: {
    gridsAllocated: number
    totalMemoryUsed: number
    peakMemoryUsed: number
    lastCleanup: number
  } = {
    gridsAllocated: 0,
    totalMemoryUsed: 0,
    peakMemoryUsed: 0,
    lastCleanup: Date.now()
  }

  static validateGridSize(width: number, height: number): { valid: boolean; error?: ErrorType } {
    const totalCells = width * height

    if (width < 20 || height < 20) {
      return { valid: false, error: ErrorType.MEMORY_EXCEEDED }
    }

    if (width > 200 || height > 200) {
      return { valid: false, error: ErrorType.MEMORY_EXCEEDED }
    }

    if (totalCells > this.LIMITS.maxGridSize) {
      return { valid: false, error: ErrorType.MEMORY_EXCEEDED }
    }

    return { valid: true }
  }

  static validateGeneration(generation: number): { valid: boolean; error?: ErrorType } {
    if (generation < 0 || generation > this.LIMITS.maxGenerations) {
      return { valid: false, error: ErrorType.MEMORY_EXCEEDED }
    }

    return { valid: true }
  }

  static allocateGrid(width: number, height: number): Uint8Array | null {
    const validation = this.validateGridSize(width, height)
    if (!validation.valid) {
      return null
    }

    try {
      const grid = new Uint8Array(width * height)
      this.trackMemoryAllocation(grid.byteLength)
      return grid
    } catch {
      return null
    }
  }

  private static trackMemoryAllocation(bytes: number): void {
    this.memoryUsage.gridsAllocated++
    this.memoryUsage.totalMemoryUsed += bytes
    this.memoryUsage.peakMemoryUsed = Math.max(
      this.memoryUsage.peakMemoryUsed,
      this.memoryUsage.totalMemoryUsed
    )
  }

  private static trackMemoryDeallocation(bytes: number): void {
    this.memoryUsage.gridsAllocated = Math.max(0, this.memoryUsage.gridsAllocated - 1)
    this.memoryUsage.totalMemoryUsed = Math.max(0, this.memoryUsage.totalMemoryUsed - bytes)
  }

  static deallocateGrid(grid: Uint8Array): void {
    if (grid) {
      this.trackMemoryDeallocation(grid.byteLength)
    }
  }

  static getMemoryUsage() {
    return {
      ...this.memoryUsage,
      limits: { ...this.LIMITS },
      utilizationPercent: (this.memoryUsage.totalMemoryUsed / (this.LIMITS.maxGridSize * 4)) * 100
    }
  }

  static estimateGridMemory(width: number, height: number): number {
    return width * height
  }

  static canAllocateGrid(width: number, height: number): boolean {
    const validation = this.validateGridSize(width, height)
    if (!validation.valid) return false

    const estimatedBytes = this.estimateGridMemory(width, height)
    const projectedUsage = this.memoryUsage.totalMemoryUsed + estimatedBytes

    return projectedUsage <= this.LIMITS.maxGridSize * 2
  }

  static forceGarbageCollection(): void {
    if (typeof window !== 'undefined' && 'gc' in window && typeof window.gc === 'function') {
      try {
        window.gc()
      } catch {
        // Garbage collection not available or failed
      }
    }

    this.memoryUsage.lastCleanup = Date.now()
  }

  static cleanup(): void {
    this.forceGarbageCollection()

    if (this.memoryUsage.totalMemoryUsed > this.LIMITS.maxGridSize) {
      this.memoryUsage.totalMemoryUsed = 0
      this.memoryUsage.gridsAllocated = 0
    }
  }

  static shouldCleanup(): boolean {
    const timeSinceLastCleanup = Date.now() - this.memoryUsage.lastCleanup
    const memoryPressure = this.memoryUsage.totalMemoryUsed > this.LIMITS.maxGridSize * 0.8

    return timeSinceLastCleanup > 30000 || memoryPressure
  }

  static resetMemoryTracking(): void {
    this.memoryUsage = {
      gridsAllocated: 0,
      totalMemoryUsed: 0,
      peakMemoryUsed: 0,
      lastCleanup: Date.now()
    }
  }

  static getLimits(): MemoryLimits {
    return { ...this.LIMITS }
  }

  static getOptimalGridSize(): { width: number; height: number } {
    const maxSide = Math.floor(Math.sqrt(this.LIMITS.maxGridSize))
    return { width: Math.min(200, maxSide), height: Math.min(200, maxSide) }
  }

  static validateMemoryState(): {
    isHealthy: boolean
    warnings: string[]
    errors: string[]
  } {
    const warnings: string[] = []
    const errors: string[] = []

    if (this.memoryUsage.totalMemoryUsed > this.LIMITS.maxGridSize * 0.8) {
      warnings.push('High memory usage detected')
    }

    if (this.memoryUsage.totalMemoryUsed > this.LIMITS.maxGridSize) {
      errors.push('Memory limit exceeded')
    }

    if (this.memoryUsage.gridsAllocated > 10) {
      warnings.push('High number of allocated grids')
    }

    const timeSinceCleanup = Date.now() - this.memoryUsage.lastCleanup
    if (timeSinceCleanup > 60000) {
      warnings.push('Memory cleanup overdue')
    }

    return {
      isHealthy: errors.length === 0,
      warnings,
      errors
    }
  }

  static createOptimizedGrid(width: number, height: number, fillValue: 0 | 1 = 0): Uint8Array | null {
    const grid = this.allocateGrid(width, height)
    if (!grid) return null

    if (fillValue === 1) {
      grid.fill(1)
    }

    return grid
  }

  static copyGridEfficiently(sourceGrid: Uint8Array): Uint8Array | null {
    try {
      const actualGrid = new Uint8Array(sourceGrid.length)
      actualGrid.set(sourceGrid)
      this.trackMemoryAllocation(actualGrid.byteLength)
      return actualGrid
    } catch {
      return null
    }
  }
}

import { Pattern, GridCoordinates, ExportedPattern } from '../types'
import { RuleValidator } from './RuleValidator'
import { PatternUtils } from './PatternUtils'

export { PatternUtils }

export class RLEImporter {
  private static readonly HEADER_REGEX = /^x\s*=\s*(\d+)\s*,\s*y\s*=\s*(\d+)(?:\s*,\s*rule\s*=\s*([^\r\n]+))?/i
  private static readonly RLE_PATTERN_REGEX = /^([bo$!]|\d+[bo$!])+$/
  
  static import(rleText: string): { pattern: Pattern | null; error?: string } {
    if (!rleText || typeof rleText !== 'string') {
      return { pattern: null, error: 'Invalid RLE input' }
    }

    const lines = rleText.trim().split(/\r?\n/).filter(line => line.trim())
    if (lines.length === 0) {
      return { pattern: null, error: 'Empty RLE input' }
    }

    let headerLine = ''
    let patternLines: string[] = []
    let foundHeader = false

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('#')) continue
      
      if (!foundHeader && this.HEADER_REGEX.test(trimmed)) {
        headerLine = trimmed
        foundHeader = true
      } else if (foundHeader || this.containsRLECharacters(trimmed)) {
        patternLines.push(trimmed)
      }
    }

    if (!foundHeader && patternLines.length === 0) {
      return { pattern: null, error: 'No valid RLE pattern found' }
    }

    let width = 0
    let height = 0
    let rule = 'B3/S23'

    if (headerLine) {
      const headerMatch = headerLine.match(this.HEADER_REGEX)
      if (headerMatch) {
        width = parseInt(headerMatch[1]!, 10)
        height = parseInt(headerMatch[2]!, 10)
        if (headerMatch[3]) {
          const ruleMatch = headerMatch[3].trim()
          if (RuleValidator.validateRule(ruleMatch).valid) {
            rule = ruleMatch
          }
        }
      }
    }

    const patternData = patternLines.join('').replace(/\s+/g, '')
    if (!this.RLE_PATTERN_REGEX.test(patternData)) {
      return { pattern: null, error: 'Invalid RLE pattern format' }
    }

    try {
      const cells = this.parseRLEPattern(patternData)
      const actualBounds = this.calculateBounds(cells)
      
      if (width === 0) width = actualBounds.maxX + 1
      if (height === 0) height = actualBounds.maxY + 1
      
      if (width > 200 || height > 200) {
        return { pattern: null, error: 'Pattern too large (maximum 200x200)' }
      }
      
      const pattern: Pattern = {
        name: 'Imported Pattern',
        width,
        height,
        cells,
        rule
      }

      return { pattern }
    } catch (error) {
      return { pattern: null, error: `RLE parsing error: ${error instanceof Error ? error.message : 'Unknown error'}` }
    }
  }

  private static containsRLECharacters(text: string): boolean {
    return /[bo$!]/.test(text)
  }

  private static parseRLEPattern(pattern: string): GridCoordinates[] {
    const cells: GridCoordinates[] = []
    let x = 0
    let y = 0
    let i = 0

    while (i < pattern.length) {
      if (pattern[i] === '!') break

      let count = 1
      let numStr = ''
      
      while (i < pattern.length && /\d/.test(pattern[i]!)) {
        numStr += pattern[i]
        i++
      }
      
      if (numStr) {
        count = parseInt(numStr, 10)
        if (count <= 0 || count > 1000) {
          throw new Error(`Invalid run count: ${count}`)
        }
      }

      if (i >= pattern.length) {
        throw new Error('Unexpected end of pattern')
      }

      const char = pattern[i]!
      
      switch (char) {
        case 'b':
          x += count
          break
        case 'o':
          for (let j = 0; j < count; j++) {
            cells.push({ x: x + j, y })
          }
          x += count
          break
        case '$':
          y += count
          x = 0
          break
        default:
          throw new Error(`Invalid RLE character: ${char}`)
      }
      
      i++
    }

    return cells
  }

  private static calculateBounds(cells: GridCoordinates[]): {
    minX: number
    maxX: number
    minY: number
    maxY: number
  } {
    if (cells.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
    }

    let minX = cells[0]!.x
    let maxX = cells[0]!.x
    let minY = cells[0]!.y
    let maxY = cells[0]!.y

    for (const cell of cells) {
      minX = Math.min(minX, cell.x)
      maxX = Math.max(maxX, cell.x)
      minY = Math.min(minY, cell.y)
      maxY = Math.max(maxY, cell.y)
    }

    return { minX, maxX, minY, maxY }
  }

  static exportToRLE(pattern: Pattern): string {
    if (!pattern.cells || pattern.cells.length === 0) {
      return `x = ${pattern.width}, y = ${pattern.height}, rule = ${pattern.rule || 'B3/S23'}\n!`
    }

    const header = `x = ${pattern.width}, y = ${pattern.height}, rule = ${pattern.rule || 'B3/S23'}`
    
    const cellMap = new Set(pattern.cells.map(cell => `${cell.x},${cell.y}`))
    const lines: string[] = []
    
    for (let y = 0; y < pattern.height; y++) {
      let line = ''
      let deadCount = 0
      
      for (let x = 0; x < pattern.width; x++) {
        if (cellMap.has(`${x},${y}`)) {
          if (deadCount > 0) {
            line += deadCount === 1 ? 'b' : `${deadCount}b`
            deadCount = 0
          }
          line += 'o'
        } else {
          deadCount++
        }
      }
      
      if (deadCount > 0 && y < pattern.height - 1) {
        line += deadCount === 1 ? 'b' : `${deadCount}b`
      }
      
      lines.push(line)
    }

    while (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop()
    }

    let rlePattern = lines.join('$')
    if (rlePattern) rlePattern += '!'
    else rlePattern = '!'

    return `${header}\n${rlePattern}`
  }
}

export class PatternExporter {
  static exportToJSON(
    grid: Uint8Array,
    width: number,
    height: number,
    rule: string,
    generation: number,
    name: string = 'Exported Pattern'
  ): ExportedPattern {
    const livingCells: number[] = []
    
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === 1) {
        const y = Math.floor(i / width)
        const x = i % width
        livingCells.push(x, y)
      }
    }

    return {
      name,
      created: new Date().toISOString(),
      grid: {
        width,
        height,
        data: livingCells
      },
      rule,
      generation
    }
  }

  static exportJSONToFile(exportedPattern: ExportedPattern): void {
    const jsonString = JSON.stringify(exportedPattern, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `${this.sanitizeFilename(exportedPattern.name)}-${this.formatDate(exportedPattern.created)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  }

  static exportCanvasToPNG(canvas: HTMLCanvasElement, name: string = 'grid'): void {
    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to create image blob')
        }
        
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${this.sanitizeFilename(name)}-${this.formatDate(new Date().toISOString())}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        URL.revokeObjectURL(url)
      }, 'image/png')
    } catch (error) {
      console.error('PNG export failed:', error)
      throw new Error('PNG export not supported in this browser')
    }
  }

  static importFromJSON(jsonString: string): { pattern: Pattern | null; error?: string } {
    try {
      const data = JSON.parse(jsonString) as ExportedPattern
      
      if (!this.validateExportedPattern(data)) {
        return { pattern: null, error: 'Invalid JSON format' }
      }

      const cells: GridCoordinates[] = []
      const livingCells = data.grid.data
      
      for (let i = 0; i < livingCells.length; i += 2) {
        const x = livingCells[i]!
        const y = livingCells[i + 1]!
        
        if (x >= 0 && x < data.grid.width && y >= 0 && y < data.grid.height) {
          cells.push({ x, y })
        }
      }

      const pattern: Pattern = {
        name: data.name,
        width: data.grid.width,
        height: data.grid.height,
        cells,
        rule: data.rule
      }

      return { pattern }
    } catch (error) {
      return { pattern: null, error: `JSON parsing error: ${error instanceof Error ? error.message : 'Unknown error'}` }
    }
  }

  private static validateExportedPattern(data: any): data is ExportedPattern {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.name === 'string' &&
      typeof data.created === 'string' &&
      typeof data.grid === 'object' &&
      typeof data.grid.width === 'number' &&
      typeof data.grid.height === 'number' &&
      Array.isArray(data.grid.data) &&
      typeof data.rule === 'string' &&
      typeof data.generation === 'number'
    )
  }

  private static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9\-_]/gi, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase()
  }

  private static formatDate(isoString: string): string {
    const date = new Date(isoString)
    return date.toISOString().slice(0, 19).replace(/[:.]/g, '-')
  }
}

export class PatternPlacer {
  private static placementHistory: Array<{
    grid: Uint8Array
    timestamp: number
    description: string
  }> = []
  
  private static readonly MAX_HISTORY = 10

  static placePattern(
    targetGrid: Uint8Array,
    gridWidth: number,
    gridHeight: number,
    pattern: Pattern,
    x: number,
    y: number,
    options: {
      overwrite?: boolean
      merge?: boolean
      saveState?: boolean
      description?: string
    } = {}
  ): { success: boolean; error?: string; affectedCells?: number } {
    const { overwrite = true, merge = false, saveState = true, description = 'Pattern placement' } = options

    if (saveState) {
      this.saveState(targetGrid, description)
    }

    const validation = PatternUtils.validatePattern(pattern)
    if (!validation.valid) {
      return { success: false, error: validation.error || 'Pattern validation failed' }
    }

    if (x < 0 || y < 0 || x + pattern.width > gridWidth || y + pattern.height > gridHeight) {
      return { success: false, error: 'Pattern extends beyond grid boundaries' }
    }

    let affectedCells = 0

    try {
      for (const cell of pattern.cells) {
        const targetX = x + cell.x
        const targetY = y + cell.y
        
        if (targetX >= 0 && targetX < gridWidth && targetY >= 0 && targetY < gridHeight) {
          const index = targetY * gridWidth + targetX
          
          if (merge) {
            if (targetGrid[index] === 0) {
              targetGrid[index] = 1
              affectedCells++
            }
          } else if (overwrite) {
            if (targetGrid[index] === 0) {
              targetGrid[index] = 1
              affectedCells++
            }
          } else {
            if (targetGrid[index] === 0) {
              targetGrid[index] = 1
              affectedCells++
            }
          }
        }
      }

      return { success: true, affectedCells }
    } catch (error) {
      return { success: false, error: `Placement failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
    }
  }

  static centerPattern(
    targetGrid: Uint8Array,
    gridWidth: number,
    gridHeight: number,
    pattern: Pattern,
    options: {
      overwrite?: boolean
      merge?: boolean
      saveState?: boolean
    } = {}
  ): { success: boolean; error?: string; position?: { x: number; y: number } } {
    const centerX = Math.floor((gridWidth - pattern.width) / 2)
    const centerY = Math.floor((gridHeight - pattern.height) / 2)
    
    const result = this.placePattern(
      targetGrid,
      gridWidth,
      gridHeight,
      pattern,
      centerX,
      centerY,
      { ...options, description: `Center ${pattern.name}` }
    )

    if (result.success) {
      return { success: true, position: { x: centerX, y: centerY } }
    }

    return { success: false, error: result.error || 'Pattern placement failed' }
  }

  static canPlacePattern(
    gridWidth: number,
    gridHeight: number,
    pattern: Pattern,
    x: number,
    y: number
  ): boolean {
    return (
      x >= 0 &&
      y >= 0 &&
      x + pattern.width <= gridWidth &&
      y + pattern.height <= gridHeight
    )
  }

  static getPlacementPreview(
    pattern: Pattern,
    x: number,
    y: number,
    gridWidth: number,
    gridHeight: number
  ): GridCoordinates[] {
    if (!this.canPlacePattern(gridWidth, gridHeight, pattern, x, y)) {
      return []
    }

    return pattern.cells.map(cell => ({
      x: x + cell.x,
      y: y + cell.y
    }))
  }

  static clearPattern(
    targetGrid: Uint8Array,
    gridWidth: number,
    gridHeight: number,
    pattern: Pattern,
    x: number,
    y: number,
    saveState: boolean = true
  ): { success: boolean; error?: string; clearedCells?: number } {
    if (saveState) {
      this.saveState(targetGrid, `Clear ${pattern.name}`)
    }

    if (!this.canPlacePattern(gridWidth, gridHeight, pattern, x, y)) {
      return { success: false, error: 'Pattern extends beyond grid boundaries' }
    }

    let clearedCells = 0

    try {
      for (const cell of pattern.cells) {
        const targetX = x + cell.x
        const targetY = y + cell.y
        const index = targetY * gridWidth + targetX
        
        if (targetGrid[index] === 1) {
          targetGrid[index] = 0
          clearedCells++
        }
      }

      return { success: true, clearedCells }
    } catch (error) {
      return { success: false, error: `Clear failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
    }
  }

  static saveState(grid: Uint8Array, description: string): void {
    const stateCopy = new Uint8Array(grid.length)
    stateCopy.set(grid)
    
    this.placementHistory.push({
      grid: stateCopy,
      timestamp: Date.now(),
      description
    })

    if (this.placementHistory.length > this.MAX_HISTORY) {
      this.placementHistory.shift()
    }
  }

  static undo(targetGrid: Uint8Array): { success: boolean; description?: string } {
    if (this.placementHistory.length === 0) {
      return { success: false }
    }

    const lastState = this.placementHistory.pop()!
    targetGrid.set(lastState.grid)
    
    return { success: true, description: lastState.description }
  }

  static canUndo(): boolean {
    return this.placementHistory.length > 0
  }

  static getUndoDescription(): string | null {
    if (this.placementHistory.length === 0) return null
    return this.placementHistory[this.placementHistory.length - 1]!.description
  }

  static clearHistory(): void {
    this.placementHistory.length = 0
  }

  static getBestPlacementPosition(
    gridWidth: number,
    gridHeight: number,
    pattern: Pattern,
    targetX: number,
    targetY: number
  ): { x: number; y: number } {
    const idealX = Math.max(0, Math.min(targetX - Math.floor(pattern.width / 2), gridWidth - pattern.width))
    const idealY = Math.max(0, Math.min(targetY - Math.floor(pattern.height / 2), gridHeight - pattern.height))
    
    return { x: idealX, y: idealY }
  }
}





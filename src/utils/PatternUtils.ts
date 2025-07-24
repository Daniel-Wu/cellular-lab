import { Pattern, GridCoordinates, ErrorType } from '@/types'
import { GridUtils } from './GridUtils'

export class PatternUtils {
  private static readonly FAMOUS_PATTERNS: Record<string, Pattern> = {
    glider: {
      name: 'Glider',
      width: 3,
      height: 3,
      cells: [
        { x: 1, y: 0 },
        { x: 2, y: 1 },
        { x: 0, y: 2 },
        { x: 1, y: 2 },
        { x: 2, y: 2 }
      ],
      rule: 'B3/S23'
    },
    blinker: {
      name: 'Blinker',
      width: 3,
      height: 1,
      cells: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 }
      ],
      rule: 'B3/S23'
    },
    block: {
      name: 'Block',
      width: 2,
      height: 2,
      cells: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 }
      ],
      rule: 'B3/S23'
    },
    beacon: {
      name: 'Beacon',
      width: 4,
      height: 4,
      cells: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 3, y: 2 },
        { x: 2, y: 3 },
        { x: 3, y: 3 }
      ],
      rule: 'B3/S23'
    },
    toad: {
      name: 'Toad',
      width: 4,
      height: 2,
      cells: [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 }
      ],
      rule: 'B3/S23'
    }
  }

  static getFamousPattern(name: string): Pattern | null {
    const pattern = this.FAMOUS_PATTERNS[name.toLowerCase()]
    return pattern ? { ...pattern, cells: [...pattern.cells] } : null
  }

  static getAllFamousPatterns(): Pattern[] {
    return Object.values(this.FAMOUS_PATTERNS).map(pattern => ({
      ...pattern,
      cells: [...pattern.cells]
    }))
  }

  static validatePattern(pattern: Pattern): { valid: boolean; error?: string } {
    if (!pattern.name || pattern.name.trim() === '') {
      return { valid: false, error: 'Pattern must have a name' }
    }

    if (pattern.width <= 0 || pattern.height <= 0) {
      return { valid: false, error: 'Pattern dimensions must be positive' }
    }

    if (pattern.width > 200 || pattern.height > 200) {
      return { valid: false, error: 'Pattern too large (maximum 200x200)' }
    }

    for (const cell of pattern.cells) {
      if (cell.x < 0 || cell.x >= pattern.width || cell.y < 0 || cell.y >= pattern.height) {
        return { valid: false, error: `Cell at (${cell.x}, ${cell.y}) is outside pattern bounds` }
      }
    }

    const cellSet = new Set(pattern.cells.map(cell => `${cell.x},${cell.y}`))
    if (cellSet.size !== pattern.cells.length) {
      return { valid: false, error: 'Pattern contains duplicate cells' }
    }

    return { valid: true }
  }

  static patternToGrid(pattern: Pattern): Uint8Array {
    const grid = new Uint8Array(pattern.width * pattern.height)
    
    for (const cell of pattern.cells) {
      const index = GridUtils.coordinatesToIndex(cell.x, cell.y, pattern.width)
      if (index >= 0 && index < grid.length) {
        grid[index] = 1
      }
    }
    
    return grid
  }

  static gridToPattern(
    grid: Uint8Array, 
    width: number, 
    height: number, 
    name: string = 'Custom Pattern'
  ): Pattern {
    const cells: GridCoordinates[] = []
    
    for (let index = 0; index < grid.length; index++) {
      if (grid[index] === 1) {
        const coords = GridUtils.indexToCoordinates(index, width)
        cells.push(coords)
      }
    }
    
    return {
      name,
      width,
      height,
      cells
    }
  }

  static placePatternOnGrid(
    grid: Uint8Array,
    gridWidth: number,
    gridHeight: number,
    pattern: Pattern,
    offsetX: number,
    offsetY: number,
    overwrite: boolean = true
  ): { success: boolean; error?: ErrorType } {
    const validation = this.validatePattern(pattern)
    if (!validation.valid) {
      return { success: false, error: ErrorType.PATTERN_TOO_LARGE }
    }

    if (!GridUtils.canFitPattern(pattern.width, pattern.height, offsetX, offsetY, gridWidth, gridHeight)) {
      return { success: false, error: ErrorType.PATTERN_TOO_LARGE }
    }

    for (const cell of pattern.cells) {
      const targetX = offsetX + cell.x
      const targetY = offsetY + cell.y
      
      if (GridUtils.isValidCoordinate(targetX, targetY, gridWidth, gridHeight)) {
        const index = GridUtils.coordinatesToIndex(targetX, targetY, gridWidth)
        if (overwrite || grid[index] === 0) {
          grid[index] = 1
        }
      }
    }

    return { success: true }
  }

  static centerPatternOnGrid(
    grid: Uint8Array,
    gridWidth: number,
    gridHeight: number,
    pattern: Pattern,
    overwrite: boolean = true
  ): { success: boolean; error?: ErrorType } {
    const centerCoords = GridUtils.centerPattern(pattern.width, pattern.height, gridWidth, gridHeight)
    return this.placePatternOnGrid(grid, gridWidth, gridHeight, pattern, centerCoords.x, centerCoords.y, overwrite)
  }

  static rotatePattern(pattern: Pattern, degrees: 90 | 180 | 270): Pattern {
    const validation = this.validatePattern(pattern)
    if (!validation.valid) {
      return pattern
    }

    let newCells: GridCoordinates[]
    let newWidth = pattern.width
    let newHeight = pattern.height

    switch (degrees) {
      case 90:
        newWidth = pattern.height
        newHeight = pattern.width
        newCells = pattern.cells.map(cell => ({
          x: pattern.height - 1 - cell.y,
          y: cell.x
        }))
        break
      case 180:
        newCells = pattern.cells.map(cell => ({
          x: pattern.width - 1 - cell.x,
          y: pattern.height - 1 - cell.y
        }))
        break
      case 270:
        newWidth = pattern.height
        newHeight = pattern.width
        newCells = pattern.cells.map(cell => ({
          x: cell.y,
          y: pattern.width - 1 - cell.x
        }))
        break
      default:
        newCells = [...pattern.cells]
    }

    return {
      name: `${pattern.name} (${degrees}°)`,
      width: newWidth,
      height: newHeight,
      cells: newCells,
      ...(pattern.rule && { rule: pattern.rule })
    }
  }

  static flipPatternHorizontal(pattern: Pattern): Pattern {
    const validation = this.validatePattern(pattern)
    if (!validation.valid) {
      return pattern
    }

    const newCells = pattern.cells.map(cell => ({
      x: pattern.width - 1 - cell.x,
      y: cell.y
    }))

    return {
      name: `${pattern.name} (H-flip)`,
      width: pattern.width,
      height: pattern.height,
      cells: newCells,
      ...(pattern.rule && { rule: pattern.rule })
    }
  }

  static flipPatternVertical(pattern: Pattern): Pattern {
    const validation = this.validatePattern(pattern)
    if (!validation.valid) {
      return pattern
    }

    const newCells = pattern.cells.map(cell => ({
      x: cell.x,
      y: pattern.height - 1 - cell.y
    }))

    return {
      name: `${pattern.name} (V-flip)`,
      width: pattern.width,
      height: pattern.height,
      cells: newCells,
      ...(pattern.rule && { rule: pattern.rule })
    }
  }

  static scalePattern(pattern: Pattern, scale: number): Pattern {
    const validation = this.validatePattern(pattern)
    if (!validation.valid || scale <= 0) {
      return pattern
    }

    const newWidth = Math.floor(pattern.width * scale)
    const newHeight = Math.floor(pattern.height * scale)

    if (newWidth > 200 || newHeight > 200) {
      return pattern
    }

    const newCells: GridCoordinates[] = []
    
    for (const cell of pattern.cells) {
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const newX = Math.floor(cell.x * scale) + dx
          const newY = Math.floor(cell.y * scale) + dy
          
          if (newX < newWidth && newY < newHeight) {
            newCells.push({ x: newX, y: newY })
          }
        }
      }
    }

    const uniqueCells = Array.from(
      new Set(newCells.map(cell => `${cell.x},${cell.y}`))
    ).map(coord => {
      const [x, y] = coord.split(',').map(Number)
      return { x: x!, y: y! }
    })

    return {
      name: `${pattern.name} (${scale}x)`,
      width: newWidth,
      height: newHeight,
      cells: uniqueCells,
      ...(pattern.rule && { rule: pattern.rule })
    }
  }

  static getPatternBounds(pattern: Pattern): {
    minX: number
    maxX: number
    minY: number
    maxY: number
  } | null {
    if (pattern.cells.length === 0) return null

    let minX = pattern.width
    let maxX = -1
    let minY = pattern.height
    let maxY = -1

    for (const cell of pattern.cells) {
      minX = Math.min(minX, cell.x)
      maxX = Math.max(maxX, cell.x)
      minY = Math.min(minY, cell.y)
      maxY = Math.max(maxY, cell.y)
    }

    return { minX, maxX, minY, maxY }
  }

  static normalizePattern(pattern: Pattern): Pattern {
    const bounds = this.getPatternBounds(pattern)
    if (!bounds) return pattern

    const newCells = pattern.cells.map(cell => ({
      x: cell.x - bounds.minX,
      y: cell.y - bounds.minY
    }))

    return {
      name: pattern.name,
      width: bounds.maxX - bounds.minX + 1,
      height: bounds.maxY - bounds.minY + 1,
      cells: newCells,
      ...(pattern.rule && { rule: pattern.rule })
    }
  }

  static patternsEqual(pattern1: Pattern, pattern2: Pattern): boolean {
    if (pattern1.width !== pattern2.width || pattern1.height !== pattern2.height) {
      return false
    }

    if (pattern1.cells.length !== pattern2.cells.length) {
      return false
    }

    const cells1 = new Set(pattern1.cells.map(cell => `${cell.x},${cell.y}`))
    const cells2 = new Set(pattern2.cells.map(cell => `${cell.x},${cell.y}`))

    return cells1.size === cells2.size && [...cells1].every(cell => cells2.has(cell))
  }
}
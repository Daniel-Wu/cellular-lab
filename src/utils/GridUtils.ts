import { GridCoordinates, CellPosition } from '@/types'

export class GridUtils {
  static coordinatesToIndex(x: number, y: number, width: number): number {
    return y * width + x
  }

  static indexToCoordinates(index: number, width: number): GridCoordinates {
    return {
      x: index % width,
      y: Math.floor(index / width)
    }
  }

  static isValidCoordinate(x: number, y: number, width: number, height: number): boolean {
    return x >= 0 && x < width && y >= 0 && y < height
  }

  static isValidIndex(index: number, gridSize: number): boolean {
    return index >= 0 && index < gridSize
  }

  static createEmptyGrid(width: number, height: number): Uint8Array {
    return new Uint8Array(width * height)
  }

  static createFilledGrid(width: number, height: number, value: 0 | 1): Uint8Array {
    const grid = new Uint8Array(width * height)
    if (value === 1) {
      grid.fill(1)
    }
    return grid
  }

  static copyGrid(grid: Uint8Array): Uint8Array {
    return new Uint8Array(grid)
  }

  static clearGrid(grid: Uint8Array): void {
    grid.fill(0)
  }

  static countLivingCells(grid: Uint8Array): number {
    let count = 0
    for (let i = 0; i < grid.length; i++) {
      count += grid[i] ?? 0
    }
    return count
  }

  static calculateDensity(grid: Uint8Array): number {
    const livingCells = this.countLivingCells(grid)
    return grid.length > 0 ? livingCells / grid.length : 0
  }

  static getLivingCellCoordinates(grid: Uint8Array, width: number): GridCoordinates[] {
    const coordinates: GridCoordinates[] = []
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === 1) {
        coordinates.push(this.indexToCoordinates(i, width))
      }
    }
    return coordinates
  }

  static getLivingCellPositions(grid: Uint8Array, width: number): CellPosition[] {
    const positions: CellPosition[] = []
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === 1) {
        const coords = this.indexToCoordinates(i, width)
        positions.push({
          index: i,
          x: coords.x,
          y: coords.y
        })
      }
    }
    return positions
  }

  static gridsEqual(grid1: Uint8Array, grid2: Uint8Array): boolean {
    if (grid1.length !== grid2.length) return false
    
    for (let i = 0; i < grid1.length; i++) {
      if (grid1[i] !== grid2[i]) return false
    }
    return true
  }

  static getGridBounds(grid: Uint8Array, width: number, height: number): {
    minX: number
    maxX: number
    minY: number
    maxY: number
  } | null {
    let minX = width
    let maxX = -1
    let minY = height
    let maxY = -1
    
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === 1) {
        const coords = this.indexToCoordinates(i, width)
        minX = Math.min(minX, coords.x)
        maxX = Math.max(maxX, coords.x)
        minY = Math.min(minY, coords.y)
        maxY = Math.max(maxY, coords.y)
      }
    }
    
    if (maxX === -1) return null
    
    return { minX, maxX, minY, maxY }
  }

  static centerPattern(
    patternWidth: number,
    patternHeight: number,
    gridWidth: number,
    gridHeight: number
  ): GridCoordinates {
    return {
      x: Math.floor((gridWidth - patternWidth) / 2),
      y: Math.floor((gridHeight - patternHeight) / 2)
    }
  }

  static canFitPattern(
    patternWidth: number,
    patternHeight: number,
    offsetX: number,
    offsetY: number,
    gridWidth: number,
    gridHeight: number
  ): boolean {
    return offsetX >= 0 && 
           offsetY >= 0 && 
           offsetX + patternWidth <= gridWidth && 
           offsetY + patternHeight <= gridHeight
  }

  static getGridStatistics(grid: Uint8Array, width: number, height: number) {
    const livingCells = this.countLivingCells(grid)
    const density = this.calculateDensity(grid)
    const bounds = this.getGridBounds(grid, width, height)
    
    return {
      totalCells: grid.length,
      livingCells,
      deadCells: grid.length - livingCells,
      density,
      bounds,
      isEmpty: livingCells === 0,
      isFull: livingCells === grid.length
    }
  }

  static resizeGrid(
    sourceGrid: Uint8Array,
    sourceWidth: number,
    sourceHeight: number,
    targetWidth: number,
    targetHeight: number,
    preserveCenter: boolean = true
  ): Uint8Array {
    const targetGrid = this.createEmptyGrid(targetWidth, targetHeight)
    
    if (preserveCenter) {
      const offsetX = Math.floor((targetWidth - sourceWidth) / 2)
      const offsetY = Math.floor((targetHeight - sourceHeight) / 2)
      
      const copyWidth = Math.min(sourceWidth, targetWidth)
      const copyHeight = Math.min(sourceHeight, targetHeight)
      const sourceStartX = Math.max(0, -offsetX)
      const sourceStartY = Math.max(0, -offsetY)
      const targetStartX = Math.max(0, offsetX)
      const targetStartY = Math.max(0, offsetY)
      
      for (let y = 0; y < copyHeight - Math.abs(Math.min(0, offsetY)); y++) {
        for (let x = 0; x < copyWidth - Math.abs(Math.min(0, offsetX)); x++) {
          const sourceIndex = this.coordinatesToIndex(sourceStartX + x, sourceStartY + y, sourceWidth)
          const targetIndex = this.coordinatesToIndex(targetStartX + x, targetStartY + y, targetWidth)
          
          if (sourceIndex < sourceGrid.length && targetIndex < targetGrid.length) {
            targetGrid[targetIndex] = sourceGrid[sourceIndex] ?? 0
          }
        }
      }
    } else {
      const copyWidth = Math.min(sourceWidth, targetWidth)
      const copyHeight = Math.min(sourceHeight, targetHeight)
      
      for (let y = 0; y < copyHeight; y++) {
        for (let x = 0; x < copyWidth; x++) {
          const sourceIndex = this.coordinatesToIndex(x, y, sourceWidth)
          const targetIndex = this.coordinatesToIndex(x, y, targetWidth)
          targetGrid[targetIndex] = sourceGrid[sourceIndex] ?? 0
        }
      }
    }
    
    return targetGrid
  }
}
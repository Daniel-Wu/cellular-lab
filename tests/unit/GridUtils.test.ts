import { describe, it, expect } from 'vitest'
import { GridUtils } from '../../src/utils/GridUtils'

describe('GridUtils', () => {
  describe('coordinate conversion', () => {
    it('should convert coordinates to index correctly', () => {
      expect(GridUtils.coordinatesToIndex(0, 0, 10)).toBe(0)
      expect(GridUtils.coordinatesToIndex(5, 3, 10)).toBe(35) // 3 * 10 + 5
      expect(GridUtils.coordinatesToIndex(9, 9, 10)).toBe(99)
    })

    it('should convert index to coordinates correctly', () => {
      expect(GridUtils.indexToCoordinates(0, 10)).toEqual({ x: 0, y: 0 })
      expect(GridUtils.indexToCoordinates(35, 10)).toEqual({ x: 5, y: 3 })
      expect(GridUtils.indexToCoordinates(99, 10)).toEqual({ x: 9, y: 9 })
    })

    it('should handle coordinate conversion round-trip', () => {
      const width = 25
      const testCases = [
        { x: 0, y: 0 },
        { x: 12, y: 7 },
        { x: 24, y: 19 }
      ]

      testCases.forEach(({ x, y }) => {
        const index = GridUtils.coordinatesToIndex(x, y, width)
        const coords = GridUtils.indexToCoordinates(index, width)
        expect(coords).toEqual({ x, y })
      })
    })
  })

  describe('validation', () => {
    it('should validate coordinates correctly', () => {
      expect(GridUtils.isValidCoordinate(5, 5, 10, 10)).toBe(true)
      expect(GridUtils.isValidCoordinate(0, 0, 10, 10)).toBe(true)
      expect(GridUtils.isValidCoordinate(9, 9, 10, 10)).toBe(true)
      
      expect(GridUtils.isValidCoordinate(-1, 5, 10, 10)).toBe(false)
      expect(GridUtils.isValidCoordinate(5, -1, 10, 10)).toBe(false)
      expect(GridUtils.isValidCoordinate(10, 5, 10, 10)).toBe(false)
      expect(GridUtils.isValidCoordinate(5, 10, 10, 10)).toBe(false)
    })

    it('should validate index correctly', () => {
      expect(GridUtils.isValidIndex(0, 100)).toBe(true)
      expect(GridUtils.isValidIndex(50, 100)).toBe(true)
      expect(GridUtils.isValidIndex(99, 100)).toBe(true)
      
      expect(GridUtils.isValidIndex(-1, 100)).toBe(false)
      expect(GridUtils.isValidIndex(100, 100)).toBe(false)
      expect(GridUtils.isValidIndex(200, 100)).toBe(false)
    })
  })

  describe('grid creation', () => {
    it('should create empty grid', () => {
      const grid = GridUtils.createEmptyGrid(5, 4)
      expect(grid.length).toBe(20)
      expect(Array.from(grid)).toEqual(new Array(20).fill(0))
    })

    it('should create filled grid with zeros', () => {
      const grid = GridUtils.createFilledGrid(3, 3, 0)
      expect(grid.length).toBe(9)
      expect(Array.from(grid)).toEqual(new Array(9).fill(0))
    })

    it('should create filled grid with ones', () => {
      const grid = GridUtils.createFilledGrid(3, 3, 1)
      expect(grid.length).toBe(9)
      expect(Array.from(grid)).toEqual(new Array(9).fill(1))
    })
  })

  describe('grid manipulation', () => {
    it('should copy grid correctly', () => {
      const original = new Uint8Array([1, 0, 1, 0, 1])
      const copy = GridUtils.copyGrid(original)
      
      expect(copy).toEqual(original)
      expect(copy).not.toBe(original)
    })

    it('should clear grid', () => {
      const grid = new Uint8Array([1, 1, 0, 1, 0])
      GridUtils.clearGrid(grid)
      expect(Array.from(grid)).toEqual([0, 0, 0, 0, 0])
    })
  })

  describe('grid statistics', () => {
    it('should count living cells correctly', () => {
      const grid = new Uint8Array([1, 0, 1, 0, 1, 1, 0])
      expect(GridUtils.countLivingCells(grid)).toBe(4)
    })

    it('should calculate density correctly', () => {
      const grid = new Uint8Array([1, 0, 1, 0])
      expect(GridUtils.calculateDensity(grid)).toBe(0.5)
      
      const emptyGrid = new Uint8Array([0, 0, 0, 0])
      expect(GridUtils.calculateDensity(emptyGrid)).toBe(0)
      
      const fullGrid = new Uint8Array([1, 1, 1, 1])
      expect(GridUtils.calculateDensity(fullGrid)).toBe(1)
    })

    it('should get living cell coordinates', () => {
      const grid = new Uint8Array([1, 0, 1, 0, 1, 0])
      const width = 3
      const coords = GridUtils.getLivingCellCoordinates(grid, width)
      
      expect(coords).toEqual([
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 1, y: 1 }
      ])
    })

    it('should get living cell positions', () => {
      const grid = new Uint8Array([1, 0, 1, 0])
      const width = 2
      const positions = GridUtils.getLivingCellPositions(grid, width)
      
      expect(positions).toEqual([
        { index: 0, x: 0, y: 0 },
        { index: 2, x: 0, y: 1 }
      ])
    })
  })

  describe('grid comparison', () => {
    it('should compare grids correctly', () => {
      const grid1 = new Uint8Array([1, 0, 1, 0])
      const grid2 = new Uint8Array([1, 0, 1, 0])
      const grid3 = new Uint8Array([0, 1, 0, 1])
      
      expect(GridUtils.gridsEqual(grid1, grid2)).toBe(true)
      expect(GridUtils.gridsEqual(grid1, grid3)).toBe(false)
    })

    it('should handle different length grids', () => {
      const grid1 = new Uint8Array([1, 0, 1])
      const grid2 = new Uint8Array([1, 0, 1, 0])
      
      expect(GridUtils.gridsEqual(grid1, grid2)).toBe(false)
    })
  })

  describe('grid bounds', () => {
    it('should calculate grid bounds correctly', () => {
      const grid = new Uint8Array(25) // 5x5 grid
      grid[6] = 1  // (1, 1)
      grid[8] = 1  // (3, 1)
      grid[18] = 1 // (3, 3)
      
      const bounds = GridUtils.getGridBounds(grid, 5, 5)
      expect(bounds).toEqual({
        minX: 1,
        maxX: 3,
        minY: 1,
        maxY: 3
      })
    })

    it('should return null for empty grid', () => {
      const grid = new Uint8Array(25)
      const bounds = GridUtils.getGridBounds(grid, 5, 5)
      expect(bounds).toBeNull()
    })
  })

  describe('pattern operations', () => {
    it('should center pattern correctly', () => {
      const center = GridUtils.centerPattern(3, 3, 10, 10)
      expect(center).toEqual({ x: 3, y: 3 }) // (10-3)/2 = 3.5 -> 3
    })

    it('should check if pattern can fit', () => {
      expect(GridUtils.canFitPattern(3, 3, 2, 2, 10, 10)).toBe(true)
      expect(GridUtils.canFitPattern(3, 3, 8, 8, 10, 10)).toBe(false)
      expect(GridUtils.canFitPattern(3, 3, -1, 2, 10, 10)).toBe(false)
    })
  })

  describe('grid statistics comprehensive', () => {
    it('should provide comprehensive grid statistics', () => {
      const grid = new Uint8Array([1, 0, 1, 0, 1, 0, 0, 0, 0])
      const stats = GridUtils.getGridStatistics(grid, 3, 3)
      
      expect(stats.totalCells).toBe(9)
      expect(stats.livingCells).toBe(3)
      expect(stats.deadCells).toBe(6)
      expect(stats.density).toBeCloseTo(1/3)
      expect(stats.isEmpty).toBe(false)
      expect(stats.isFull).toBe(false)
      expect(stats.bounds).toEqual({
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 1
      })
    })

    it('should handle empty grid statistics', () => {
      const grid = new Uint8Array(9)
      const stats = GridUtils.getGridStatistics(grid, 3, 3)
      
      expect(stats.livingCells).toBe(0)
      expect(stats.density).toBe(0)
      expect(stats.isEmpty).toBe(true)
      expect(stats.isFull).toBe(false)
      expect(stats.bounds).toBeNull()
    })

    it('should handle full grid statistics', () => {
      const grid = new Uint8Array(9).fill(1)
      const stats = GridUtils.getGridStatistics(grid, 3, 3)
      
      expect(stats.livingCells).toBe(9)
      expect(stats.density).toBe(1)
      expect(stats.isEmpty).toBe(false)
      expect(stats.isFull).toBe(true)
    })
  })

  describe('grid resizing', () => {
    it('should resize grid with center preservation', () => {
      const sourceGrid = new Uint8Array([1, 1, 1, 1]) // 2x2
      const resized = GridUtils.resizeGrid(sourceGrid, 2, 2, 4, 4, true)
      
      // Should be centered in 4x4 grid
      expect(resized[5]).toBe(1) // (1, 1)
      expect(resized[6]).toBe(1) // (2, 1)
      expect(resized[9]).toBe(1) // (1, 2)
      expect(resized[10]).toBe(1) // (2, 2)
    })

    it('should resize grid without center preservation', () => {
      const sourceGrid = new Uint8Array([1, 1, 1, 1]) // 2x2
      const resized = GridUtils.resizeGrid(sourceGrid, 2, 2, 4, 4, false)
      
      // Should be at top-left
      expect(resized[0]).toBe(1) // (0, 0)
      expect(resized[1]).toBe(1) // (1, 0)
      expect(resized[4]).toBe(1) // (0, 1)
      expect(resized[5]).toBe(1) // (1, 1)
    })

    it('should handle shrinking grid', () => {
      const sourceGrid = new Uint8Array([1, 1, 1, 1, 1, 1, 1, 1, 1]) // 3x3
      const resized = GridUtils.resizeGrid(sourceGrid, 3, 3, 2, 2, false)
      
      expect(resized.length).toBe(4)
      expect(resized[0]).toBe(1) // (0, 0)
      expect(resized[1]).toBe(1) // (1, 0)
      expect(resized[2]).toBe(1) // (0, 1)
      expect(resized[3]).toBe(1) // (1, 1)
    })
  })
})
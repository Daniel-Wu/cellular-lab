import { describe, it, expect, beforeEach } from 'vitest'
import { RuleEngine } from '../../src/engines/RuleEngine'
import { Rule } from '../../src/types'

describe('RuleEngine', () => {
  let engine: RuleEngine

  beforeEach(() => {
    engine = new RuleEngine()
  })

  describe('preset rules', () => {
    it('should provide Conway\'s Life preset', () => {
      const conway = RuleEngine.getPresetRule('conway')
      expect(conway).toEqual({
        birth: [3],
        survival: [2, 3],
        notation: 'B3/S23'
      })
    })

    it('should provide HighLife preset', () => {
      const highlife = RuleEngine.getPresetRule('highlife')
      expect(highlife).toEqual({
        birth: [3, 6],
        survival: [2, 3],
        notation: 'B36/S23'
      })
    })

    it('should provide Seeds preset', () => {
      const seeds = RuleEngine.getPresetRule('seeds')
      expect(seeds).toEqual({
        birth: [2],
        survival: [],
        notation: 'B2/S'
      })
    })

    it('should provide Day & Night preset', () => {
      const daynight = RuleEngine.getPresetRule('daynight')
      expect(daynight).toEqual({
        birth: [3, 6, 7, 8],
        survival: [3, 4, 6, 7, 8],
        notation: 'B3678/S34678'
      })
    })

    it('should return all preset rules', () => {
      const presets = RuleEngine.getAllPresetRules()
      expect(presets).toHaveLength(4)
      expect(presets.map(p => p.id)).toEqual(['conway', 'highlife', 'seeds', 'daynight'])
    })
  })

  describe('computeNextGeneration', () => {
    it('should compute Conway\'s Life blinker correctly', () => {
      const width = 5
      const height = 5
      const grid = new Uint8Array(width * height)
      
      // Set up vertical blinker
      grid[1 * width + 2] = 1 // (2, 1)
      grid[2 * width + 2] = 1 // (2, 2)
      grid[3 * width + 2] = 1 // (2, 3)
      
      const rule: Rule = { birth: [3], survival: [2, 3], notation: 'B3/S23' }
      const nextGrid = engine.computeNextGeneration(grid, width, height, rule)
      
      // Should become horizontal blinker
      expect(nextGrid[2 * width + 1]).toBe(1) // (1, 2)
      expect(nextGrid[2 * width + 2]).toBe(1) // (2, 2)
      expect(nextGrid[2 * width + 3]).toBe(1) // (3, 2)
      
      // Other cells should be dead
      expect(nextGrid[1 * width + 2]).toBe(0) // (2, 1)
      expect(nextGrid[3 * width + 2]).toBe(0) // (2, 3)
    })

    it('should handle block pattern (stays stable)', () => {
      const width = 4
      const height = 4
      const grid = new Uint8Array(width * height)
      
      // Set up 2x2 block
      grid[1 * width + 1] = 1
      grid[1 * width + 2] = 1
      grid[2 * width + 1] = 1
      grid[2 * width + 2] = 1
      
      const rule: Rule = { birth: [3], survival: [2, 3], notation: 'B3/S23' }
      const nextGrid = engine.computeNextGeneration(grid, width, height, rule)
      
      // Block should remain unchanged
      expect(nextGrid[1 * width + 1]).toBe(1)
      expect(nextGrid[1 * width + 2]).toBe(1)
      expect(nextGrid[2 * width + 1]).toBe(1)
      expect(nextGrid[2 * width + 2]).toBe(1)
    })

    it('should handle empty grid', () => {
      const width = 10
      const height = 10
      const grid = new Uint8Array(width * height)
      
      const rule: Rule = { birth: [3], survival: [2, 3], notation: 'B3/S23' }
      const nextGrid = engine.computeNextGeneration(grid, width, height, rule)
      
      // Should remain empty
      for (let i = 0; i < nextGrid.length; i++) {
        expect(nextGrid[i]).toBe(0)
      }
    })

    it('should handle seeds rule correctly', () => {
      const width = 5
      const height = 5
      const grid = new Uint8Array(width * height)
      
      // Place a single cell with 2 neighbors
      grid[1 * width + 1] = 1
      grid[1 * width + 2] = 1
      
      const rule: Rule = { birth: [2], survival: [], notation: 'B2/S' }
      const nextGrid = engine.computeNextGeneration(grid, width, height, rule)
      
      // Original cells should die (no survival conditions)
      expect(nextGrid[1 * width + 1]).toBe(0)
      expect(nextGrid[1 * width + 2]).toBe(0)
      
      // New cells should be born where there are exactly 2 neighbors
      expect(nextGrid[0 * width + 1]).toBe(1) // (1, 0)
      expect(nextGrid[0 * width + 2]).toBe(1) // (2, 0)
      expect(nextGrid[2 * width + 1]).toBe(1) // (1, 2)
      expect(nextGrid[2 * width + 2]).toBe(1) // (2, 2)
    })

    it('should handle boundary conditions correctly', () => {
      const width = 3
      const height = 3
      const grid = new Uint8Array(width * height)
      
      // Place cells at corners and edges
      grid[0] = 1 // top-left corner
      grid[2] = 1 // top-right corner
      grid[6] = 1 // bottom-left corner
      grid[8] = 1 // bottom-right corner
      
      const rule: Rule = { birth: [3], survival: [2, 3], notation: 'B3/S23' }
      const nextGrid = engine.computeNextGeneration(grid, width, height, rule)
      
      // All corner cells should die (each has only 1 neighbor)
      expect(nextGrid[0]).toBe(0)
      expect(nextGrid[2]).toBe(0)
      expect(nextGrid[6]).toBe(0)
      expect(nextGrid[8]).toBe(0)
    })
  })

  describe('performance metrics', () => {
    it('should track performance metrics', () => {
      const width = 50
      const height = 50
      const grid = new Uint8Array(width * height)
      const rule: Rule = { birth: [3], survival: [2, 3], notation: 'B3/S23' }
      
      engine.computeNextGeneration(grid, width, height, rule)
      
      const metrics = engine.getPerformanceMetrics()
      expect(metrics.renderCount).toBe(1)
      expect(metrics.lastRenderTime).toBeGreaterThan(0)
      expect(metrics.averageRenderTime).toBeGreaterThan(0)
    })

    it('should calculate average render time correctly', () => {
      const width = 10
      const height = 10
      const grid = new Uint8Array(width * height)
      const rule: Rule = { birth: [3], survival: [2, 3], notation: 'B3/S23' }
      
      engine.computeNextGeneration(grid, width, height, rule)
      engine.computeNextGeneration(grid, width, height, rule)
      engine.computeNextGeneration(grid, width, height, rule)
      
      const metrics = engine.getPerformanceMetrics()
      expect(metrics.renderCount).toBe(3)
      expect(metrics.averageRenderTime).toBeGreaterThan(0)
    })

    it('should reset performance metrics', () => {
      const width = 10
      const height = 10
      const grid = new Uint8Array(width * height)
      const rule: Rule = { birth: [3], survival: [2, 3], notation: 'B3/S23' }
      
      engine.computeNextGeneration(grid, width, height, rule)
      engine.resetPerformanceMetrics()
      
      const metrics = engine.getPerformanceMetrics()
      expect(metrics.renderCount).toBe(0)
      expect(metrics.lastRenderTime).toBe(0)
      expect(metrics.averageRenderTime).toBe(0)
    })
  })

  describe('grid validation', () => {
    it('should validate valid grid bounds', () => {
      expect(RuleEngine.validateGridBounds(50, 50)).toBe(true)
      expect(RuleEngine.validateGridBounds(20, 20)).toBe(true)
      expect(RuleEngine.validateGridBounds(200, 200)).toBe(true)
    })

    it('should reject invalid grid bounds', () => {
      expect(RuleEngine.validateGridBounds(19, 50)).toBe(false)
      expect(RuleEngine.validateGridBounds(50, 19)).toBe(false)
      expect(RuleEngine.validateGridBounds(201, 200)).toBe(false)
      expect(RuleEngine.validateGridBounds(200, 201)).toBe(false)
      expect(RuleEngine.validateGridBounds(200, 201)).toBe(false) // > 40,000 cells
    })
  })

  describe('grid copying', () => {
    it('should copy grid correctly', () => {
      const original = new Uint8Array([1, 0, 1, 0, 1])
      const copy = RuleEngine.copyGrid(original)
      
      expect(copy).toEqual(original)
      expect(copy).not.toBe(original) // Different objects
    })
  })

  describe('performance benchmarks', () => {
    it('should handle 200x200 grid within performance target', () => {
      const width = 200
      const height = 200
      const grid = new Uint8Array(width * height)
      
      // Add some random living cells for realistic computation
      for (let i = 0; i < 1000; i++) {
        grid[Math.floor(Math.random() * grid.length)] = 1
      }
      
      const rule: Rule = { birth: [3], survival: [2, 3], notation: 'B3/S23' }
      
      const startTime = performance.now()
      engine.computeNextGeneration(grid, width, height, rule)
      const endTime = performance.now()
      
      const renderTime = endTime - startTime
      expect(renderTime).toBeLessThan(16) // 60fps target
    })
  })
})
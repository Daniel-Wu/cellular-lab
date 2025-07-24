import { describe, it, expect, beforeEach } from 'vitest'
import { RuleEngine } from '../../src/engines/RuleEngine'
import { RuleValidator } from '../../src/utils/RuleValidator'
import { GridUtils } from '../../src/utils/GridUtils'
import { PatternUtils } from '../../src/utils/PatternUtils'
import { MemoryManager } from '../../src/utils/MemoryManager'
import { Pattern, Rule } from '../../src/types'

describe('Integration Tests', () => {
  beforeEach(() => {
    MemoryManager.resetMemoryTracking()
  })

  describe('complete simulation workflow', () => {
    it('should run Conway\'s Life simulation end-to-end', () => {
      const width = 10
      const height = 10
      const engine = new RuleEngine()
      
      // Create grid with glider pattern
      const grid = GridUtils.createEmptyGrid(width, height)
      const glider = PatternUtils.getFamousPattern('glider')!
      
      // Place glider at position (2, 2)
      PatternUtils.placePatternOnGrid(grid, width, height, glider, 2, 2)
      
      // Verify initial state
      expect(GridUtils.countLivingCells(grid)).toBe(5)
      
      // Get Conway's rule from validator
      const conwayRule = RuleValidator.getPresetRule('conway')
      const rule: Rule = RuleValidator.parseRule(conwayRule.notation)!
      
      // Run simulation for several generations
      let currentGrid = grid
      for (let gen = 0; gen < 5; gen++) {
        const nextGrid = engine.computeNextGeneration(currentGrid, width, height, rule)
        currentGrid = nextGrid
      }
      
      // Glider should still be alive and moved
      expect(GridUtils.countLivingCells(currentGrid)).toBe(5)
      
      // Verify performance was tracked
      const metrics = engine.getPerformanceMetrics()
      expect(metrics.renderCount).toBe(5)
      expect(metrics.averageRenderTime).toBeGreaterThan(0)
    })

    it('should handle rule switching during simulation', () => {
      const width = 20
      const height = 20
      const engine = new RuleEngine()
      
      // Start with blinker pattern
      const grid = GridUtils.createEmptyGrid(width, height)
      const blinker = PatternUtils.getFamousPattern('blinker')!
      PatternUtils.centerPatternOnGrid(grid, width, height, blinker)
      
      // Run with Conway's Life
      const conwayRule = RuleEngine.getPresetRule('conway')
      let currentGrid = GridUtils.copyGrid(grid)
      
      for (let i = 0; i < 3; i++) {
        currentGrid = engine.computeNextGeneration(currentGrid, width, height, conwayRule)
      }
      
      // Should oscillate - after 2 generations, back to original
      const afterConway = currentGrid
      
      // Switch to Seeds rule
      const seedsRule = RuleEngine.getPresetRule('seeds')
      currentGrid = engine.computeNextGeneration(currentGrid, width, height, seedsRule)
      
      // Seeds rule should kill all cells and create new ones
      const afterSeeds = currentGrid
      expect(GridUtils.gridsEqual(afterConway, afterSeeds)).toBe(false)
      
      // Verify rule switching was fast
      const start = performance.now()
      engine.computeNextGeneration(currentGrid, width, height, seedsRule)
      const end = performance.now()
      
      expect(end - start).toBeLessThan(50) // <50ms requirement
    })

    it('should handle grid size changes with pattern preservation', () => {
      // Start with small grid
      const smallGrid = GridUtils.createEmptyGrid(30, 30)
      const block = PatternUtils.getFamousPattern('block')!
      
      // Place block in center
      PatternUtils.centerPatternOnGrid(smallGrid, 30, 30, block)
      expect(GridUtils.countLivingCells(smallGrid)).toBe(4)
      
      // Resize to larger grid
      const largeGrid = GridUtils.resizeGrid(smallGrid, 30, 30, 60, 60, true)
      expect(GridUtils.countLivingCells(largeGrid)).toBe(4)
      
      // Block should still be stable under Conway's rule
      const engine = new RuleEngine()
      const rule = RuleEngine.getPresetRule('conway')
      
      const nextGrid = engine.computeNextGeneration(largeGrid, 60, 60, rule)
      expect(GridUtils.countLivingCells(nextGrid)).toBe(4)
      expect(GridUtils.gridsEqual(largeGrid, nextGrid)).toBe(false) // Different positions but same pattern
    })

    it('should handle pattern placement edge cases', () => {
      const width = 10
      const height = 10
      const grid = GridUtils.createEmptyGrid(width, height)
      
      // Try to place pattern that's too large
      const largePattern: Pattern = {
        name: 'Large',
        width: 15,
        height: 15,
        cells: [{ x: 0, y: 0 }]
      }
      
      const result1 = PatternUtils.placePatternOnGrid(grid, width, height, largePattern, 0, 0)
      expect(result1.success).toBe(false)
      
      // Try to place pattern at invalid position
      const glider = PatternUtils.getFamousPattern('glider')!
      const result2 = PatternUtils.placePatternOnGrid(grid, width, height, glider, 8, 8)
      expect(result2.success).toBe(false)
      
      // Place pattern at valid position
      const result3 = PatternUtils.placePatternOnGrid(grid, width, height, glider, 1, 1)
      expect(result3.success).toBe(true)
      expect(GridUtils.countLivingCells(grid)).toBe(5)
    })
  })

  describe('memory management integration', () => {
    it('should enforce memory limits during simulation', () => {
      // Test maximum grid size
      const validation = MemoryManager.validateGridSize(200, 200)
      expect(validation.valid).toBe(true)
      
      const invalidValidation = MemoryManager.validateGridSize(201, 200)
      expect(invalidValidation.valid).toBe(false)
      
      // Allocate maximum grid
      const grid = MemoryManager.allocateGrid(200, 200)
      expect(grid).not.toBeNull()
      expect(grid!.length).toBe(40000)
      
      // Check memory usage
      const usage = MemoryManager.getMemoryUsage()
      expect(usage.gridsAllocated).toBe(1)
      expect(usage.totalMemoryUsed).toBe(40000)
    })

    it('should handle memory cleanup during long simulations', () => {
      // Allocate multiple grids to trigger memory pressure
      const grids: Uint8Array[] = []
      for (let i = 0; i < 10; i++) {
        const grid = MemoryManager.allocateGrid(50, 50)
        if (grid) grids.push(grid)
      }
      
      // Check if cleanup is needed
      expect(MemoryManager.shouldCleanup()).toBe(true)
      
      // Perform cleanup
      MemoryManager.cleanup()
      
      // Memory should be reset
      const usage = MemoryManager.getMemoryUsage()
      expect(usage.totalMemoryUsed).toBe(0)
      expect(usage.gridsAllocated).toBe(0)
    })

    it('should validate memory state during heavy usage', () => {
      // Create many small grids
      for (let i = 0; i < 15; i++) {
        MemoryManager.allocateGrid(30, 30)
      }
      
      const health = MemoryManager.validateMemoryState()
      expect(health.warnings.length).toBeGreaterThan(0)
      
      // Should warn about too many grids
      expect(health.warnings.some(w => w.includes('High number of allocated grids'))).toBe(true)
    })
  })

  describe('performance benchmarks', () => {
    it('should meet 60fps target on 200x200 grid', () => {
      const width = 200
      const height = 200
      const grid = MemoryManager.allocateGrid(width, height)!
      
      // Add random living cells for realistic computation
      for (let i = 0; i < 5000; i++) {
        const randomIndex = Math.floor(Math.random() * grid.length)
        grid[randomIndex] = 1
      }
      
      const engine = new RuleEngine()
      const rule = RuleEngine.getPresetRule('conway')
      
      // Measure performance over multiple generations
      const startTime = performance.now()
      const generations = 10
      
      let currentGrid = grid
      for (let i = 0; i < generations; i++) {
        currentGrid = engine.computeNextGeneration(currentGrid, width, height, rule)
      }
      
      const endTime = performance.now()
      const averageTime = (endTime - startTime) / generations
      
      expect(averageTime).toBeLessThan(16) // 60fps = 16.67ms per frame
      
      // Verify engine tracked performance
      const metrics = engine.getPerformanceMetrics()
      expect(metrics.renderCount).toBe(generations)
      expect(metrics.averageRenderTime).toBeLessThan(16)
    })

    it('should handle rule switching with low latency', () => {
      const width = 100
      const height = 100
      const grid = MemoryManager.allocateGrid(width, height)!
      
      // Add some living cells
      for (let i = 0; i < 1000; i++) {
        grid[Math.floor(Math.random() * grid.length)] = 1
      }
      
      const engine = new RuleEngine()
      const rules = [
        RuleEngine.getPresetRule('conway'),
        RuleEngine.getPresetRule('highlife'),
        RuleEngine.getPresetRule('seeds'),
        RuleEngine.getPresetRule('daynight')
      ]
      
      let currentGrid = grid
      
      // Test switching between different rules
      for (const rule of rules) {
        const start = performance.now()
        currentGrid = engine.computeNextGeneration(currentGrid, width, height, rule)
        const end = performance.now()
        
        expect(end - start).toBeLessThan(50) // <50ms rule switching requirement
      }
    })
  })

  describe('pattern and rule integration', () => {
    it('should validate patterns work with their suggested rules', () => {
      const glider = PatternUtils.getFamousPattern('glider')!
      expect(glider.rule).toBe('B3/S23')
      
      // Verify the rule is valid
      const validation = RuleValidator.validateRule(glider.rule!)
      expect(validation.valid).toBe(true)
      
      // Parse and use the rule
      const rule = RuleValidator.parseRule(glider.rule!)!
      expect(rule.notation).toBe('B3/S23')
      
      // Verify it matches Conway's preset
      const conwayPreset = RuleValidator.getPresetRule('conway')
      expect(rule.notation).toBe(conwayPreset.notation)
    })

    it('should handle pattern transformations correctly', () => {
      const blinker = PatternUtils.getFamousPattern('blinker')!
      
      // Rotate blinker 90 degrees (horizontal -> vertical)
      const rotated = PatternUtils.rotatePattern(blinker, 90)
      expect(rotated.width).toBe(1) // Was height=1
      expect(rotated.height).toBe(3) // Was width=3
      
      // Both should behave the same under Conway's rule
      const width = 10
      const height = 10
      const engine = new RuleEngine()
      const rule = RuleEngine.getPresetRule('conway')
      
      // Test original blinker
      const grid1 = GridUtils.createEmptyGrid(width, height)
      PatternUtils.centerPatternOnGrid(grid1, width, height, blinker)
      const next1 = engine.computeNextGeneration(grid1, width, height, rule)
      
      // Test rotated blinker
      const grid2 = GridUtils.createEmptyGrid(width, height)
      PatternUtils.centerPatternOnGrid(grid2, width, height, rotated)
      const next2 = engine.computeNextGeneration(grid2, width, height, rule)
      
      // Both should have same number of living cells (oscillating)
      expect(GridUtils.countLivingCells(next1)).toBe(3)
      expect(GridUtils.countLivingCells(next2)).toBe(3)
    })

    it('should handle pattern scaling and validation', () => {
      const block = PatternUtils.getFamousPattern('block')!
      
      // Scale up the block
      const scaled = PatternUtils.scalePattern(block, 2)
      expect(scaled.width).toBe(4)
      expect(scaled.height).toBe(4)
      expect(scaled.cells.length).toBeGreaterThan(4)
      
      // Validate the scaled pattern
      const validation = PatternUtils.validatePattern(scaled)
      expect(validation.valid).toBe(true)
      
      // Should still be stable under Conway's rule
      const width = 10
      const height = 10
      const grid = GridUtils.createEmptyGrid(width, height)
      
      const placement = PatternUtils.centerPatternOnGrid(grid, width, height, scaled)
      expect(placement.success).toBe(true)
      
      const engine = new RuleEngine()
      const rule = RuleEngine.getPresetRule('conway')
      const next = engine.computeNextGeneration(grid, width, height, rule)
      
      // Scaled block should remain stable
      expect(GridUtils.countLivingCells(next)).toBe(GridUtils.countLivingCells(grid))
    })
  })

  describe('comprehensive workflow test', () => {
    it('should handle complete application workflow', () => {
      // 1. Validate memory and create optimal grid
      const optimal = MemoryManager.getOptimalGridSize()
      const grid = MemoryManager.allocateGrid(optimal.width, optimal.height)!
      
      // 2. Get and validate a rule
      const allPresets = RuleValidator.getAllPresetRules()
      expect(allPresets.length).toBe(4)
      
      const highlifePreset = allPresets.find(p => p.id === 'highlife')!
      const validation = RuleValidator.validateRule(highlifePreset.notation)
      expect(validation.valid).toBe(true)
      
      const rule = RuleValidator.parseRule(highlifePreset.notation)!
      
      // 3. Place multiple patterns
      const patterns = PatternUtils.getAllFamousPatterns()
      let placedPatterns = 0
      
      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i]
        const x = (i % 5) * 10 + 5
        const y = Math.floor(i / 5) * 10 + 5
        
        if (GridUtils.canFitPattern(pattern.width, pattern.height, x, y, optimal.width, optimal.height)) {
          const result = PatternUtils.placePatternOnGrid(grid, optimal.width, optimal.height, pattern, x, y)
          if (result.success) placedPatterns++
        }
      }
      
      expect(placedPatterns).toBeGreaterThan(0)
      
      // 4. Run simulation and track performance
      const engine = new RuleEngine()
      let currentGrid = grid
      
      for (let gen = 0; gen < 10; gen++) {
        currentGrid = engine.computeNextGeneration(currentGrid, optimal.width, optimal.height, rule)
        
        // Check memory health periodically
        if (gen % 5 === 0) {
          const health = MemoryManager.validateMemoryState()
          expect(health.isHealthy).toBe(true)
        }
      }
      
      // 5. Analyze final state
      const stats = GridUtils.getGridStatistics(currentGrid, optimal.width, optimal.height)
      expect(stats.totalCells).toBe(optimal.width * optimal.height)
      expect(stats.density).toBeGreaterThanOrEqual(0)
      expect(stats.density).toBeLessThanOrEqual(1)
      
      // 6. Verify performance targets were met
      const metrics = engine.getPerformanceMetrics()
      expect(metrics.renderCount).toBe(10)
      expect(metrics.averageRenderTime).toBeLessThan(16) // 60fps target
      
      // 7. Clean up
      MemoryManager.deallocateGrid(currentGrid)
      MemoryManager.cleanup()
      
      const finalUsage = MemoryManager.getMemoryUsage()
      expect(finalUsage.totalMemoryUsed).toBe(0)
    })
  })
})
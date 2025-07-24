import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryManager } from '../../src/utils/MemoryManager'
import { ErrorType } from '../../src/types'

describe('MemoryManager', () => {
  beforeEach(() => {
    MemoryManager.resetMemoryTracking()
  })

  describe('grid size validation', () => {
    it('should validate acceptable grid sizes', () => {
      const result1 = MemoryManager.validateGridSize(50, 50)
      expect(result1.valid).toBe(true)
      
      const result2 = MemoryManager.validateGridSize(20, 20)
      expect(result2.valid).toBe(true)
      
      const result3 = MemoryManager.validateGridSize(200, 200)
      expect(result3.valid).toBe(true)
    })

    it('should reject grids that are too small', () => {
      const result = MemoryManager.validateGridSize(19, 20)
      expect(result.valid).toBe(false)
      expect(result.error).toBe(ErrorType.MEMORY_EXCEEDED)
    })

    it('should reject grids that are too large', () => {
      const result1 = MemoryManager.validateGridSize(201, 200)
      expect(result1.valid).toBe(false)
      expect(result1.error).toBe(ErrorType.MEMORY_EXCEEDED)
      
      const result2 = MemoryManager.validateGridSize(200, 201)
      expect(result2.valid).toBe(false)
      expect(result2.error).toBe(ErrorType.MEMORY_EXCEEDED)
    })

    it('should reject grids exceeding total cell limit', () => {
      const result = MemoryManager.validateGridSize(200, 201)
      expect(result.valid).toBe(false)
      expect(result.error).toBe(ErrorType.MEMORY_EXCEEDED)
    })
  })

  describe('generation validation', () => {
    it('should validate acceptable generation numbers', () => {
      expect(MemoryManager.validateGeneration(0).valid).toBe(true)
      expect(MemoryManager.validateGeneration(1000).valid).toBe(true)
      expect(MemoryManager.validateGeneration(999999).valid).toBe(true)
    })

    it('should reject negative generations', () => {
      const result = MemoryManager.validateGeneration(-1)
      expect(result.valid).toBe(false)
      expect(result.error).toBe(ErrorType.MEMORY_EXCEEDED)
    })

    it('should reject generations exceeding limit', () => {
      const result = MemoryManager.validateGeneration(1000000)
      expect(result.valid).toBe(false)
      expect(result.error).toBe(ErrorType.MEMORY_EXCEEDED)
    })
  })

  describe('grid allocation', () => {
    it('should allocate valid grids', () => {
      const grid = MemoryManager.allocateGrid(50, 50)
      expect(grid).not.toBeNull()
      expect(grid!.length).toBe(2500)
      expect(grid!.constructor).toBe(Uint8Array)
    })

    it('should return null for invalid grid sizes', () => {
      const grid = MemoryManager.allocateGrid(19, 20)
      expect(grid).toBeNull()
    })

    it('should track memory allocation', () => {
      MemoryManager.allocateGrid(50, 50)
      const usage = MemoryManager.getMemoryUsage()
      
      expect(usage.gridsAllocated).toBe(1)
      expect(usage.totalMemoryUsed).toBe(2500)
    })
  })

  describe('memory tracking', () => {
    it('should track multiple allocations', () => {
      MemoryManager.allocateGrid(10, 10)
      MemoryManager.allocateGrid(20, 20)
      
      const usage = MemoryManager.getMemoryUsage()
      expect(usage.gridsAllocated).toBe(2)
      expect(usage.totalMemoryUsed).toBe(500) // 100 + 400
    })

    it('should track peak memory usage', () => {
      const grid1 = MemoryManager.allocateGrid(50, 50)
      MemoryManager.allocateGrid(30, 30)
      
      if (grid1) MemoryManager.deallocateGrid(grid1)
      
      const usage = MemoryManager.getMemoryUsage()
      expect(usage.peakMemoryUsed).toBe(3400) // 2500 + 900
      expect(usage.totalMemoryUsed).toBe(900) // Only grid2 remains
    })

    it('should handle deallocation', () => {
      const grid = MemoryManager.allocateGrid(10, 10)
      if (grid) {
        MemoryManager.deallocateGrid(grid)
        
        const usage = MemoryManager.getMemoryUsage()
        expect(usage.gridsAllocated).toBe(0)
        expect(usage.totalMemoryUsed).toBe(0)
      }
    })

    it('should prevent negative memory counts', () => {
      const grid = new Uint8Array(100)
      MemoryManager.deallocateGrid(grid) // Deallocate without allocating
      
      const usage = MemoryManager.getMemoryUsage()
      expect(usage.gridsAllocated).toBe(0)
      expect(usage.totalMemoryUsed).toBe(0)
    })
  })

  describe('memory estimation', () => {
    it('should estimate grid memory correctly', () => {
      expect(MemoryManager.estimateGridMemory(10, 10)).toBe(100)
      expect(MemoryManager.estimateGridMemory(50, 40)).toBe(2000)
    })

    it('should check allocation feasibility', () => {
      expect(MemoryManager.canAllocateGrid(50, 50)).toBe(true)
      expect(MemoryManager.canAllocateGrid(201, 200)).toBe(false)
      
      // After allocating large grid, should be more restrictive
      MemoryManager.allocateGrid(100, 100)
      expect(MemoryManager.canAllocateGrid(150, 150)).toBe(false)
    })
  })

  describe('memory cleanup', () => {
    it('should indicate when cleanup is needed', () => {
      // Initially no cleanup needed
      expect(MemoryManager.shouldCleanup()).toBe(false)
      
      // Allocate large amount of memory
      for (let i = 0; i < 10; i++) {
        MemoryManager.allocateGrid(50, 50)
      }
      
      expect(MemoryManager.shouldCleanup()).toBe(true)
    })

    it('should reset memory tracking', () => {
      MemoryManager.allocateGrid(50, 50)
      MemoryManager.resetMemoryTracking()
      
      const usage = MemoryManager.getMemoryUsage()
      expect(usage.gridsAllocated).toBe(0)
      expect(usage.totalMemoryUsed).toBe(0)
      expect(usage.peakMemoryUsed).toBe(0)
    })

    it('should perform cleanup', () => {
      // Fill memory
      for (let i = 0; i < 15; i++) {
        MemoryManager.allocateGrid(50, 50)
      }
      
      MemoryManager.cleanup()
      
      const usage = MemoryManager.getMemoryUsage()
      expect(usage.totalMemoryUsed).toBe(0)
      expect(usage.gridsAllocated).toBe(0)
    })
  })

  describe('memory limits', () => {
    it('should provide memory limits', () => {
      const limits = MemoryManager.getLimits()
      expect(limits.maxGridSize).toBe(40000)
      expect(limits.maxGenerations).toBe(999999)
      expect(limits.maxHistorySteps).toBe(0)
    })

    it('should calculate optimal grid size', () => {
      const optimal = MemoryManager.getOptimalGridSize()
      expect(optimal.width).toBeLessThanOrEqual(200)
      expect(optimal.height).toBeLessThanOrEqual(200)
      expect(optimal.width * optimal.height).toBeLessThanOrEqual(40000)
    })
  })

  describe('memory health validation', () => {
    it('should report healthy state initially', () => {
      const health = MemoryManager.validateMemoryState()
      expect(health.isHealthy).toBe(true)
      expect(health.errors).toHaveLength(0)
    })

    it('should warn about high memory usage', () => {
      // Allocate 80%+ of memory
      for (let i = 0; i < 16; i++) {
        MemoryManager.allocateGrid(50, 50)
      }
      
      const health = MemoryManager.validateMemoryState()
      expect(health.warnings.length).toBeGreaterThan(0)
      expect(health.warnings.some(w => w.includes('High memory usage'))).toBe(true)
    })

    it('should error on memory limit exceeded', () => {
      // Force memory usage over limit
      for (let i = 0; i < 20; i++) {
        MemoryManager.allocateGrid(50, 50)
      }
      
      const health = MemoryManager.validateMemoryState()
      expect(health.isHealthy).toBe(false)
      expect(health.errors.some(e => e.includes('Memory limit exceeded'))).toBe(true)
    })

    it('should warn about too many grids', () => {
      // Allocate many small grids
      for (let i = 0; i < 12; i++) {
        MemoryManager.allocateGrid(20, 20)
      }
      
      const health = MemoryManager.validateMemoryState()
      expect(health.warnings.some(w => w.includes('High number of allocated grids'))).toBe(true)
    })
  })

  describe('optimized operations', () => {
    it('should create optimized empty grid', () => {
      const grid = MemoryManager.createOptimizedGrid(10, 10, 0)
      expect(grid).not.toBeNull()
      expect(grid!.length).toBe(100)
      expect(Array.from(grid!)).toEqual(new Array(100).fill(0))
    })

    it('should create optimized filled grid', () => {
      const grid = MemoryManager.createOptimizedGrid(5, 5, 1)
      expect(grid).not.toBeNull()
      expect(grid!.length).toBe(25)
      expect(Array.from(grid!)).toEqual(new Array(25).fill(1))
    })

    it('should copy grid efficiently', () => {
      const original = new Uint8Array([1, 0, 1, 0, 1])
      const copy = MemoryManager.copyGridEfficiently(original)
      
      expect(copy).not.toBeNull()
      expect(copy).toEqual(original)
      expect(copy).not.toBe(original)
    })

    it('should return null for invalid optimized operations', () => {
      const grid1 = MemoryManager.createOptimizedGrid(201, 200, 0)
      expect(grid1).toBeNull()
      
      const grid2 = MemoryManager.createOptimizedGrid(19, 20, 0)
      expect(grid2).toBeNull()
    })
  })

  describe('utilization calculation', () => {
    it('should calculate utilization percentage', () => {
      MemoryManager.allocateGrid(100, 100) // 10,000 cells
      
      const usage = MemoryManager.getMemoryUsage()
      // utilization = 10,000 / (40,000 * 4) * 100 = 6.25%
      expect(usage.utilizationPercent).toBeCloseTo(6.25, 1)
    })

    it('should handle zero utilization', () => {
      const usage = MemoryManager.getMemoryUsage()
      expect(usage.utilizationPercent).toBe(0)
    })
  })
})
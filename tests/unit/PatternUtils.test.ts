import { describe, it, expect } from 'vitest'
import { PatternUtils } from '../../src/utils/PatternUtils'
import { Pattern, ErrorType } from '../../src/types'

describe('PatternUtils', () => {
  describe('famous patterns', () => {
    it('should get glider pattern', () => {
      const glider = PatternUtils.getFamousPattern('glider')
      expect(glider).toEqual({
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
      })
    })

    it('should get blinker pattern', () => {
      const blinker = PatternUtils.getFamousPattern('blinker')
      expect(blinker?.name).toBe('Blinker')
      expect(blinker?.width).toBe(3)
      expect(blinker?.height).toBe(1)
      expect(blinker?.cells).toHaveLength(3)
    })

    it('should get block pattern', () => {
      const block = PatternUtils.getFamousPattern('block')
      expect(block?.name).toBe('Block')
      expect(block?.width).toBe(2)
      expect(block?.height).toBe(2)
      expect(block?.cells).toHaveLength(4)
    })

    it('should return null for unknown pattern', () => {
      const unknown = PatternUtils.getFamousPattern('unknown')
      expect(unknown).toBeNull()
    })

    it('should be case insensitive', () => {
      const glider = PatternUtils.getFamousPattern('GLIDER')
      expect(glider?.name).toBe('Glider')
    })

    it('should return copies of patterns', () => {
      const glider1 = PatternUtils.getFamousPattern('glider')
      const glider2 = PatternUtils.getFamousPattern('glider')
      
      expect(glider1).toEqual(glider2)
      expect(glider1?.cells).not.toBe(glider2?.cells) // Different array objects
    })

    it('should get all famous patterns', () => {
      const patterns = PatternUtils.getAllFamousPatterns()
      expect(patterns).toHaveLength(5)
      expect(patterns.map(p => p.name)).toEqual([
        'Glider', 'Blinker', 'Block', 'Beacon', 'Toad'
      ])
    })
  })

  describe('pattern validation', () => {
    it('should validate correct pattern', () => {
      const pattern: Pattern = {
        name: 'Test',
        width: 3,
        height: 3,
        cells: [{ x: 1, y: 1 }]
      }
      
      const result = PatternUtils.validatePattern(pattern)
      expect(result.valid).toBe(true)
    })

    it('should reject pattern without name', () => {
      const pattern: Pattern = {
        name: '',
        width: 3,
        height: 3,
        cells: []
      }
      
      const result = PatternUtils.validatePattern(pattern)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('must have a name')
    })

    it('should reject pattern with invalid dimensions', () => {
      const pattern: Pattern = {
        name: 'Test',
        width: 0,
        height: 3,
        cells: []
      }
      
      const result = PatternUtils.validatePattern(pattern)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('must be positive')
    })

    it('should reject oversized pattern', () => {
      const pattern: Pattern = {
        name: 'Test',
        width: 201,
        height: 200,
        cells: []
      }
      
      const result = PatternUtils.validatePattern(pattern)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('too large')
    })

    it('should reject cells outside bounds', () => {
      const pattern: Pattern = {
        name: 'Test',
        width: 3,
        height: 3,
        cells: [{ x: 3, y: 1 }] // x=3 is outside 0-2 range
      }
      
      const result = PatternUtils.validatePattern(pattern)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('outside pattern bounds')
    })

    it('should reject duplicate cells', () => {
      const pattern: Pattern = {
        name: 'Test',
        width: 3,
        height: 3,
        cells: [{ x: 1, y: 1 }, { x: 1, y: 1 }]
      }
      
      const result = PatternUtils.validatePattern(pattern)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('duplicate cells')
    })
  })

  describe('pattern to grid conversion', () => {
    it('should convert pattern to grid correctly', () => {
      const pattern: Pattern = {
        name: 'Test',
        width: 3,
        height: 2,
        cells: [{ x: 0, y: 0 }, { x: 2, y: 1 }]
      }
      
      const grid = PatternUtils.patternToGrid(pattern)
      expect(grid.length).toBe(6)
      expect(grid[0]).toBe(1) // (0, 0)
      expect(grid[5]).toBe(1) // (2, 1)
      expect(grid[1]).toBe(0) // Other cells should be 0
    })

    it('should handle empty pattern', () => {
      const pattern: Pattern = {
        name: 'Empty',
        width: 2,
        height: 2,
        cells: []
      }
      
      const grid = PatternUtils.patternToGrid(pattern)
      expect(Array.from(grid)).toEqual([0, 0, 0, 0])
    })
  })

  describe('grid to pattern conversion', () => {
    it('should convert grid to pattern correctly', () => {
      const grid = new Uint8Array([1, 0, 0, 1])
      const pattern = PatternUtils.gridToPattern(grid, 2, 2, 'Test')
      
      expect(pattern.name).toBe('Test')
      expect(pattern.width).toBe(2)
      expect(pattern.height).toBe(2)
      expect(pattern.cells).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 1 }
      ])
    })

    it('should use default name', () => {
      const grid = new Uint8Array([1])
      const pattern = PatternUtils.gridToPattern(grid, 1, 1)
      expect(pattern.name).toBe('Custom Pattern')
    })
  })

  describe('pattern placement', () => {
    it('should place pattern on grid successfully', () => {
      const grid = new Uint8Array(25) // 5x5
      const pattern: Pattern = {
        name: 'Test',
        width: 2,
        height: 2,
        cells: [{ x: 0, y: 0 }, { x: 1, y: 1 }]
      }
      
      const result = PatternUtils.placePatternOnGrid(grid, 5, 5, pattern, 1, 1)
      expect(result.success).toBe(true)
      
      expect(grid[6]).toBe(1)  // (1, 1)
      expect(grid[12]).toBe(1) // (2, 2)
    })

    it('should fail when pattern doesn\'t fit', () => {
      const grid = new Uint8Array(9) // 3x3
      const pattern: Pattern = {
        name: 'Test',
        width: 2,
        height: 2,
        cells: [{ x: 0, y: 0 }]
      }
      
      const result = PatternUtils.placePatternOnGrid(grid, 3, 3, pattern, 2, 2)
      expect(result.success).toBe(false)
      expect(result.error).toBe(ErrorType.PATTERN_TOO_LARGE)
    })

    it('should handle overwrite mode', () => {
      const grid = new Uint8Array(9) // 3x3
      grid[4] = 1 // Center cell already alive
      
      const pattern: Pattern = {
        name: 'Test',
        width: 1,
        height: 1,
        cells: [{ x: 0, y: 0 }]
      }
      
      // With overwrite=false, shouldn't change existing live cell
      PatternUtils.placePatternOnGrid(grid, 3, 3, pattern, 1, 1, false)
      expect(grid[4]).toBe(1)
      
      // With overwrite=true (default), should overwrite
      grid[4] = 0 // Reset
      PatternUtils.placePatternOnGrid(grid, 3, 3, pattern, 1, 1, true)
      expect(grid[4]).toBe(1)
    })
  })

  describe('pattern centering', () => {
    it('should center pattern on grid', () => {
      const grid = new Uint8Array(25) // 5x5
      const pattern: Pattern = {
        name: 'Test',
        width: 1,
        height: 1,
        cells: [{ x: 0, y: 0 }]
      }
      
      const result = PatternUtils.centerPatternOnGrid(grid, 5, 5, pattern)
      expect(result.success).toBe(true)
      expect(grid[12]).toBe(1) // Center of 5x5 grid
    })
  })

  describe('pattern transformations', () => {
    const testPattern: Pattern = {
      name: 'L-Shape',
      width: 2,
      height: 3,
      cells: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 }
      ]
    }

    it('should rotate pattern 90 degrees', () => {
      const rotated = PatternUtils.rotatePattern(testPattern, 90)
      
      expect(rotated.width).toBe(3) // height becomes width
      expect(rotated.height).toBe(2) // width becomes height
      expect(rotated.name).toContain('90°')
      expect(rotated.cells).toEqual([
        { x: 2, y: 0 }, // (0,0) -> (2,0)
        { x: 1, y: 0 }, // (0,1) -> (1,0)
        { x: 1, y: 1 }  // (1,1) -> (1,1)
      ])
    })

    it('should rotate pattern 180 degrees', () => {
      const rotated = PatternUtils.rotatePattern(testPattern, 180)
      
      expect(rotated.width).toBe(2)
      expect(rotated.height).toBe(3)
      expect(rotated.name).toContain('180°')
      expect(rotated.cells).toEqual([
        { x: 1, y: 2 }, // (0,0) -> (1,2)
        { x: 1, y: 1 }, // (0,1) -> (1,1)  
        { x: 0, y: 1 }  // (1,1) -> (0,1)
      ])
    })

    it('should rotate pattern 270 degrees', () => {
      const rotated = PatternUtils.rotatePattern(testPattern, 270)
      
      expect(rotated.width).toBe(3)
      expect(rotated.height).toBe(2)
      expect(rotated.name).toContain('270°')
    })

    it('should flip pattern horizontally', () => {
      const flipped = PatternUtils.flipPatternHorizontal(testPattern)
      
      expect(flipped.width).toBe(2)
      expect(flipped.height).toBe(3)
      expect(flipped.name).toContain('H-flip')
      expect(flipped.cells).toEqual([
        { x: 1, y: 0 }, // (0,0) -> (1,0)
        { x: 1, y: 1 }, // (0,1) -> (1,1)
        { x: 0, y: 1 }  // (1,1) -> (0,1)
      ])
    })

    it('should flip pattern vertically', () => {
      const flipped = PatternUtils.flipPatternVertical(testPattern)
      
      expect(flipped.width).toBe(2)
      expect(flipped.height).toBe(3)
      expect(flipped.name).toContain('V-flip')
      expect(flipped.cells).toEqual([
        { x: 0, y: 2 }, // (0,0) -> (0,2)
        { x: 0, y: 1 }, // (0,1) -> (0,1)
        { x: 1, y: 1 }  // (1,1) -> (1,1)
      ])
    })

    it('should scale pattern up', () => {
      const small: Pattern = {
        name: 'Dot',
        width: 1,
        height: 1,
        cells: [{ x: 0, y: 0 }]
      }
      
      const scaled = PatternUtils.scalePattern(small, 2)
      expect(scaled.width).toBe(2)
      expect(scaled.height).toBe(2)
      expect(scaled.name).toContain('2x')
      expect(scaled.cells).toHaveLength(4) // 2x2 block
    })

    it('should reject oversized scaling', () => {
      const large: Pattern = {
        name: 'Large',
        width: 100,
        height: 100,
        cells: [{ x: 0, y: 0 }]
      }
      
      const scaled = PatternUtils.scalePattern(large, 3)
      expect(scaled).toBe(large) // Should return original unchanged
    })

    it('should handle invalid transformations gracefully', () => {
      const invalid: Pattern = {
        name: '',
        width: 0,
        height: 0,
        cells: []
      }
      
      const rotated = PatternUtils.rotatePattern(invalid, 90)
      expect(rotated).toBe(invalid)
    })
  })

  describe('pattern analysis', () => {
    it('should get pattern bounds', () => {
      const pattern: Pattern = {
        name: 'Test',
        width: 5,
        height: 5,
        cells: [
          { x: 1, y: 2 },
          { x: 3, y: 1 },
          { x: 2, y: 4 }
        ]
      }
      
      const bounds = PatternUtils.getPatternBounds(pattern)
      expect(bounds).toEqual({
        minX: 1,
        maxX: 3,
        minY: 1,
        maxY: 4
      })
    })

    it('should return null bounds for empty pattern', () => {
      const pattern: Pattern = {
        name: 'Empty',
        width: 3,
        height: 3,
        cells: []
      }
      
      const bounds = PatternUtils.getPatternBounds(pattern)
      expect(bounds).toBeNull()
    })

    it('should normalize pattern', () => {
      const pattern: Pattern = {
        name: 'Offset',
        width: 5,
        height: 5,
        cells: [
          { x: 2, y: 3 },
          { x: 3, y: 3 },
          { x: 3, y: 4 }
        ]
      }
      
      const normalized = PatternUtils.normalizePattern(pattern)
      expect(normalized.width).toBe(2)  // 3-2+1
      expect(normalized.height).toBe(2) // 4-3+1
      expect(normalized.cells).toEqual([
        { x: 0, y: 0 }, // 2-2, 3-3
        { x: 1, y: 0 }, // 3-2, 3-3
        { x: 1, y: 1 }  // 3-2, 4-3
      ])
    })
  })

  describe('pattern comparison', () => {
    it('should identify equal patterns', () => {
      const pattern1: Pattern = {
        name: 'Test1',
        width: 2,
        height: 2,
        cells: [{ x: 0, y: 0 }, { x: 1, y: 1 }]
      }
      
      const pattern2: Pattern = {
        name: 'Test2',
        width: 2,
        height: 2,
        cells: [{ x: 1, y: 1 }, { x: 0, y: 0 }] // Different order
      }
      
      expect(PatternUtils.patternsEqual(pattern1, pattern2)).toBe(true)
    })

    it('should identify different patterns', () => {
      const pattern1: Pattern = {
        name: 'Test1',
        width: 2,
        height: 2,
        cells: [{ x: 0, y: 0 }]
      }
      
      const pattern2: Pattern = {
        name: 'Test2',
        width: 2,
        height: 2,
        cells: [{ x: 1, y: 1 }]
      }
      
      expect(PatternUtils.patternsEqual(pattern1, pattern2)).toBe(false)
    })

    it('should handle different dimensions', () => {
      const pattern1: Pattern = {
        name: 'Test1',
        width: 2,
        height: 2,
        cells: []
      }
      
      const pattern2: Pattern = {
        name: 'Test2',
        width: 3,
        height: 3,
        cells: []
      }
      
      expect(PatternUtils.patternsEqual(pattern1, pattern2)).toBe(false)
    })

    it('should handle different cell counts', () => {
      const pattern1: Pattern = {
        name: 'Test1',
        width: 2,
        height: 2,
        cells: [{ x: 0, y: 0 }]
      }
      
      const pattern2: Pattern = {
        name: 'Test2',
        width: 2,
        height: 2,
        cells: [{ x: 0, y: 0 }, { x: 1, y: 1 }]
      }
      
      expect(PatternUtils.patternsEqual(pattern1, pattern2)).toBe(false)
    })
  })
})
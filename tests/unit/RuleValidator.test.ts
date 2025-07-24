import { describe, it, expect } from 'vitest'
import { RuleValidator } from '../../src/utils/RuleValidator'

describe('RuleValidator', () => {
  describe('basic validation', () => {
    it('should validate correct B/S notation', () => {
      const result = RuleValidator.validateRule('B3/S23')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should validate empty birth conditions', () => {
      const result = RuleValidator.validateRule('B/S23')
      expect(result.valid).toBe(true)
    })

    it('should validate empty survival conditions', () => {
      const result = RuleValidator.validateRule('B3/S')
      expect(result.valid).toBe(true)
    })

    it('should validate complex rules', () => {
      const result = RuleValidator.validateRule('B3678/S34567')
      expect(result.valid).toBe(true)
    })

    it('should reject invalid format', () => {
      const result = RuleValidator.validateRule('invalid')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid format')
    })

    it('should reject numbers outside 0-8 range', () => {
      const result = RuleValidator.validateRule('B9/S23')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('numbers 0-8 only')
    })

    it('should reject duplicate birth conditions', () => {
      const result = RuleValidator.validateRule('B33/S23')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Duplicate birth conditions')
    })

    it('should reject duplicate survival conditions', () => {
      const result = RuleValidator.validateRule('B3/S223')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Duplicate survival conditions')
    })

    it('should handle empty string', () => {
      const result = RuleValidator.validateRule('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('cannot be empty')
    })

    it('should handle null/undefined input', () => {
      const result1 = RuleValidator.validateRule(null as unknown as string)
      expect(result1.valid).toBe(false)
      
      const result2 = RuleValidator.validateRule(undefined as unknown as string)
      expect(result2.valid).toBe(false)
    })

    it('should handle whitespace', () => {
      const result = RuleValidator.validateRule('  B3/S23  ')
      expect(result.valid).toBe(true)
    })
  })

  describe('rule parsing', () => {
    it('should parse valid rule correctly', () => {
      const rule = RuleValidator.parseRule('B3/S23')
      expect(rule).toEqual({
        birth: [3],
        survival: [2, 3],
        notation: 'B3/S23'
      })
    })

    it('should parse empty conditions', () => {
      const rule = RuleValidator.parseRule('B/S')
      expect(rule).toEqual({
        birth: [],
        survival: [],
        notation: 'B/S'
      })
    })

    it('should return null for invalid rules', () => {
      const rule = RuleValidator.parseRule('invalid')
      expect(rule).toBeNull()
    })

    it('should handle complex rules', () => {
      const rule = RuleValidator.parseRule('B3678/S34567')
      expect(rule).toEqual({
        birth: [3, 6, 7, 8],
        survival: [3, 4, 5, 6, 7],
        notation: 'B3678/S34567'
      })
    })
  })

  describe('rule formatting', () => {
    it('should format rule with sorted numbers', () => {
      const formatted = RuleValidator.formatRule([3, 1, 2], [3, 2, 4])
      expect(formatted).toBe('B123/S234')
    })

    it('should handle empty arrays', () => {
      const formatted = RuleValidator.formatRule([], [])
      expect(formatted).toBe('B/S')
    })

    it('should handle single conditions', () => {
      const formatted = RuleValidator.formatRule([3], [2])
      expect(formatted).toBe('B3/S2')
    })
  })

  describe('preset rules', () => {
    it('should get Conway\'s Life preset', () => {
      const conway = RuleValidator.getPresetRule('conway')
      expect(conway).toEqual({
        name: "Conway's Game of Life",
        birth: [3],
        survival: [2, 3],
        notation: 'B3/S23',
        description: 'The classic cellular automaton with balanced birth and survival rules'
      })
    })

    it('should get all preset rules', () => {
      const presets = RuleValidator.getAllPresetRules()
      expect(presets).toHaveLength(4)
      expect(presets.map(p => p.id)).toEqual(['conway', 'highlife', 'seeds', 'daynight'])
    })

    it('should identify preset rules by notation', () => {
      expect(RuleValidator.isPresetRule('B3/S23')).toBe('conway')
      expect(RuleValidator.isPresetRule('B36/S23')).toBe('highlife')
      expect(RuleValidator.isPresetRule('B2/S')).toBe('seeds')
      expect(RuleValidator.isPresetRule('B3678/S34678')).toBe('daynight')
      expect(RuleValidator.isPresetRule('B1/S1')).toBeNull()
    })

    it('should get preset rule by notation', () => {
      const conway = RuleValidator.getPresetRuleByNotation('B3/S23')
      expect(conway?.name).toBe("Conway's Game of Life")
      
      const unknown = RuleValidator.getPresetRuleByNotation('B1/S1')
      expect(unknown).toBeNull()
    })
  })

  describe('rule number validation', () => {
    it('should validate correct rule numbers', () => {
      const result = RuleValidator.validateRuleNumbers([0, 1, 8], [2, 3, 4])
      expect(result.valid).toBe(true)
    })

    it('should reject negative numbers', () => {
      const result = RuleValidator.validateRuleNumbers([-1, 3], [2, 3])
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid birth condition: -1')
    })

    it('should reject numbers > 8', () => {
      const result = RuleValidator.validateRuleNumbers([3], [2, 9])
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid survival condition: 9')
    })

    it('should reject non-integers', () => {
      const result = RuleValidator.validateRuleNumbers([3.5], [2])
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid birth condition: 3.5')
    })

    it('should reject duplicate numbers', () => {
      const result1 = RuleValidator.validateRuleNumbers([3, 3], [2])
      expect(result1.valid).toBe(false)
      expect(result1.error).toContain('Duplicate birth conditions')
      
      const result2 = RuleValidator.validateRuleNumbers([3], [2, 2])
      expect(result2.valid).toBe(false)
      expect(result2.error).toContain('Duplicate survival conditions')
    })
  })

  describe('rule creation', () => {
    it('should create valid rule', () => {
      const rule = RuleValidator.createRule([3, 1], [2, 3])
      expect(rule).toEqual({
        birth: [1, 3],
        survival: [2, 3],
        notation: 'B13/S23'
      })
    })

    it('should return null for invalid rule numbers', () => {
      const rule = RuleValidator.createRule([9], [2, 3])
      expect(rule).toBeNull()
    })

    it('should sort rule numbers', () => {
      const rule = RuleValidator.createRule([6, 3, 7], [3, 4, 6, 7, 8])
      expect(rule?.birth).toEqual([3, 6, 7])
      expect(rule?.survival).toEqual([3, 4, 6, 7, 8])
    })
  })

  describe('rule comparison', () => {
    it('should compare identical rules', () => {
      const rule1 = { birth: [3], survival: [2, 3], notation: 'B3/S23' }
      const rule2 = { birth: [3], survival: [2, 3], notation: 'B3/S23' }
      expect(RuleValidator.rulesEqual(rule1, rule2)).toBe(true)
    })

    it('should compare rules with different order', () => {
      const rule1 = { birth: [3, 6], survival: [2, 3], notation: 'B36/S23' }
      const rule2 = { birth: [6, 3], survival: [3, 2], notation: 'B63/S32' }
      expect(RuleValidator.rulesEqual(rule1, rule2)).toBe(true)
    })

    it('should detect different rules', () => {
      const rule1 = { birth: [3], survival: [2, 3], notation: 'B3/S23' }
      const rule2 = { birth: [3, 6], survival: [2, 3], notation: 'B36/S23' }
      expect(RuleValidator.rulesEqual(rule1, rule2)).toBe(false)
    })

    it('should handle empty arrays', () => {
      const rule1 = { birth: [], survival: [], notation: 'B/S' }
      const rule2 = { birth: [], survival: [], notation: 'B/S' }
      expect(RuleValidator.rulesEqual(rule1, rule2)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle maximum length conditions', () => {
      const result = RuleValidator.validateRule('B012345678/S012345678')
      expect(result.valid).toBe(true)
    })

    it('should reject conditions that are too long', () => {
      const result = RuleValidator.validateRule('B0123456789/S23')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Too many birth conditions')
    })

    it('should handle all preset rule validations', () => {
      const presets = [
        'B3/S23',    // Conway
        'B36/S23',   // HighLife
        'B2/S',      // Seeds
        'B3678/S34678' // Day & Night
      ]
      
      presets.forEach(notation => {
        const result = RuleValidator.validateRule(notation)
        expect(result.valid).toBe(true)
      })
    })
  })
})
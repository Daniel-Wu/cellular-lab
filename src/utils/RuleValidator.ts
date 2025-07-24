import { ValidationResult, Rule, PresetRuleConfig } from '@/types'

export class RuleValidator {
  private static readonly PRESET_RULES = {
    conway: {
      name: "Conway's Game of Life",
      birth: [3],
      survival: [2, 3],
      notation: 'B3/S23',
      description: 'The classic cellular automaton with balanced birth and survival rules'
    },
    highlife: {
      name: 'HighLife',
      birth: [3, 6],
      survival: [2, 3],
      notation: 'B36/S23',
      description: 'Like Conway\'s Life but with additional birth on 6 neighbors, creating replicators'
    },
    seeds: {
      name: 'Seeds',
      birth: [2],
      survival: [],
      notation: 'B2/S',
      description: 'Every living cell dies, new cells born with 2 neighbors - creates explosive growth'
    },
    daynight: {
      name: 'Day & Night',
      birth: [3, 6, 7, 8],
      survival: [3, 4, 6, 7, 8],
      notation: 'B3678/S34678',
      description: 'Symmetric rule where both crowded and sparse areas can sustain life'
    }
  } as const

  static validateRule(notation: string): ValidationResult {
    if (!notation || typeof notation !== 'string') {
      return { valid: false, error: 'Rule notation must be a non-empty string' }
    }

    const trimmedNotation = notation.trim()
    if (trimmedNotation === '') {
      return { valid: false, error: 'Rule notation cannot be empty' }
    }

    const regex = /^B([0-8]*)\/S([0-8]*)$/
    const match = trimmedNotation.match(regex)
    
    if (!match) {
      return { 
        valid: false, 
        error: 'Invalid format. Use B/S notation like "B3/S23" (numbers 0-8 only)' 
      }
    }
    
    const birthStr = match[1] ?? ''
    const survivalStr = match[2] ?? ''
    
    if (birthStr.length > 9) {
      return { valid: false, error: 'Too many birth conditions (maximum 9)' }
    }
    
    if (survivalStr.length > 9) {
      return { valid: false, error: 'Too many survival conditions (maximum 9)' }
    }
    
    const birth = birthStr.split('').map(Number)
    const survival = survivalStr.split('').map(Number)
    
    if (new Set(birth).size !== birth.length) {
      return { valid: false, error: 'Duplicate birth conditions not allowed' }
    }
    if (new Set(survival).size !== survival.length) {
      return { valid: false, error: 'Duplicate survival conditions not allowed' }
    }
    
    return { valid: true }
  }

  static parseRule(notation: string): Rule | null {
    const validation = this.validateRule(notation)
    if (!validation.valid) return null
    
    const match = notation.trim().match(/^B([0-8]*)\/S([0-8]*)$/)
    if (!match) return null
    
    const birthStr = match[1] ?? ''
    const survivalStr = match[2] ?? ''
    
    return {
      birth: birthStr.split('').map(Number),
      survival: survivalStr.split('').map(Number),
      notation: notation.trim()
    }
  }

  static formatRule(birth: number[], survival: number[]): string {
    const sortedBirth = [...birth].sort((a, b) => a - b)
    const sortedSurvival = [...survival].sort((a, b) => a - b)
    
    return `B${sortedBirth.join('')}/S${sortedSurvival.join('')}`
  }

  static getPresetRule(preset: keyof typeof RuleValidator.PRESET_RULES): PresetRuleConfig {
    const presetRule = this.PRESET_RULES[preset]
    return {
      name: presetRule.name,
      birth: [...presetRule.birth],
      survival: [...presetRule.survival],
      notation: presetRule.notation,
      description: presetRule.description
    }
  }

  static getAllPresetRules(): Array<PresetRuleConfig & { id: string }> {
    return Object.entries(this.PRESET_RULES).map(([id, rule]) => ({
      id,
      name: rule.name,
      birth: [...rule.birth],
      survival: [...rule.survival],
      notation: rule.notation,
      description: rule.description
    }))
  }

  static isPresetRule(notation: string): keyof typeof RuleValidator.PRESET_RULES | null {
    const trimmedNotation = notation.trim()
    
    for (const [id, rule] of Object.entries(this.PRESET_RULES)) {
      if (rule.notation === trimmedNotation) {
        return id as keyof typeof RuleValidator.PRESET_RULES
      }
    }
    
    return null
  }

  static getPresetRuleByNotation(notation: string): PresetRuleConfig | null {
    const presetId = this.isPresetRule(notation)
    return presetId ? this.getPresetRule(presetId) : null
  }

  static validateRuleNumbers(birth: number[], survival: number[]): ValidationResult {
    for (const num of birth) {
      if (!Number.isInteger(num) || num < 0 || num > 8) {
        return { valid: false, error: `Invalid birth condition: ${num}. Must be integer 0-8` }
      }
    }
    
    for (const num of survival) {
      if (!Number.isInteger(num) || num < 0 || num > 8) {
        return { valid: false, error: `Invalid survival condition: ${num}. Must be integer 0-8` }
      }
    }
    
    if (new Set(birth).size !== birth.length) {
      return { valid: false, error: 'Duplicate birth conditions not allowed' }
    }
    
    if (new Set(survival).size !== survival.length) {
      return { valid: false, error: 'Duplicate survival conditions not allowed' }
    }
    
    return { valid: true }
  }

  static createRule(birth: number[], survival: number[]): Rule | null {
    const validation = this.validateRuleNumbers(birth, survival)
    if (!validation.valid) return null
    
    return {
      birth: [...birth].sort((a, b) => a - b),
      survival: [...survival].sort((a, b) => a - b),
      notation: this.formatRule(birth, survival)
    }
  }

  static rulesEqual(rule1: Rule, rule2: Rule): boolean {
    const birth1 = [...rule1.birth].sort((a, b) => a - b)
    const birth2 = [...rule2.birth].sort((a, b) => a - b)
    const survival1 = [...rule1.survival].sort((a, b) => a - b)
    const survival2 = [...rule2.survival].sort((a, b) => a - b)
    
    return birth1.length === birth2.length &&
           survival1.length === survival2.length &&
           birth1.every((val, idx) => val === birth2[idx]) &&
           survival1.every((val, idx) => val === survival2[idx])
  }
}
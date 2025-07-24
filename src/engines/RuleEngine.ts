import { Rule } from '@/types'

export class RuleEngine {
  private static readonly PRESET_RULES = {
    conway: { birth: [3], survival: [2, 3], notation: 'B3/S23' },
    highlife: { birth: [3, 6], survival: [2, 3], notation: 'B36/S23' },
    seeds: { birth: [2], survival: [], notation: 'B2/S' },
    daynight: { birth: [3, 6, 7, 8], survival: [3, 4, 6, 7, 8], notation: 'B3678/S34678' }
  } as const

  private performanceMetrics: {
    lastRenderTime: number
    averageRenderTime: number
    renderCount: number
  } = {
    lastRenderTime: 0,
    averageRenderTime: 0,
    renderCount: 0
  }

  static getPresetRule(preset: 'conway' | 'highlife' | 'seeds' | 'daynight'): Rule {
    const presetRule = RuleEngine.PRESET_RULES[preset]
    return {
      birth: [...presetRule.birth],
      survival: [...presetRule.survival],
      notation: presetRule.notation
    }
  }

  static getAllPresetRules() {
    return Object.entries(RuleEngine.PRESET_RULES).map(([key, rule]) => ({
      id: key as keyof typeof RuleEngine.PRESET_RULES,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      birth: [...rule.birth],
      survival: [...rule.survival],
      notation: rule.notation
    }))
  }

  private countNeighbors(
    grid: Uint8Array,
    width: number,
    height: number,
    x: number,
    y: number
  ): number {
    let count = 0
    const maxX = width - 1
    const maxY = height - 1
    
    const minDx = x > 0 ? -1 : 0
    const maxDx = x < maxX ? 1 : 0
    const minDy = y > 0 ? -1 : 0
    const maxDy = y < maxY ? 1 : 0
    
    for (let dy = minDy; dy <= maxDy; dy++) {
      const nyWidth = (y + dy) * width
      for (let dx = minDx; dx <= maxDx; dx++) {
        if (dx === 0 && dy === 0) continue
        count += grid[nyWidth + x + dx] ?? 0
      }
    }
    
    return count
  }

  computeNextGeneration(
    grid: Uint8Array, 
    width: number, 
    height: number, 
    rule: Rule
  ): Uint8Array {
    const startTime = performance.now()
    
    const nextGrid = new Uint8Array(grid.length)
    const birthSet = new Set(rule.birth)
    const survivalSet = new Set(rule.survival)
    
    for (let y = 0; y < height; y++) {
      const yWidth = y * width
      for (let x = 0; x < width; x++) {
        const index = yWidth + x
        const neighbors = this.countNeighbors(grid, width, height, x, y)
        const isAlive = grid[index] === 1
        
        if (isAlive) {
          nextGrid[index] = survivalSet.has(neighbors) ? 1 : 0
        } else {
          nextGrid[index] = birthSet.has(neighbors) ? 1 : 0
        }
      }
    }
    
    const endTime = performance.now()
    this.updatePerformanceMetrics(endTime - startTime)
    
    return nextGrid
  }

  private updatePerformanceMetrics(renderTime: number): void {
    this.performanceMetrics.lastRenderTime = renderTime
    this.performanceMetrics.renderCount++
    
    const alpha = 0.1
    if (this.performanceMetrics.renderCount === 1) {
      this.performanceMetrics.averageRenderTime = renderTime
    } else {
      this.performanceMetrics.averageRenderTime = 
        alpha * renderTime + (1 - alpha) * this.performanceMetrics.averageRenderTime
    }
  }

  getPerformanceMetrics() {
    return { ...this.performanceMetrics }
  }

  resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      lastRenderTime: 0,
      averageRenderTime: 0,
      renderCount: 0
    }
  }

  static validateGridBounds(width: number, height: number): boolean {
    return width >= 20 && width <= 200 && height >= 20 && height <= 200 && 
           width * height <= 40000
  }

  static copyGrid(grid: Uint8Array): Uint8Array {
    return new Uint8Array(grid)
  }
}
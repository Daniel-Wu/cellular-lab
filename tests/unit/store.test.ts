import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '@/stores'

describe('App Store', () => {
  beforeEach(() => {
    useAppStore.getState().resetState()
  })

  it('should initialize with default state', () => {
    const state = useAppStore.getState()
    
    expect(state.grid.width).toBe(50)
    expect(state.grid.height).toBe(50)
    expect(state.grid.generation).toBe(0)
    expect(state.simulation.isRunning).toBe(false)
    expect(state.rule.notation).toBe('B3/S23')
    expect(state.ui.showGrid).toBe(true)
  })

  it('should toggle cell state', () => {
    const { toggleCell, grid } = useAppStore.getState()
    
    expect(grid.current[0]).toBe(0)
    toggleCell(0)
    expect(useAppStore.getState().grid.current[0]).toBe(1)
    toggleCell(0)
    expect(useAppStore.getState().grid.current[0]).toBe(0)
  })

  it('should clear grid', () => {
    const { setCell, clearGrid } = useAppStore.getState()
    
    setCell(0, 1)
    setCell(10, 1)
    expect(useAppStore.getState().grid.current[0]).toBe(1)
    expect(useAppStore.getState().grid.current[10]).toBe(1)
    
    clearGrid()
    expect(useAppStore.getState().grid.current[0]).toBe(0)
    expect(useAppStore.getState().grid.current[10]).toBe(0)
    expect(useAppStore.getState().grid.generation).toBe(0)
  })

  it('should update grid size', () => {
    const { setGridSize } = useAppStore.getState()
    
    setGridSize(100, 100)
    const state = useAppStore.getState()
    
    expect(state.grid.width).toBe(100)
    expect(state.grid.height).toBe(100)
    expect(state.grid.current.length).toBe(10000)
    expect(state.grid.generation).toBe(0)
  })
})
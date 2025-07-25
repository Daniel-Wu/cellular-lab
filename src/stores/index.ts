import { create } from 'zustand'
import { AppState, Rule, Pattern } from '@/types'
import { RuleEngine } from '@/engines/RuleEngine'
import { PatternPlacer } from '../utils/MemoryManager'

interface AppActions {
  setGridSize: (width: number, height: number) => void
  setCell: (index: number, state: 0 | 1) => void
  toggleCell: (index: number) => void
  clearGrid: () => void
  randomizeGrid: () => void
  setRule: (rule: Rule) => void
  setSpeed: (speed: number) => void
  startSimulation: () => void
  stopSimulation: () => void
  stepSimulation: () => void
  incrementGeneration: () => void
  setSelectedPattern: (pattern: string | null) => void
  setIsDrawing: (drawing: boolean) => void
  setLastDrawnCell: (cell: number | null) => void
  toggleGridLines: () => void
  resetState: () => void
  placePattern: (pattern: Pattern, x: number, y: number) => { success: boolean; error?: string | undefined }
  centerPattern: (pattern: Pattern) => { success: boolean; error?: string | undefined; position?: { x: number; y: number } | undefined }
  setPatternPlacementMode: (enabled: boolean, pattern?: Pattern) => void
}

type AppStore = AppState & AppActions

const DEFAULT_SPEED = 200

const createInitialGrid = (width: number, height: number): Uint8Array => {
  return new Uint8Array(width * height)
}

const getDefaultGridSize = () => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    const isMobile = window.innerWidth < 768 // md breakpoint
    return isMobile ? { width: 50, height: 50 } : { width: 100, height: 50 }
  }
  // Default for SSR or initial render
  return { width: 50, height: 50 }
}

const defaultGridSize = getDefaultGridSize()

const initialState: AppState = {
  grid: {
    current: createInitialGrid(defaultGridSize.width, defaultGridSize.height),
    width: defaultGridSize.width,
    height: defaultGridSize.height,
    generation: 0,
  },
  simulation: {
    isRunning: false,
    speed: DEFAULT_SPEED,
    intervalId: null,
  },
  rule: {
    birth: [3],
    survival: [2, 3],
    notation: 'B3/S23',
  },
  ui: {
    selectedPattern: null,
    isDrawing: false,
    lastDrawnCell: null,
    showGrid: true,
    patternPlacementMode: false,
  },
}

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,

  setGridSize: (width: number, height: number) => {
    const currentState = get()
    if (currentState.simulation.intervalId) {
      clearInterval(currentState.simulation.intervalId)
    }
    
    set({
      grid: {
        current: createInitialGrid(width, height),
        width,
        height,
        generation: 0,
      },
      simulation: {
        ...currentState.simulation,
        isRunning: false,
        intervalId: null,
      },
    })
  },

  setCell: (index: number, state: 0 | 1) => {
    const currentState = get()
    const newGrid = new Uint8Array(currentState.grid.current)
    newGrid[index] = state
    
    set({
      grid: {
        ...currentState.grid,
        current: newGrid,
      },
    })
  },

  toggleCell: (index: number) => {
    const currentState = get()
    const currentCellState = currentState.grid.current[index]
    get().setCell(index, currentCellState === 1 ? 0 : 1)
  },

  clearGrid: () => {
    const currentState = get()
    const { width, height } = currentState.grid
    
    set({
      grid: {
        ...currentState.grid,
        current: createInitialGrid(width, height),
        generation: 0,
      },
    })
  },

  randomizeGrid: () => {
    const currentState = get()
    const { width, height } = currentState.grid
    const gridSize = width * height
    const newGrid = new Uint8Array(gridSize)
    
    // Fill grid with random values (0.5 probability for each cell to be alive)
    for (let i = 0; i < gridSize; i++) {
      newGrid[i] = Math.random() > 0.5 ? 1 : 0
    }
    
    set({
      grid: {
        ...currentState.grid,
        current: newGrid,
        generation: 0,
      },
    })
  },

  setRule: (rule: Rule) => {
    set(() => ({
      rule: { ...rule },
    }))
  },

  setSpeed: (speed: number) => {
    const currentState = get()
    const wasRunning = currentState.simulation.isRunning
    
    // If simulation is running, stop it first
    if (wasRunning && currentState.simulation.intervalId) {
      clearInterval(currentState.simulation.intervalId)
    }
    
    // Update the speed
    set({
      simulation: {
        ...currentState.simulation,
        speed,
        intervalId: null,
        isRunning: false,
      },
    })
    
    // If it was running, restart it with the new speed
    if (wasRunning) {
      const intervalId = window.setInterval(() => {
        get().stepSimulation()
      }, speed)

      set((state) => ({
        simulation: {
          ...state.simulation,
          isRunning: true,
          intervalId,
        },
      }))
    }
  },

  startSimulation: () => {
    const currentState = get()
    if (currentState.simulation.isRunning) return

    const intervalId = window.setInterval(() => {
      get().stepSimulation()
    }, currentState.simulation.speed)

    set({
      simulation: {
        ...currentState.simulation,
        isRunning: true,
        intervalId,
      },
    })
  },

  stopSimulation: () => {
    const currentState = get()
    if (currentState.simulation.intervalId) {
      clearInterval(currentState.simulation.intervalId)
    }

    set({
      simulation: {
        ...currentState.simulation,
        isRunning: false,
        intervalId: null,
      },
    })
  },

  stepSimulation: () => {
    const currentState = get()
    const { current, width, height, generation } = currentState.grid
    const { rule } = currentState
    
    const engine = new RuleEngine()
    const nextGrid = engine.computeNextGeneration(current, width, height, rule)
    
    set({
      grid: {
        ...currentState.grid,
        current: nextGrid,
        generation: generation + 1,
      },
    })
  },

  incrementGeneration: () => {
    set((state) => ({
      grid: {
        ...state.grid,
        generation: state.grid.generation + 1,
      },
    }))
  },

  setSelectedPattern: (pattern: string | null) => {
    set((state) => ({
      ui: {
        ...state.ui,
        selectedPattern: pattern,
      },
    }))
  },

  setIsDrawing: (drawing: boolean) => {
    set((state) => ({
      ui: {
        ...state.ui,
        isDrawing: drawing,
      },
    }))
  },

  setLastDrawnCell: (cell: number | null) => {
    set((state) => ({
      ui: {
        ...state.ui,
        lastDrawnCell: cell,
      },
    }))
  },

  toggleGridLines: () => {
    set((state) => ({
      ui: {
        ...state.ui,
        showGrid: !state.ui.showGrid,
      },
    }))
  },

  resetState: () => {
    const currentState = get()
    if (currentState.simulation.intervalId !== null) {
      clearInterval(currentState.simulation.intervalId)
    }
    set({ ...initialState })
  },

  placePattern: (pattern: Pattern, x: number, y: number) => {
    const currentState = get()
    
    
    const newGrid = new Uint8Array(currentState.grid.current)
    const result = PatternPlacer.placePattern(
      newGrid,
      currentState.grid.width,
      currentState.grid.height,
      pattern,
      x,
      y,
      { saveState: false }
    )

    if (result.success) {
      set({
        grid: {
          ...currentState.grid,
          current: newGrid,
        },
      })
      return { success: true }
    }

    return { success: false, error: result.error }
  },

  centerPattern: (pattern: Pattern) => {
    const currentState = get()
    
    
    const newGrid = new Uint8Array(currentState.grid.current)
    const result = PatternPlacer.centerPattern(
      newGrid,
      currentState.grid.width,
      currentState.grid.height,
      pattern,
      { saveState: false }
    )

    if (result.success) {
      set({
        grid: {
          ...currentState.grid,
          current: newGrid,
        },
      })
      return { success: true, position: result.position }
    }

    return { success: false, error: result.error }
  },

  setPatternPlacementMode: (enabled: boolean, pattern?: Pattern) => {
    set((state) => ({
      ui: {
        ...state.ui,
        patternPlacementMode: enabled,
        selectedPattern: pattern?.name || null,
      },
    }))
  },
}))

export type AppStoreType = typeof useAppStore
export { createInitialGrid }
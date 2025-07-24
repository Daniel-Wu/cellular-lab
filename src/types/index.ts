export interface AppState {
  grid: {
    current: Uint8Array;
    width: number;
    height: number;
    generation: number;
  };
  simulation: {
    isRunning: boolean;
    speed: number;
    intervalId: number | null;
  };
  rule: {
    birth: number[];
    survival: number[];
    notation: string;
  };
  ui: {
    selectedPattern: string | null;
    isDrawing: boolean;
    lastDrawnCell: number | null;
    showGrid: boolean;
    patternPlacementMode: boolean;
  };
}

export interface Rule {
  birth: number[];
  survival: number[];
  notation: string;
}

export interface Pattern {
  name: string;
  width: number;
  height: number;
  cells: Array<{x: number; y: number}>;
  rule?: string;
}

export interface ExportedPattern {
  name: string;
  created: string;
  grid: {
    width: number;
    height: number;
    data: number[];
  };
  rule: string;
  generation: number;
}

export interface MemoryLimits {
  maxGridSize: number;
  maxGenerations: number;
  maxHistorySteps: number;
}

export interface PerformanceTargets {
  frameRate: number;
  renderTime: number;
  memoryUsage: number;
  startupTime: number;
  targetFPS: number;
  maxMemoryMB: number;
  maxLoadTimeMS: number;
  maxBundleSizeMB: number;
  maxRuleSwitchingMS: number;
  maxGenerationTimeMS: number;
}

export interface BrowserSupport {
  minimum: {
    chrome: string;
    firefox: string;
    safari: string;
    edge: string;
  };
  features: string[];
  mobile: {
    ios: string;
    android: string;
  };
}

export interface Breakpoints {
  mobile: string;
  tablet: string;
  desktop: string;
}

export interface A11yAnnouncements {
  gridState: string;
  ruleChange: string;
  simulationState: string;
}

export enum ErrorType {
  CANVAS_UNSUPPORTED = 'canvas_unsupported',
  MEMORY_EXCEEDED = 'memory_exceeded',
  INVALID_RULE = 'invalid_rule',
  PATTERN_TOO_LARGE = 'pattern_too_large',
  IMPORT_FAILED = 'import_failed'
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface FeatureSupport {
  supported: boolean;
  missing: string[];
}

export interface GridCoordinates {
  x: number;
  y: number;
}

export interface CellPosition {
  index: number;
  x: number;
  y: number;
}

export interface GridDimensions {
  width: number;
  height: number;
  cellSize: number;
}

export interface RenderOptions {
  showGrid: boolean;
  devicePixelRatio: number;
}

export interface SimulationState {
  isRunning: boolean;
  speed: number;
  generation: number;
}

export interface TouchEventData {
  x: number;
  y: number;
  cellIndex: number | null;
}

export interface KeyboardShortcuts {
  playPause: string;
  step: string;
  reset: string;
  escape: string;
}

export type GridSize = 20 | 50 | 100 | 200;

export type CellState = 0 | 1;

export type PresetRule = 'conway' | 'highlife' | 'seeds' | 'daynight';

export interface PresetRuleConfig {
  name: string;
  birth: number[];
  survival: number[];
  notation: string;
  description: string;
}

export interface PerformanceMetrics {
  lastRenderTime: number;
  averageRenderTime: number;
  renderCount: number;
}

export interface MemoryUsage {
  gridsAllocated: number;
  totalMemoryUsed: number;
  peakMemoryUsed: number;
  lastCleanup: number;
  limits: MemoryLimits;
  utilizationPercent: number;
}

export interface MemoryValidationResult {
  valid: boolean;
  error?: ErrorType;
}

export interface MemoryHealthCheck {
  isHealthy: boolean;
  warnings: string[];
  errors: string[];
}

export interface PatternValidationResult {
  valid: boolean;
  error?: string;
}

export interface PatternPlacementResult {
  success: boolean;
  error?: ErrorType;
}

export interface PatternBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface GridStatistics {
  totalCells: number;
  livingCells: number;
  deadCells: number;
  density: number;
  bounds: PatternBounds | null;
  isEmpty: boolean;
  isFull: boolean;
}

export interface GridResizeOptions {
  preserveCenter: boolean;
}

export interface OptimalGridSize {
  width: number;
  height: number;
}

export interface RuleEngineConfig {
  enablePerformanceTracking: boolean;
  optimizeBoundaryChecks: boolean;
}

export interface EnginePerformanceReport {
  averageGenerationTime: number;
  lastGenerationTime: number;
  totalGenerations: number;
  performanceWarnings: string[];
}

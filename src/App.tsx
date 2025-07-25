import { useAppStore } from './stores'
import { Play, Pause, SkipForward, RotateCcw, Settings, Shuffle } from 'lucide-react'
import toast from 'react-hot-toast'
import { GridContainer } from './components/Grid'
import { PatternLibrary } from './components/PatternLibrary'
import { Pattern } from './types'
import { useRef, useEffect, useCallback, useState } from 'react'
import { useAccessibility } from './hooks/useAccessibility'
import { performanceProfiler } from './utils/PerformanceProfiler'
import { errorHandler, handleError, createError, ErrorSeverity } from './utils/ErrorHandler'
import { RuleEngine } from './engines/RuleEngine'

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState<string>('');
  const [gridHeight, setGridHeight] = useState<string>('');
  
  // Get preset rules
  const presetRules = RuleEngine.getAllPresetRules();

  const { 
    grid, 
    simulation, 
    rule,
    startSimulation,
    stopSimulation,
    stepSimulation,
    clearGrid,
    randomizeGrid,
    centerPattern,
    setPatternPlacementMode,
    setGridSize,
    setSpeed,
    setRule
  } = useAppStore();

  // Initialize accessibility features
  const {
    announceToScreenReader,
    showKeyboardShortcuts,
    getAccessibilityState
  } = useAccessibility({
    enableKeyboardShortcuts: true,
    enableScreenReaderAnnouncements: true,
    enableFocusManagement: true
  });

  // Initialize performance monitoring
  useEffect(() => {
    performanceProfiler.startMonitoring();
    performanceProfiler.setWarningThresholds({
      targetFPS: 60,
      maxMemoryMB: 100,
      maxLoadTimeMS: 2000,
      maxBundleSizeMB: 5,
      maxRuleSwitchingMS: 50,
      maxGenerationTimeMS: 16
    });

    return () => {
      performanceProfiler.stopMonitoring();
    };
  }, []);

  // Error boundary for canvas support
  useEffect(() => {
    const browserSupport = errorHandler.checkBrowserSupport();
    if (!browserSupport.isSupported) {
      console.error('Browser support issues:', browserSupport.missingFeatures);
      
      if (browserSupport.missingFeatures.includes('HTML5 Canvas')) {
        const fallback = errorHandler.createCanvasNotSupportedFallback();
        const gridContainer = document.querySelector('[data-testid="grid-container"]');
        if (gridContainer && gridContainer.parentNode) {
          gridContainer.parentNode.replaceChild(fallback, gridContainer);
        }
      }
    }
  }, []);

  // Accessibility state detection
  const accessibilityState = getAccessibilityState();

  const handlePlayPause = useCallback(() => {
    const operation = simulation.isRunning ? 'pause' : 'start';
    
    try {
      performanceProfiler.measureOperationTime(() => {
        if (simulation.isRunning) {
          stopSimulation();
        } else {
          startSimulation();
        }
      }, 'simulation toggle');

      const message = simulation.isRunning ? 'Simulation paused' : 'Simulation started';
      toast.success(message);
      announceToScreenReader(message);
      
    } catch (error) {
      const errorInfo = handleError(error as Error, {
        component: 'App',
        operation: `simulation ${operation}`
      });
      console.error('Simulation toggle failed:', errorInfo);
    }
  }, [simulation.isRunning, startSimulation, stopSimulation, announceToScreenReader]);

  const handleStep = useCallback(() => {
    try {
      performanceProfiler.measureOperationTime(() => {
        stepSimulation();
      }, 'generation computation');

      const message = `Generation ${grid.generation + 1}`;
      toast.success(message);
      announceToScreenReader(`Step completed. ${message}`);
      
    } catch (error) {
      const errorInfo = handleError(error as Error, {
        component: 'App',
        operation: 'step simulation'
      });
      console.error('Step simulation failed:', errorInfo);
    }
  }, [stepSimulation, grid.generation, announceToScreenReader]);

  const handleReset = useCallback(() => {
    try {
      if (simulation.isRunning) {
        stopSimulation();
      }
      
      performanceProfiler.measureOperationTime(() => {
        clearGrid();
      }, 'grid reset');

      const message = 'Grid cleared';
      toast.success(message);
      announceToScreenReader(message);
      
    } catch (error) {
      const errorInfo = handleError(error as Error, {
        component: 'App',
        operation: 'reset grid'
      });
      console.error('Grid reset failed:', errorInfo);
    }
  }, [simulation.isRunning, stopSimulation, clearGrid, announceToScreenReader]);

  const handleRandomize = useCallback(() => {
    try {
      if (simulation.isRunning) {
        stopSimulation();
      }
      
      performanceProfiler.measureOperationTime(() => {
        randomizeGrid();
      }, 'grid randomization');

      const message = 'Grid randomized';
      toast.success(message);
      announceToScreenReader(message);
      
    } catch (error) {
      const errorInfo = handleError(error as Error, {
        component: 'App',
        operation: 'randomize grid'
      });
      console.error('Grid randomization failed:', errorInfo);
    }
  }, [simulation.isRunning, stopSimulation, randomizeGrid, announceToScreenReader]);

  const handlePatternSelect = useCallback((pattern: Pattern) => {
    try {
      const result = centerPattern(pattern);
      
      if (result.success) {
        const message = `${pattern.name} placed on grid`;
        toast.success(message);
        announceToScreenReader(message);
        setPatternPlacementMode(false);
      } else {
        const error = createError(
          'PATTERN_PLACEMENT_FAILED',
          result.error || 'Failed to place pattern',
          ErrorSeverity.MEDIUM
        );
        handleError(error, {
          component: 'App',
          operation: 'pattern placement'
        });
      }
    } catch (error) {
      const errorInfo = handleError(error as Error, {
        component: 'App',
        operation: 'pattern placement'
      });
      console.error('Pattern placement failed:', errorInfo);
    }
  }, [centerPattern, setPatternPlacementMode, announceToScreenReader]);

  const handleGridResize = useCallback(() => {
    const width = parseInt(gridWidth, 10);
    const height = parseInt(gridHeight, 10);
    
    // Validation
    if (isNaN(width) || isNaN(height)) {
      toast.error('Please enter valid numbers for width and height');
      return;
    }
    
    if (width < 20 || width > 200 || height < 20 || height > 200) {
      toast.error('Grid size must be between 20 and 200');
      return;
    }
    
    try {
      setGridSize(width, height);
      const message = `Grid resized to ${width}×${height}`;
      toast.success(message);
      announceToScreenReader(message);
      
      // Clear inputs after successful resize
      setGridWidth('');
      setGridHeight('');
    } catch (error) {
      const errorInfo = handleError(error as Error, {
        component: 'App',
        operation: 'grid resize'
      });
      console.error('Grid resize failed:', errorInfo);
    }
  }, [gridWidth, gridHeight, setGridSize, announceToScreenReader]);

  const handleSpeedChange = useCallback((multiplier: number) => {
    try {
      const baseSpeed = 200; // Base speed (1x)
      const newSpeed = Math.round(baseSpeed / multiplier);
      
      setSpeed(newSpeed);
      
      const message = `Speed set to ${multiplier}x (${newSpeed}ms)`;
      toast.success(message);
      announceToScreenReader(message);
      
    } catch (error) {
      const errorInfo = handleError(error as Error, {
        component: 'App',
        operation: 'speed change'
      });
      console.error('Speed change failed:', errorInfo);
    }
  }, [setSpeed, announceToScreenReader]);

  const handleRuleChange = useCallback((ruleId: string) => {
    try {
      const selectedRule = presetRules.find(r => r.id === ruleId);
      if (!selectedRule) {
        toast.error('Invalid rule selected');
        return;
      }
      
      setRule({
        birth: selectedRule.birth,
        survival: selectedRule.survival,
        notation: selectedRule.notation
      });
      
      const message = `Rule changed to ${selectedRule.name} (${selectedRule.notation})`;
      toast.success(message);
      announceToScreenReader(message);
      
    } catch (error) {
      const errorInfo = handleError(error as Error, {
        component: 'App',
        operation: 'rule change'
      });
      console.error('Rule change failed:', errorInfo);
    }
  }, [presetRules, setRule, announceToScreenReader]);

  // Apply accessibility classes based on user preferences
  const appClasses = [
    'min-h-screen bg-background text-text-primary',
    accessibilityState.highContrastMode && 'high-contrast',
    accessibilityState.hasReducedMotion && 'reduce-motion'
  ].filter(Boolean).join(' ');

  return (
    <div 
      ref={appRef}
      className={appClasses}
      data-testid="app-root"
    >
      <div className="container mx-auto px-10 py-6 max-w-full">
        <header className="text-center mb-8 animate-slide-up">
          <div className="mb-6">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cell-alive to-primary-400 bg-clip-text text-transparent mb-3 animate-float">
              CellularLab
            </h1>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Interactive Cellular Automata Explorer
            </p>
            <div className="w-24 h-1 bg-gradient-to-r from-cell-alive to-primary-400 mx-auto mt-4 rounded-full"></div>
          </div>
          <div className="sr-only">
            Current rule: {rule.notation}. Grid size: {grid.width} by {grid.height}. 
            Generation: {grid.generation}. 
            Press Ctrl+H for keyboard shortcuts.
          </div>
        </header>

        <main role="main" className="space-y-8">
          <section aria-labelledby="grid-heading">
            <div className="card p-8 animate-slide-in-from-left">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h2 id="grid-heading" className="text-3xl font-bold text-text-primary mb-2">
                    Grid ({grid.width}×{grid.height})
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-text-secondary">
                    <div 
                      className="flex items-center gap-2"
                      data-testid="generation"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      <div className="w-2 h-2 bg-cell-alive rounded-full animate-pulse"></div>
                      Generation: <span className="font-mono text-text-accent font-semibold">{grid.generation}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handlePlayPause}
                    className={`btn-${simulation.isRunning ? 'warning' : 'primary'} flex items-center gap-2 text-sm`}
                    aria-pressed={simulation.isRunning}
                    aria-label={simulation.isRunning ? 'Pause simulation' : 'Start simulation'}
                    data-testid="play-pause-button"
                  >
                    {simulation.isRunning ? <Pause size={16} /> : <Play size={16} />}
                    {simulation.isRunning ? 'Pause' : 'Play'}
                  </button>
                  
                  <button
                    onClick={handleStep}
                    disabled={simulation.isRunning}
                    className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100"
                    aria-label="Step simulation forward one generation"
                    aria-describedby={simulation.isRunning ? 'step-disabled-help' : undefined}
                    data-testid="step-button"
                  >
                    <SkipForward size={16} />
                    Step
                  </button>
                  
                  <button
                    onClick={handleReset}
                    className="btn-danger flex items-center gap-2 text-sm"
                    aria-label="Reset grid to empty state"
                    data-testid="reset-button"
                  >
                    <RotateCcw size={16} />
                    Reset
                  </button>
                  
                  <button
                    onClick={handleRandomize}
                    className="btn-secondary flex items-center gap-2 text-sm"
                    aria-label="Randomize grid with 50% probability for each cell"
                    data-testid="randomize-button"
                  >
                    <Shuffle size={16} />
                    Random
                  </button>
                </div>
                {simulation.isRunning && (
                  <div id="step-disabled-help" className="sr-only">
                    Step button is disabled while simulation is running
                  </div>
                )}
              </div>
              
              <GridContainer 
                showPerformanceMetrics={true} 
                canvasRef={canvasRef}
                aria-label={`Cellular automata grid, ${grid.width} by ${grid.height} cells, generation ${grid.generation}`}
              />
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-in-from-right" aria-label="Simulation controls and information">
            <div className="card p-6" aria-labelledby="rule-heading">
              <h3 id="rule-heading" className="text-lg font-semibold mb-4 text-text-primary flex items-center gap-2">
                <div className="w-3 h-3 bg-gradient-to-r from-cell-alive to-primary-400 rounded-full"></div>
                Current Rule
              </h3>
              <div className="space-y-3">
                <div className="text-center bg-surface-elevated rounded-xl p-3 border border-grid-line/20">
                  <div 
                    className="text-2xl font-mono font-bold text-transparent bg-gradient-to-r from-cell-alive to-primary-400 bg-clip-text mb-1"
                    aria-label={`Current rule: ${rule.notation}`}
                  >
                    {rule.notation}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {presetRules.find(r => r.notation === rule.notation)?.name || 'Custom Rule'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {presetRules.map((presetRule) => (
                    <button
                      key={presetRule.id}
                      onClick={() => handleRuleChange(presetRule.id)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        rule.notation === presetRule.notation
                          ? 'bg-cell-alive text-black border-cell-alive font-semibold' 
                          : 'bg-surface-elevated border-grid-line/20 text-text-secondary hover:border-cell-alive hover:text-cell-alive'
                      }`}
                      aria-label={`Set rule to ${presetRule.name} (${presetRule.notation})`}
                      data-testid={`rule-${presetRule.id}`}
                    >
                      {presetRule.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card p-6" aria-labelledby="speed-heading">
              <h3 id="speed-heading" className="text-lg font-semibold mb-4 text-text-primary flex items-center gap-2">
                <div className="w-3 h-3 bg-gradient-to-r from-warning to-warning/60 rounded-full"></div>
                Simulation Speed
              </h3>
              <div className="space-y-3">
                <div className="text-center bg-surface-elevated rounded-xl p-3 border border-grid-line/20">
                  <div 
                    className="text-xl font-mono font-bold text-warning mb-1"
                    aria-label={`Current speed: ${simulation.speed} milliseconds per generation`}
                  >
                    {simulation.speed}ms
                  </div>
                  <div className="text-xs text-text-secondary">
                    per generation
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleSpeedChange(0.5)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      simulation.speed === 400 
                        ? 'bg-warning text-black border-warning font-semibold' 
                        : 'bg-surface-elevated border-grid-line/20 text-text-secondary hover:border-warning hover:text-warning'
                    }`}
                    aria-label="Set speed to 0.5x (slower)"
                    data-testid="speed-0.5x"
                  >
                    0.5x
                  </button>
                  <button
                    onClick={() => handleSpeedChange(1)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      simulation.speed === 200 
                        ? 'bg-warning text-black border-warning font-semibold' 
                        : 'bg-surface-elevated border-grid-line/20 text-text-secondary hover:border-warning hover:text-warning'
                    }`}
                    aria-label="Set speed to 1x (normal)"
                    data-testid="speed-1x"
                  >
                    1x
                  </button>
                  <button
                    onClick={() => handleSpeedChange(2)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      simulation.speed === 100 
                        ? 'bg-warning text-black border-warning font-semibold' 
                        : 'bg-surface-elevated border-grid-line/20 text-text-secondary hover:border-warning hover:text-warning'
                    }`}
                    aria-label="Set speed to 2x (faster)"
                    data-testid="speed-2x"
                  >
                    2x
                  </button>
                  <button
                    onClick={() => handleSpeedChange(4)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      simulation.speed === 50 
                        ? 'bg-warning text-black border-warning font-semibold' 
                        : 'bg-surface-elevated border-grid-line/20 text-text-secondary hover:border-warning hover:text-warning'
                    }`}
                    aria-label="Set speed to 4x (fastest)"
                    data-testid="speed-4x"
                  >
                    4x
                  </button>
                </div>
              </div>
            </div>

            <div className="card p-6" aria-labelledby="resize-heading">
              <h3 id="resize-heading" className="text-lg font-semibold mb-4 text-text-primary flex items-center gap-2">
                <div className="w-3 h-3 bg-gradient-to-r from-info to-info/60 rounded-full"></div>
                Grid Size
              </h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label htmlFor="grid-width" className="block text-xs text-text-secondary mb-1">
                      Width (20-200)
                    </label>
                    <input
                      id="grid-width"
                      type="text"
                      value={gridWidth}
                      onChange={(e) => setGridWidth(e.target.value)}
                      placeholder={grid.width.toString()}
                      className="w-full px-3 py-2 text-sm bg-surface-elevated border border-grid-line/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="grid-height" className="block text-xs text-text-secondary mb-1">
                      Height (20-200)
                    </label>
                    <input
                      id="grid-height"
                      type="text"
                      value={gridHeight}
                      onChange={(e) => setGridHeight(e.target.value)}
                      placeholder={grid.height.toString()}
                      className="w-full px-3 py-2 text-sm bg-surface-elevated border border-grid-line/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                    />
                  </div>
                </div>
                <button
                  onClick={handleGridResize}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                  aria-label="Resize grid to specified dimensions"
                >
                  <Settings size={16} />
                  Resize Grid
                </button>
              </div>
            </div>
          </section>
        </main>

        <section className="mt-12 animate-slide-in-from-bottom" aria-labelledby="patterns-heading">
          <div className="card-elevated p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-gradient-to-r from-cell-alive to-primary-400 rounded-full animate-pulse"></div>
                <h2 id="patterns-heading" className="text-2xl font-bold text-text-primary">
                  Pattern Library
                </h2>
                <div className="w-4 h-4 bg-gradient-to-r from-primary-400 to-cell-alive rounded-full animate-pulse"></div>
              </div>
            </div>
            <PatternLibrary
              onPatternSelect={handlePatternSelect}
              grid={grid.current}
              gridWidth={grid.width}
              gridHeight={grid.height}
              rule={rule.notation}
              generation={grid.generation}
              canvasRef={canvasRef}
            />
          </div>
        </section>
      </div>

      {/* Performance monitoring indicator (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          className="fixed bottom-6 right-6 card p-4 text-xs backdrop-blur-md border border-grid-line/50 animate-fade-in"
          aria-hidden="true"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <div className="text-text-primary font-semibold">Performance</div>
          </div>
          <div className="space-y-1 text-text-secondary">
            <div className="flex justify-between gap-4">
              <span>FPS:</span>
              <span className="font-mono text-success font-semibold">
                {Math.round(performanceProfiler.generateReport().fps.current)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Memory:</span>
              <span className="font-mono text-info font-semibold">
                {Math.round(performanceProfiler.generateReport().memory.current.usedJSHeapSize / 1024 / 1024)}MB
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App
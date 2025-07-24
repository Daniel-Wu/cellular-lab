import { useAppStore } from './stores'
import { Play, Pause, SkipForward, RotateCcw, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { GridContainer } from './components/Grid'
import { PatternLibrary } from './components/PatternLibrary'
import { Pattern } from './types'
import { useRef, useEffect, useCallback } from 'react'
import { useAccessibility } from './hooks/useAccessibility'
import { performanceProfiler } from './utils/PerformanceProfiler'
import { errorHandler, handleError, createError, ErrorSeverity } from './utils/ErrorHandler'

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<HTMLDivElement>(null);

  const { 
    grid, 
    simulation, 
    rule,
    startSimulation,
    stopSimulation,
    stepSimulation,
    clearGrid,
    centerPattern,
    setPatternPlacementMode
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

  const handleKeyboardShortcuts = useCallback(() => {
    showKeyboardShortcuts();
  }, [showKeyboardShortcuts]);

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
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-cell-alive mb-2">
            CellularLab
          </h1>
          <p className="text-text-secondary">
            Interactive Cellular Automata Explorer
          </p>
          <div className="sr-only">
            Current rule: {rule.notation}. Grid size: {grid.width} by {grid.height}. 
            Generation: {grid.generation}. 
            Press Ctrl+H for keyboard shortcuts.
          </div>
        </header>

        <main role="main" className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <section className="lg:col-span-3" aria-labelledby="grid-heading">
            <div className="bg-surface rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 id="grid-heading" className="text-xl font-semibold">
                  Grid ({grid.width}×{grid.height})
                </h2>
                <div 
                  className="text-text-secondary"
                  data-testid="generation"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  Generation: {grid.generation}
                </div>
              </div>
              
              <GridContainer 
                showPerformanceMetrics={true} 
                canvasRef={canvasRef}
                aria-label={`Cellular automata grid, ${grid.width} by ${grid.height} cells, generation ${grid.generation}`}
              />
            </div>
          </section>

          <aside className="space-y-6" aria-label="Simulation controls and information">
            <section className="bg-surface rounded-lg p-6" aria-labelledby="controls-heading">
              <h3 id="controls-heading" className="text-lg font-semibold mb-4">
                Simulation Controls
              </h3>
              
              <div className="grid grid-cols-2 gap-2 mb-4" role="group" aria-label="Simulation actions">
                <button
                  onClick={handlePlayPause}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-light hover:bg-opacity-80 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-cell-alive focus:ring-offset-2"
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
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-medium hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-cell-alive focus:ring-offset-2"
                  aria-label="Step simulation forward one generation"
                  aria-describedby={simulation.isRunning ? 'step-disabled-help' : undefined}
                  data-testid="step-button"
                >
                  <SkipForward size={16} />
                  Step
                </button>
                {simulation.isRunning && (
                  <div id="step-disabled-help" className="sr-only">
                    Step button is disabled while simulation is running
                  </div>
                )}
              </div>

              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-warning hover:bg-opacity-80 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-warning focus:ring-offset-2"
                aria-label="Reset grid to empty state"
                data-testid="reset-button"
              >
                <RotateCcw size={16} />
                Reset
              </button>
            </section>

            <section className="bg-surface rounded-lg p-6" aria-labelledby="rule-heading">
              <h3 id="rule-heading" className="text-lg font-semibold mb-4">
                Current Rule
              </h3>
              <div className="text-center">
                <div 
                  className="text-2xl font-mono text-cell-alive mb-2"
                  aria-label={`Rule notation: ${rule.notation}`}
                >
                  {rule.notation}
                </div>
                <div className="text-sm text-text-secondary">
                  Conway's Game of Life
                </div>
              </div>
            </section>

            <section className="bg-surface rounded-lg p-6" aria-labelledby="speed-heading">
              <h3 id="speed-heading" className="text-lg font-semibold mb-4">
                Simulation Speed
              </h3>
              <div 
                className="text-center text-text-secondary"
                aria-label={`${simulation.speed} milliseconds per generation`}
              >
                {simulation.speed}ms per generation
              </div>
            </section>

            <section className="bg-surface rounded-lg p-6" aria-labelledby="help-heading">
              <h3 id="help-heading" className="text-lg font-semibold mb-4">
                Help
              </h3>
              <button
                onClick={handleKeyboardShortcuts}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-secondary hover:bg-opacity-80 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-cell-alive focus:ring-offset-2"
                aria-label="Show keyboard shortcuts"
              >
                <Info size={16} />
                Keyboard Shortcuts
              </button>
            </section>
          </aside>
        </main>

        <section className="mt-8" aria-labelledby="patterns-heading">
          <div className="bg-surface rounded-lg p-6">
            <h2 id="patterns-heading" className="sr-only">
              Pattern Library
            </h2>
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
          className="fixed bottom-4 right-4 bg-surface p-2 rounded-lg text-xs opacity-75"
          aria-hidden="true"
        >
          <div>FPS: {Math.round(performanceProfiler.generateReport().fps.current)}</div>
          <div>Memory: {Math.round(performanceProfiler.generateReport().memory.current.usedJSHeapSize / 1024 / 1024)}MB</div>
        </div>
      )}
    </div>
  );
}

export default App
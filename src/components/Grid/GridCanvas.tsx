import { useRef, useEffect, useCallback, memo } from 'react';
import { GridRenderer } from '../../engines/GridRenderer';
import { InteractionHandler } from '../../utils/InteractionHandler';
import { PerformanceMonitor, PerformanceMetrics } from '../../utils/PerformanceMonitor';
import { useAppStore } from '../../stores';

interface GridCanvasProps {
  width?: number;
  height?: number;
  className?: string;
  onPerformanceUpdate?: (metrics: PerformanceMetrics) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement> | undefined;
}

export const GridCanvas = memo<GridCanvasProps>(({ 
  width = 400, 
  height = 400, 
  className = '',
  onPerformanceUpdate,
  canvasRef: externalCanvasRef
}) => {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalCanvasRef || internalCanvasRef;
  const rendererRef = useRef<GridRenderer | null>(null);
  const interactionHandlerRef = useRef<InteractionHandler | null>(null);
  const performanceMonitorRef = useRef<PerformanceMonitor | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const { 
    grid, 
    ui,
    setCell, 
    setIsDrawing, 
    setLastDrawnCell 
  } = useAppStore();

  const handlePerformanceWarning = useCallback((message: string, metrics: PerformanceMetrics) => {
    console.warn(`GridCanvas Performance Warning: ${message}`, metrics);
    onPerformanceUpdate?.(metrics);
  }, [onPerformanceUpdate]);

  const setupRenderer = useCallback(() => {
    if (!canvasRef.current) return;

    try {
      rendererRef.current = new GridRenderer(canvasRef.current);
      performanceMonitorRef.current = new PerformanceMonitor(handlePerformanceWarning);
    } catch (error) {
      console.error('Failed to initialize GridRenderer:', error);
    }
  }, [handlePerformanceWarning]);

  const setupInteractionHandler = useCallback(() => {
    if (!canvasRef.current || !rendererRef.current) return;

    const handleCellChange = (index: number, state: 0 | 1) => {
      setCell(index, state);
    };

    const handleDrawingStateChange = (isDrawing: boolean) => {
      setIsDrawing(isDrawing);
    };

    const handleLastCellChange = (cell: number | null) => {
      setLastDrawnCell(cell);
    };

    const getCurrentGrid = () => grid.current;

    interactionHandlerRef.current = new InteractionHandler(
      canvasRef.current,
      handleCellChange,
      handleDrawingStateChange,
      handleLastCellChange,
      getCurrentGrid
    );
  }, [setCell, setIsDrawing, setLastDrawnCell, grid]);

  const render = useCallback(() => {
    if (!rendererRef.current || !performanceMonitorRef.current) return;

    const startTime = performanceMonitorRef.current.startFrame();
    
    rendererRef.current.render(
      grid.current,
      grid.width,
      grid.height,
      { showGrid: ui.showGrid }
    );

    performanceMonitorRef.current.endFrame(startTime);

    const metrics = performanceMonitorRef.current.getMetrics();
    onPerformanceUpdate?.(metrics);
  }, [grid, ui.showGrid, onPerformanceUpdate]);

  const scheduleRender = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(render);
  }, [render]);

  useEffect(() => {
    setupRenderer();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [setupRenderer]);

  useEffect(() => {
    setupInteractionHandler();
    return () => {
      interactionHandlerRef.current?.destroy();
    };
  }, [setupInteractionHandler]);

  useEffect(() => {
    scheduleRender();
  }, [scheduleRender]);

  useEffect(() => {
    const handleResize = () => {
      rendererRef.current?.resize();
      scheduleRender();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [scheduleRender]);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.dataset.gridWidth = grid.width.toString();
      canvasRef.current.dataset.gridHeight = grid.height.toString();
    }
  }, [grid.width, grid.height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`border border-grid-line cursor-pointer touch-none ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        maxWidth: '100%',
        maxHeight: '100%'
      }}
      aria-label={`Cellular automata grid, ${grid.width} by ${grid.height} cells, generation ${grid.generation}`}
      role="img"
    />
  );
});

GridCanvas.displayName = 'GridCanvas';
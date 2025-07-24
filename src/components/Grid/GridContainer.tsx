import React, { useState, useCallback, useMemo } from 'react';
import { GridCanvas } from './GridCanvas';
import { PerformanceMetrics } from '../../utils/PerformanceMonitor';
import { useAppStore } from '../../stores';

interface GridContainerProps {
  className?: string;
  showPerformanceMetrics?: boolean;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

export const GridContainer: React.FC<GridContainerProps> = ({ 
  className = '',
  showPerformanceMetrics = false,
  canvasRef
}) => {
  const { grid } = useAppStore();
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);

  const handlePerformanceUpdate = useCallback((metrics: PerformanceMetrics) => {
    setPerformanceMetrics(metrics);
  }, []);

  const containerDimensions = useMemo(() => {
    const aspectRatio = grid.width / grid.height;
    const maxSize = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.6, 500);
    
    let width: number;
    let height: number;

    if (aspectRatio > 1) {
      width = maxSize;
      height = maxSize / aspectRatio;
    } else {
      height = maxSize;
      width = maxSize * aspectRatio;
    }

    return {
      width: Math.max(320, Math.min(width, 500)),
      height: Math.max(320, Math.min(height, 500))
    };
  }, [grid.width, grid.height]);

  const performanceGrade = useMemo(() => {
    if (!performanceMetrics) return null;
    
    if (performanceMetrics.fps >= 58 && performanceMetrics.averageFrameTime <= 16.67) {
      return { grade: 'excellent', color: 'text-green-400' };
    }
    if (performanceMetrics.fps >= 50 && performanceMetrics.averageFrameTime <= 25) {
      return { grade: 'good', color: 'text-blue-400' };
    }
    if (performanceMetrics.fps >= 30 && performanceMetrics.averageFrameTime <= 33) {
      return { grade: 'fair', color: 'text-yellow-400' };
    }
    return { grade: 'poor', color: 'text-red-400' };
  }, [performanceMetrics]);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative">
        <GridCanvas
          width={containerDimensions.width}
          height={containerDimensions.height}
          onPerformanceUpdate={handlePerformanceUpdate}
          className="rounded-lg shadow-lg"
          canvasRef={canvasRef}
        />
        
        {showPerformanceMetrics && performanceMetrics && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
            <div className={`font-semibold ${performanceGrade?.color}`}>
              {performanceGrade?.grade.toUpperCase()}
            </div>
            <div>FPS: {performanceMetrics.fps}</div>
            <div>Frame: {performanceMetrics.frameTime.toFixed(1)}ms</div>
            {performanceMetrics.memoryUsage > 0 && (
              <div>Memory: {performanceMetrics.memoryUsage.toFixed(1)}MB</div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 text-center text-sm text-text-secondary">
        <div>
          Grid Size: {grid.width} × {grid.height} cells
        </div>
        <div>
          Generation: {grid.generation}
        </div>
        {performanceMetrics && (
          <div className="mt-1">
            Rendered {performanceMetrics.renderCount} frames
          </div>
        )}
      </div>
    </div>
  );
};
import React, { useMemo } from 'react';
import { GridCanvas } from './GridCanvas';
import { useAppStore } from '../../stores';

interface GridContainerProps {
  className?: string;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

export const GridContainer: React.FC<GridContainerProps> = ({ 
  className = '',
  canvasRef
}) => {
  const { grid } = useAppStore();

  const containerDimensions = useMemo(() => {
    const aspectRatio = grid.width / grid.height;
    const maxSize = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.8, 500);
    
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
      width: Math.max(320, Math.min(width, 1000)),
      height: Math.max(320, Math.min(height, 1000))
    };
  }, [grid.width, grid.height]);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative">
        <GridCanvas
          width={containerDimensions.width}
          height={containerDimensions.height}
          className="rounded-lg shadow-lg"
          canvasRef={canvasRef}
        />
      </div>

      <div className="mt-4 text-center text-sm text-text-secondary">
        <div>
          Grid Size: {grid.width} × {grid.height} cells
        </div>
        <div>
          Generation: {grid.generation}
        </div>
      </div>
    </div>
  );
};
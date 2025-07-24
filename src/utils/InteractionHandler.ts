import { TouchEventData } from '../types';

export class InteractionHandler {
  private isDrawing = false;
  private lastCell: number | null = null;
  private canvas: HTMLCanvasElement;
  private onCellChange: (index: number, state: 0 | 1) => void;
  private onDrawingStateChange: (isDrawing: boolean) => void;
  private onLastCellChange: (cell: number | null) => void;
  private getCurrentGrid: () => Uint8Array;

  constructor(
    canvas: HTMLCanvasElement,
    onCellChange: (index: number, state: 0 | 1) => void,
    onDrawingStateChange: (isDrawing: boolean) => void,
    onLastCellChange: (cell: number | null) => void,
    getCurrentGrid: () => Uint8Array
  ) {
    this.canvas = canvas;
    this.onCellChange = onCellChange;
    this.onDrawingStateChange = onDrawingStateChange;
    this.onLastCellChange = onLastCellChange;
    this.getCurrentGrid = getCurrentGrid;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    this.canvas.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
  }

  private handleMouseDown = (event: MouseEvent): void => {
    event.preventDefault();
    this.startDrawing();
    this.handleCellInteraction(event.clientX, event.clientY);
  };

  private handleMouseMove = (event: MouseEvent): void => {
    if (!this.isDrawing) return;
    event.preventDefault();
    this.handleCellInteraction(event.clientX, event.clientY);
  };

  private handleMouseUp = (_event: MouseEvent): void => {
    this.stopDrawing();
  };

  private handleMouseLeave = (_event: MouseEvent): void => {
    this.stopDrawing();
  };

  private handleTouchStart = (event: TouchEvent): void => {
    event.preventDefault();
    if (event.touches.length !== 1) return;
    
    const touch = event.touches[0];
    if (!touch) return;
    this.startDrawing();
    this.handleCellInteraction(touch.clientX, touch.clientY);
  };

  private handleTouchMove = (event: TouchEvent): void => {
    event.preventDefault();
    if (!this.isDrawing || event.touches.length !== 1) return;
    
    const touch = event.touches[0];
    if (!touch) return;
    this.handleCellInteraction(touch.clientX, touch.clientY);
  };

  private handleTouchEnd = (event: TouchEvent): void => {
    event.preventDefault();
    this.stopDrawing();
  };

  private startDrawing(): void {
    this.isDrawing = true;
    this.onDrawingStateChange(true);
  }

  private stopDrawing(): void {
    this.isDrawing = false;
    this.lastCell = null;
    this.onDrawingStateChange(false);
    this.onLastCellChange(null);
  }

  private handleCellInteraction(clientX: number, clientY: number): void {
    const touchData = this.getTouch(clientX, clientY);
    if (!touchData || touchData.cellIndex === null) return;
    
    if (touchData.cellIndex === this.lastCell) return;
    
    this.lastCell = touchData.cellIndex;
    this.onLastCellChange(touchData.cellIndex);
    
    const grid = this.getCurrentGridState();
    const currentState = grid[touchData.cellIndex] as 0 | 1;
    this.onCellChange(touchData.cellIndex, currentState === 1 ? 0 : 1);
  }

  private getTouch(clientX: number, clientY: number): TouchEventData {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    return {
      x,
      y,
      cellIndex: this.getCellIndex(x, y)
    };
  }

  private getCellIndex(x: number, y: number): number | null {
    const { width, height } = this.getGridDimensions();
    const cellSize = this.getCellSize();
    
    const cellX = Math.floor(x / cellSize);
    const cellY = Math.floor(y / cellSize);
    
    if (cellX >= 0 && cellX < width && cellY >= 0 && cellY < height) {
      return cellY * width + cellX;
    }
    
    return null;
  }

  private getCellSize(): number {
    const { width, height } = this.getGridDimensions();
    const rect = this.canvas.getBoundingClientRect();
    return Math.min(rect.width / width, rect.height / height);
  }

  private getGridDimensions(): { width: number; height: number } {
    const canvas = this.canvas;
    return {
      width: parseInt(canvas.dataset.gridWidth || '50'),
      height: parseInt(canvas.dataset.gridHeight || '50')
    };
  }

  private getCurrentGridState(): Uint8Array {
    return this.getCurrentGrid();
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    this.canvas.removeEventListener('touchcancel', this.handleTouchEnd);
  }
}
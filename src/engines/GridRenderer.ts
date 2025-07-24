export class GridRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private devicePixelRatio: number;
  private lastFrameTime = 0;
  private frameCount = 0;
  private fps = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not supported');
    }
    this.ctx = ctx;
    this.devicePixelRatio = window.devicePixelRatio || 1;
    this.setupCanvas();
  }

  private setupCanvas(): void {
    const { canvas, ctx, devicePixelRatio } = this;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    
    ctx.scale(devicePixelRatio, devicePixelRatio);
    
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    ctx.imageSmoothingEnabled = false;
  }

  resize(): void {
    this.setupCanvas();
  }

  render(
    grid: Uint8Array,
    width: number,
    height: number,
    options: { showGrid: boolean } = { showGrid: false }
  ): void {
    const startTime = performance.now();
    
    const { canvas, ctx } = this;
    const rect = canvas.getBoundingClientRect();
    
    const cellSize = Math.min(
      rect.width / width,
      rect.height / height
    );

    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.fillStyle = '#00d4ff';
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === 1) {
        const x = (i % width) * cellSize;
        const y = Math.floor(i / width) * cellSize;
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }

    if (options.showGrid && width <= 50) {
      this.renderGridLines(width, height, cellSize);
    }

    this.updateFPS(startTime);
  }

  private renderGridLines(width: number, height: number, cellSize: number): void {
    const { ctx } = this;
    
    ctx.strokeStyle = '#333344';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = 0; x <= width; x++) {
      const xPos = x * cellSize;
      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, height * cellSize);
    }

    for (let y = 0; y <= height; y++) {
      const yPos = y * cellSize;
      ctx.moveTo(0, yPos);
      ctx.lineTo(width * cellSize, yPos);
    }

    ctx.stroke();
  }

  private updateFPS(startTime: number): void {
    const endTime = performance.now();
    const frameTime = endTime - startTime;
    
    if (endTime - this.lastFrameTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = endTime;
      
      if (frameTime > 16.67) {
        console.warn(`Slow render: ${frameTime.toFixed(2)}ms (target: <16.67ms)`);
      }
    }
    this.frameCount++;
  }

  getFPS(): number {
    return this.fps;
  }

  getCellSize(width: number, height: number): number {
    const rect = this.canvas.getBoundingClientRect();
    return Math.min(rect.width / width, rect.height / height);
  }

  coordinateToCell(x: number, y: number, width: number, height: number): { x: number; y: number; index: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const cellSize = this.getCellSize(width, height);
    
    const cellX = Math.floor((x - rect.left) / cellSize);
    const cellY = Math.floor((y - rect.top) / cellSize);
    
    if (cellX >= 0 && cellX < width && cellY >= 0 && cellY < height) {
      return {
        x: cellX,
        y: cellY,
        index: cellY * width + cellX
      };
    }
    
    return null;
  }
}
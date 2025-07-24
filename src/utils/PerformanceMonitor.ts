export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  renderCount: number;
  averageFrameTime: number;
}

export class PerformanceMonitor {
  private frameCount = 0;

  private frameTimeSum = 0;
  private renderCount = 0;
  private fps = 0;
  private lastFPSUpdate = 0;
  private frameTimes: number[] = [];
  private readonly maxFrameTimes = 60;
  private readonly targetFrameTime = 16.67;

  private onWarning: ((message: string, metrics: PerformanceMetrics) => void) | undefined;

  constructor(onWarning?: (message: string, metrics: PerformanceMetrics) => void) {
    this.onWarning = onWarning;
  }

  startFrame(): number {
    return performance.now();
  }

  endFrame(startTime: number): void {
    const endTime = performance.now();
    const frameTime = endTime - startTime;
    
    this.frameCount++;
    this.renderCount++;
    this.frameTimeSum += frameTime;
    
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.maxFrameTimes) {
      this.frameTimes.shift();
    }

    if (endTime - this.lastFPSUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFPSUpdate = endTime;
    }

    if (frameTime > this.targetFrameTime) {
      const metrics = this.getMetrics();
      this.onWarning?.(
        `Frame time ${frameTime.toFixed(2)}ms exceeds target ${this.targetFrameTime}ms`,
        metrics
      );
    }
  }

  getMetrics(): PerformanceMetrics {
    const averageFrameTime = this.frameTimeSum / Math.max(this.renderCount, 1);
    
    return {
      fps: this.fps,
      frameTime: this.frameTimes[this.frameTimes.length - 1] || 0,
      memoryUsage: this.getMemoryUsage(),
      renderCount: this.renderCount,
      averageFrameTime
    };
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  }

  reset(): void {
    this.frameCount = 0;
    this.frameTimeSum = 0;
    this.renderCount = 0;
    this.frameTimes = [];
    this.lastFPSUpdate = 0;
  }

  isPerformanceGood(): boolean {
    const metrics = this.getMetrics();
    return metrics.fps >= 55 && metrics.averageFrameTime <= this.targetFrameTime * 1.2;
  }

  getPerformanceGrade(): 'excellent' | 'good' | 'fair' | 'poor' {
    const metrics = this.getMetrics();
    
    if (metrics.fps >= 58 && metrics.averageFrameTime <= this.targetFrameTime) {
      return 'excellent';
    }
    if (metrics.fps >= 50 && metrics.averageFrameTime <= this.targetFrameTime * 1.5) {
      return 'good';
    }
    if (metrics.fps >= 30 && metrics.averageFrameTime <= this.targetFrameTime * 2) {
      return 'fair';
    }
    return 'poor';
  }

  createReportString(): string {
    const metrics = this.getMetrics();
    const grade = this.getPerformanceGrade();
    
    return [
      `Performance: ${grade.toUpperCase()}`,
      `FPS: ${metrics.fps}`,
      `Frame Time: ${metrics.frameTime.toFixed(2)}ms (avg: ${metrics.averageFrameTime.toFixed(2)}ms)`,
      `Memory: ${metrics.memoryUsage.toFixed(1)}MB`,
      `Renders: ${metrics.renderCount}`
    ].join(' | ');
  }
}
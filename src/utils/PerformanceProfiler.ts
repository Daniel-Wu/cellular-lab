import { PerformanceTargets } from '../types';

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface ProfilerOptions {
  enableFPSMonitoring?: boolean;
  enableMemoryTracking?: boolean;
  enableBundleAnalysis?: boolean;
  sampleInterval?: number;
  maxHistorySize?: number;
}

interface PerformanceReport {
  fps: {
    current: number;
    average: number;
    min: number;
    max: number;
    history: number[];
  };
  memory: {
    current: MemoryInfo;
    peak: MemoryInfo;
    leaked: boolean;
    growthRate: number;
    history: MemoryInfo[];
  };
  loadTime: {
    initial: number;
    interactive: number;
    complete: number;
  };
  bundleSize: {
    total: number;
    chunks: Record<string, number>;
    estimated: boolean;
  };
  degradation: {
    detected: boolean;
    severity: 'none' | 'minor' | 'moderate' | 'severe';
    causes: string[];
    recommendations: string[];
  };
  timestamp: Date;
}

interface PerformanceBenchmark {
  name: string;
  target: number;
  current: number;
  status: 'pass' | 'warning' | 'fail';
  impact: 'low' | 'medium' | 'high';
}

class PerformanceProfiler {
  private static instance: PerformanceProfiler;
  private options: Required<ProfilerOptions>;
  private fpsHistory: number[] = [];
  private memoryHistory: MemoryInfo[] = [];
  private rafId: number | null = null;
  private isMonitoring = false;
  private onReportCallback?: (report: PerformanceReport) => void;
  private warningThresholds: PerformanceTargets;

  static getInstance(): PerformanceProfiler {
    if (!PerformanceProfiler.instance) {
      PerformanceProfiler.instance = new PerformanceProfiler();
    }
    return PerformanceProfiler.instance;
  }

  constructor() {
    this.options = {
      enableFPSMonitoring: true,
      enableMemoryTracking: true,
      enableBundleAnalysis: true,
      sampleInterval: 1000,
      maxHistorySize: 60
    };

    this.warningThresholds = {
      frameRate: 60,
      renderTime: 16,
      memoryUsage: 100,
      startupTime: 2000,
      targetFPS: 60,
      maxMemoryMB: 100,
      maxLoadTimeMS: 2000,
      maxBundleSizeMB: 5,
      maxRuleSwitchingMS: 50,
      maxGenerationTimeMS: 16
    };

    this.setupPerformanceObserver();
  }

  setOptions(options: Partial<ProfilerOptions>): void {
    this.options = { ...this.options, ...options };
  }

  setReportCallback(callback: (report: PerformanceReport) => void): void {
    this.onReportCallback = callback;
  }

  setWarningThresholds(thresholds: Partial<PerformanceTargets>): void {
    this.warningThresholds = { ...this.warningThresholds, ...thresholds };
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    if (this.options.enableFPSMonitoring) {
      this.startFPSMonitoring();
    }
    
    if (this.options.enableMemoryTracking) {
      this.startMemoryTracking();
    }
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private startFPSMonitoring(): void {
    let lastTime = performance.now();
    let frameCount = 0;
    let lastFPSUpdate = lastTime;

    const tick = (currentTime: number) => {
      if (!this.isMonitoring) return;

      frameCount++;
      const delta = currentTime - lastFPSUpdate;

      if (delta >= 1000) { // Update FPS every second
        const fps = Math.round((frameCount * 1000) / delta);
        this.recordFPS(fps);
        
        frameCount = 0;
        lastFPSUpdate = currentTime;
      }

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  private startMemoryTracking(): void {
    const trackMemory = () => {
      if (!this.isMonitoring) return;

      const memoryInfo = this.getMemoryInfo();
      if (memoryInfo) {
        this.recordMemory(memoryInfo);
      }

      setTimeout(trackMemory, this.options.sampleInterval);
    };

    trackMemory();
  }

  private recordFPS(fps: number): void {
    this.fpsHistory.push(fps);
    
    if (this.fpsHistory.length > this.options.maxHistorySize) {
      this.fpsHistory.shift();
    }

    if (fps < this.warningThresholds.targetFPS * 0.8) {
      this.detectPerformanceDegradation();
    }
  }

  private recordMemory(memory: MemoryInfo): void {
    this.memoryHistory.push(memory);
    
    if (this.memoryHistory.length > this.options.maxHistorySize) {
      this.memoryHistory.shift();
    }

    const memoryMB = memory.usedJSHeapSize / 1024 / 1024;
    if (memoryMB > this.warningThresholds.maxMemoryMB) {
      this.detectMemoryLeak();
    }
  }

  private getMemoryInfo(): MemoryInfo | null {
    // @ts-ignore - performance.memory is not in standard TypeScript definitions
    const memory = (performance as any).memory;
    
    if (!memory) return null;

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit
    };
  }

  private detectPerformanceDegradation(): void {
    const recentFPS = this.fpsHistory.slice(-10);
    const averageFPS = recentFPS.reduce((sum, fps) => sum + fps, 0) / recentFPS.length;
    
    if (averageFPS < this.warningThresholds.targetFPS * 0.6) {
      console.warn(`[PerformanceProfiler] Severe FPS degradation detected: ${averageFPS}fps`);
      this.triggerDegradationWarning('severe', 'Low FPS detected');
    } else if (averageFPS < this.warningThresholds.targetFPS * 0.8) {
      console.warn(`[PerformanceProfiler] Moderate FPS degradation detected: ${averageFPS}fps`);
      this.triggerDegradationWarning('moderate', 'FPS below target');
    }
  }

  private detectMemoryLeak(): void {
    if (this.memoryHistory.length < 10) return;

    const recent = this.memoryHistory.slice(-10);
    const growthRate = this.calculateMemoryGrowthRate(recent);
    
    if (growthRate > 5) { // 5MB/minute growth rate
      console.warn(`[PerformanceProfiler] Potential memory leak detected: ${growthRate}MB/min growth`);
      this.triggerDegradationWarning('moderate', 'Memory usage growing rapidly');
    }
  }

  private calculateMemoryGrowthRate(samples: MemoryInfo[]): number {
    if (samples.length < 2) return 0;

    const firstSample = samples[0];
    const lastSample = samples[samples.length - 1];
    
    if (!firstSample || !lastSample) return 0;

    const first = firstSample.usedJSHeapSize / 1024 / 1024;
    const last = lastSample.usedJSHeapSize / 1024 / 1024;
    const timeSpan = (samples.length - 1) * (this.options.sampleInterval / 1000 / 60); // minutes

    return (last - first) / timeSpan;
  }

  private triggerDegradationWarning(severity: 'minor' | 'moderate' | 'severe', cause: string): void {
    const report = this.generateReport();
    report.degradation.detected = true;
    report.degradation.severity = severity;
    report.degradation.causes.push(cause);
    
    if (this.onReportCallback) {
      this.onReportCallback(report);
    }
  }

  measureOperationTime<T>(operation: () => T, operationName: string): T {
    const startTime = performance.now();
    const result = operation();
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`[PerformanceProfiler] ${operationName}: ${duration.toFixed(2)}ms`);

    if (operationName.includes('rule switching') && duration > this.warningThresholds.maxRuleSwitchingMS) {
      console.warn(`[PerformanceProfiler] Slow rule switching: ${duration.toFixed(2)}ms`);
    }

    if (operationName.includes('generation') && duration > this.warningThresholds.maxGenerationTimeMS) {
      console.warn(`[PerformanceProfiler] Slow generation computation: ${duration.toFixed(2)}ms`);
    }

    return result;
  }

  async measureAsyncOperation<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`[PerformanceProfiler] ${operationName}: ${duration.toFixed(2)}ms`);
    return result;
  }

  generateReport(): PerformanceReport {
    const currentMemory = this.getMemoryInfo() || {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0
    };

    const fps = this.calculateFPSMetrics();
    const memory = this.calculateMemoryMetrics(currentMemory);
    const loadTime = this.getLoadTimeMetrics();
    const bundleSize = this.estimateBundleSize();

    return {
      fps,
      memory,
      loadTime,
      bundleSize,
      degradation: {
        detected: false,
        severity: 'none',
        causes: [],
        recommendations: this.generateRecommendations(fps, memory)
      },
      timestamp: new Date()
    };
  }

  private calculateFPSMetrics() {
    if (this.fpsHistory.length === 0) {
      return {
        current: 0,
        average: 0,
        min: 0,
        max: 0,
        history: []
      };
    }

    const current = this.fpsHistory[this.fpsHistory.length - 1] || 0;
    const average = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
    const min = Math.min(...this.fpsHistory);
    const max = Math.max(...this.fpsHistory);

    return {
      current,
      average: Math.round(average),
      min,
      max,
      history: [...this.fpsHistory]
    };
  }

  private calculateMemoryMetrics(currentMemory: MemoryInfo) {
    const peak = this.memoryHistory.reduce((max, current) => {
      return current.usedJSHeapSize > max.usedJSHeapSize ? current : max;
    }, currentMemory);

    const growthRate = this.memoryHistory.length > 1 ? 
      this.calculateMemoryGrowthRate(this.memoryHistory) : 0;

    const leaked = growthRate > 2; // 2MB/min threshold

    return {
      current: currentMemory,
      peak,
      leaked,
      growthRate,
      history: [...this.memoryHistory]
    };
  }

  private getLoadTimeMetrics() {
    try {
      const navigationEntries = performance.getEntriesByType ? performance.getEntriesByType('navigation') : [];
      const navigation = navigationEntries[0] as PerformanceNavigationTiming;
      
      if (!navigation) {
        return {
          initial: 0,
          interactive: 0,
          complete: 0
        };
      }

      return {
        initial: navigation.loadEventEnd - navigation.fetchStart,
        interactive: navigation.domInteractive - navigation.fetchStart,
        complete: navigation.loadEventEnd - navigation.fetchStart
      };
    } catch (error) {
      return {
        initial: 0,
        interactive: 0,
        complete: 0
      };
    }
  }

  private estimateBundleSize() {
    const resources = performance.getEntriesByType('resource');
    let totalSize = 0;
    const chunks: Record<string, number> = {};

    resources.forEach(resource => {
      if (resource.name.includes('.js') || resource.name.includes('.css')) {
        const size = (resource as any).transferSize || (resource as any).encodedBodySize || 0;
        totalSize += size;
        
        const filename = resource.name.split('/').pop() || 'unknown';
        chunks[filename] = size;
      }
    });

    return {
      total: totalSize,
      chunks,
      estimated: true
    };
  }

  private generateRecommendations(fps: any, memory: any): string[] {
    const recommendations: string[] = [];

    if (fps.average < this.warningThresholds.targetFPS * 0.8) {
      recommendations.push('Consider reducing grid size for better performance');
      recommendations.push('Enable performance mode in settings');
    }

    if (memory.current.usedJSHeapSize / 1024 / 1024 > this.warningThresholds.maxMemoryMB) {
      recommendations.push('Clear grid history to free memory');
      recommendations.push('Avoid running simulations for extended periods');
    }

    if (memory.leaked) {
      recommendations.push('Refresh the page to clear memory leaks');
      recommendations.push('Report persistent memory issues');
    }

    return recommendations;
  }

  runBenchmarks(): PerformanceBenchmark[] {
    const benchmarks: PerformanceBenchmark[] = [];
    const report = this.generateReport();

    // FPS Benchmark
    benchmarks.push({
      name: 'Average FPS',
      target: this.warningThresholds.targetFPS,
      current: report.fps.average,
      status: report.fps.average >= this.warningThresholds.targetFPS ? 'pass' :
              report.fps.average >= this.warningThresholds.targetFPS * 0.8 ? 'warning' : 'fail',
      impact: 'high'
    });

    // Memory Benchmark
    const memoryMB = report.memory.current.usedJSHeapSize / 1024 / 1024;
    benchmarks.push({
      name: 'Memory Usage (MB)',
      target: this.warningThresholds.maxMemoryMB,
      current: Math.round(memoryMB),
      status: memoryMB <= this.warningThresholds.maxMemoryMB ? 'pass' :
              memoryMB <= this.warningThresholds.maxMemoryMB * 1.2 ? 'warning' : 'fail',
      impact: 'medium'
    });

    // Load Time Benchmark
    benchmarks.push({
      name: 'Initial Load Time (ms)',
      target: this.warningThresholds.maxLoadTimeMS,
      current: Math.round(report.loadTime.initial),
      status: report.loadTime.initial <= this.warningThresholds.maxLoadTimeMS ? 'pass' :
              report.loadTime.initial <= this.warningThresholds.maxLoadTimeMS * 1.2 ? 'warning' : 'fail',
      impact: 'medium'
    });

    // Bundle Size Benchmark
    const bundleSizeMB = report.bundleSize.total / 1024 / 1024;
    benchmarks.push({
      name: 'Bundle Size (MB)',
      target: this.warningThresholds.maxBundleSizeMB,
      current: Math.round(bundleSizeMB * 100) / 100,
      status: bundleSizeMB <= this.warningThresholds.maxBundleSizeMB ? 'pass' :
              bundleSizeMB <= this.warningThresholds.maxBundleSizeMB * 1.1 ? 'warning' : 'fail',
      impact: 'low'
    });

    return benchmarks;
  }

  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'measure') {
              console.log(`[PerformanceProfiler] ${entry.name}: ${entry.duration.toFixed(2)}ms`);
            }
          });
        });

        observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
      } catch (e) {
        console.warn('[PerformanceProfiler] PerformanceObserver not fully supported');
      }
    }
  }

  markStart(name: string): void {
    performance.mark(`${name}-start`);
  }

  markEnd(name: string): void {
    performance.mark(`${name}-end`);
    try {
      performance.measure(name, `${name}-start`, `${name}-end`);
    } catch (e) {
      console.warn(`[PerformanceProfiler] Failed to measure ${name}`);
    }
  }

  clearMarks(name?: string): void {
    if (name) {
      performance.clearMarks(`${name}-start`);
      performance.clearMarks(`${name}-end`);
      performance.clearMeasures(name);
    } else {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }

  getDetailedReport(): string {
    const report = this.generateReport();
    const benchmarks = this.runBenchmarks();
    
    return `
# Performance Report - ${report.timestamp.toLocaleString()}

## FPS Metrics
- Current: ${report.fps.current} fps
- Average: ${report.fps.average} fps
- Min: ${report.fps.min} fps
- Max: ${report.fps.max} fps

## Memory Usage
- Current: ${Math.round(report.memory.current.usedJSHeapSize / 1024 / 1024)}MB
- Peak: ${Math.round(report.memory.peak.usedJSHeapSize / 1024 / 1024)}MB
- Growth Rate: ${report.memory.growthRate.toFixed(2)}MB/min
- Memory Leak: ${report.memory.leaked ? 'Detected' : 'None'}

## Load Performance
- Initial Load: ${Math.round(report.loadTime.initial)}ms
- Interactive: ${Math.round(report.loadTime.interactive)}ms
- Complete: ${Math.round(report.loadTime.complete)}ms

## Bundle Analysis
- Total Size: ${Math.round(report.bundleSize.total / 1024 / 1024 * 100) / 100}MB
- Main Chunks: ${Object.entries(report.bundleSize.chunks).map(([name, size]) => 
  `${name}: ${Math.round(size / 1024)}KB`).join(', ')}

## Benchmarks
${benchmarks.map(b => `- ${b.name}: ${b.current}/${b.target} - ${b.status.toUpperCase()}`).join('\n')}

## Recommendations
${report.degradation.recommendations.map(r => `- ${r}`).join('\n')}
`;
  }
}

export const performanceProfiler = PerformanceProfiler.getInstance();
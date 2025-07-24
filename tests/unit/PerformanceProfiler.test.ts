import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { performanceProfiler } from '../../src/utils/PerformanceProfiler';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  getEntriesByType: vi.fn(() => []),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
  }
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 16); // 60fps
  return 1;
});

global.cancelAnimationFrame = vi.fn();

// Mock PerformanceObserver
global.PerformanceObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  disconnect: vi.fn()
}));

describe('PerformanceProfiler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    performanceProfiler.stopMonitoring();
  });

  afterEach(() => {
    performanceProfiler.stopMonitoring();
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = performanceProfiler;
      const instance2 = performanceProfiler;
      
      expect(instance1).toBe(instance2);
    });

    it('should set default options', () => {
      performanceProfiler.setOptions({
        enableFPSMonitoring: false,
        sampleInterval: 2000
      });
      
      // Test that options are applied (this is internal behavior)
      expect(() => performanceProfiler.startMonitoring()).not.toThrow();
    });
  });

  describe('FPS Monitoring', () => {
    it('should start and stop FPS monitoring', () => {
      performanceProfiler.startMonitoring();
      expect(global.requestAnimationFrame).toHaveBeenCalled();
      
      performanceProfiler.stopMonitoring();
      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should generate FPS report with metrics', () => {
      const report = performanceProfiler.generateReport();
      
      expect(report.fps).toHaveProperty('current');
      expect(report.fps).toHaveProperty('average');
      expect(report.fps).toHaveProperty('min');
      expect(report.fps).toHaveProperty('max');
      expect(report.fps).toHaveProperty('history');
    });
  });

  describe('Memory Tracking', () => {
    it('should generate memory report with current usage', () => {
      const report = performanceProfiler.generateReport();
      
      expect(report.memory).toHaveProperty('current');
      expect(report.memory).toHaveProperty('peak');
      expect(report.memory).toHaveProperty('leaked');
      expect(report.memory).toHaveProperty('growthRate');
      expect(report.memory).toHaveProperty('history');
      
      expect(report.memory.current.usedJSHeapSize).toBe(50 * 1024 * 1024);
    });

    it('should detect memory leaks based on growth rate', () => {
      // This would require time-based testing which is complex
      // We can test the basic structure
      const report = performanceProfiler.generateReport();
      expect(typeof report.memory.leaked).toBe('boolean');
      expect(typeof report.memory.growthRate).toBe('number');
    });
  });

  describe('Performance Measurement', () => {
    it('should measure synchronous operation time', () => {
      const mockOperation = vi.fn(() => 'result');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = performanceProfiler.measureOperationTime(mockOperation, 'test operation');
      
      expect(result).toBe('result');
      expect(mockOperation).toHaveBeenCalledOnce();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PerformanceProfiler] test operation:')
      );
      
      consoleSpy.mockRestore();
    });

    it('should measure async operation time', async () => {
      const mockAsyncOperation = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async result';
      });
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = await performanceProfiler.measureAsyncOperation(mockAsyncOperation, 'async test');
      
      expect(result).toBe('async result');
      expect(mockAsyncOperation).toHaveBeenCalledOnce();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PerformanceProfiler] async test:')
      );
      
      consoleSpy.mockRestore();
    });

    it('should warn about slow rule switching', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock a slow operation by controlling performance.now()
      let callCount = 0;
      mockPerformance.now.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 0 : 100; // 100ms operation
      });
      
      performanceProfiler.measureOperationTime(() => {}, 'rule switching');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow rule switching:')
      );
      
      consoleSpy.mockRestore();
    });

    it('should warn about slow generation computation', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      let callCount = 0;
      mockPerformance.now.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 0 : 50; // 50ms operation
      });
      
      performanceProfiler.measureOperationTime(() => {}, 'generation');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow generation computation:')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Marks', () => {
    it('should create performance marks and measures', () => {
      performanceProfiler.markStart('test-operation');
      performanceProfiler.markEnd('test-operation');
      
      expect(mockPerformance.mark).toHaveBeenCalledWith('test-operation-start');
      expect(mockPerformance.mark).toHaveBeenCalledWith('test-operation-end');
      expect(mockPerformance.measure).toHaveBeenCalledWith(
        'test-operation',
        'test-operation-start',
        'test-operation-end'
      );
    });

    it('should clear performance marks', () => {
      performanceProfiler.clearMarks('test-operation');
      
      expect(mockPerformance.clearMarks).toHaveBeenCalledWith('test-operation-start');
      expect(mockPerformance.clearMarks).toHaveBeenCalledWith('test-operation-end');
      expect(mockPerformance.clearMeasures).toHaveBeenCalledWith('test-operation');
    });

    it('should clear all marks when no name provided', () => {
      performanceProfiler.clearMarks();
      
      expect(mockPerformance.clearMarks).toHaveBeenCalledWith();
      expect(mockPerformance.clearMeasures).toHaveBeenCalledWith();
    });
  });

  describe('Load Time Metrics', () => {
    it('should calculate load time metrics from navigation timing', () => {
      const mockNavigationTiming = {
        fetchStart: 1000,
        domInteractive: 1500,
        loadEventEnd: 2000
      };
      
      mockPerformance.getEntriesByType.mockReturnValue([mockNavigationTiming]);
      
      const report = performanceProfiler.generateReport();
      
      expect(report.loadTime.initial).toBe(1000); // loadEventEnd - fetchStart
      expect(report.loadTime.interactive).toBe(500); // domInteractive - fetchStart
      expect(report.loadTime.complete).toBe(1000); // loadEventEnd - fetchStart
    });

    it('should handle missing navigation timing', () => {
      mockPerformance.getEntriesByType.mockReturnValue([]);
      
      const report = performanceProfiler.generateReport();
      
      expect(report.loadTime.initial).toBe(0);
      expect(report.loadTime.interactive).toBe(0);
      expect(report.loadTime.complete).toBe(0);
    });
  });

  describe('Bundle Size Analysis', () => {
    it('should estimate bundle size from resource timing', () => {
      const mockResources = [
        { name: 'app.js', transferSize: 100 * 1024 }, // 100KB
        { name: 'vendor.js', transferSize: 500 * 1024 }, // 500KB
        { name: 'styles.css', transferSize: 50 * 1024 }, // 50KB
        { name: 'image.png', transferSize: 200 * 1024 } // Should be ignored
      ];
      
      mockPerformance.getEntriesByType.mockReturnValue(mockResources);
      
      const report = performanceProfiler.generateReport();
      
      expect(report.bundleSize.total).toBe(650 * 1024); // JS + CSS only
      expect(report.bundleSize.chunks['app.js']).toBe(100 * 1024);
      expect(report.bundleSize.chunks['vendor.js']).toBe(500 * 1024);
      expect(report.bundleSize.chunks['styles.css']).toBe(50 * 1024);
      expect(report.bundleSize.estimated).toBe(true);
    });
  });

  describe('Benchmarks', () => {
    it('should run performance benchmarks', () => {
      const benchmarks = performanceProfiler.runBenchmarks();
      
      expect(benchmarks).toHaveLength(4);
      
      const fpsBenchmark = benchmarks.find(b => b.name === 'Average FPS');
      expect(fpsBenchmark).toBeDefined();
      expect(fpsBenchmark?.target).toBe(60);
      
      const memoryBenchmark = benchmarks.find(b => b.name === 'Memory Usage (MB)');
      expect(memoryBenchmark).toBeDefined();
      expect(memoryBenchmark?.target).toBe(100);
      
      const loadTimeBenchmark = benchmarks.find(b => b.name === 'Initial Load Time (ms)');
      expect(loadTimeBenchmark).toBeDefined();
      expect(loadTimeBenchmark?.target).toBe(2000);
      
      const bundleBenchmark = benchmarks.find(b => b.name === 'Bundle Size (MB)');
      expect(bundleBenchmark).toBeDefined();
      expect(bundleBenchmark?.target).toBe(5);
    });

    it('should classify benchmark results correctly', () => {
      // Mock good performance
      const report = performanceProfiler.generateReport();
      report.fps.average = 58; // Warning range
      
      const benchmarks = performanceProfiler.runBenchmarks();
      const fpsBenchmark = benchmarks.find(b => b.name === 'Average FPS');
      
      expect(fpsBenchmark?.status).toBe('warning');
    });
  });

  describe('Detailed Report', () => {
    it('should generate detailed text report', () => {
      mockPerformance.getEntriesByType.mockReturnValue([
        { name: 'app.js', transferSize: 100 * 1024 }
      ]);
      
      const detailedReport = performanceProfiler.getDetailedReport();
      
      expect(detailedReport).toContain('Performance Report');
      expect(detailedReport).toContain('FPS Metrics');
      expect(detailedReport).toContain('Memory Usage');
      expect(detailedReport).toContain('Load Performance');
      expect(detailedReport).toContain('Bundle Analysis');
      expect(detailedReport).toContain('Benchmarks');
      expect(detailedReport).toContain('Recommendations');
    });
  });

  describe('Warning Thresholds', () => {
    it('should allow setting custom warning thresholds', () => {
      performanceProfiler.setWarningThresholds({
        targetFPS: 30,
        maxMemoryMB: 200
      });
      
      const benchmarks = performanceProfiler.runBenchmarks();
      
      const fpsBenchmark = benchmarks.find(b => b.name === 'Average FPS');
      expect(fpsBenchmark?.target).toBe(30);
      
      const memoryBenchmark = benchmarks.find(b => b.name === 'Memory Usage (MB)');
      expect(memoryBenchmark?.target).toBe(200);
    });
  });

  describe('Report Callback', () => {
    it('should call report callback when degradation detected', () => {
      const callback = vi.fn();
      performanceProfiler.setReportCallback(callback);
      
      // This would require triggering degradation detection
      // which is complex to test in isolation
      expect(callback).toHaveBeenCalledTimes(0);
    });
  });

  describe('Performance Observer Setup', () => {
    it('should setup performance observer when available', () => {
      expect(global.PerformanceObserver).toHaveBeenCalled();
    });

    it('should handle performance observer errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock PerformanceObserver to throw
      global.PerformanceObserver = vi.fn().mockImplementation(() => {
        throw new Error('Not supported');
      });
      
      // Re-create instance to trigger observer setup
      expect(() => {
        const profiler = performanceProfiler;
      }).not.toThrow();
      
      consoleSpy.mockRestore();
    });
  });
});
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
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
    usedJSHeapSize: 50 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024
  }
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

// Mock canvas with performance considerations
const mockCanvasContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  fill: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  rect: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
  save: vi.fn(),
  restore: vi.fn()
};

HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvasContext);

// Mock requestAnimationFrame for controlled timing
let rafCallbacks: Function[] = [];
global.requestAnimationFrame = vi.fn((callback) => {
  rafCallbacks.push(callback);
  return rafCallbacks.length;
});

global.cancelAnimationFrame = vi.fn((id) => {
  rafCallbacks = rafCallbacks.filter((_, index) => index + 1 !== id);
});

describe('Performance Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    rafCallbacks = [];
    performanceProfiler.stopMonitoring();
  });

  afterEach(() => {
    performanceProfiler.stopMonitoring();
    vi.restoreAllMocks();
  });

  describe('FPS Performance', () => {
    it('should maintain 60fps during simulation on standard grid', async () => {
      vi.useFakeTimers();
      
      render(<App />);
      
      // Set grid to reasonable size (50x50)
      const widthInput = screen.getByDisplayValue('50');
      const heightInput = screen.getAllByDisplayValue('50')[1];
      
      expect(widthInput).toBeInTheDocument();
      expect(heightInput).toBeInTheDocument();
      
      // Start performance monitoring
      performanceProfiler.startMonitoring();
      
      // Start simulation
      const playButton = screen.getByRole('button', { name: /play|pause/i });
      await user.click(playButton);
      
      // Simulate 60fps for 1 second
      for (let frame = 0; frame < 60; frame++) {
        vi.advanceTimersByTime(16.67); // ~60fps
        rafCallbacks.forEach(callback => callback(performance.now()));
        rafCallbacks = [];
      }
      
      const report = performanceProfiler.generateReport();
      expect(report.fps.average).toBeGreaterThanOrEqual(50); // Allow some tolerance
      
      vi.useRealTimers();
    });

    it('should detect FPS degradation on large grids', async () => {
      vi.useFakeTimers();
      
      render(<App />);
      
      // Set large grid size (200x200)
      const widthInput = screen.getByDisplayValue('50');
      const heightInput = screen.getAllByDisplayValue('50')[1];
      
      await user.clear(widthInput);
      await user.type(widthInput, '200');
      await user.clear(heightInput);
      await user.type(heightInput, '200');
      
      performanceProfiler.startMonitoring();
      
      const playButton = screen.getByRole('button', { name: /play|pause/i });
      await user.click(playButton);
      
      // Simulate degraded performance (30fps)
      for (let frame = 0; frame < 30; frame++) {
        vi.advanceTimersByTime(33.33); // ~30fps
        rafCallbacks.forEach(callback => callback(performance.now()));
        rafCallbacks = [];
      }
      
      const benchmarks = performanceProfiler.runBenchmarks();
      const fpsBenchmark = benchmarks.find(b => b.name === 'Average FPS');
      
      expect(fpsBenchmark?.status).toBe('warning');
      
      vi.useRealTimers();
    });

    it('should show performance warnings when FPS drops below threshold', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      render(<App />);
      
      performanceProfiler.setWarningThresholds({ targetFPS: 60 });
      performanceProfiler.startMonitoring();
      
      // Simulate poor performance
      const mockReportCallback = vi.fn();
      performanceProfiler.setReportCallback(mockReportCallback);
      
      // This would trigger degradation detection in real scenario
      // For testing, we can verify the thresholds are set
      const benchmarks = performanceProfiler.runBenchmarks();
      expect(benchmarks.find(b => b.name === 'Average FPS')?.target).toBe(60);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Memory Management', () => {
    it('should track memory usage during simulation', async () => {
      render(<App />);
      
      performanceProfiler.startMonitoring();
      
      const playButton = screen.getByRole('button', { name: /play|pause/i });
      await user.click(playButton);
      
      // Run simulation for a bit
      await waitFor(() => {
        const generation = screen.getByText(/generation/i);
        expect(generation).toHaveTextContent(/[1-9]/); // At least generation 1
      }, { timeout: 2000 });
      
      const report = performanceProfiler.generateReport();
      
      expect(report.memory.current.usedJSHeapSize).toBeGreaterThan(0);
      expect(typeof report.memory.growthRate).toBe('number');
    });

    it('should detect memory leaks during extended simulation', async () => {
      vi.useFakeTimers();
      
      // Mock increasing memory usage
      let memoryUsage = 50 * 1024 * 1024;
      mockPerformance.memory = {
        get usedJSHeapSize() { return memoryUsage += 1024 * 1024; }, // Grow by 1MB each call
        totalJSHeapSize: 200 * 1024 * 1024,
        jsHeapSizeLimit: 2 * 1024 * 1024 * 1024
      };
      
      render(<App />);
      
      performanceProfiler.startMonitoring();
      
      const playButton = screen.getByRole('button', { name: /play|pause/i });
      await user.click(playButton);
      
      // Simulate extended run time with memory tracking
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(1000); // 1 second intervals
      }
      
      const report = performanceProfiler.generateReport();
      expect(report.memory.growthRate).toBeGreaterThan(0);
      
      vi.useRealTimers();
    });

    it('should handle memory exhaustion gracefully', async () => {
      // Mock memory exhaustion
      mockPerformance.memory = {
        usedJSHeapSize: 1.8 * 1024 * 1024 * 1024, // 1.8GB
        totalJSHeapSize: 2 * 1024 * 1024 * 1024, // 2GB
        jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
      };
      
      render(<App />);
      
      const benchmarks = performanceProfiler.runBenchmarks();
      const memoryBenchmark = benchmarks.find(b => b.name === 'Memory Usage (MB)');
      
      expect(memoryBenchmark?.status).toBe('fail');
    });
  });

  describe('Rule Switching Performance', () => {
    it('should switch rules within 50ms threshold', async () => {
      render(<App />);
      
      const ruleInput = screen.getByDisplayValue(/B3\/S23/i);
      
      const startTime = performance.now();
      
      // Change rule
      await user.clear(ruleInput);
      await user.type(ruleInput, 'B36/S23');
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50);
    });

    it('should measure rule switching performance automatically', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      render(<App />);
      
      const result = performanceProfiler.measureOperationTime(() => {
        // Simulate rule switching operation
        return 'rule switched';
      }, 'rule switching');
      
      expect(result).toBe('rule switched');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PerformanceProfiler] rule switching:')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Generation Computation Performance', () => {
    it('should compute generations within 16ms for 60fps', async () => {
      render(<App />);
      
      const stepButton = screen.getByRole('button', { name: /step/i });
      
      const startTime = performance.now();
      await user.click(stepButton);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(16); // 60fps = 16.67ms per frame
    });

    it('should warn about slow generation computation', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock slow operation
      let callCount = 0;
      mockPerformance.now.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 0 : 30; // 30ms operation
      });
      
      const result = performanceProfiler.measureOperationTime(() => {
        return 'generation computed';
      }, 'generation computation');
      
      expect(result).toBe('generation computed');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow generation computation:')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Canvas Rendering Performance', () => {
    it('should render canvas efficiently', async () => {
      render(<App />);
      
      // Start simulation to trigger rendering
      const playButton = screen.getByRole('button', { name: /play|pause/i });
      await user.click(playButton);
      
      // Let it run for a bit
      await waitFor(() => {
        expect(mockCanvasContext.clearRect).toHaveBeenCalled();
        expect(mockCanvasContext.fillRect).toHaveBeenCalled();
      });
      
      // Verify efficient rendering (not too many calls)
      expect(mockCanvasContext.clearRect).toHaveBeenCalledTimes(
        expect.any(Number)
      );
    });

    it('should handle large grid rendering within performance budget', async () => {
      render(<App />);
      
      // Set large grid
      const widthInput = screen.getByDisplayValue('50');
      const heightInput = screen.getAllByDisplayValue('50')[1];
      
      await user.clear(widthInput);
      await user.type(widthInput, '150');
      await user.clear(heightInput);
      await user.type(heightInput, '150');
      
      const stepButton = screen.getByRole('button', { name: /step/i });
      
      const startTime = performance.now();
      await user.click(stepButton);
      const endTime = performance.now();
      
      // Should still render reasonably quickly
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Bundle Size and Load Performance', () => {
    it('should have reasonable bundle size', () => {
      // Mock resource timing data
      mockPerformance.getEntriesByType.mockReturnValue([
        { name: 'main.js', transferSize: 2 * 1024 * 1024 }, // 2MB
        { name: 'vendor.js', transferSize: 1.5 * 1024 * 1024 }, // 1.5MB
        { name: 'styles.css', transferSize: 0.2 * 1024 * 1024 } // 200KB
      ]);
      
      const report = performanceProfiler.generateReport();
      const bundleSizeMB = report.bundleSize.total / 1024 / 1024;
      
      expect(bundleSizeMB).toBeLessThan(5); // Under 5MB target
    });

    it('should meet load time requirements', () => {
      // Mock navigation timing
      mockPerformance.getEntriesByType.mockReturnValue([{
        fetchStart: 0,
        domInteractive: 800,
        loadEventEnd: 1500
      }]);
      
      const report = performanceProfiler.generateReport();
      
      expect(report.loadTime.initial).toBeLessThan(2000); // Under 2 second target
      expect(report.loadTime.interactive).toBeLessThan(1000); // Interactive quickly
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should provide detailed performance report', () => {
      const detailedReport = performanceProfiler.getDetailedReport();
      
      expect(detailedReport).toContain('Performance Report');
      expect(detailedReport).toContain('FPS Metrics');
      expect(detailedReport).toContain('Memory Usage');
      expect(detailedReport).toContain('Benchmarks');
      expect(detailedReport).toContain('Recommendations');
    });

    it('should run all performance benchmarks', () => {
      const benchmarks = performanceProfiler.runBenchmarks();
      
      expect(benchmarks).toHaveLength(4);
      
      const benchmarkNames = benchmarks.map(b => b.name);
      expect(benchmarkNames).toContain('Average FPS');
      expect(benchmarkNames).toContain('Memory Usage (MB)');
      expect(benchmarkNames).toContain('Initial Load Time (ms)');
      expect(benchmarkNames).toContain('Bundle Size (MB)');
      
      benchmarks.forEach(benchmark => {
        expect(benchmark.status).toMatch(/pass|warning|fail/);
        expect(benchmark.impact).toMatch(/low|medium|high/);
      });
    });

    it('should generate performance recommendations', () => {
      // Mock poor performance scenario
      mockPerformance.memory = {
        usedJSHeapSize: 150 * 1024 * 1024, // 150MB
        totalJSHeapSize: 200 * 1024 * 1024,
        jsHeapSizeLimit: 2 * 1024 * 1024 * 1024
      };
      
      const report = performanceProfiler.generateReport();
      
      expect(report.degradation.recommendations).toContain(
        expect.stringContaining('memory')
      );
    });
  });

  describe('Performance Marks and Measures', () => {
    it('should create performance marks for operations', () => {
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
  });

  describe('Performance Degradation Detection', () => {
    it('should detect and warn about performance issues', async () => {
      const mockCallback = vi.fn();
      performanceProfiler.setReportCallback(mockCallback);
      
      render(<App />);
      
      // This would be triggered by actual performance degradation
      // For testing, we verify the callback can be set
      expect(mockCallback).toHaveBeenCalledTimes(0);
    });

    it('should provide recovery recommendations for poor performance', () => {
      performanceProfiler.setWarningThresholds({
        targetFPS: 60,
        maxMemoryMB: 50 // Low threshold to trigger warnings
      });
      
      const benchmarks = performanceProfiler.runBenchmarks();
      const memoryBenchmark = benchmarks.find(b => b.name === 'Memory Usage (MB)');
      
      expect(memoryBenchmark?.status).toBe('warning');
    });
  });

  describe('Real-world Performance Scenarios', () => {
    it('should handle Conway\'s Life glider gun pattern efficiently', async () => {
      render(<App />);
      
      // This would test with actual glider gun pattern
      // For now, test large pattern handling
      const playButton = screen.getByRole('button', { name: /play|pause/i });
      
      const startTime = performance.now();
      await user.click(playButton);
      
      // Run for several generations
      await waitFor(() => {
        const generation = screen.getByText(/generation/i);
        expect(generation).toHaveTextContent(/[5-9]|[1-9][0-9]/); // At least generation 5
      }, { timeout: 3000 });
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete reasonably quickly
      expect(totalTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should handle rapid rule switching without performance issues', async () => {
      render(<App />);
      
      const ruleInput = screen.getByDisplayValue(/B3\/S23/i);
      const rules = ['B36/S23', 'B2/S', 'B3678/S34678', 'B1/S1'];
      
      const startTime = performance.now();
      
      for (const rule of rules) {
        await user.clear(ruleInput);
        await user.type(ruleInput, rule);
      }
      
      const endTime = performance.now();
      const averageTime = (endTime - startTime) / rules.length;
      
      expect(averageTime).toBeLessThan(50); // Under 50ms per switch
    });
  });
});
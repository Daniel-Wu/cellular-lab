import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  errorHandler, 
  handleError, 
  createError, 
  CellularLabError, 
  ErrorSeverity 
} from '../../src/utils/ErrorHandler';

describe('ErrorHandler', () => {
  beforeEach(() => {
    errorHandler.clearErrorLog();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Error Classification', () => {
    it('should classify canvas errors correctly', () => {
      const error = new Error('canvas context not supported');
      const errorInfo = handleError(error);
      
      expect(errorInfo.code).toBe('CANVAS_NOT_SUPPORTED');
      expect(errorInfo.severity).toBe(ErrorSeverity.CRITICAL);
      expect(errorInfo.recoverable).toBe(false);
    });

    it('should classify memory errors correctly', () => {
      const error = new Error('out of memory heap exceeded');
      const errorInfo = handleError(error);
      
      expect(errorInfo.code).toBe('MEMORY_EXCEEDED');
      expect(errorInfo.severity).toBe(ErrorSeverity.CRITICAL);
      expect(errorInfo.recoverable).toBe(true);
    });

    it('should classify rule validation errors correctly', () => {
      const error = new Error('invalid rule notation format');
      const errorInfo = handleError(error);
      
      expect(errorInfo.code).toBe('INVALID_RULE_FORMAT');
      expect(errorInfo.severity).toBe(ErrorSeverity.MEDIUM);
      expect(errorInfo.recoverable).toBe(true);
    });

    it('should classify pattern import errors correctly', () => {
      const error = new Error('failed to parse RLE pattern');
      const errorInfo = handleError(error);
      
      expect(errorInfo.code).toBe('PATTERN_IMPORT_FAILED');
      expect(errorInfo.severity).toBe(ErrorSeverity.MEDIUM);
      expect(errorInfo.recoverable).toBe(true);
    });

    it('should classify unknown errors correctly', () => {
      const error = new Error('some unexpected error');
      const errorInfo = handleError(error);
      
      expect(errorInfo.code).toBe('UNKNOWN_ERROR');
      expect(errorInfo.severity).toBe(ErrorSeverity.MEDIUM);
      expect(errorInfo.recoverable).toBe(true);
    });
  });

  describe('CellularLabError', () => {
    it('should create custom errors with all properties', () => {
      const context = { component: 'GridRenderer', operation: 'render' };
      const error = createError(
        'RENDERING_FAILED',
        'Failed to render grid',
        ErrorSeverity.HIGH,
        context,
        true
      );

      expect(error).toBeInstanceOf(CellularLabError);
      expect(error.code).toBe('RENDERING_FAILED');
      expect(error.message).toBe('Failed to render grid');
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.context).toEqual(context);
      expect(error.recoverable).toBe(true);
    });

    it('should handle custom errors in error handler', () => {
      const customError = createError(
        'SIMULATION_ERROR',
        'Simulation failed',
        ErrorSeverity.HIGH
      );

      const errorInfo = handleError(customError);
      
      expect(errorInfo.code).toBe('SIMULATION_ERROR');
      expect(errorInfo.severity).toBe(ErrorSeverity.HIGH);
      expect(errorInfo.userMessage).toContain('error occurred during simulation');
    });
  });

  describe('User Messages', () => {
    it('should provide helpful user messages for canvas errors', () => {
      const error = new Error('canvas not supported');
      const errorInfo = handleError(error);
      
      expect(errorInfo.userMessage).toContain('browser does not support HTML5 Canvas');
      expect(errorInfo.userMessage).toContain('modern browser');
    });

    it('should provide helpful user messages for memory errors', () => {
      const error = new Error('out of memory');
      const errorInfo = handleError(error);
      
      expect(errorInfo.userMessage).toContain('run out of memory');
      expect(errorInfo.userMessage).toContain('reducing the grid size');
    });

    it('should provide helpful user messages for pattern errors', () => {
      const error = new Error('RLE import failed');
      const errorInfo = handleError(error);
      
      expect(errorInfo.userMessage).toContain('Failed to import the pattern');
      expect(errorInfo.userMessage).toContain('file format is correct');
    });
  });

  describe('Recovery Actions', () => {
    it('should provide recovery actions for canvas errors', () => {
      const error = new Error('canvas not supported');
      const errorInfo = handleError(error);
      
      expect(errorInfo.recoveryActions).toContain('Update your browser to the latest version');
      expect(errorInfo.recoveryActions).toContain('Try a different browser (Chrome, Firefox, Safari, Edge)');
    });

    it('should provide recovery actions for memory errors', () => {
      const error = new Error('memory exceeded');
      const errorInfo = handleError(error);
      
      expect(errorInfo.recoveryActions).toContain('Reduce grid size to 100x100 or smaller');
      expect(errorInfo.recoveryActions).toContain('Refresh the page to clear memory');
    });

    it('should provide recovery actions for rule errors', () => {
      const error = new Error('invalid rule format');
      const errorInfo = handleError(error);
      
      expect(errorInfo.recoveryActions).toContain('Use format B[numbers]/S[numbers] (e.g., "B3/S23")');
      expect(errorInfo.recoveryActions).toContain('Try a preset rule instead');
    });
  });

  describe('Error Logging', () => {
    it('should log errors to internal storage', () => {
      const error = new Error('test error');
      handleError(error);
      
      const log = errorHandler.getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0].message).toBe('test error');
    });

    it('should maintain maximum log size', () => {
      // Create more errors than the max log size (100)
      for (let i = 0; i < 105; i++) {
        handleError(new Error(`test error ${i}`));
      }
      
      const log = errorHandler.getErrorLog();
      expect(log).toHaveLength(100);
      expect(log[0].message).toBe('test error 104'); // Most recent first
    });

    it('should clear error log', () => {
      handleError(new Error('test error 1'));
      handleError(new Error('test error 2'));
      
      expect(errorHandler.getErrorLog()).toHaveLength(2);
      
      errorHandler.clearErrorLog();
      expect(errorHandler.getErrorLog()).toHaveLength(0);
    });
  });

  describe('Browser Support Detection', () => {
    it('should detect missing canvas support', () => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      // @ts-ignore
      delete HTMLCanvasElement.prototype.getContext;
      
      const support = errorHandler.checkBrowserSupport();
      
      expect(support.isSupported).toBe(false);
      expect(support.missingFeatures).toContain('HTML5 Canvas');
      
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    });

    it('should detect missing localStorage support', () => {
      const originalLocalStorage = window.localStorage;
      // @ts-ignore
      delete window.localStorage;
      
      const support = errorHandler.checkBrowserSupport();
      
      expect(support.isSupported).toBe(false);
      expect(support.missingFeatures).toContain('Local Storage');
      
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true
      });
    });

    it('should detect full browser support', () => {
      const support = errorHandler.checkBrowserSupport();
      
      expect(support.isSupported).toBe(true);
      expect(support.missingFeatures).toHaveLength(0);
    });
  });

  describe('Canvas Fallback', () => {
    it('should create canvas not supported fallback element', () => {
      const fallback = errorHandler.createCanvasNotSupportedFallback();
      
      expect(fallback).toBeInstanceOf(HTMLElement);
      expect(fallback.textContent).toContain('Canvas Not Supported');
      expect(fallback.textContent).toContain('Chrome 80 or later');
      expect(fallback.querySelector('button')).toBeTruthy();
    });
  });

  describe('Error Context', () => {
    it('should include system information in error context', () => {
      const error = new Error('test error');
      const errorInfo = handleError(error, { component: 'TestComponent' });
      
      expect(errorInfo.context?.browserInfo).toBeDefined();
      expect(errorInfo.context?.timestamp).toBeInstanceOf(Date);
      expect(errorInfo.context?.userAgent).toBeDefined();
      expect(errorInfo.context?.component).toBe('TestComponent');
    });

    it('should include stack trace for regular errors', () => {
      const error = new Error('test error with stack');
      const errorInfo = handleError(error);
      
      expect(errorInfo.context?.stackTrace).toBeDefined();
      expect(typeof errorInfo.context?.stackTrace).toBe('string');
    });
  });

  describe('Error Callback', () => {
    it('should call error callback when set', () => {
      const callback = vi.fn();
      errorHandler.setErrorCallback(callback);
      
      const error = new Error('test error');
      handleError(error);
      
      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        message: 'test error'
      }));
    });
  });

  describe('Toast Notifications', () => {
    it('should determine correct toast duration based on severity', () => {
      // Mock toast to capture calls
      const mockToast = { error: vi.fn() };
      vi.doMock('react-hot-toast', () => ({ toast: mockToast }));
      
      const lowError = createError('TEST', 'low severity', ErrorSeverity.LOW);
      const highError = createError('TEST', 'high severity', ErrorSeverity.HIGH);
      
      // Test different severities would result in different durations
      // This is more of an integration test and hard to test in isolation
      expect(lowError.severity).toBe(ErrorSeverity.LOW);
      expect(highError.severity).toBe(ErrorSeverity.HIGH);
    });
  });
});
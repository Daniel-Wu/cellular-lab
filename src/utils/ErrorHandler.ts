import { toast } from 'react-hot-toast';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  component?: string;
  operation?: string;
  gridSize?: { width: number; height: number };
  memoryUsage?: number;
  browserInfo?: string;
  timestamp?: Date;
  userAgent?: string;
  stackTrace?: string;
}

export interface ErrorInfo {
  code: string;
  message: string;
  severity: ErrorSeverity;
  context?: ErrorContext;
  recoverable: boolean;
  userMessage: string;
  recoveryActions?: string[];
}

export class CellularLabError extends Error {
  code: string;
  severity: ErrorSeverity;
  context: ErrorContext | undefined;
  recoverable: boolean;

  constructor(
    code: string,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: ErrorContext | undefined = undefined,
    recoverable: boolean = true
  ) {
    super(message);
    this.name = 'CellularLabError';
    this.code = code;
    this.severity = severity;
    this.context = context;
    this.recoverable = recoverable;
  }
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorInfo[] = [];
  private maxLogSize = 100;
  private onErrorCallback?: (error: ErrorInfo) => void;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  setErrorCallback(callback: (error: ErrorInfo) => void): void {
    this.onErrorCallback = callback;
  }

  private getSystemInfo(): Partial<ErrorContext> {
    return {
      browserInfo: navigator.userAgent,
      timestamp: new Date(),
      userAgent: navigator.userAgent
    };
  }

  private createErrorInfo(error: Error | CellularLabError, context?: ErrorContext): ErrorInfo {
    if (error instanceof CellularLabError) {
      return {
        code: error.code,
        message: error.message,
        severity: error.severity,
        context: { 
          ...this.getSystemInfo(), 
          ...(error.context || {}), 
          ...(context || {})
        },
        recoverable: error.recoverable,
        userMessage: this.getUserMessage(error.code, error.message),
        recoveryActions: this.getRecoveryActions(error.code)
      };
    }

    const errorCode = this.classifyError(error);
    const severity = this.determineSeverity(errorCode, error);

    return {
      code: errorCode,
      message: error.message,
      severity,
      context: { 
        ...this.getSystemInfo(), 
        ...(context || {}), 
        stackTrace: error.stack || 'No stack trace available'
      },
      recoverable: this.isRecoverable(errorCode),
      userMessage: this.getUserMessage(errorCode, error.message),
      recoveryActions: this.getRecoveryActions(errorCode)
    };
  }

  private classifyError(error: Error): string {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('canvas') || message.includes('2d') || message.includes('webgl')) {
      return 'CANVAS_NOT_SUPPORTED';
    }
    
    if (message.includes('memory') || message.includes('heap')) {
      return 'MEMORY_EXCEEDED';
    }
    
    if (message.includes('fetch') || message.includes('network')) {
      return 'NETWORK_ERROR';
    }
    
    if (message.includes('rle') || message.includes('pattern')) {
      return 'PATTERN_IMPORT_FAILED';
    }
    
    if (message.includes('rule') || message.includes('notation')) {
      return 'INVALID_RULE_FORMAT';
    }
    
    if (message.includes('grid') && message.includes('size')) {
      return 'GRID_SIZE_INVALID';
    }
    
    if (stack.includes('gridrenderer') || stack.includes('rendering')) {
      return 'RENDERING_FAILED';
    }
    
    if (stack.includes('ruleengine') || stack.includes('simulation')) {
      return 'SIMULATION_ERROR';
    }

    return 'UNKNOWN_ERROR';
  }

  private determineSeverity(code: string, _error: Error): ErrorSeverity {
    switch (code) {
      case 'CANVAS_NOT_SUPPORTED':
      case 'MEMORY_EXCEEDED':
        return ErrorSeverity.CRITICAL;
      
      case 'RENDERING_FAILED':
      case 'SIMULATION_ERROR':
        return ErrorSeverity.HIGH;
      
      case 'PATTERN_IMPORT_FAILED':
      case 'INVALID_RULE_FORMAT':
      case 'GRID_SIZE_INVALID':
        return ErrorSeverity.MEDIUM;
      
      case 'NETWORK_ERROR':
        return ErrorSeverity.LOW;
      
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  private isRecoverable(code: string): boolean {
    const nonRecoverableErrors = ['CANVAS_NOT_SUPPORTED'];
    return !nonRecoverableErrors.includes(code);
  }

  private getUserMessage(code: string, originalMessage: string): string {
    const messages: Record<string, string> = {
      CANVAS_NOT_SUPPORTED: 'Your browser does not support HTML5 Canvas, which is required for this application. Please use a modern browser like Chrome, Firefox, Safari, or Edge.',
      MEMORY_EXCEEDED: 'The application has run out of memory. Try reducing the grid size or refreshing the page.',
      PATTERN_IMPORT_FAILED: 'Failed to import the pattern. Please check that the file format is correct (RLE or JSON).',
      INVALID_RULE_FORMAT: 'The rule format is invalid. Please use the format "B3/S23" where numbers represent neighbor counts.',
      GRID_SIZE_INVALID: 'The grid size is too large or invalid. Please choose a size between 20x20 and 200x200.',
      RENDERING_FAILED: 'Failed to render the grid. This may be due to browser limitations or memory constraints.',
      SIMULATION_ERROR: 'An error occurred during simulation. The simulation has been paused.',
      NETWORK_ERROR: 'Network connection failed. Some features may not work properly.',
      UNKNOWN_ERROR: 'An unexpected error occurred. Please try refreshing the page.'
    };

    return messages[code] || `An error occurred: ${originalMessage}`;
  }

  private getRecoveryActions(code: string): string[] {
    const actions: Record<string, string[]> = {
      CANVAS_NOT_SUPPORTED: [
        'Update your browser to the latest version',
        'Try a different browser (Chrome, Firefox, Safari, Edge)',
        'Enable hardware acceleration in browser settings'
      ],
      MEMORY_EXCEEDED: [
        'Reduce grid size to 100x100 or smaller',
        'Close other browser tabs',
        'Refresh the page to clear memory',
        'Restart your browser'
      ],
      PATTERN_IMPORT_FAILED: [
        'Check file format (should be .rle or .json)',
        'Verify file is not corrupted',
        'Try a smaller pattern',
        'Use manual pattern creation instead'
      ],
      INVALID_RULE_FORMAT: [
        'Use format B[numbers]/S[numbers] (e.g., "B3/S23")',
        'Check for typos in the rule',
        'Try a preset rule instead',
        'Refer to rule documentation'
      ],
      GRID_SIZE_INVALID: [
        'Choose size between 20x20 and 200x200',
        'Use preset sizes',
        'Clear browser cache if size persists',
        'Refresh the page'
      ],
      RENDERING_FAILED: [
        'Reduce grid size',
        'Close other applications using graphics',
        'Update graphics drivers',
        'Try refreshing the page'
      ],
      SIMULATION_ERROR: [
        'Reset the grid',
        'Try a different rule',
        'Reduce simulation speed',
        'Refresh the page'
      ],
      NETWORK_ERROR: [
        'Check internet connection',
        'Try again in a few moments',
        'Use offline features only',
        'Contact support if persistent'
      ],
      UNKNOWN_ERROR: [
        'Refresh the page',
        'Clear browser cache',
        'Try in a different browser',
        'Report the issue if it persists'
      ]
    };

    return actions[code] || ['Refresh the page', 'Try again', 'Contact support if the issue persists'];
  }

  handle(error: Error | CellularLabError, context?: ErrorContext): ErrorInfo {
    const errorInfo = this.createErrorInfo(error, context);
    
    this.logError(errorInfo);
    this.notifyUser(errorInfo);
    
    if (this.onErrorCallback) {
      this.onErrorCallback(errorInfo);
    }

    return errorInfo;
  }

  private logError(errorInfo: ErrorInfo): void {
    console.error(`[CellularLab] ${errorInfo.code}: ${errorInfo.message}`, errorInfo.context);
    
    this.errorLog.unshift(errorInfo);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }
  }

  private notifyUser(errorInfo: ErrorInfo): void {
    const duration = this.getToastDuration(errorInfo.severity);
    const icon = this.getErrorIcon(errorInfo.severity);

    toast.error(errorInfo.userMessage, {
      duration,
      icon,
      style: {
        maxWidth: '400px'
      }
    });

    if (errorInfo.severity === ErrorSeverity.CRITICAL) {
      this.showCriticalErrorModal(errorInfo);
    }
  }

  private getToastDuration(severity: ErrorSeverity): number {
    switch (severity) {
      case ErrorSeverity.LOW: return 3000;
      case ErrorSeverity.MEDIUM: return 5000;
      case ErrorSeverity.HIGH: return 8000;
      case ErrorSeverity.CRITICAL: return 0; // Persistent
      default: return 5000;
    }
  }

  private getErrorIcon(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.LOW: return '⚠️';
      case ErrorSeverity.MEDIUM: return '❗';
      case ErrorSeverity.HIGH: return '🚨';
      case ErrorSeverity.CRITICAL: return '💥';
      default: return '❗';
    }
  }

  private showCriticalErrorModal(errorInfo: ErrorInfo): void {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'error-title');

    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md mx-4 shadow-xl">
        <h2 id="error-title" class="text-xl font-bold text-red-600 dark:text-red-400 mb-4">
          Critical Error
        </h2>
        <p class="text-gray-700 dark:text-gray-300 mb-4">
          ${errorInfo.userMessage}
        </p>
        <div class="mb-4">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Try these solutions:
          </h3>
          <ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
            ${errorInfo.recoveryActions?.map(action => `<li>${action}</li>`).join('') || ''}
          </ul>
        </div>
        <div class="flex gap-2">
          <button id="error-close" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors">
            Close
          </button>
          <button id="error-refresh" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
            Refresh Page
          </button>
        </div>
      </div>
    `;

    const closeButton = modal.querySelector('#error-close');
    const refreshButton = modal.querySelector('#error-refresh');

    closeButton?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    refreshButton?.addEventListener('click', () => {
      window.location.reload();
    });

    document.body.appendChild(modal);
    
    requestAnimationFrame(() => {
      const firstButton = modal.querySelector('button');
      firstButton?.focus();
    });
  }

  getErrorLog(): ErrorInfo[] {
    return [...this.errorLog];
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }

  createCanvasNotSupportedFallback(): HTMLElement {
    const fallback = document.createElement('div');
    fallback.className = 'flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg';
    
    fallback.innerHTML = `
      <div class="text-6xl mb-4">🖥️</div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        Canvas Not Supported
      </h2>
      <p class="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        Your browser doesn't support HTML5 Canvas, which is required for this cellular automata simulator.
      </p>
      <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600 mb-6">
        <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Recommended Browsers:
        </h3>
        <ul class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Chrome 80 or later</li>
          <li>• Firefox 75 or later</li>
          <li>• Safari 13 or later</li>
          <li>• Edge 80 or later</li>
        </ul>
      </div>
      <button onclick="window.location.reload()" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        Try Again
      </button>
    `;
    
    return fallback;
  }

  checkBrowserSupport(): { isSupported: boolean; missingFeatures: string[] } {
    const missingFeatures: string[] = [];

    if (!document.createElement('canvas').getContext) {
      missingFeatures.push('HTML5 Canvas');
    }

    if (!window.localStorage) {
      missingFeatures.push('Local Storage');
    }

    if (!window.CSS || !window.CSS.supports || !window.CSS.supports('display', 'grid')) {
      missingFeatures.push('CSS Grid');
    }

    if (!window.CSS || !window.CSS.supports || !window.CSS.supports('--custom-property', 'value')) {
      missingFeatures.push('CSS Custom Properties');
    }

    if (!Array.from) {
      missingFeatures.push('ES2015 Array.from');
    }

    if (!Promise) {
      missingFeatures.push('ES2015 Promises');
    }

    return {
      isSupported: missingFeatures.length === 0,
      missingFeatures
    };
  }
}

export const errorHandler = ErrorHandler.getInstance();

export const handleError = (error: Error | CellularLabError, context?: ErrorContext): ErrorInfo => {
  return errorHandler.handle(error, context);
};

export const createError = (
  code: string,
  message: string,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  context?: ErrorContext,
  recoverable: boolean = true
): CellularLabError => {
  return new CellularLabError(code, message, severity, context, recoverable);
};
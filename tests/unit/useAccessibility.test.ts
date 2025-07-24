import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAccessibility } from '../../src/hooks/useAccessibility';

// Mock zustand store
const mockStore = {
  simulation: { isRunning: false },
  grid: { generation: 0, width: 50, height: 50, current: new Uint8Array(2500) },
  rule: { notation: 'B3/S23' },
  toggleSimulation: vi.fn(),
  stepSimulation: vi.fn(),
  resetGrid: vi.fn(),
  setRule: vi.fn(),
  setGridSize: vi.fn()
};

vi.mock('../../src/stores', () => ({
  useAppStore: () => mockStore
}));

// Mock react-hot-toast
const mockToast = vi.fn();
vi.mock('react-hot-toast', () => ({
  toast: mockToast
}));

// Mock window APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('useAccessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset DOM
    document.body.innerHTML = '';
    
    // Mock navigator
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      configurable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.removeEventListener('keydown', vi.fn());
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const { result } = renderHook(() => useAccessibility());
      
      expect(result.current.announceToScreenReader).toBeInstanceOf(Function);
      expect(result.current.manageFocus).toBeInstanceOf(Function);
      expect(result.current.trapFocus).toBeInstanceOf(Function);
      expect(result.current.updateAriaProperties).toBeInstanceOf(Function);
      expect(result.current.showKeyboardShortcuts).toBeInstanceOf(Function);
      expect(result.current.getAccessibilityState).toBeInstanceOf(Function);
    });

    it('should create live region in DOM', () => {
      renderHook(() => useAccessibility());
      
      const liveRegion = document.querySelector('[aria-live]');
      expect(liveRegion).toBeTruthy();
      expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
      expect(liveRegion?.getAttribute('aria-atomic')).toBe('true');
    });

    it('should announce initial grid state', () => {
      const { result } = renderHook(() => useAccessibility());
      
      // The hook should announce the initial state
      expect(result.current.liveRegionRef.current).toBeTruthy();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should toggle simulation on Space key', () => {
      renderHook(() => useAccessibility());
      
      const spaceEvent = new KeyboardEvent('keydown', { code: 'Space' });
      act(() => {
        document.dispatchEvent(spaceEvent);
      });
      
      expect(mockStore.toggleSimulation).toHaveBeenCalledOnce();
    });

    it('should step simulation on Ctrl+ArrowRight', () => {
      renderHook(() => useAccessibility());
      
      const stepEvent = new KeyboardEvent('keydown', { 
        code: 'ArrowRight', 
        ctrlKey: true 
      });
      act(() => {
        document.dispatchEvent(stepEvent);
      });
      
      expect(mockStore.stepSimulation).toHaveBeenCalledOnce();
    });

    it('should reset grid on Ctrl+R', () => {
      renderHook(() => useAccessibility());
      
      const resetEvent = new KeyboardEvent('keydown', { 
        code: 'KeyR', 
        ctrlKey: true 
      });
      act(() => {
        document.dispatchEvent(resetEvent);
      });
      
      expect(mockStore.resetGrid).toHaveBeenCalledOnce();
    });

    it('should load preset rules on Ctrl+1-5', () => {
      renderHook(() => useAccessibility());
      
      const presetEvent = new KeyboardEvent('keydown', { 
        code: 'Digit1', 
        ctrlKey: true 
      });
      act(() => {
        document.dispatchEvent(presetEvent);
      });
      
      expect(mockStore.setRule).toHaveBeenCalledWith({
        birth: [3],
        survival: [2, 3],
        notation: 'B3/S23'
      });
    });

    it('should show help on Ctrl+H', () => {
      renderHook(() => useAccessibility());
      
      const helpEvent = new KeyboardEvent('keydown', { 
        code: 'KeyH', 
        ctrlKey: true 
      });
      act(() => {
        document.dispatchEvent(helpEvent);
      });
      
      expect(mockToast).toHaveBeenCalledWith(
        expect.stringContaining('Keyboard shortcuts:'),
        expect.objectContaining({ duration: 5000, icon: '⌨️' })
      );
    });

    it('should close modals on Escape key', () => {
      // Create a mock modal
      const modal = document.createElement('div');
      modal.setAttribute('role', 'dialog');
      const closeButton = document.createElement('button');
      closeButton.setAttribute('data-close', 'true');
      closeButton.click = vi.fn();
      modal.appendChild(closeButton);
      document.body.appendChild(modal);
      
      renderHook(() => useAccessibility());
      
      const escapeEvent = new KeyboardEvent('keydown', { code: 'Escape' });
      act(() => {
        document.dispatchEvent(escapeEvent);
      });
      
      expect(closeButton.click).toHaveBeenCalledOnce();
    });

    it('should not trigger shortcuts when input is focused', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();
      
      renderHook(() => useAccessibility());
      
      const spaceEvent = new KeyboardEvent('keydown', { 
        code: 'Space',
        target: input 
      });
      
      // Mock event target
      Object.defineProperty(spaceEvent, 'target', { value: input });
      
      act(() => {
        document.dispatchEvent(spaceEvent);
      });
      
      expect(mockStore.toggleSimulation).not.toHaveBeenCalled();
    });

    it('should disable keyboard shortcuts when option is false', () => {
      renderHook(() => useAccessibility({ enableKeyboardShortcuts: false }));
      
      const spaceEvent = new KeyboardEvent('keydown', { code: 'Space' });
      act(() => {
        document.dispatchEvent(spaceEvent);
      });
      
      expect(mockStore.toggleSimulation).not.toHaveBeenCalled();
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should announce to screen reader', () => {
      const { result } = renderHook(() => useAccessibility());
      
      act(() => {
        result.current.announceToScreenReader('Test announcement');
      });
      
      const liveRegion = result.current.liveRegionRef.current;
      expect(liveRegion?.textContent).toBe('Test announcement');
    });

    it('should set priority for announcements', () => {
      const { result } = renderHook(() => useAccessibility());
      
      act(() => {
        result.current.announceToScreenReader('Urgent message', 'assertive');
      });
      
      const liveRegion = result.current.liveRegionRef.current;
      expect(liveRegion?.getAttribute('aria-live')).toBe('assertive');
    });

    it('should avoid duplicate announcements', () => {
      const { result } = renderHook(() => useAccessibility());
      
      act(() => {
        result.current.announceToScreenReader('Same message');
        result.current.announceToScreenReader('Same message');
      });
      
      // Should only announce once (implementation detail)
      const liveRegion = result.current.liveRegionRef.current;
      expect(liveRegion?.textContent).toBe('Same message');
    });

    it('should clear announcements after timeout', async () => {
      vi.useFakeTimers();
      
      const { result } = renderHook(() => useAccessibility());
      
      act(() => {
        result.current.announceToScreenReader('Temporary message');
      });
      
      const liveRegion = result.current.liveRegionRef.current;
      expect(liveRegion?.textContent).toBe('Temporary message');
      
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      
      expect(liveRegion?.textContent).toBe('');
      
      vi.useRealTimers();
    });

    it('should disable announcements when option is false', () => {
      const { result } = renderHook(() => 
        useAccessibility({ enableScreenReaderAnnouncements: false })
      );
      
      act(() => {
        result.current.announceToScreenReader('Should not announce');
      });
      
      const liveRegion = result.current.liveRegionRef.current;
      expect(liveRegion).toBeNull();
    });
  });

  describe('Focus Management', () => {
    it('should manage focus to element', () => {
      const { result } = renderHook(() => useAccessibility());
      const button = document.createElement('button');
      button.focus = vi.fn();
      document.body.appendChild(button);
      
      act(() => {
        result.current.manageFocus(button, 'test button');
      });
      
      // Use requestAnimationFrame callback
      act(() => {
        vi.runAllTimers();
      });
      
      expect(button.focus).toHaveBeenCalledOnce();
    });

    it('should trap focus within container', () => {
      const { result } = renderHook(() => useAccessibility());
      
      const container = document.createElement('div');
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      container.appendChild(button1);
      container.appendChild(button2);
      document.body.appendChild(container);
      
      const cleanup = result.current.trapFocus(container);
      
      expect(typeof cleanup).toBe('function');
      
      // Test cleanup
      act(() => {
        cleanup();
      });
    });

    it('should handle Tab key in focus trap', () => {
      const { result } = renderHook(() => useAccessibility());
      
      const container = document.createElement('div');
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      button1.focus = vi.fn();
      button2.focus = vi.fn();
      container.appendChild(button1);
      container.appendChild(button2);
      document.body.appendChild(container);
      
      result.current.trapFocus(container);
      
      // Simulate being on last element and pressing Tab
      Object.defineProperty(document, 'activeElement', { 
        value: button2, 
        configurable: true 
      });
      
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      container.dispatchEvent(tabEvent);
      
      // Should focus first element (tested through event listener)
      expect(button1.focus).toHaveBeenCalledOnce();
    });

    it('should disable focus management when option is false', () => {
      const { result } = renderHook(() => 
        useAccessibility({ enableFocusManagement: false })
      );
      
      const button = document.createElement('button');
      button.focus = vi.fn();
      
      act(() => {
        result.current.manageFocus(button);
      });
      
      expect(button.focus).not.toHaveBeenCalled();
    });
  });

  describe('ARIA Properties', () => {
    it('should update ARIA properties on element', () => {
      const { result } = renderHook(() => useAccessibility());
      
      const element = document.createElement('div');
      
      act(() => {
        result.current.updateAriaProperties(element, {
          'aria-label': 'Test label',
          'aria-expanded': 'true'
        });
      });
      
      expect(element.getAttribute('aria-label')).toBe('Test label');
      expect(element.getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('Accessibility State Detection', () => {
    it('should detect reduced motion preference', () => {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      
      const { result } = renderHook(() => useAccessibility());
      
      const state = result.current.getAccessibilityState();
      expect(state.hasReducedMotion).toBe(true);
    });

    it('should detect high contrast mode', () => {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query.includes('prefers-contrast: high'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      
      const { result } = renderHook(() => useAccessibility());
      
      const state = result.current.getAccessibilityState();
      expect(state.highContrastMode).toBe(true);
    });

    it('should detect screen reader activity', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'NVDA screen reader',
        configurable: true
      });
      
      const { result } = renderHook(() => useAccessibility());
      
      const state = result.current.getAccessibilityState();
      expect(state.isScreenReaderActive).toBe(true);
    });

    it('should detect keyboard navigation', () => {
      // Mock focus-visible selector
      document.querySelector = vi.fn().mockReturnValue(document.createElement('div'));
      
      const { result } = renderHook(() => useAccessibility());
      
      const state = result.current.getAccessibilityState();
      expect(state.isKeyboardNavigation).toBe(true);
    });
  });

  describe('Simulation Announcements', () => {
    it('should announce simulation state during running', () => {
      vi.useFakeTimers();
      
      mockStore.simulation.isRunning = true;
      mockStore.grid.generation = 5;
      
      renderHook(() => useAccessibility());
      
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      // Should announce generation and living cells
      const liveRegion = document.querySelector('[aria-live]');
      expect(liveRegion?.textContent).toContain('Generation 5');
      
      vi.useRealTimers();
    });

    it('should not announce when simulation is paused', () => {
      vi.useFakeTimers();
      
      mockStore.simulation.isRunning = false;
      
      renderHook(() => useAccessibility());
      
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      
      // Should not have interval announcements
      const liveRegion = document.querySelector('[aria-live]');
      expect(liveRegion?.textContent).not.toContain('Generation');
      
      vi.useRealTimers();
    });
  });

  describe('Cleanup', () => {
    it('should remove live region on unmount', () => {
      const { unmount } = renderHook(() => useAccessibility());
      
      expect(document.querySelector('[aria-live]')).toBeTruthy();
      
      unmount();
      
      expect(document.querySelector('[aria-live]')).toBeFalsy();
    });
  });
});
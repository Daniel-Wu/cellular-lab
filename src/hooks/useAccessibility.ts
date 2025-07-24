import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../stores';
import { toast } from 'react-hot-toast';

interface AccessibilityOptions {
  enableKeyboardShortcuts?: boolean;
  enableScreenReaderAnnouncements?: boolean;
  enableFocusManagement?: boolean;
  reducedMotion?: boolean;
}

interface AccessibilityState {
  isKeyboardNavigation: boolean;
  isScreenReaderActive: boolean;
  hasReducedMotion: boolean;
  highContrastMode: boolean;
}

export const useAccessibility = (options: AccessibilityOptions = {}) => {
  const {
    enableKeyboardShortcuts = true,
    enableScreenReaderAnnouncements = true,
    enableFocusManagement = true,
    reducedMotion = false
  } = options;

  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const focusedElementRef = useRef<HTMLElement | null>(null);
  const lastAnnouncementRef = useRef<string>('');
  
  const { 
    simulation, 
    grid, 
    rule,
    startSimulation,
    stopSimulation,
    stepSimulation, 
    clearGrid, 
    setRule
  } = useAppStore();

  const getAccessibilityState = useCallback((): AccessibilityState => {
    const hasReducedMotion = reducedMotion || 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    const highContrastMode = 
      window.matchMedia('(prefers-contrast: high)').matches ||
      window.matchMedia('(prefers-contrast: more)').matches;

    const isScreenReaderActive = 
      navigator.userAgent.includes('JAWS') ||
      navigator.userAgent.includes('NVDA') ||
      'speechSynthesis' in window;

    return {
      isKeyboardNavigation: document.querySelector(':focus-visible') !== null,
      isScreenReaderActive,
      hasReducedMotion,
      highContrastMode
    };
  }, [reducedMotion]);

  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!enableScreenReaderAnnouncements || !liveRegionRef.current) return;
    
    if (lastAnnouncementRef.current === message) return;
    lastAnnouncementRef.current = message;

    const liveRegion = liveRegionRef.current;
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.textContent = message;

    setTimeout(() => {
      if (liveRegion.textContent === message) {
        liveRegion.textContent = '';
      }
    }, 1000);
  }, [enableScreenReaderAnnouncements]);

  const handleKeyboardShortcut = useCallback((event: KeyboardEvent) => {
    if (!enableKeyboardShortcuts) return;

    const isModifierPressed = event.ctrlKey || event.metaKey;
    const target = event.target as HTMLElement;
    const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    if (isInputFocused && !isModifierPressed) return;

    switch (event.code) {
      case 'Space':
        if (!isInputFocused) {
          event.preventDefault();
          if (simulation.isRunning) {
            stopSimulation();
            announceToScreenReader('Simulation paused');
          } else {
            startSimulation();
            announceToScreenReader('Simulation started');
          }
        }
        break;

      case 'ArrowRight':
        if (!isInputFocused && isModifierPressed) {
          event.preventDefault();
          stepSimulation();
          announceToScreenReader(`Step completed. Generation ${grid.generation + 1}`);
        }
        break;

      case 'KeyR':
        if (isModifierPressed) {
          event.preventDefault();
          clearGrid();
          announceToScreenReader('Grid reset to empty state');
        }
        break;

      case 'Escape':
        event.preventDefault();
        const activeModal = document.querySelector('[role="dialog"]');
        if (activeModal) {
          const closeButton = activeModal.querySelector('button[aria-label*="close"], button[data-close]');
          if (closeButton instanceof HTMLElement) {
            closeButton.click();
            announceToScreenReader('Modal closed');
          }
        }
        break;

      case 'Tab':
        if (enableFocusManagement) {
          const focusableElements = document.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          
          if (focusableElements.length > 0) {
            focusedElementRef.current = event.target as HTMLElement;
          }
        }
        break;

      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5':
        if (isModifierPressed) {
          event.preventDefault();
          const presetRules = [
            { birth: [3], survival: [2, 3], notation: 'B3/S23' }, // Conway's Life
            { birth: [3, 6], survival: [2, 3], notation: 'B36/S23' }, // HighLife
            { birth: [2], survival: [], notation: 'B2/S' }, // Seeds
            { birth: [3, 6, 7, 8], survival: [3, 4, 6, 7, 8], notation: 'B3678/S34678' }, // Day & Night
            { birth: [1], survival: [1], notation: 'B1/S1' } // Gnarl
          ];
          
          const ruleIndex = parseInt(event.code.slice(-1)) - 1;
          if (ruleIndex >= 0 && ruleIndex < presetRules.length) {
            const selectedRule = presetRules[ruleIndex];
            if (selectedRule) {
              setRule(selectedRule);
              announceToScreenReader(`Rule changed to ${selectedRule.notation}`);
            }
          }
        }
        break;

      case 'KeyH':
        if (isModifierPressed) {
          event.preventDefault();
          showKeyboardShortcuts();
        }
        break;
    }
  }, [
    enableKeyboardShortcuts,
    simulation.isRunning,
    grid.generation,
    startSimulation,
    stopSimulation,
    stepSimulation,
    clearGrid,
    setRule,
    announceToScreenReader,
    enableFocusManagement
  ]);

  const showKeyboardShortcuts = useCallback(() => {
    const shortcuts = [
      'Space: Play/Pause simulation',
      'Ctrl/Cmd + Right Arrow: Step forward',
      'Ctrl/Cmd + R: Reset grid',
      'Ctrl/Cmd + 1-5: Load preset rules',
      'Escape: Close modals',
      'Tab: Navigate focusable elements',
      'Ctrl/Cmd + H: Show this help'
    ];
    
    const message = 'Keyboard shortcuts: ' + shortcuts.join(', ');
    announceToScreenReader(message, 'assertive');
    toast(message, { duration: 5000, icon: '⌨️' });
  }, [announceToScreenReader]);

  const manageFocus = useCallback((element: HTMLElement | null, reason?: string) => {
    if (!enableFocusManagement || !element) return;

    requestAnimationFrame(() => {
      element.focus();
      if (reason) {
        announceToScreenReader(`Focus moved to ${reason}`);
      }
    });

    focusedElementRef.current = element;
  }, [enableFocusManagement, announceToScreenReader]);

  const trapFocus = useCallback((containerElement: HTMLElement) => {
    if (!enableFocusManagement) return () => {};

    const focusableElements = containerElement.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKeyPress = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    containerElement.addEventListener('keydown', handleTabKeyPress);

    return () => {
      containerElement.removeEventListener('keydown', handleTabKeyPress);
    };
  }, [enableFocusManagement]);

  const createLiveRegion = useCallback(() => {
    if (!enableScreenReaderAnnouncements) return null;

    if (!liveRegionRef.current) {
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.setAttribute('aria-relevant', 'text');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      
      document.body.appendChild(liveRegion);
      liveRegionRef.current = liveRegion;
    }

    return liveRegionRef.current;
  }, [enableScreenReaderAnnouncements]);

  const updateAriaProperties = useCallback((element: HTMLElement, properties: Record<string, string>) => {
    Object.entries(properties).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }, []);

  useEffect(() => {
    if (enableKeyboardShortcuts) {
      document.addEventListener('keydown', handleKeyboardShortcut);
      return () => document.removeEventListener('keydown', handleKeyboardShortcut);
    }
    return undefined;
  }, [handleKeyboardShortcut, enableKeyboardShortcuts]);

  useEffect(() => {
    const liveRegion = createLiveRegion();
    
    return () => {
      if (liveRegion && liveRegion.parentNode) {
        liveRegion.parentNode.removeChild(liveRegion);
        liveRegionRef.current = null;
      }
    };
  }, [createLiveRegion]);

  useEffect(() => {
    if (enableScreenReaderAnnouncements) {
      announceToScreenReader(`Cellular automata grid loaded. Size: ${grid.width} by ${grid.height}. Current rule: ${rule.notation}`);
    }
  }, []);

  useEffect(() => {
    if (enableScreenReaderAnnouncements && simulation.isRunning) {
      const interval = setInterval(() => {
        announceToScreenReader(`Generation ${grid.generation}, living cells: ${Array.from(grid.current).filter(cell => cell === 1).length}`);
      }, 5000);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [simulation.isRunning, grid.generation, grid.current, announceToScreenReader, enableScreenReaderAnnouncements]);

  return {
    announceToScreenReader,
    manageFocus,
    trapFocus,
    updateAriaProperties,
    showKeyboardShortcuts,
    getAccessibilityState,
    liveRegionRef
  };
};
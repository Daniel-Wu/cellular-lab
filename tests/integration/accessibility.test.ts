import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

// Mock toast
vi.mock('react-hot-toast', () => ({
  toast: vi.fn(),
  Toaster: () => null
}));

// Mock canvas context
const mockCanvas = {
  getContext: vi.fn(() => ({
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
  })),
  width: 800,
  height: 600
};

HTMLCanvasElement.prototype.getContext = mockCanvas.getContext;

describe('Accessibility Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Keyboard Navigation', () => {
    it('should navigate through all interactive elements with Tab', async () => {
      render(<App />);
      
      // Start from first focusable element
      const playButton = screen.getByRole('button', { name: /play|pause/i });
      playButton.focus();
      
      expect(document.activeElement).toBe(playButton);
      
      // Tab through elements
      await user.tab();
      expect(document.activeElement?.tagName).toBe('BUTTON');
      
      await user.tab();
      expect(document.activeElement?.tagName).toBe('BUTTON');
      
      // Continue tabbing through all interactive elements
      for (let i = 0; i < 10; i++) {
        await user.tab();
        expect(document.activeElement).toBeTruthy();
      }
    });

    it('should support reverse tabbing with Shift+Tab', async () => {
      render(<App />);
      
      // Focus last element by tabbing forward first
      const buttons = screen.getAllByRole('button');
      const lastButton = buttons[buttons.length - 1];
      lastButton.focus();
      
      // Shift+Tab should move backwards
      await user.tab({ shift: true });
      expect(document.activeElement).not.toBe(lastButton);
    });

    it('should handle Enter key to activate buttons', async () => {
      render(<App />);
      
      const playButton = screen.getByRole('button', { name: /play|pause/i });
      playButton.focus();
      
      await user.keyboard('{Enter}');
      
      // Should trigger play/pause functionality
      expect(playButton).toHaveAttribute('aria-pressed');
    });

    it('should handle Space key for global play/pause', async () => {
      render(<App />);
      
      // Space should work even when no specific element is focused
      document.body.focus();
      
      await user.keyboard(' ');
      
      // Should trigger simulation toggle
      const playButton = screen.getByRole('button', { name: /play|pause/i });
      expect(playButton).toHaveAttribute('aria-pressed');
    });

    it('should handle Escape key to close modals', async () => {
      render(<App />);
      
      // Open pattern library modal
      const patternButton = screen.getByRole('button', { name: /pattern/i });
      await user.click(patternButton);
      
      // Verify modal is open
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      
      // Press Escape
      await user.keyboard('{Escape}');
      
      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should handle Ctrl+R for grid reset', async () => {
      render(<App />);
      
      await user.keyboard('{Control>}r{/Control}');
      
      // Should reset the grid (verify through UI state)
      const generation = screen.getByText(/generation/i);
      expect(generation).toHaveTextContent('0');
    });

    it('should handle Ctrl+Arrow for stepping simulation', async () => {
      render(<App />);
      
      await user.keyboard('{Control>}{ArrowRight}{/Control}');
      
      // Should step simulation forward
      const generation = screen.getByText(/generation/i);
      expect(generation).toHaveTextContent('1');
    });

    it('should handle preset rule shortcuts Ctrl+1-5', async () => {
      render(<App />);
      
      // Test Conway's Life (Ctrl+1)
      await user.keyboard('{Control>}1{/Control}');
      
      const ruleDisplay = screen.getByDisplayValue(/B3\/S23/i);
      expect(ruleDisplay).toBeInTheDocument();
      
      // Test HighLife (Ctrl+2)
      await user.keyboard('{Control>}2{/Control}');
      
      const highLifeRule = screen.getByDisplayValue(/B36\/S23/i);
      expect(highLifeRule).toBeInTheDocument();
    });

    it('should show keyboard shortcuts help with Ctrl+H', async () => {
      render(<App />);
      
      await user.keyboard('{Control>}h{/Control}');
      
      // Should show toast with keyboard shortcuts
      // This would be verified by checking if toast was called with shortcuts
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper ARIA labels on all interactive elements', () => {
      render(<App />);
      
      const playButton = screen.getByRole('button', { name: /play|pause/i });
      expect(playButton).toHaveAttribute('aria-label');
      
      const stepButton = screen.getByRole('button', { name: /step/i });
      expect(stepButton).toHaveAttribute('aria-label');
      
      const resetButton = screen.getByRole('button', { name: /reset/i });
      expect(resetButton).toHaveAttribute('aria-label');
    });

    it('should have live regions for dynamic content', () => {
      render(<App />);
      
      const liveRegion = document.querySelector('[aria-live]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('should announce simulation state changes', async () => {
      render(<App />);
      
      const playButton = screen.getByRole('button', { name: /play|pause/i });
      await user.click(playButton);
      
      const liveRegion = document.querySelector('[aria-live]');
      await waitFor(() => {
        expect(liveRegion?.textContent).toContain('started');
      });
    });

    it('should announce generation progress during simulation', async () => {
      vi.useFakeTimers();
      
      render(<App />);
      
      const playButton = screen.getByRole('button', { name: /play|pause/i });
      await user.click(playButton);
      
      // Fast-forward to trigger generation announcements
      vi.advanceTimersByTime(5000);
      
      const liveRegion = document.querySelector('[aria-live]');
      expect(liveRegion?.textContent).toContain('Generation');
      
      vi.useRealTimers();
    });

    it('should have proper heading structure', () => {
      render(<App />);
      
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Check heading levels are logical (h1 -> h2 -> h3, etc.)
      const headingLevels = headings.map(h => parseInt(h.tagName.slice(1)));
      expect(headingLevels[0]).toBe(1); // Should start with h1
    });

    it('should have proper form labels and descriptions', () => {
      render(<App />);
      
      const ruleInput = screen.getByDisplayValue(/B3\/S23/i);
      expect(ruleInput).toHaveAttribute('aria-label');
      
      const gridSizeInputs = screen.getAllByRole('spinbutton');
      gridSizeInputs.forEach(input => {
        expect(input).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Focus Management', () => {
    it('should maintain focus trap in modal dialogs', async () => {
      render(<App />);
      
      // Open pattern library modal
      const patternButton = screen.getByRole('button', { name: /pattern/i });
      await user.click(patternButton);
      
      const modal = screen.getByRole('dialog');
      const modalButtons = Array.from(modal.querySelectorAll('button'));
      
      // Focus should be trapped within modal
      const firstButton = modalButtons[0];
      const lastButton = modalButtons[modalButtons.length - 1];
      
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);
      
      // Tab from last element should cycle to first
      lastButton.focus();
      await user.tab();
      expect(document.activeElement).toBe(firstButton);
    });

    it('should restore focus after modal closes', async () => {
      render(<App />);
      
      const patternButton = screen.getByRole('button', { name: /pattern/i });
      patternButton.focus();
      
      await user.click(patternButton);
      
      // Close modal with Escape
      await user.keyboard('{Escape}');
      
      // Focus should return to trigger button
      await waitFor(() => {
        expect(document.activeElement).toBe(patternButton);
      });
    });

    it('should have visible focus indicators', () => {
      render(<App />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        button.focus();
        
        // Should have focus-visible class or appropriate styling
        const styles = window.getComputedStyle(button);
        expect(styles.outline).not.toBe('none');
      });
    });
  });

  describe('High Contrast Mode', () => {
    it('should adapt to high contrast preferences', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query.includes('prefers-contrast: high'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
      
      render(<App />);
      
      // Elements should have appropriate contrast styling
      const app = document.querySelector('#root');
      expect(app).toHaveClass('high-contrast');
    });
  });

  describe('Reduced Motion', () => {
    it('should respect reduced motion preferences', () => {
      // Mock reduced motion media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
      
      render(<App />);
      
      // Animations should be disabled or reduced
      const animatedElements = document.querySelectorAll('[class*="animate"]');
      animatedElements.forEach(el => {
        const styles = window.getComputedStyle(el);
        expect(styles.animationDuration).toBe('0s');
      });
    });
  });

  describe('Error Accessibility', () => {
    it('should announce errors to screen readers', async () => {
      render(<App />);
      
      // Trigger an error (invalid rule format)
      const ruleInput = screen.getByDisplayValue(/B3\/S23/i);
      await user.clear(ruleInput);
      await user.type(ruleInput, 'invalid rule');
      
      const liveRegion = document.querySelector('[aria-live]');
      await waitFor(() => {
        expect(liveRegion?.textContent).toContain('invalid');
      });
    });

    it('should provide accessible error messages', async () => {
      render(<App />);
      
      // Trigger validation error
      const ruleInput = screen.getByDisplayValue(/B3\/S23/i);
      await user.clear(ruleInput);
      await user.type(ruleInput, 'bad');
      
      // Should have aria-describedby pointing to error message
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
      expect(ruleInput).toHaveAttribute('aria-describedby');
    });
  });

  describe('Mobile Accessibility', () => {
    it('should have appropriate touch targets', () => {
      render(<App />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minSize = parseInt(styles.minHeight) || parseInt(styles.height);
        expect(minSize).toBeGreaterThanOrEqual(44); // 44px minimum touch target
      });
    });

    it('should prevent zoom on form inputs', () => {
      render(<App />);
      
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        const styles = window.getComputedStyle(input);
        const fontSize = parseInt(styles.fontSize);
        expect(fontSize).toBeGreaterThanOrEqual(16); // Prevent iOS zoom
      });
    });
  });

  describe('Complete Workflows', () => {
    it('should support complete simulation workflow via keyboard', async () => {
      render(<App />);
      
      // Navigate to play button and start simulation
      const playButton = screen.getByRole('button', { name: /play|pause/i });
      playButton.focus();
      await user.keyboard('{Enter}');
      
      // Wait and verify simulation is running
      expect(playButton).toHaveAttribute('aria-pressed', 'true');
      
      // Step simulation manually
      await user.keyboard('{Control>}{ArrowRight}{/Control}');
      
      // Reset grid
      await user.keyboard('{Control>}r{/Control}');
      
      // Change rule
      await user.keyboard('{Control>}2{/Control}');
      
      // All operations should be accessible via keyboard
      const generation = screen.getByText(/generation/i);
      expect(generation).toHaveTextContent('0');
    });

    it('should support pattern library workflow accessibly', async () => {
      render(<App />);
      
      // Open pattern library
      const patternButton = screen.getByRole('button', { name: /pattern/i });
      await user.click(patternButton);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      
      // Navigate within modal
      const patternOptions = screen.getAllByRole('button', { name: /pattern/i });
      const firstPattern = patternOptions[0];
      await user.click(firstPattern);
      
      // Close modal
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should handle error recovery accessibly', async () => {
      render(<App />);
      
      // Trigger error
      const ruleInput = screen.getByDisplayValue(/B3\/S23/i);
      ruleInput.focus();
      await user.clear(ruleInput);
      await user.type(ruleInput, 'invalid');
      
      // Error should be announced
      const liveRegion = document.querySelector('[aria-live]');
      await waitFor(() => {
        expect(liveRegion?.textContent).toContain('invalid');
      });
      
      // Fix error
      await user.clear(ruleInput);
      await user.type(ruleInput, 'B3/S23');
      
      // Success should be announced
      await waitFor(() => {
        expect(liveRegion?.textContent).not.toContain('invalid');
      });
    });
  });
});
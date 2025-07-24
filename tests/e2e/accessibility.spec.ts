import { test, expect, Page, Browser } from '@playwright/test';

test.describe('Accessibility E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate through all interactive elements with Tab', async ({ page }) => {
      // Start from first focusable element
      await page.keyboard.press('Tab');
      let focusedElement = await page.locator(':focus').first();
      await expect(focusedElement).toBeVisible();

      // Count total focusable elements
      const focusableElements = await page.locator(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ).count();

      // Tab through all elements
      for (let i = 1; i < focusableElements; i++) {
        await page.keyboard.press('Tab');
        focusedElement = await page.locator(':focus').first();
        await expect(focusedElement).toBeVisible();
      }
    });

    test('should support reverse tabbing with Shift+Tab', async ({ page }) => {
      // Tab to second element
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      const secondElement = await page.locator(':focus').first();

      // Shift+Tab should go back to first element
      await page.keyboard.press('Shift+Tab');
      const firstElement = await page.locator(':focus').first();

      await expect(firstElement).not.toHaveText(await secondElement.textContent() || '');
    });

    test('should activate buttons with Enter and Space', async ({ page }) => {
      const playButton = page.getByRole('button', { name: /play|pause/i });
      await playButton.focus();

      // Test Enter key
      await page.keyboard.press('Enter');
      await expect(playButton).toHaveAttribute('aria-pressed', 'true');

      // Reset
      await page.keyboard.press('Enter');

      // Test Space key
      await page.keyboard.press('Space');
      await expect(playButton).toHaveAttribute('aria-pressed', 'true');
    });

    test('should handle global keyboard shortcuts', async ({ page }) => {
      // Test Space for play/pause (global)
      await page.keyboard.press('Space');
      const playButton = page.getByRole('button', { name: /play|pause/i });
      await expect(playButton).toHaveAttribute('aria-pressed', 'true');

      // Test Ctrl+R for reset
      await page.keyboard.press('Control+KeyR');
      const generation = page.getByText(/generation.*0/i);
      await expect(generation).toBeVisible();

      // Test Ctrl+ArrowRight for step
      await page.keyboard.press('Control+ArrowRight');
      const generation1 = page.getByText(/generation.*1/i);
      await expect(generation1).toBeVisible();

      // Test preset rules (Ctrl+1-5)
      await page.keyboard.press('Control+Digit2'); // HighLife
      const ruleInput = page.getByDisplayValue(/B36\/S23/i);
      await expect(ruleInput).toBeVisible();
    });

    test('should close modals with Escape key', async ({ page }) => {
      // Open pattern library
      const patternButton = page.getByRole('button', { name: /pattern/i });
      await patternButton.click();

      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      // Close with Escape
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    });

    test('should show keyboard shortcuts help with Ctrl+H', async ({ page }) => {
      await page.keyboard.press('Control+KeyH');
      
      // Should show toast notification with shortcuts
      const toast = page.locator('[data-testid="toast"], .toast').first();
      await expect(toast).toContainText('Keyboard shortcuts');
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper ARIA structure', async ({ page }) => {
      // Check for main landmarks
      await expect(page.getByRole('main')).toBeVisible();
      
      // Check for proper heading hierarchy
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);

      // First heading should be h1
      const firstHeading = headings.first();
      await expect(firstHeading).toHaveAttribute('tagName', 'H1');
    });

    test('should have live regions for dynamic content', async ({ page }) => {
      const liveRegion = page.locator('[aria-live]');
      await expect(liveRegion).toBeVisible();
      await expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      await expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    test('should announce simulation state changes', async ({ page }) => {
      const playButton = page.getByRole('button', { name: /play|pause/i });
      await playButton.click();

      // Wait for announcement
      const liveRegion = page.locator('[aria-live]');
      await expect(liveRegion).toContainText(/started|running/i, { timeout: 2000 });
    });

    test('should have proper form labels', async ({ page }) => {
      // Rule input should have label
      const ruleInput = page.getByDisplayValue(/B3\/S23/i);
      await expect(ruleInput).toHaveAttribute('aria-label');

      // Grid size inputs should have labels
      const gridInputs = page.locator('input[type="number"]');
      const count = await gridInputs.count();
      
      for (let i = 0; i < count; i++) {
        const input = gridInputs.nth(i);
        await expect(input).toHaveAttribute('aria-label');
      }
    });

    test('should provide accessible error messages', async ({ page }) => {
      const ruleInput = page.getByDisplayValue(/B3\/S23/i);
      
      // Enter invalid rule
      await ruleInput.clear();
      await ruleInput.fill('invalid');
      await page.keyboard.press('Tab'); // Trigger validation

      // Should have error message
      const errorMessage = page.getByRole('alert');
      await expect(errorMessage).toBeVisible();

      // Input should reference error message
      await expect(ruleInput).toHaveAttribute('aria-describedby');
    });
  });

  test.describe('Focus Management', () => {
    test('should maintain focus trap in modals', async ({ page }) => {
      // Open pattern library modal
      const patternButton = page.getByRole('button', { name: /pattern/i });
      await patternButton.click();

      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      // Find all focusable elements in modal
      const modalButtons = modal.locator('button');
      const firstButton = modalButtons.first();
      const lastButton = modalButtons.last();

      // Focus should start on first element
      await expect(firstButton).toBeFocused();

      // Tab to last element
      const buttonCount = await modalButtons.count();
      for (let i = 1; i < buttonCount; i++) {
        await page.keyboard.press('Tab');
      }
      await expect(lastButton).toBeFocused();

      // Tab from last should cycle to first
      await page.keyboard.press('Tab');
      await expect(firstButton).toBeFocused();

      // Shift+Tab from first should go to last
      await page.keyboard.press('Shift+Tab');
      await expect(lastButton).toBeFocused();
    });

    test('should restore focus after modal closes', async ({ page }) => {
      const patternButton = page.getByRole('button', { name: /pattern/i });
      await patternButton.focus();
      await expect(patternButton).toBeFocused();

      await patternButton.click();

      // Close modal with Escape
      await page.keyboard.press('Escape');

      // Focus should return to trigger button
      await expect(patternButton).toBeFocused();
    });

    test('should have visible focus indicators', async ({ page }) => {
      const buttons = page.locator('button:visible');
      const count = await buttons.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const button = buttons.nth(i);
        await button.focus();

        // Check that button has visible focus styling
        const outline = await button.evaluate(el => 
          window.getComputedStyle(el).outline
        );
        expect(outline).not.toBe('none');
      }
    });
  });

  test.describe('High Contrast Mode', () => {
    test('should adapt to high contrast preferences', async ({ page }) => {
      // Emulate high contrast preference
      await page.emulateMedia({ 
        reducedMotion: null,
        colorScheme: null,
        forcedColors: 'active'
      });

      await page.reload();

      // Check that high contrast styles are applied
      const body = page.locator('body');
      const backgroundColor = await body.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );

      // High contrast mode should change background
      expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  });

  test.describe('Reduced Motion', () => {
    test('should respect reduced motion preferences', async ({ page }) => {
      // Emulate reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.reload();

      // Check that animations are disabled or reduced
      const animatedElements = page.locator('[class*="animate"], [class*="transition"]');
      const count = await animatedElements.count();

      if (count > 0) {
        const firstAnimated = animatedElements.first();
        const animationDuration = await firstAnimated.evaluate(el => 
          window.getComputedStyle(el).animationDuration
        );
        expect(animationDuration).toBe('0s');
      }
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should have appropriate touch targets on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      const buttons = page.locator('button:visible');
      const count = await buttons.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const button = buttons.nth(i);
        const boundingBox = await button.boundingBox();
        
        if (boundingBox) {
          // Touch targets should be at least 44px
          expect(boundingBox.height).toBeGreaterThanOrEqual(44);
          expect(boundingBox.width).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test('should prevent zoom on form inputs', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      const inputs = page.locator('input:visible');
      const count = await inputs.count();

      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        const fontSize = await input.evaluate(el => 
          window.getComputedStyle(el).fontSize
        );
        
        const fontSizeNum = parseInt(fontSize);
        expect(fontSizeNum).toBeGreaterThanOrEqual(16); // Prevent iOS zoom
      }
    });
  });

  test.describe('Screen Reader Integration', () => {
    test('should work with NVDA simulation', async ({ page }) => {
      // While we can't test actual screen readers in Playwright,
      // we can test ARIA structure and announcements
      
      // Enable screen reader mode simulation
      await page.addInitScript(() => {
        // Simulate screen reader presence
        Object.defineProperty(navigator, 'userAgent', {
          value: navigator.userAgent + ' NVDA',
          configurable: true
        });
      });

      await page.reload();

      // Test that aria-live regions work
      const playButton = page.getByRole('button', { name: /play|pause/i });
      await playButton.click();

      const liveRegion = page.locator('[aria-live]');
      await expect(liveRegion).toContainText(/started|running/i, { timeout: 2000 });
    });

    test('should announce form validation errors', async ({ page }) => {
      const ruleInput = page.getByDisplayValue(/B3\/S23/i);
      
      await ruleInput.clear();
      await ruleInput.fill('invalid rule');
      await page.keyboard.press('Tab');

      // Error should be announced via live region
      const liveRegion = page.locator('[aria-live]');
      await expect(liveRegion).toContainText(/invalid|error/i, { timeout: 2000 });
    });
  });

  test.describe('Complete Accessibility Workflows', () => {
    test('should complete full simulation workflow via keyboard', async ({ page }) => {
      // Navigate to play button and start simulation
      await page.keyboard.press('Tab');
      const playButton = page.locator(':focus');
      await page.keyboard.press('Enter');

      // Verify simulation started
      await expect(playButton).toHaveAttribute('aria-pressed', 'true');

      // Step simulation manually
      await page.keyboard.press('Control+ArrowRight');
      const generation1 = page.getByText(/generation.*1/i);
      await expect(generation1).toBeVisible();

      // Reset grid
      await page.keyboard.press('Control+KeyR');
      const generation0 = page.getByText(/generation.*0/i);
      await expect(generation0).toBeVisible();

      // Change rule with keyboard shortcut
      await page.keyboard.press('Control+Digit2');
      const highLifeRule = page.getByDisplayValue(/B36\/S23/i);
      await expect(highLifeRule).toBeVisible();
    });

    test('should complete pattern library workflow accessibly', async ({ page }) => {
      // Open pattern library
      const patternButton = page.getByRole('button', { name: /pattern/i });
      await patternButton.click();

      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      // Navigate within modal using keyboard
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      // Select a pattern (if available)
      const patternOptions = modal.locator('button[data-pattern]');
      const patternCount = await patternOptions.count();
      
      if (patternCount > 0) {
        await patternOptions.first().click();
      }

      // Close modal
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    });

    test('should handle error states accessibly', async ({ page }) => {
      const ruleInput = page.getByDisplayValue(/B3\/S23/i);
      
      // Trigger error
      await ruleInput.focus();
      await ruleInput.clear();
      await ruleInput.fill('invalid');
      await page.keyboard.press('Tab');

      // Error should be accessible
      const errorMessage = page.getByRole('alert');
      await expect(errorMessage).toBeVisible();
      
      // Error should be announced
      const liveRegion = page.locator('[aria-live]');
      await expect(liveRegion).toContainText(/invalid|error/i, { timeout: 2000 });

      // Fix error
      await ruleInput.focus();
      await ruleInput.clear();
      await ruleInput.fill('B3/S23');
      await page.keyboard.press('Tab');

      // Error should be cleared
      await expect(errorMessage).not.toBeVisible();
    });
  });

  test.describe('Performance and Accessibility', () => {
    test('should maintain accessibility during high performance scenarios', async ({ page }) => {
      // Set large grid size
      const widthInput = page.getByDisplayValue('50').first();
      const heightInput = page.getByDisplayValue('50').last();
      
      await widthInput.clear();
      await widthInput.fill('100');
      await heightInput.clear();
      await heightInput.fill('100');

      // Start simulation
      const playButton = page.getByRole('button', { name: /play|pause/i });
      await playButton.click();

      // Let it run for a bit
      await page.waitForTimeout(2000);

      // Accessibility should still work
      await page.keyboard.press('Space'); // Should pause
      await expect(playButton).toHaveAttribute('aria-pressed', 'false');

      // Live regions should still work
      const liveRegion = page.locator('[aria-live]');
      await expect(liveRegion).toBeVisible();
    });
  });
});
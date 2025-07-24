import { test, expect, devices } from '@playwright/test';

// Test on multiple browsers and devices
const browsers = ['chromium', 'firefox', 'webkit'];
const mobileDevices = ['iPhone 12', 'Pixel 5', 'iPad'];

test.describe('Cross-Browser Compatibility Tests', () => {
  
  test.describe('Core Functionality', () => {
    browsers.forEach(browserName => {
      test(`should work correctly on ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping test for ${currentBrowser}`);
        
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Test basic functionality
        const playButton = page.getByRole('button', { name: /play|pause/i });
        await expect(playButton).toBeVisible();

        await playButton.click();
        await expect(playButton).toHaveAttribute('aria-pressed', 'true');

        // Test simulation stepping
        const stepButton = page.getByRole('button', { name: /step/i });
        await stepButton.click();
        
        const generation = page.getByText(/generation.*[1-9]/i);
        await expect(generation).toBeVisible({ timeout: 5000 });

        // Test grid reset
        const resetButton = page.getByRole('button', { name: /reset/i });
        await resetButton.click();
        
        const generationZero = page.getByText(/generation.*0/i);
        await expect(generationZero).toBeVisible();
      });
    });
  });

  test.describe('Canvas Support', () => {
    browsers.forEach(browserName => {
      test(`should support Canvas 2D on ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping test for ${currentBrowser}`);
        
        await page.goto('/');

        // Check canvas is present and functional
        const canvas = page.locator('canvas');
        await expect(canvas).toBeVisible();

        // Verify canvas context is available
        const hasCanvas2D = await page.evaluate(() => {
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext && canvas.getContext('2d'));
        });
        
        expect(hasCanvas2D).toBe(true);

        // Test canvas interaction
        const canvasBoundingBox = await canvas.boundingBox();
        if (canvasBoundingBox) {
          await page.mouse.click(
            canvasBoundingBox.x + canvasBoundingBox.width / 2,
            canvasBoundingBox.y + canvasBoundingBox.height / 2
          );
        }
      });
    });
  });

  test.describe('Mobile Device Support', () => {
    mobileDevices.forEach(deviceName => {
      test(`should work on ${deviceName}`, async ({ browser }) => {
        const device = devices[deviceName];
        const context = await browser.newContext({
          ...device,
        });
        const page = await context.newPage();

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Test mobile-specific functionality
        const playButton = page.getByRole('button', { name: /play|pause/i });
        await expect(playButton).toBeVisible();

        // Test touch interaction
        await playButton.tap();
        await expect(playButton).toHaveAttribute('aria-pressed', 'true');

        // Test touch targets are appropriate size
        const boundingBox = await playButton.boundingBox();
        if (boundingBox) {
          expect(boundingBox.height).toBeGreaterThanOrEqual(44);
          expect(boundingBox.width).toBeGreaterThanOrEqual(44);
        }

        // Test pinch zoom prevention
        const viewport = page.viewportSize();
        if (viewport && deviceName.includes('iPhone')) {
          // iOS specific tests
          const inputs = page.locator('input');
          const count = await inputs.count();
          
          for (let i = 0; i < count; i++) {
            const input = inputs.nth(i);
            const fontSize = await input.evaluate(el => 
              window.getComputedStyle(el).fontSize
            );
            expect(parseInt(fontSize)).toBeGreaterThanOrEqual(16);
          }
        }

        await context.close();
      });
    });
  });

  test.describe('Feature Detection', () => {
    browsers.forEach(browserName => {
      test(`should detect browser features correctly on ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping test for ${currentBrowser}`);
        
        await page.goto('/');

        // Test feature detection
        const features = await page.evaluate(() => {
          return {
            canvas: !!(document.createElement('canvas').getContext),
            localStorage: typeof Storage !== 'undefined',
            cssGrid: CSS.supports('display', 'grid'),
            cssCustomProperties: CSS.supports('--custom-property', 'value'),
            arrayFrom: typeof Array.from === 'function',
            promises: typeof Promise === 'function',
            requestAnimationFrame: typeof requestAnimationFrame === 'function',
            webGL: !!(document.createElement('canvas').getContext('webgl') || 
                     document.createElement('canvas').getContext('experimental-webgl'))
          };
        });

        // All modern browsers should support these
        expect(features.canvas).toBe(true);
        expect(features.localStorage).toBe(true);
        expect(features.cssGrid).toBe(true);
        expect(features.cssCustomProperties).toBe(true);
        expect(features.arrayFrom).toBe(true);
        expect(features.promises).toBe(true);
        expect(features.requestAnimationFrame).toBe(true);

        // WebGL may not be available in all test environments
        if (browserName !== 'webkit') {
          expect(features.webGL).toBe(true);
        }
      });
    });
  });

  test.describe('Performance Across Browsers', () => {
    browsers.forEach(browserName => {
      test(`should meet performance targets on ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping test for ${currentBrowser}`);
        
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Measure load time
        const navigationTiming = await page.evaluate(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          return {
            loadTime: navigation.loadEventEnd - navigation.fetchStart,
            domInteractive: navigation.domInteractive - navigation.fetchStart,
            firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
          };
        });

        // Performance targets
        expect(navigationTiming.loadTime).toBeLessThan(3000); // 3 second load time
        expect(navigationTiming.domInteractive).toBeLessThan(1500); // 1.5 second interactive

        // Test simulation performance
        const playButton = page.getByRole('button', { name: /play|pause/i });
        
        const startTime = Date.now();
        await playButton.click();
        
        // Wait for several generations
        await page.waitForFunction(() => {
          const genText = document.querySelector('[data-testid="generation"]')?.textContent || 
                         Array.from(document.querySelectorAll('*')).find(el => 
                           el.textContent?.match(/generation.*[5-9]/i))?.textContent;
          return genText && /generation.*[5-9]/i.test(genText);
        }, { timeout: 5000 });
        
        const endTime = Date.now();
        const simulationTime = endTime - startTime;
        
        expect(simulationTime).toBeLessThan(5000); // Should reach 5+ generations in under 5 seconds
      });
    });
  });

  test.describe('Error Handling Across Browsers', () => {
    browsers.forEach(browserName => {
      test(`should handle errors gracefully on ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping test for ${currentBrowser}`);
        
        await page.goto('/');

        // Test rule validation error
        const ruleInput = page.getByDisplayValue(/B3\/S23/i);
        await ruleInput.clear();
        await ruleInput.fill('invalid rule');
        await page.keyboard.press('Tab');

        // Should show error message
        const errorMessage = page.getByRole('alert');
        await expect(errorMessage).toBeVisible({ timeout: 2000 });

        // Test recovery
        await ruleInput.clear();
        await ruleInput.fill('B3/S23');
        await page.keyboard.press('Tab');

        await expect(errorMessage).not.toBeVisible({ timeout: 2000 });
      });
    });
  });

  test.describe('Local Storage Compatibility', () => {
    browsers.forEach(browserName => {
      test(`should persist settings in localStorage on ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping test for ${currentBrowser}`);
        
        await page.goto('/');

        // Change grid size
        const widthInput = page.getByDisplayValue('50').first();
        await widthInput.clear();
        await widthInput.fill('75');

        // Change rule
        const ruleInput = page.getByDisplayValue(/B3\/S23/i);
        await ruleInput.clear();
        await ruleInput.fill('B36/S23');

        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Settings should be persisted
        await expect(page.getByDisplayValue('75')).toBeVisible();
        await expect(page.getByDisplayValue(/B36\/S23/i)).toBeVisible();
      });
    });
  });

  test.describe('CSS Grid and Flexbox Support', () => {
    browsers.forEach(browserName => {
      test(`should render layout correctly on ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping test for ${currentBrowser}`);
        
        await page.goto('/');

        // Test main layout structure
        const main = page.getByRole('main');
        await expect(main).toBeVisible();

        // Test grid layout
        const gridContainer = page.locator('[data-testid="grid-container"]');
        if (await gridContainer.count() > 0) {
          const display = await gridContainer.evaluate(el => 
            window.getComputedStyle(el).display
          );
          expect(display).toBe('grid');
        }

        // Test responsive behavior
        await page.setViewportSize({ width: 320, height: 568 }); // Mobile
        await expect(main).toBeVisible();

        await page.setViewportSize({ width: 1024, height: 768 }); // Desktop
        await expect(main).toBeVisible();
      });
    });
  });

  test.describe('JavaScript ES2018+ Features', () => {
    browsers.forEach(browserName => {
      test(`should support required JavaScript features on ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping test for ${currentBrowser}`);
        
        await page.goto('/');

        const jsFeatures = await page.evaluate(() => {
          return {
            asyncAwait: (async () => true)() instanceof Promise,
            spread: [...[1, 2, 3]].length === 3,
            destructuring: (() => { const [a] = [1]; return a === 1; })(),
            arrows: (() => [1].map(x => x * 2)[0] === 2)(),
            classes: (() => { class Test {} return typeof Test === 'function'; })(),
            modules: typeof import === 'function',
            uint8Array: typeof Uint8Array === 'function',
            weakMap: typeof WeakMap === 'function',
            symbol: typeof Symbol === 'function'
          };
        });

        // All features should be supported
        Object.entries(jsFeatures).forEach(([feature, supported]) => {
          expect(supported).toBe(true);
        });
      });
    });
  });

  test.describe('Memory Management Across Browsers', () => {
    browsers.forEach(browserName => {
      test(`should manage memory efficiently on ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping test for ${currentBrowser}`);
        
        await page.goto('/');

        // Start memory monitoring
        const initialMemory = await page.evaluate(() => {
          // @ts-ignore
          return (performance as any).memory?.usedJSHeapSize || 0;
        });

        // Run simulation for extended period
        const playButton = page.getByRole('button', { name: /play|pause/i });
        await playButton.click();

        // Wait for significant time
        await page.waitForTimeout(5000);

        // Stop simulation
        await playButton.click();

        // Check final memory
        const finalMemory = await page.evaluate(() => {
          // @ts-ignore
          return (performance as any).memory?.usedJSHeapSize || 0;
        });

        // Memory growth should be reasonable (if memory API available)
        if (initialMemory > 0 && finalMemory > 0) {
          const memoryGrowth = (finalMemory - initialMemory) / 1024 / 1024; // MB
          expect(memoryGrowth).toBeLessThan(50); // Less than 50MB growth
        }
      });
    });
  });

  test.describe('Network Conditions', () => {
    test('should work under slow network conditions', async ({ page }) => {
      // Simulate slow 3G
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 100); // Add 100ms delay
      });

      await page.goto('/');

      // Should still load and be functional
      const playButton = page.getByRole('button', { name: /play|pause/i });
      await expect(playButton).toBeVisible({ timeout: 10000 });

      await playButton.click();
      await expect(playButton).toHaveAttribute('aria-pressed', 'true');
    });

    test('should handle offline conditions gracefully', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Go offline
      await page.context().setOffline(true);

      // App should continue to work (it's fully client-side)
      const playButton = page.getByRole('button', { name: /play|pause/i });
      await playButton.click();
      await expect(playButton).toHaveAttribute('aria-pressed', 'true');

      const stepButton = page.getByRole('button', { name: /step/i });
      await stepButton.click();
      
      const generation = page.getByText(/generation.*1/i);
      await expect(generation).toBeVisible();
    });
  });

  test.describe('Font and Text Rendering', () => {
    browsers.forEach(browserName => {
      test(`should render text correctly on ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping test for ${currentBrowser}`);
        
        await page.goto('/');

        // Test that text is readable
        const headings = page.locator('h1, h2, h3');
        const count = await headings.count();
        
        for (let i = 0; i < count; i++) {
          const heading = headings.nth(i);
          await expect(heading).toBeVisible();
          
          const text = await heading.textContent();
          expect(text).toBeTruthy();
          expect(text!.length).toBeGreaterThan(0);
        }

        // Test monospace font for rule notation
        const ruleInput = page.getByDisplayValue(/B3\/S23/i);
        const fontFamily = await ruleInput.evaluate(el => 
          window.getComputedStyle(el).fontFamily
        );
        
        // Should use monospace font
        expect(fontFamily.toLowerCase()).toMatch(/mono|courier|consolas|menlo/);
      });
    });
  });

  test.describe('Color and Contrast', () => {
    test('should meet contrast requirements in all browsers', async ({ page }) => {
      await page.goto('/');

      // Test that text has sufficient contrast
      const textElements = page.locator('button, p, span, div');
      const count = Math.min(await textElements.count(), 10); // Test first 10

      for (let i = 0; i < count; i++) {
        const element = textElements.nth(i);
        const text = await element.textContent();
        
        if (text && text.trim().length > 0) {
          const styles = await element.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              fontSize: computed.fontSize
            };
          });

          // Basic checks - actual contrast calculation would be more complex
          expect(styles.color).not.toBe(styles.backgroundColor);
          expect(styles.fontSize).toBeTruthy();
        }
      }
    });
  });
});
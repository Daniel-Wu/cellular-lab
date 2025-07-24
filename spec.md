# Cellular Automata Web App Specification

## Project Overview

**CellularLab** is a minimal, lightweight web application for exploring cellular automata behavior through interactive simulation and basic pattern analysis. The app targets students and curious minds interested in complex systems and emergent behavior.

**Design Goals**: Simplicity, maintainability, and fast performance with minimal dependencies.

---

## Design Language & Visual Identity

### Design Philosophy
- **Minimal Complexity**: Clean, uncluttered interface focused on the grid
- **Immediate Feedback**: Visual changes happen instantly
- **Mobile-First**: Touch-friendly controls and responsive design

### Color Palette
```scss
// Primary Colors
$primary-dark:     #1a1a2e    // Deep navy for headers
$primary-medium:   #16213e    // Medium blue for panels
$primary-light:    #0f4c75    // Accent blue for buttons

// Cell Colors
$cell-alive:       #00d4ff    // Bright cyan for living cells
$cell-dead:        #1a1a2a    // Dark gray for dead cells
$grid-line:        #333344    // Subtle grid borders

// UI Colors
$background:       #0a0a0f    // Very dark background
$surface:          #1e1e2f    // Panel background
$text-primary:     #ffffff    // Primary text
$text-secondary:   #b0b0c4    // Secondary text
$success:          #4caf50    // Success states
$warning:          #ff6b35    // Warnings/errors
```

### Typography
- **Primary**: System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI'`)
- **Monospace**: `'Monaco', 'Menlo', monospace` for rules
- **Sizes**: 12px, 14px, 16px, 20px, 24px

---

## Core Features (Minimal Set)

### 1. Interactive Grid Simulation
- **Grid sizes**: 20x20, 50x50, 100x100, 200x200 (dropdown selection)
- **Live editing**: Click/tap to toggle cells, drag to paint
- **Real-time simulation** at user-controlled speed
- **Basic export**: Save grid as PNG image

### 2. Rule Management
- **Preset rules**: Conway's Life (B3/S23), HighLife (B36/S23), Seeds (B2/S), Day & Night (B3678/S34567)
- **Custom rules**: Simple B/S notation input with live validation
- **Rule switching**: Apply new rules to current grid state

### 3. Basic Pattern Library
- **Famous patterns**: Glider, Blinker, Block, Beacon, Toad (hardcoded)
- **Pattern placement**: Click to place pattern at cursor position
- **Simple import**: Paste RLE format patterns

### 4. Simulation Controls
- **Play/Pause**: Start/stop animation
- **Step**: Advance one generation
- **Speed control**: 100ms to 2000ms per generation (slider)
- **Reset**: Clear grid to empty state
- **Generation counter**: Display current generation number

---

## Technical Architecture & Data Models

### Core State Management

```typescript
// Main application state
interface AppState {
  grid: {
    current: Uint8Array;      // Flat array: index = y * width + x
    width: number;            // Grid width (20-200)
    height: number;           // Grid height (20-200)
    generation: number;       // Current generation (max: 999999)
  };
  simulation: {
    isRunning: boolean;
    speed: number;            // ms between generations (100-2000)
    intervalId: number | null;
  };
  rule: {
    birth: number[];          // Birth conditions [0-8]
    survival: number[];       // Survival conditions [0-8]
    notation: string;         // Display string "B3/S23"
  };
  ui: {
    selectedPattern: string | null;
    isDrawing: boolean;
    lastDrawnCell: number | null;
    showGrid: boolean;        // Grid lines on/off
  };
}

// Grid coordinate system: (0,0) at top-left, row-major storage
// Index calculation: index = y * width + x
// Boundary condition: Fixed edges (cells outside grid are always dead)
```

### Rule Engine

```typescript
interface Rule {
  birth: number[];
  survival: number[];
  notation: string;
}

// Totalistic rules only (Moore neighborhood: 8 surrounding cells)
class RuleEngine {
  // Count living neighbors for cell at (x, y)
  private countNeighbors(grid: Uint8Array, width: number, height: number, x: number, y: number): number {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue; // Skip center cell
        const nx = x + dx;
        const ny = y + dy;
        // Fixed boundary: out-of-bounds cells are dead
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const index = ny * width + nx;
          count += grid[index];
        }
      }
    }
    return count;
  }

  // Apply rule to generate next generation
  computeNextGeneration(grid: Uint8Array, width: number, height: number, rule: Rule): Uint8Array {
    const nextGrid = new Uint8Array(grid.length);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const neighbors = this.countNeighbors(grid, width, height, x, y);
        const isAlive = grid[index] === 1;
        
        if (isAlive) {
          nextGrid[index] = rule.survival.includes(neighbors) ? 1 : 0;
        } else {
          nextGrid[index] = rule.birth.includes(neighbors) ? 1 : 0;
        }
      }
    }
    
    return nextGrid;
  }
}
```

### Pattern Format

```typescript
// Simplified pattern format (internal use only)
interface Pattern {
  name: string;
  width: number;
  height: number;
  cells: Array<{x: number, y: number}>; // Relative coordinates of living cells
  rule?: string; // Optional rule suggestion
}

// RLE import (basic subset)
class RLEParser {
  // Parse simple RLE: "bo$2bo$3o!"
  // b = dead cell, o = living cell, $ = end of line, ! = end of pattern
  static parse(rle: string): Pattern | null {
    // Implementation handles basic RLE syntax only
    // Returns null for unsupported features
  }
}
```

---

## Error Handling & Edge Cases

### Memory Management

```typescript
interface MemoryLimits {
  maxGridSize: 200 * 200;     // 40,000 cells maximum
  maxGenerations: 999999;     // Counter limit
  maxHistorySteps: 0;         // No undo/redo (keeps it simple)
}

// Memory cleanup strategy
class MemoryManager {
  // Automatic cleanup when grid size changes
  static clearGrid(): void {
    // Reset generation counter
    // Clear any pending intervals
    // Force garbage collection hint
  }
}
```

### Error Handling Strategy

```typescript
// Centralized error handling
enum ErrorType {
  CANVAS_UNSUPPORTED = 'canvas_unsupported',
  MEMORY_EXCEEDED = 'memory_exceeded',
  INVALID_RULE = 'invalid_rule',
  PATTERN_TOO_LARGE = 'pattern_too_large',
  IMPORT_FAILED = 'import_failed'
}

class ErrorHandler {
  static handle(error: ErrorType, context?: any): void {
    switch (error) {
      case ErrorType.CANVAS_UNSUPPORTED:
        // Show fallback message: "Canvas not supported. Please use a modern browser."
        break;
      case ErrorType.INVALID_RULE:
        // Show inline validation error below rule input
        break;
      case ErrorType.PATTERN_TOO_LARGE:
        // "Pattern too large for current grid size"
        break;
      default:
        // Generic: "Something went wrong. Please refresh the page."
    }
  }
}
```

### Input Validation

```typescript
class RuleValidator {
  // Validate B/S notation: "B3/S23"
  static validateRule(notation: string): {valid: boolean, error?: string} {
    const regex = /^B([0-8]*)\/S([0-8]*)$/;
    const match = notation.match(regex);
    
    if (!match) {
      return {valid: false, error: 'Format: B3/S23 (numbers 0-8 only)'};
    }
    
    const birth = match[1].split('').map(Number);
    const survival = match[2].split('').map(Number);
    
    // Check for duplicates
    if (new Set(birth).size !== birth.length) {
      return {valid: false, error: 'Duplicate birth conditions'};
    }
    if (new Set(survival).size !== survival.length) {
      return {valid: false, error: 'Duplicate survival conditions'};
    }
    
    return {valid: true};
  }
}
```

---

## Responsive Design & Mobile Support

### Breakpoints & Layout

```typescript
// Mobile-first responsive design
interface Breakpoints {
  mobile: '320px - 767px';   // Single column, stacked layout
  tablet: '768px - 1023px';  // Sidebar collapses to tabs
  desktop: '1024px+';        // Full sidebar layout
}

// Touch interaction handling
class TouchHandler {
  private isDrawing = false;
  private lastTouchCell: number | null = null;
  
  handleTouchStart(event: TouchEvent, gridElement: HTMLCanvasElement): void {
    event.preventDefault(); // Prevent scrolling
    this.isDrawing = true;
    const cell = this.getTouchCell(event, gridElement);
    if (cell !== null) {
      this.toggleCell(cell);
      this.lastTouchCell = cell;
    }
  }
  
  handleTouchMove(event: TouchEvent, gridElement: HTMLCanvasElement): void {
    if (!this.isDrawing) return;
    event.preventDefault();
    const cell = this.getTouchCell(event, gridElement);
    if (cell !== null && cell !== this.lastTouchCell) {
      this.toggleCell(cell);
      this.lastTouchCell = cell;
    }
  }
  
  private getTouchCell(event: TouchEvent, canvas: HTMLCanvasElement): number | null {
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];
    const x = Math.floor((touch.clientX - rect.left) / (rect.width / gridWidth));
    const y = Math.floor((touch.clientY - rect.top) / (rect.height / gridHeight));
    
    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
      return y * gridWidth + x;
    }
    return null;
  }
}
```

### Mobile Layout Adaptations

```scss
// Mobile-specific styles
@media (max-width: 767px) {
  .grid-container {
    // Grid takes full width, square aspect ratio
    width: 100vw;
    height: 100vw;
    max-width: 400px;
    max-height: 400px;
  }
  
  .controls {
    // Controls stack vertically below grid
    flex-direction: column;
    gap: 8px;
    padding: 16px;
  }
  
  .rule-input {
    // Larger touch targets
    min-height: 44px;
    font-size: 16px; // Prevent zoom on iOS
  }
}
```

---

## Accessibility (WCAG 2.1 AA)

### Keyboard Navigation

```typescript
// Keyboard accessibility
class KeyboardHandler {
  handleKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case ' ':
        event.preventDefault();
        this.togglePlayPause();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.stepForward();
        break;
      case 'r':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.resetGrid();
        }
        break;
      case 'Escape':
        this.clearSelection();
        break;
    }
  }
}
```

### Screen Reader Support

```typescript
// ARIA live regions for dynamic updates
interface A11yAnnouncements {
  gridState: string;    // "Grid updated. Generation 42. 156 living cells."
  ruleChange: string;   // "Rule changed to Conway's Life: B3/S23"
  simulationState: string; // "Simulation started" / "Simulation paused"
}

class AccessibilityManager {
  private liveRegion: HTMLElement;
  
  announceChange(type: keyof A11yAnnouncements, message: string): void {
    // Debounced announcements to avoid spam
    clearTimeout(this.announceTimeout);
    this.announceTimeout = setTimeout(() => {
      this.liveRegion.textContent = message;
    }, 100);
  }
}
```

### High Contrast & Color Support

```scss
// High contrast mode support
@media (prefers-contrast: high) {
  :root {
    --cell-alive: #ffffff;
    --cell-dead: #000000;
    --grid-line: #808080;
    --background: #000000;
    --text-primary: #ffffff;
  }
}

// Reduced motion support
@media (prefers-reduced-motion: reduce) {
  .cell-transition {
    transition: none;
  }
  
  .simulation-speed {
    min-value: 500ms; // Slower minimum speed
  }
}
```

---

## Performance & Rendering

### Canvas Rendering Strategy

```typescript
class GridRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cellSize: number;
  private devicePixelRatio: number;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.devicePixelRatio = window.devicePixelRatio || 1;
    
    // Handle Canvas creation failure
    if (!this.ctx) {
      throw new Error(ErrorType.CANVAS_UNSUPPORTED);
    }
  }
  
  // Efficient full grid redraw (no dirty region tracking for simplicity)
  render(grid: Uint8Array, width: number, height: number, showGrid: boolean): void {
    // Calculate cell size based on canvas dimensions
    this.cellSize = Math.min(
      this.canvas.width / width,
      this.canvas.height / height
    );
    
    // Clear canvas
    this.ctx.fillStyle = '#1a1a2a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw cells (only living cells for performance)
    this.ctx.fillStyle = '#00d4ff';
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === 1) {
        const x = (i % width) * this.cellSize;
        const y = Math.floor(i / width) * this.cellSize;
        this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
      }
    }
    
    // Optional grid lines (only for smaller grids)
    if (showGrid && width <= 50) {
      this.drawGridLines(width, height);
    }
  }
  
  private drawGridLines(width: number, height: number): void {
    this.ctx.strokeStyle = '#333344';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    
    // Vertical lines
    for (let x = 0; x <= width; x++) {
      const xPos = x * this.cellSize;
      this.ctx.moveTo(xPos, 0);
      this.ctx.lineTo(xPos, height * this.cellSize);
    }
    
    // Horizontal lines
    for (let y = 0; y <= height; y++) {
      const yPos = y * this.cellSize;
      this.ctx.moveTo(0, yPos);
      this.ctx.lineTo(width * this.cellSize, yPos);
    }
    
    this.ctx.stroke();
  }
}
```

### Performance Targets & Monitoring

```typescript
interface PerformanceTargets {
  frameRate: 60; // FPS for 200x200 grid
  renderTime: 16; // Max ms per frame (60fps = 16.67ms)
  memoryUsage: 50; // Max MB for entire app
  startupTime: 2000; // Max ms to interactive
}

// Simple performance monitoring
class PerformanceMonitor {
  private renderTimes: number[] = [];
  
  measureRender(renderFn: () => void): void {
    const start = performance.now();
    renderFn();
    const end = performance.now();
    
    this.renderTimes.push(end - start);
    if (this.renderTimes.length > 60) {
      this.renderTimes.shift(); // Keep last 60 measurements
    }
    
    // Simple performance warning
    const avgRenderTime = this.renderTimes.reduce((a, b) => a + b) / this.renderTimes.length;
    if (avgRenderTime > 16) {
      console.warn(`Slow rendering detected: ${avgRenderTime.toFixed(2)}ms average`);
    }
  }
}
```

---

## File Formats & Import/Export

### Pattern Export

```typescript
// Simple JSON export format
interface ExportedPattern {
  name: string;
  created: string; // ISO date string
  grid: {
    width: number;
    height: number;
    data: number[]; // Sparse format: [x, y] pairs of living cells
  };
  rule: string; // B/S notation
  generation: number;
}

class PatternExporter {
  // Export current grid state as JSON
  static exportAsJSON(grid: Uint8Array, width: number, height: number, rule: string, generation: number): string {
    const livingCells: number[] = [];
    
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === 1) {
        const x = i % width;
        const y = Math.floor(i / width);
        livingCells.push(x, y);
      }
    }
    
    const pattern: ExportedPattern = {
      name: `Pattern_${Date.now()}`,
      created: new Date().toISOString(),
      grid: { width, height, data: livingCells },
      rule,
      generation
    };
    
    return JSON.stringify(pattern, null, 2);
  }
  
  // Export as PNG image
  static exportAsPNG(canvas: HTMLCanvasElement): void {
    const link = document.createElement('a');
    link.download = `cellular_automata_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }
}
```

### Basic RLE Import

```typescript
// Minimal RLE parser (subset of full specification)
class RLEImporter {
  static import(rleText: string): Pattern | null {
    try {
      const lines = rleText.trim().split('\n');
      const headerLine = lines.find(line => line.startsWith('#r') || line.startsWith('x'));
      
      if (!headerLine) return null;
      
      // Parse header: "x = 3, y = 3, rule = B3/S23"
      const xMatch = headerLine.match(/x\s*=\s*(\d+)/);
      const yMatch = headerLine.match(/y\s*=\s*(\d+)/);
      
      if (!xMatch || !yMatch) return null;
      
      const width = parseInt(xMatch[1]);
      const height = parseInt(yMatch[1]);
      
      // Find pattern data (non-comment lines)
      const patternData = lines
        .filter(line => !line.startsWith('#') && !line.includes('='))
        .join('');
      
      return this.parseRLEData(patternData, width, height);
    } catch (error) {
      return null;
    }
  }
  
  private static parseRLEData(data: string, width: number, height: number): Pattern | null {
    const cells: Array<{x: number, y: number}> = [];
    let x = 0, y = 0;
    let i = 0;
    
    while (i < data.length && y < height) {
      const char = data[i];
      
      if (char === 'b') {
        x++; // Dead cell
      } else if (char === 'o') {
        cells.push({x, y});
        x++;
      } else if (char === '$') {
        x = 0;
        y++;
      } else if (char === '!') {
        break; // End of pattern
      } else if (/\d/.test(char)) {
        // Run length encoding (simplified)
        const runLength = parseInt(char);
        const nextChar = data[i + 1];
        
        if (nextChar === 'o') {
          for (let j = 0; j < runLength; j++) {
            cells.push({x: x + j, y});
          }
          x += runLength;
          i++; // Skip next character
        } else if (nextChar === 'b') {
          x += runLength;
          i++; // Skip next character
        }
      }
      
      i++;
      
      // Bounds checking
      if (x >= width) {
        x = 0;
        y++;
      }
    }
    
    return {
      name: 'Imported Pattern',
      width,
      height,
      cells
    };
  }
}
```

---

## Browser Compatibility & Testing

### Minimum Requirements

```typescript
interface BrowserSupport {
  minimum: {
    chrome: '80+';     // March 2020
    firefox: '75+';    // April 2020
    safari: '13+';     // September 2019
    edge: '80+';       // February 2020
  };
  features: [
    'Canvas 2D Context',
    'Local Storage',
    'ES2018+ (async/await, spread operator)',
    'CSS Grid',
    'CSS Custom Properties'
  ];
  mobile: {
    ios: '13+';
    android: '7+';
  };
}

// Feature detection
class FeatureDetection {
  static checkSupport(): {supported: boolean, missing: string[]} {
    const missing: string[] = [];
    
    // Canvas support
    const canvas = document.createElement('canvas');
    if (!canvas.getContext('2d')) {
      missing.push('Canvas 2D');
    }
    
    // Local Storage
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
    } catch {
      missing.push('Local Storage');
    }
    
    // CSS Grid
    if (!CSS.supports('display', 'grid')) {
      missing.push('CSS Grid');
    }
    
    return {
      supported: missing.length === 0,
      missing
    };
  }
}
```

### Testing Strategy

```typescript
// Test categories and coverage targets
interface TestingPlan {
  unit: {
    coverage: '90%';
    focus: [
      'RuleEngine.computeNextGeneration',
      'RuleValidator.validateRule',
      'RLEImporter.import',
      'GridRenderer.render'
    ];
  };
  integration: {
    scenarios: [
      'Complete simulation workflow',
      'Pattern import/export cycle',
      'Rule switching during simulation',
      'Grid size changes'
    ];
  };
  browser: {
    matrix: [
      'Chrome 80+ (Windows, macOS, Android)',
      'Firefox 75+ (Windows, macOS)',
      'Safari 13+ (macOS, iOS)',
      'Edge 80+ (Windows)'
    ];
  };
  performance: {
    benchmarks: [
      '200x200 grid at 60fps for 10 seconds',
      'Rule switching latency < 50ms',
      'Pattern import time < 200ms',
      'Memory usage stable over 1000 generations'
    ];
  };
}
```

---

## Project Timeline & Deliverables

### Development Phases

#### Phase 1: Core Engine (Week 1-2)
**Deliverables:**
- Grid data structures and coordinate system
- Basic rule engine with Conway's Life
- Canvas rendering system
- Simple play/pause/step controls

**Acceptance Criteria:**
- Conway's Life runs smoothly on 100x100 grid
- Click to toggle cells works
- Generation counter updates correctly

#### Phase 2: UI & Interactions (Week 3)
**Deliverables:**
- Complete responsive layout
- Touch/mouse interaction handling
- Rule input with validation
- Grid size selector

**Acceptance Criteria:**
- Works on mobile Safari and Chrome
- Rule validation shows helpful error messages
- Grid resizing preserves existing patterns

#### Phase 3: Patterns & Polish (Week 4)
**Deliverables:**
- Pattern library with famous patterns
- Basic RLE import
- PNG export functionality
- Accessibility features

**Acceptance Criteria:**
- All WCAG 2.1 AA requirements met
- Pattern placement works intuitively
- Export generates valid files

#### Phase 4: Testing & Deployment (Week 5)
**Deliverables:**
- Complete test suite
- Cross-browser compatibility fixes
- Performance optimizations
- Production deployment

**Acceptance Criteria:**
- All tests passing on target browsers
- Performance benchmarks met
- App deployed and accessible

---

## Tech Stack (Final, Minimal)

### Core Framework
- **React 18** with TypeScript
- **Vite** for development and building
- **Zustand** for lightweight state management (simpler than Redux)

### Styling & UI
- **Tailwind CSS** for utility-first styling
- **Lucide React** for icons
- **React Hot Toast** for notifications

### Testing & Quality
- **Vitest** for unit testing
- **Playwright** for E2E testing
- **ESLint** + **Prettier** for code quality

### Deployment
- **Vercel** for static hosting
- **GitHub Actions** for CI/CD

### No Backend Required
- Everything runs client-side
- Local Storage for preferences
- Static JSON files for preset patterns

---

## Success Metrics & KPIs

### Performance Benchmarks
- **60 FPS** sustained on 200x200 grid
- **< 50ms** rule switching latency
- **< 2s** initial page load
- **< 5MB** total app size

### User Experience Goals
- **Zero crashes** during normal usage
- **Intuitive controls** requiring no documentation
- **Accessible** to screen reader users
- **Fast** on 3-year-old mobile devices

### Code Quality Targets
- **90%+ test coverage** for core logic
- **Zero TypeScript errors** in production build
- **A+ Lighthouse score** for accessibility
- **Maintainable** codebase with clear separation of concerns

This specification provides a complete, implementable foundation for a minimal yet powerful cellular automata web application that prioritizes simplicity, performance, and maintainability.

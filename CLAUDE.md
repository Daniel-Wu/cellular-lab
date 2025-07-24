# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CellularLab is a minimal, lightweight React/TypeScript web application for exploring cellular automata behavior through interactive simulation and pattern analysis. The app targets students and curious minds interested in complex systems and emergent behavior.

**Key Principles**: Simplicity, maintainability, and fast performance with minimal dependencies. Everything runs client-side with no backend required.

## Development Commands

Since this project hasn't been set up yet, these are the expected commands based on the tech stack:

```bash
# Development
npm run dev          # Start Vite development server
npm run build        # Build for production
npm run preview      # Preview production build locally

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically
npm run typecheck    # Run TypeScript compiler check
npm run format       # Run Prettier formatting

# Testing
npm test             # Run unit tests with Vitest
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate test coverage report
npm run test:e2e     # Run Playwright E2E tests
```

## Architecture & Core Components

### Tech Stack
- **React 18** with TypeScript for UI
- **Vite** for development and building
- **Zustand** for lightweight state management
- **Tailwind CSS** for utility-first styling
- **Canvas 2D** for high-performance grid rendering
- **Vitest** for unit testing, **Playwright** for E2E

### Key Data Structures

```typescript
// Main application state
interface AppState {
  grid: {
    current: Uint8Array;      // Flat array: index = y * width + x
    width: number;            // Grid width (20-200)
    height: number;           // Grid height (20-200)
    generation: number;       // Current generation
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
}
```

### Core Systems

1. **RuleEngine** - Implements totalistic cellular automata rules with Moore neighborhood
2. **GridRenderer** - Canvas-based rendering system optimized for 60fps on 200x200 grids
3. **PatternLibrary** - Manages famous patterns (Glider, Blinker, etc.) and RLE import
4. **TouchHandler** - Mobile-first interaction system with drag painting
5. **AccessibilityManager** - WCAG 2.1 AA compliance with keyboard navigation

### File Organization

Expected structure when implemented:
```
src/
├── components/          # React components
│   ├── Grid/           # Grid canvas and interaction
│   ├── Controls/       # Simulation controls
│   ├── RuleInput/      # Rule editor with validation
│   └── PatternLibrary/ # Pattern selection and import
├── hooks/              # Custom React hooks
├── stores/             # Zustand state stores
├── engines/            # Core logic (RuleEngine, etc.)
├── utils/              # Utility functions
└── types/              # TypeScript type definitions
```

## Performance Requirements

- **60 FPS** sustained on 200x200 grid
- **< 50ms** rule switching latency
- **< 2s** initial page load
- **< 5MB** total app size

Key optimizations:
- Use Uint8Array for memory-efficient grid storage
- Canvas rendering with minimal redraws
- Efficient neighbor counting algorithm
- Mobile-first responsive design

## Development Guidelines

### Grid Coordinate System
- Origin (0,0) at top-left
- Row-major storage: `index = y * width + x`
- Fixed boundary conditions (cells outside grid are always dead)

### Rule Format
- B/S notation: "B3/S23" (Birth on 3 neighbors, Survive with 2-3 neighbors)
- Validation regex: `/^B([0-8]*)\/S([0-8]*)$/`
- Support for totalistic rules only (Moore neighborhood)

### Mobile Support
- Touch-friendly controls with 44px minimum touch targets
- Prevent iOS zoom with `font-size: 16px` on inputs
- Responsive breakpoints: mobile (320-767px), tablet (768-1023px), desktop (1024px+)

### Accessibility
- Full keyboard navigation (Space = play/pause, Arrow keys = step, R = reset)
- ARIA live regions for dynamic announcements
- High contrast mode support
- Screen reader compatibility

### Testing Strategy
- **Unit tests**: Core logic (RuleEngine, validation, parsing)
- **Integration tests**: Complete workflows (simulation, import/export)
- **E2E tests**: Cross-browser compatibility matrix
- **Performance tests**: 60fps benchmarks and memory usage

## Error Handling

Key error scenarios:
- Canvas not supported → Show fallback message
- Invalid rule format → Inline validation errors
- Pattern too large → Size validation
- Memory exceeded → Graceful degradation
- Import failures → Clear error messages

## Browser Support

Minimum requirements:
- Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- Canvas 2D Context, Local Storage, ES2018+
- CSS Grid, CSS Custom Properties
- iOS 13+, Android 7+

## Import/Export Formats

- **RLE import**: Basic subset for pattern loading
- **JSON export**: Custom format for grid state
- **PNG export**: Canvas image export functionality

## Design System

### Color Palette
- Living cells: `#00d4ff` (bright cyan)
- Dead cells: `#1a1a2a` (dark gray)
- Background: `#0a0a0f` (very dark)
- Grid lines: `#333344` (subtle borders)

### Typography
- Primary: System font stack
- Monospace: Monaco/Menlo for rule notation
- Sizes: 12px, 14px, 16px, 20px, 24px
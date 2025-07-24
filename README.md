# CellularLab

**CellularLab** is a minimal, lightweight web application for exploring cellular automata behavior through interactive simulation and basic pattern analysis. Built for students and curious minds interested in complex systems and emergent behavior.

## Features

- **Interactive Grid Simulation** - Multiple grid sizes (20x20 to 200x200) with live cell editing
- **Real-time Simulation** - User-controlled speed with play/pause/step controls
- **Rule Management** - Conway's Life, HighLife, Seeds, Day & Night, plus custom B/S notation rules
- **Pattern Library** - Famous patterns like Glider, Blinker, Block, Beacon, and Toad
- **Import/Export** - RLE pattern import and PNG image export
- **Mobile-First Design** - Touch-friendly controls and responsive layout
- **Accessibility** - Full WCAG 2.1 AA compliance with keyboard navigation and screen reader support

## Tech Stack

- **React 18** with TypeScript
- **Vite** for development and building
- **Zustand** for lightweight state management
- **Tailwind CSS** for utility-first styling
- **Canvas 2D** for high-performance rendering
- **Vercel** for deployment

## Performance Targets

- 60 FPS sustained on 200x200 grid
- < 50ms rule switching latency
- < 2s initial page load
- < 5MB total app size

## Design Philosophy

Prioritizes simplicity, maintainability, and fast performance with minimal dependencies. Everything runs client-side with no backend required.

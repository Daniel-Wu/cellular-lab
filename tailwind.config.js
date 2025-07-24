/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          dark: '#1a1a2e',
          medium: '#16213e',
          light: '#0f4c75',
        },
        cell: {
          alive: '#00d4ff',
          dead: '#1a1a2a',
        },
        grid: {
          line: '#333344',
        },
        background: '#0a0a0f',
        surface: '#1e1e2f',
        text: {
          primary: '#ffffff',
          secondary: '#b0b0c4',
        },
        success: '#4caf50',
        warning: '#ff6b35',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Monaco', 'Menlo', 'monospace'],
      },
      fontSize: {
        '12': '12px',
        '14': '14px',
        '16': '16px',
        '20': '20px',
        '24': '24px',
      },
      screens: {
        'reduce-motion': { 'raw': '(prefers-reduced-motion: reduce)' },
        'high-contrast': { 'raw': '(prefers-contrast: high)' },
      },
    },
  },
  plugins: [],
}
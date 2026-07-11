import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FBF6EC',
        sand: '#F3E9D8',
        card: '#FFFDF8',
        line: '#EADBC4',
        acorn: { DEFAULT: '#8A5A2B', dark: '#5C3B1E' },
        caramel: '#C98A3C',
        bark: '#4A3728',
        leaf: '#7FA35A',
        blush: '#F2A9A0',
      },
      fontFamily: {
        // System font stack (Phase 0 choice — see report). `--font-sans` lets the app layer
        // later opt into a bundled next/font without touching this config.
        sans: [
          'var(--font-sans)',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        soft: '0 2px 12px rgba(74, 55, 40, 0.06)',
      },
    },
  },
  plugins: [],
};
export default config;

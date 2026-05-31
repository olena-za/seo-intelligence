import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './features/**/*.{js,ts,jsx,tsx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
    './types/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        border: 'rgba(148, 163, 184, 0.24)',
        muted: '#94a3b8',
        surface: '#0f172a',
        surface2: '#111827',
        panel: '#111827',
        panel2: '#0f172a',
        accent: '#38bdf8',
        accent2: '#60a5fa'
      },
      boxShadow: {
        panel: '0 20px 45px rgba(15, 23, 42, 0.18)'
      }
    }
  },
  plugins: [],
};

export default config;

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        accent: {
          yellow: '#f59e0b',
          pink: '#ec4899',
          green: '#10b981',
          cyan: '#06b6d4',
          orange: '#f97316',
        },
        game: {
          dark: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          light: '#f8fafc',
          lightCard: '#ffffff',
          lightBorder: '#e2e8f0',
        },
        classic: {
          blue: '#2B7FE0',
          border: '#3B82F6',
          bg: '#F5F7FA',
          panel: '#FFFFFF',
          header: '#EEF2FF',
        },
      },
      fontFamily: {
        game: ['Outfit', 'Fredoka', 'system-ui', 'sans-serif'],
      },
      animation: {
        'bounce-subtle': 'bounce 2s infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wiggle': 'wiggle 0.5s ease-in-out infinite',
        'score-bounce': 'scoreBounce 0.6s ease-in-out',
        'correct-flash': 'correctFlash 1.5s ease-out',
        'float-up': 'floatUp 1s ease-out forwards',
        'timer-urgent': 'timerUrgent 0.5s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        scoreBounce: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
        },
        correctFlash: {
          '0%': { backgroundColor: '#dcfce7' },
          '100%': { backgroundColor: 'transparent' },
        },
        floatUp: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-30px)' },
        },
        timerUrgent: {
          '0%, 100%': { color: '#ef4444', transform: 'scale(1)' },
          '50%': { color: '#dc2626', transform: 'scale(1.1)' },
        },
      },
    },
  },
  plugins: [],
}

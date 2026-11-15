/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kds: {
          dark: '#0a0e17',
          surface: '#111827',
          card: '#161f30',
          border: '#1f2d45',
          hover: '#22324e',
          text: {
            primary: '#f8fafc',
            secondary: '#94a3b8',
            muted: '#64748b',
          },
          accent: {
            gold: '#f59e0b',
            saffron: '#eab308',
          },
          status: {
            incoming: '#38bdf8',
            preparing: '#f59e0b',
            ready: '#10b981',
            served: '#818cf8',
            completed: '#64748b',
            cancelled: '#ef4444',
          },
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

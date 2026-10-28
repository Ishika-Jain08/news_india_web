/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f3efe6',
        ink: '#1c1915',
        card: '#fffdf8',
        line: '#e4d8c4',
        crimson: '#9f1d1d',
        navy: '#172033',
        gold: '#8a5a12',
        muted: '#5f584f',
      },
      fontFamily: {
        serif: ['"Source Serif 4"', '"Noto Serif Devanagari"', 'Georgia', 'serif'],
        sans: ['"Source Sans 3"', '"Noto Sans Devanagari"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 12px 30px rgba(28, 25, 21, 0.06)',
      },
    },
  },
  plugins: [],
}

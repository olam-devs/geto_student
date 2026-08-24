/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0f8f4',
          100: '#d0e9dc',
          500: '#3d8c5c',
          600: '#2D6247',
          700: '#1E4835',
          800: '#1A3B2B',
          900: '#122419',
          DEFAULT: '#1E4835',
        },
        accent: {
          50:  '#fef3ec',
          100: '#fcdfc7',
          400: '#e8956a',
          500: '#D97444',
          600: '#C95F2A',
          700: '#A84B1E',
          DEFAULT: '#C95F2A',
        },
        sand: {
          50:  '#FAFAF7',
          100: '#F5F0E8',
          200: '#EDE5D8',
        },
        verified: {
          DEFAULT: '#16A34A',
          light:   '#DCFCE7',
          dark:    '#14532D',
        },
      },
      fontFamily: {
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['Syne', '"DM Sans"', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.07), 0 4px 12px 0 rgba(0,0,0,0.05)',
        lift: '0 8px 32px 0 rgba(30,72,53,0.18)',
      },
    },
  },
  plugins: [],
};

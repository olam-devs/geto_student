/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eef0f7',
          100: '#d4d9ee',
          200: '#aab0dc',
          500: '#454A7A',
          600: '#303668',
          700: '#1D2040',
          800: '#14162B',
          900: '#0D0F1F',
          DEFAULT: '#1D2040',
        },
        accent: {
          50:  '#e8faf3',
          100: '#c0f0de',
          200: '#91e4c6',
          400: '#4FE09E',
          500: '#2FD48B',
          600: '#1FA872',
          700: '#147553',
          DEFAULT: '#2FD48B',
        },
        coral: {
          50:   '#fff0ee',
          100:  '#ffd6d2',
          DEFAULT: '#FF6B5B',
          600:  '#E5503F',
          700:  '#C73527',
        },
        sand: {
          50:  '#F5F6F8',
          100: '#ECEEF2',
          200: '#DDE0E8',
        },
        verified: {
          DEFAULT: '#16A34A',
          light:   '#DCFCE7',
          dark:    '#14532D',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.07), 0 4px 12px 0 rgba(0,0,0,0.05)',
        lift: '0 8px 32px 0 rgba(20,22,43,0.22)',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 纸（暖白底）
        paper: {
          50: '#fdfcfa',
          100: '#f9f7f3',
          200: '#f3efe8',
          300: '#e9e3d9',
          400: '#dbd2c4',
        },
        // 墨（正文与主按钮）
        ink: {
          50: '#f6f6f5',
          100: '#e7e7e4',
          200: '#d2d2cc',
          300: '#b0b0a7',
          400: '#8a8a80',
          500: '#6b6b62',
          600: '#54544c',
          700: '#40403a',
          800: '#292926',
          900: '#141413',
          950: '#0b0b0a',
        },
        // 玉（强调色，只用在交互与状态）
        jade: {
          50: '#eefaf6',
          100: '#d6f3e9',
          200: '#abe6d4',
          300: '#74d2b9',
          400: '#3fb89c',
          500: '#1f9c82',
          600: '#147d69',
          700: '#126455',
          800: '#125046',
          900: '#10423a',
        },
        clay: {
          50: '#fdf4f2',
          100: '#fbe6e1',
          200: '#f6c9bf',
          300: '#eda393',
          400: '#e07862',
          500: '#cf553d',
        },
        amberish: {
          50: '#fdf8ed',
          100: '#f9eccd',
          200: '#f2d79b',
        },
      },
      fontFamily: {
        sans: [
          '"Inter"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
        display: [
          '"Iowan Old Style"',
          '"Palatino Linotype"',
          'Palatino',
          '"Songti SC"',
          '"Noto Serif SC"',
          'Georgia',
          'serif',
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,20,19,0.04), 0 1px 1px rgba(20,20,19,0.02)',
        lift: '0 12px 32px -12px rgba(20,20,19,0.14), 0 2px 8px -4px rgba(20,20,19,0.06)',
        pop: '0 24px 64px -24px rgba(20,20,19,0.28)',
        insetline: 'inset 0 0 0 1px rgba(20,20,19,0.06)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'scale-in': 'scale-in 0.16s ease-out both',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

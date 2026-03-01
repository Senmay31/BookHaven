/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand palette — warm library tones
        parchment: {
          50:  '#fdf8f0',
          100: '#f9eed8',
          200: '#f2d9a8',
          300: '#e8be72',
          400: '#dda03e',
          500: '#c9841e',
          600: '#a96715',
          700: '#874e14',
          800: '#6e3f17',
          900: '#5b3415',
        },
        teal: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#b9e6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#1a5276', // Primary
          700: '#154360',
          800: '#0f3450',
          900: '#082236',
        },
        slate: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Lora', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'parchment-texture': "url('/textures/parchment.png')",
        'hero-gradient': 'linear-gradient(135deg, #0f172a 0%, #1a5276 50%, #154360 100%)',
      },
      boxShadow: {
        'book': '4px 4px 20px rgba(0,0,0,0.15), inset -3px 0 8px rgba(0,0,0,0.1)',
        'card': '0 4px 24px rgba(0,0,0,0.08)',
        'elevated': '0 8px 48px rgba(0,0,0,0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200px 0' },
          '100%': { backgroundPosition: 'calc(200px + 100%) 0' },
        },
      },
    },
  },
  plugins: [],
};

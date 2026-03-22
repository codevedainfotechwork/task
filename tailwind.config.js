/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cyber: {
          black:  '#030712',
          dark:   '#050d1a',
          navy:   '#0a1628',
          deep:   '#0d1f3c',
          blue:   '#0ea5e9',
          indigo: '#6366f1',
          violet: '#8b5cf6',
          purple: '#a855f7',
          fuchsia:'#d946ef',
          cyan:   '#22d3ee',
          teal:   '#14b8a6',
          green:  '#10b981',
          yellow: '#eab308',
          red:    '#ef4444',
          pink:   '#ec4899',
        },
        neon: {
          blue:   '#00d4ff',
          purple: '#bf00ff',
          cyan:   '#00fff5',
          green:  '#00ff88',
          pink:   '#ff0080',
          yellow: '#f0e000',
          orange: '#ff6600',
        },
        glass: {
          white:  'rgba(255,255,255,0.04)',
          border: 'rgba(255,255,255,0.08)',
          hover:  'rgba(255,255,255,0.07)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'neon-blue':    '0 0 20px rgba(0,212,255,0.5), 0 0 60px rgba(0,212,255,0.15)',
        'neon-purple':  '0 0 20px rgba(191,0,255,0.5), 0 0 60px rgba(191,0,255,0.15)',
        'neon-cyan':    '0 0 20px rgba(0,255,245,0.5), 0 0 60px rgba(0,255,245,0.15)',
        'neon-green':   '0 0 20px rgba(0,255,136,0.5), 0 0 60px rgba(0,255,136,0.15)',
        'neon-red':     '0 0 20px rgba(255,50,50,0.6), 0 0 60px rgba(255,50,50,0.2)',
        'neon-pink':    '0 0 20px rgba(255,0,128,0.5), 0 0 60px rgba(255,0,128,0.15)',
        'holo-card':    '0 8px 32px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.05) inset',
        'holo-card-hover': '0 20px 60px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.08) inset',
        'inner-glow':   'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.3)',
        'float':        '0 20px 80px rgba(0,0,0,0.8)',
      },
      backgroundImage: {
        'cyber-grid': 'linear-gradient(rgba(0,212,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.05) 1px, transparent 1px)',
        'neon-gradient': 'linear-gradient(135deg, #00d4ff, #bf00ff)',
        'aurora':      'linear-gradient(135deg, #0a1628 0%, #1a0a3c 25%, #0a2040 50%, #1a0a3c 75%, #0a1628 100%)',
        'glass':       'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        'holo':        'linear-gradient(135deg, rgba(0,212,255,0.08) 0%, rgba(191,0,255,0.08) 50%, rgba(0,255,245,0.05) 100%)',
        'card-shine':  'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.05) 100%)',
      },
      animation: {
        'float':       'float 8s ease-in-out infinite',
        'float-slow':  'float 12s ease-in-out infinite',
        'pulse-neon':  'pulseNeon 2s ease-in-out infinite',
        'scan':        'scan 4s linear infinite',
        'rotate-slow': 'rotate 20s linear infinite',
        'shimmer':     'shimmer 2s linear infinite',
        'glow-pulse':  'glowPulse 3s ease-in-out infinite',
        'slide-up':    'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-scale':  'fadeScale 0.3s ease-out',
        'data-stream': 'dataStream 3s linear infinite',
        'border-spin': 'borderSpin 4s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-15px) rotate(1deg)' },
        },
        pulseNeon: {
          '0%, 100%': { opacity: 1, filter: 'brightness(1)' },
          '50%': { opacity: 0.7, filter: 'brightness(1.3)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0,212,255,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0,212,255,0.6), 0 0 80px rgba(0,212,255,0.2)' },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(30px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: 0, transform: 'translateX(40px)' },
          to:   { opacity: 1, transform: 'translateX(0)' },
        },
        fadeScale: {
          from: { opacity: 0, transform: 'scale(0.92)' },
          to:   { opacity: 1, transform: 'scale(1)' },
        },
        dataStream: {
          '0%':   { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '0% 100%' },
        },
        borderSpin: {
          '0%':   { '--angle': '0deg' },
          '100%': { '--angle': '360deg' },
        },
      },
    },
  },
  plugins: [],
}

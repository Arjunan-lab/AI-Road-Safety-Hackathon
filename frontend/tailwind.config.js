/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        tactical: ['Montserrat', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      colors: {
        void: '#030305',
        abyss: '#090a10',
        'neon-crimson': '#E11D48',
        'neon-cyan': '#00f0ff',
        'neon-amber': '#F59E0B',
        'bio-green': '#10B981',
        'glass-dark': 'rgba(9, 10, 16, 0.7)',
      },
      backgroundImage: {
        'hex-pattern': 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
      },
      animation: {
        'core-spin': 'spin 12s linear infinite',
        'pulse-neon': 'neonPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'hud-boot': 'hudBoot 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'radar-sweep': 'radarSweep 3s linear infinite',
        'slide-down': 'slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        neonPulse: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 15px rgba(225,29,72,0.6))' },
          '50%': { opacity: '0.6', filter: 'drop-shadow(0 0 5px rgba(225,29,72,0.3))' },
        },
        hudBoot: {
          '0%': { transform: 'scale(0.98) translateY(10px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-150%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    }
  },
  plugins: [],
};

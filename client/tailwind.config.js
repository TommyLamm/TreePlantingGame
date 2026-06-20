/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'bounce-slow': 'bounce-slow 4s ease-in-out infinite',
        'sway': 'sway 5s ease-in-out infinite',
        'ping-slow': 'ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite',
        'pulse-slow': 'pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 10s ease-in-out infinite',
        'fall': 'fall 12s linear infinite',
        'burst': 'burst 1.5s ease-out forwards',
        'level-up-bounce': 'level-up-bounce 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'loading-bar': 'loading-bar 2s ease-in-out infinite',
        'wiggle': 'wiggle 0.5s ease-in-out',
        'leaf-swing': 'leaf-swing 3.4s ease-in-out infinite',
        'leaf-drift': 'ambient-leaf-drift 14s linear infinite',
        'bird-cross': 'bird-cross 24s linear infinite',
        'ambient-glow': 'ambient-glow 8s ease-in-out infinite',
        'rain-streak': 'ambient-rain-fall 1.8s linear infinite',
        'snow-drift': 'ambient-snow-drift 18s linear infinite',
        'butterfly-flutter': 'companion-butterfly-path 8.5s ease-in-out infinite',
        'companion-hop': 'companion-hop 4.8s ease-in-out infinite',
      },
      keyframes: {
        'bounce-slow': {
          '0%, 100%': { transform: 'translateY(-2%)' },
          '50%': { transform: 'translateY(0)' },
        },
        'sway': {
          '0%, 100%': { transform: 'rotate(-1deg)' },
          '50%': { transform: 'rotate(1deg)' },
        },
        'ping-slow': {
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '33%': { transform: 'translateY(-50px) translateX(20px)' },
          '66%': { transform: 'translateY(-100px) translateX(-20px)' },
        },
        'fall': {
          '0%': { transform: 'translateY(-10%) translateX(0) rotate(0deg)', opacity: '0' },
          '10%': { opacity: '0.8' },
          '90%': { opacity: '0.8' },
          '100%': { transform: 'translateY(110vh) translateX(50px) rotate(360deg)', opacity: '0' },
        },
        'burst': {
          '0%': { transform: 'translateY(0) scale(0.5)', opacity: '1' },
          '50%': { transform: 'translateY(-50px) scale(1.2)', opacity: '1' },
          '100%': { transform: 'translateY(-80px) scale(1)', opacity: '0' },
        },
        'level-up-bounce': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.15) translateY(-5%)' },
          '70%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1) translateY(0)' },
        },
        'loading-bar': {
          '0%': { width: '0%' },
          '50%': { width: '70%' },
          '100%': { width: '100%' },
        },
        'wiggle': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '20%': { transform: 'rotate(-3deg)' },
          '40%': { transform: 'rotate(3deg)' },
          '60%': { transform: 'rotate(-2deg)' },
          '80%': { transform: 'rotate(2deg)' },
        },
        'leaf-swing': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) rotate(-7deg)' },
          '50%': { transform: 'translate3d(2px, 3px, 0) rotate(8deg)' },
        },
        'ambient-leaf-drift': {
          '0%': { transform: 'translate3d(0, -18vh, 0) rotate(0deg)', opacity: '0' },
          '12%, 84%': { opacity: '.7' },
          '100%': { transform: 'translate3d(120px, 118vh, 0) rotate(340deg)', opacity: '0' },
        },
        'bird-cross': {
          '0%': { transform: 'translate3d(-10vw, 0, 0) scale(.72)' },
          '100%': { transform: 'translate3d(112vw, -20px, 0) scale(.72)' },
        },
        'ambient-glow': {
          '0%, 100%': { opacity: '.78', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.04)' },
        },
        'ambient-rain-fall': {
          '0%': { transform: 'translate3d(0, -24vh, 0) rotate(10deg)', opacity: '0' },
          '14%, 82%': { opacity: '.7' },
          '100%': { transform: 'translate3d(40px, 116vh, 0) rotate(10deg)', opacity: '0' },
        },
        'ambient-snow-drift': {
          '0%': { transform: 'translate3d(0, -20vh, 0)', opacity: '0' },
          '10%, 88%': { opacity: '.7' },
          '100%': { transform: 'translate3d(80px, 112vh, 0)', opacity: '0' },
        },
        'companion-butterfly-path': {
          '0%, 100%': { transform: 'translate3d(-12px, 0, 0) rotate(-6deg)' },
          '35%': { transform: 'translate3d(18px, -24px, 0) rotate(7deg)' },
          '70%': { transform: 'translate3d(-4px, -42px, 0) rotate(-3deg)' },
        },
        'companion-hop': {
          '0%, 18%, 100%': { transform: 'translate3d(0, 0, 0) rotate(0deg)' },
          '8%': { transform: 'translate3d(0, -12px, 0) rotate(-4deg)' },
          '14%': { transform: 'translate3d(6px, 0, 0) rotate(3deg)' },
        },
      }
    },
  },
  plugins: [],
}

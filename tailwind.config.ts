import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],

  theme: {
    extend: {
      colors: {
        'bg-void': '#0a0a0a',
        'bg-surface': '#111111',
        'bg-raised': '#1a1a1a',
        'bg-overlay': '#222222',
        'text-primary': '#e8e8e8',
        'text-secondary': '#888888',
        'text-dim': '#555555',
        'border-subtle': '#1f1f1f',
        'border-default': '#2a2a2a',
        'border-focus': '#3a3a3a',
        'accent': '#ffffff',
        'accent-dim': 'rgba(255, 255, 255, 0.12)',
      },
      fontFamily: {
        serif: ['Instrument Serif', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.25rem',
        'xl': '2rem',
        '2xl': '3.5rem',
      },
    }
  },

  plugins: [typography]
} satisfies Config;

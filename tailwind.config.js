/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Backgrounds (darkest → lightest)
        base: '#0a0a0a',
        screen: '#161616',
        card: '#1e1e1e',
        surface: '#252525',
        elevated: '#2e2e2e',

        // Borders
        'border-default': '#2a2a2a',
        'border-subtle': '#1e1e1e',
        'border-emphasis': '#333333',

        // Text
        'text-primary': '#f0ede0',
        'text-secondary': '#e0ddd0',
        'text-muted': '#888888',
        'text-faint': '#666666',
        'text-ghost': '#555555',
        'text-disabled': '#3a3a3a',

        // Amber accent
        amber: {
          500: '#f0a030',
          bg: 'rgba(240,160,48,0.12)',
          border: '#634010',
          deep: '#854f0b',
        },

        // Status
        'status-ok': '#32b464',
        'status-ok-bg': 'rgba(50,180,100,0.10)',
        'status-low': '#f0a030',
        'status-low-bg': 'rgba(240,160,48,0.12)',
        'status-out': '#f05032',
        'status-out-bg': 'rgba(240,80,50,0.13)',

        // Location accents
        'loc-a': '#f0a030',
        'loc-b': '#378add',
        'loc-c': '#32b464',
        'loc-d': '#aa7aff',
        'loc-e': '#888888',
      },
      borderRadius: {
        sm: '4px',
        md: '7px',
        lg: '10px',
        pill: '20px',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      fontSize: {
        'badge': ['8px', { lineHeight: '12px', fontWeight: '500' }],
        'section': ['9px', { lineHeight: '12px', fontWeight: '500', letterSpacing: '0.06em' }],
        'meta': ['9px', { lineHeight: '14px', fontWeight: '400' }],
        'field': ['10px', { lineHeight: '14px', fontWeight: '400' }],
        'input': ['11px', { lineHeight: '16px', fontWeight: '400' }],
        'item': ['12px', { lineHeight: '18px', fontWeight: '500' }],
        'title': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'stat': ['16px', { lineHeight: '20px', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
};

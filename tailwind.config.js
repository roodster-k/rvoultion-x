/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: {
          DEFAULT: '#0f5f54',
          light: '#e0f0ee',
          hover: '#d0ece8',
          dark: '#0a4038',
        },
        accent: '#10b981',
        // Status
        status: {
          normal: { DEFAULT: '#10b981', bg: '#ecfdf5' },
          attention: { DEFAULT: '#f59e0b', bg: '#fffbeb' },
          complication: { DEFAULT: '#ef4444', bg: '#fef2f2' },
        },
        // Surfaces
        surface: {
          main: '#f5f8f7',
          white: '#ffffff',
        },
        // Text
        text: {
          dark: '#0f172a',
          muted: '#64748b',
          light: '#94a3b8',
        },
        border: '#e2e8f0',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      borderRadius: {
        'xl': '14px',
        '2xl': '20px',
        '3xl': '28px',
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.08)',
        'modal': '0 25px 60px rgba(0, 0, 0, 0.3)',
        'button': '0 4px 12px rgba(15, 95, 84, 0.3)',
        'toast': '0 10px 30px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

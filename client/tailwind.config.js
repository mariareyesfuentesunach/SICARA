/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vino: {
          DEFAULT: '#722F37',
          primary: '#722F37',
          dark: '#4A1722',
          light: '#A64D5A',
          hover: '#5D252C',
          soft: '#FBF0F2',
          border: '#E8D3D6',
        },
        app: {
          bg: '#F8F5F5',
          card: '#FFFFFF',
          text: '#292329',
          muted: '#685D68',
          border: '#E8E2E4',
        },
        status: {
          success: '#16A34A',
          'success-bg': '#DCFCE7',
          'success-border': '#86EFAC',
          error: '#DC2626',
          'error-bg': '#FEE2E2',
          'error-border': '#FCA5A5',
          warning: '#D97706',
          'warning-bg': '#FEF3C7',
          'warning-border': '#FCD34D',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(41, 35, 41, 0.05), 0 4px 16px -2px rgba(114, 47, 55, 0.04)',
        'card': '0 4px 20px -2px rgba(114, 47, 55, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'elevated': '0 12px 32px -4px rgba(74, 23, 34, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        'card': '14px',
        'subtle': '10px',
      }
    },
  },
  plugins: [],
}

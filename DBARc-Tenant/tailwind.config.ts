import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/entities/**/*.{js,ts,jsx,tsx,mdx}',
    './src/widgets/**/*.{js,ts,jsx,tsx,mdx}',
    './src/shared/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--primary-50, #f0f9ff)',
          100: 'var(--primary-100, #e0f2fe)',
          200: 'var(--primary-200, #bae6fd)',
          300: 'var(--primary-300, #7dd3fc)',
          400: 'var(--primary-400, #38bdf8)',
          500: 'var(--primary-500, #0ea5e9)',
          600: 'var(--primary-600, #0284c7)',
          700: 'var(--primary-700, #0369a1)',
          800: 'var(--primary-800, #075985)',
          900: 'var(--primary-900, #0c4a6e)',
          950: 'var(--primary-950, #082f49)',
          rider: '#00d2ff',
        },
        secondary: {
          rider: '#3a7bd5',
        },
        slate: {
          rider: '#0f172a',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
export default config

import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#080B14',
        secondary: '#0D1117',
        elevated: '#161B27',
        amber: '#F5A623',
        green: '#00FF88',
        danger: '#FF3B3B',
        blue: '#4A9EFF',
        textprimary: '#E8EDF5',
        textsecondary: '#8892A4',
        muted: '#4A5568',
        border: '#1E2535',
        brightborder: '#2D3748',
      },
      fontFamily: {
        clash: ['Clash Display', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        hero: 'clamp(3rem, 8vw, 7rem)',
        section: 'clamp(2rem, 4vw, 3.5rem)',
      },
    },
  },
  plugins: [],
}
export default config

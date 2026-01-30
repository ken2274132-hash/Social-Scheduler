import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Brand Colors
        brand: {
          DEFAULT: '#5932EA',
          light: '#7C5FF5',
          dark: '#4525C7',
        },
        // Semantic Colors
        success: {
          DEFAULT: '#00AC4F',
          light: '#D3FFE7',
          dark: '#008767',
          muted: '#16C09820',
        },
        danger: {
          DEFAULT: '#DF0404',
          light: '#FFF2E8',
          muted: '#FF000020',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
        },
        info: {
          DEFAULT: '#037092',
          light: '#EFFAFF',
        },
        // Text Colors
        muted: '#9197B3',
        subtle: '#B5B7C0',
        heading: '#292D32',
        // Surface/Background
        surface: {
          DEFAULT: '#FAFBFF',
          secondary: '#F9FBFF',
          card: '#F5F5F5',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'bounce-slow': 'bounce-slow 3s infinite',
      },
      keyframes: {
        'bounce-slow': {
          '0%, 100%': { transform: 'translateY(-5%)', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' },
          '50%': { transform: 'translateY(0)', animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

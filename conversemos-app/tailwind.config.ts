import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        verde: {
          50: "#eef5f1",
          100: "#dcebe1",
          200: "#b5d6c3",
          300: "#7fb89c",
          400: "#4b9877",
          500: "#2f7c5c",
          600: "#1f6a4c",
          700: "#1a5c45", // marca — fondo oscuro principal
          800: "#154938",
          900: "#0f3527",
          950: "#0a241b",
        },
        rosa: {
          50: "#fef1f4",
          100: "#fde3ea",
          200: "#fbc4d3",
          300: "#f79bb4",
          400: "#ef6f92",
          500: "#e14f78",
          600: "#c73863",
          700: "#a52a4f",
          800: "#872541",
          900: "#712139",
        },
        crema: {
          DEFAULT: "#faf8f4",
          50: "#fffdfb",
          100: "#faf8f4",
          200: "#f3efe6",
          300: "#e9e2d3",
        },
        tinta: "#152420",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgb(21 36 32 / 0.25)",
        card: "0 2px 20px 0 rgb(21 36 32 / 0.08)",
      },
      backgroundImage: {
        "grain": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s ease-out forwards",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

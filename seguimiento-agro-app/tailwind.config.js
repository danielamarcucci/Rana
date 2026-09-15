/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Azul institucional del sector agricultura ("Campo Milagro")
        azul: {
          50: "#eef4fb",
          100: "#d9e7f6",
          200: "#b0cded",
          300: "#7fabe0",
          400: "#4d84cf",
          500: "#2a63b5",
          600: "#1c4a91",
          700: "#163a73",
          800: "#132f5c",
          900: "#0f2547",
          950: "#0a1830",
        },
        // Naranja institucional ("Campo Milagro")
        naranja: {
          50: "#fff5ec",
          100: "#ffe6cc",
          200: "#ffc999",
          300: "#ffa75f",
          400: "#fb8a34",
          500: "#f0740f",
          600: "#d15e0a",
          700: "#aa480b",
          800: "#883a0f",
          900: "#6f300f",
        },
        avance: {
          bajo: "#d1483b",
          medio: "#f0740f",
          alto: "#2a63b5",
          completo: "#1c8a4c",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 2px 12px 0 rgb(15 37 71 / 0.10)",
      },
    },
  },
  plugins: [],
};

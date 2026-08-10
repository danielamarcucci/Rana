/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        pagado: {
          50: "#eefdf3",
          100: "#d6f9e2",
          200: "#a6f0c3",
          300: "#6ce09d",
          400: "#3cc978",
          500: "#1fae5e",
          600: "#158b4b",
          700: "#136f3e",
          800: "#125833",
          900: "#0f472b",
        },
        pendiente: {
          50: "#fff6ed",
          100: "#ffe9d2",
          200: "#ffcea3",
          300: "#ffab68",
          400: "#fd8836",
          500: "#f76a12",
          600: "#e0500a",
          700: "#b93c0c",
          800: "#933110",
          900: "#772a10",
        },
        marca: {
          50: "#eef5ff",
          100: "#d9e8ff",
          200: "#bad6ff",
          300: "#8cbcff",
          400: "#5798ff",
          500: "#3072f7",
          600: "#1f55ec",
          700: "#1c42d0",
          800: "#1d38a8",
          900: "#1c3384",
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
        card: "0 2px 12px 0 rgb(30 40 30 / 0.10)",
      },
    },
  },
  plugins: [],
};

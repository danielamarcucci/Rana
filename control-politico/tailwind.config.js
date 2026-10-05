/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        marca: {
          50: "#f1f5fb",
          100: "#dde7f5",
          200: "#bccfeb",
          300: "#8eaedb",
          400: "#5c86c6",
          500: "#3a68b0",
          600: "#2a5194",
          700: "#234278",
          800: "#203964",
          900: "#1d3154",
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(20 30 50 / 0.08), 0 1px 2px -1px rgb(20 30 50 / 0.08)",
      },
    },
  },
  plugins: [],
};

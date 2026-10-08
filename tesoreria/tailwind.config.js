/** Paleta tomada de la línea gráfica del sitio de la Red (redagrariacolombia.com). */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        olivo: { hondo: "#2F3A1A", DEFAULT: "#46551F", vivo: "#7A9A2E" },
        tierra: "#8C4415",
        ocre: { DEFAULT: "#B87A20", texto: "#925E15", hover: "#9E6819" },
        arena: "#E8C48F",
        suave: "#ECF0E4",
        tenue: "#F6F8F1",
        tinta: "#1C2113",
        gris: "#5F6752",
        linea: "#DBE1CE",
        alerta: { DEFAULT: "#B3231F", fondo: "#FBEDEC" },
        aviso: { DEFAULT: "#8C6212", fondo: "#FBF3E6" },
      },
      fontFamily: {
        sans: ["var(--fuente-texto)", "Segoe UI", "system-ui", "sans-serif"],
        titular: ["var(--fuente-titular)", "Arial Narrow", "sans-serif"],
      },
      maxWidth: { contenido: "76rem" },
    },
  },
  plugins: [],
};

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F7F6D7",
        paper: "#FBFAE9",
        ink: "#1A1112",
        wine: {
          DEFAULT: "#6E1E3B",
          dark: "#4B1428",
          light: "#8E5066",
        },
        olive: {
          DEFAULT: "#C9D863",
          dark: "#899343",
        },
        teal: {
          DEFAULT: "#1C8888",
          dark: "#0F5C5C",
        },
        blush: {
          DEFAULT: "#EAB0C8",
          dark: "#C796AA",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      backgroundImage: {
        "radial-glow":
          "radial-gradient(circle at center, var(--tw-gradient-stops))",
      },
      keyframes: {
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "spin-slower": {
          from: { transform: "rotate(360deg)" },
          to: { transform: "rotate(0deg)" },
        },
        pulseglow: {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "0.9", transform: "scale(1.06)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "45%": { opacity: "0.86" },
          "48%": { opacity: "1" },
          "52%": { opacity: "0.9" },
          "55%": { opacity: "1" },
        },
      },
      animation: {
        "spin-slow": "spin-slow 40s linear infinite",
        "spin-slower": "spin-slower 70s linear infinite",
        pulseglow: "pulseglow 4.5s ease-in-out infinite",
        marquee: "marquee 32s linear infinite",
        float: "float 7s ease-in-out infinite",
        flicker: "flicker 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        grass: { 50: "#f1fbe8", 100: "#dff5c8", 200: "#c1ea96", 300: "#9bdb5e", 400: "#7cc93a", 500: "#5fae23", 600: "#478a18", 700: "#386a17", 800: "#2f5518", 900: "#284818" },
        sun: { 100: "#fff6cc", 200: "#ffec99", 300: "#ffdd55", 400: "#ffcc22", 500: "#f5b400", 600: "#d18f00" },
        sky: { 100: "#e3f4ff", 200: "#bfe6ff", 300: "#8fd3ff", 400: "#55b9f5" },
        soil: { 300: "#c89a6a", 400: "#a97a4b", 500: "#8a5d35", 600: "#6d4726" },
      },
      fontFamily: {
        display: ["ui-rounded", "\"SF Pro Rounded\"", "\"Nunito\"", "\"Varela Round\"", "system-ui", "sans-serif"],
        sans: ["ui-rounded", "\"SF Pro Rounded\"", "\"Nunito\"", "system-ui", "sans-serif"],
      },
      boxShadow: {
        chunky: "0 4px 0 0 rgba(0,0,0,0.18)",
        "chunky-sm": "0 2px 0 0 rgba(0,0,0,0.18)",
      },
      keyframes: {
        pop: { "0%": { transform: "scale(0.6)", opacity: "0" }, "60%": { transform: "scale(1.15)", opacity: "1" }, "100%": { transform: "scale(1)" } },
        floatUp: { "0%": { transform: "translateY(0)", opacity: "1" }, "100%": { transform: "translateY(-48px)", opacity: "0" } },
        sway: { "0%,100%": { transform: "rotate(-4deg)" }, "50%": { transform: "rotate(4deg)" } },
        bump: { "0%,100%": { transform: "scale(1)" }, "40%": { transform: "scale(1.25)" } },
        wiggle: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-3px)" } },
      },
      animation: {
        pop: "pop 0.35s ease-out",
        "float-up": "floatUp 1.1s ease-out forwards",
        sway: "sway 2.4s ease-in-out infinite",
        bump: "bump 0.45s ease-out",
        wiggle: "wiggle 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

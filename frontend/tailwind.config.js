/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        bone: { 50: "#FDFBF7", 100: "#F3F1E9", 200: "#EBE8DF", 300: "#E2DFD3" },
        ink: { 900: "#1A1916", 700: "#5C5950", 500: "#8A877B" },
        terra: { 600: "#8C3B30", 700: "#6C2C23" },
        gold: { 500: "#D39744", 600: "#B37D35" },
        forest: { 700: "#2B3F36", 600: "#375945" },
      },
      fontFamily: {
        serif: ["'Cormorant Garamond'", "serif"],
        sans: ["'Outfit'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 24px rgba(26,25,22,0.04)",
        medium: "0 8px 32px rgba(26,25,22,0.08)",
      },
    },
  },
  plugins: [],
};

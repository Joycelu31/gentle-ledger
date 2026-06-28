/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 20px 70px rgba(35, 74, 52, 0.10)",
        card: "0 14px 40px rgba(42, 84, 56, 0.08)",
      },
      colors: {
        leaf: {
          50: "#f5faf4",
          100: "#e8f3e4",
          200: "#d4e8cc",
          300: "#a9cfa0",
          500: "#608c5a",
          700: "#385a37",
        },
        bark: {
          500: "#7b6a55",
          700: "#4b3f33",
        },
      },
    },
  },
  plugins: [],
};

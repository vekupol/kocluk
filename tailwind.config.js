/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: false, // sadece tek mod
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#674188", // ana renk
          100: "#F7EFE5", // hover - açık
          200: "#E2BFD9", // hover - orta
          300: "#C8A1E0", // hover - koyu
        },
        ink: {
          DEFAULT: "#FFFFFF", // metin
        },
      },
      borderRadius: {
        xl2: "1rem",
      },
      boxShadow: {
        soft: "0 6px 24px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
};

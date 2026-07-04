/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./en/**/*.html",
    "./site/**/*.{html,mjs,json}",
    "./assets/js/**/*.{js,mjs}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2563EB",
        ink: "#0F172A"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(15, 23, 42, 0.10)"
      }
    }
  },
  plugins: []
};

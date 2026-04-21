/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#185FA5',
          green: '#3B6D11',
          red: '#A32D2D',
        }
      }
    },
  },
  plugins: [],
}

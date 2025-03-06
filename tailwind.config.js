/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"], // Ensure Tailwind scans all files
    theme: {
      extend: {
        fontFamily: {
          sans: ['Inter', 'sans-serif'], // Use Inter as default font
        },
      },
    },
    plugins: [],
  };
  
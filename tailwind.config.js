/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
    safelist: [
      'space-x-8', // Navbar horizontal spacing
      'mb-6',      // Button margin-bottom
      'space-y-6', // Vertical spacing between buttons
    ], // Temporary for debugging
    theme: {
      extend: {},
    },
    plugins: [],
  };
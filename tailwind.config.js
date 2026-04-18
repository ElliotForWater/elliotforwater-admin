/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#116682',
          dark: '#0d4f64',
          light: '#e8f4f8',
        },
        surface: '#f6fafd',
        'on-surface': '#171c1f',
        'on-surface-variant': '#40484c',
        outline: '#d0d8dc',
        error: '#ba1a1a',
        'success-bg': '#e6f4ea',
        'success-color': '#1a7e34',
      },
      borderRadius: {
        card: '10px',
      },
    },
  },
  plugins: [require('@tailwindcss/container-queries')],
};

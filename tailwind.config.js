/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // BiteInsight Design Tokens
        background: '#e2f1ee',
        primary: '#023432',
        secondary: '#00776f',
        accent: '#3b9586',
        surface: {
          secondary: '#ffffff',
          tertiary: '#f1f8f7',
          contrast: '#023432',
        },
        status: {
          negative: '#ff3f42',
          positive: '#3b9586',
        },
        dietary: {
          diabetic: '#b8d828',
          keto: '#ffa569',
          'gluten-free': '#ff7779',
          vegan: '#a8d5a2',
          vegetarian: '#c8e6c9',
          lactose: '#fff9c4',
          pescatarian: '#b3e5fc',
        },
      },
      fontFamily: {
        'figtree-light': ['Figtree_300Light'],
        'figtree': ['Figtree_400Regular'],
        'figtree-bold': ['Figtree_700Bold'],
      },
    },
  },
  plugins: [],
};

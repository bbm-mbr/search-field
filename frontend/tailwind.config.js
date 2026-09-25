/** @type {import('tailwindcss').Config} */

/* Bosch FROK colours, applied by re-mapping the Tailwind palettes the UI
   already uses. No component class changes: `text-slate-500`, `bg-teal-50`,
   `text-red-700` … keep their meaning and now render in Bosch colours, so every
   screen and interaction stays exactly as it was.

   Values marked * are the FROK tokens as defined in News-Radar
   (news-ai/frontend/src/App.css); the others are interpolated between them.

     slate   → Bosch gray   (neutral text, borders, surfaces)
     teal    → Bosch blue   (primary / interactive accent)
     red     → Bosch red    (errors, headwinds)
     green   → Bosch green  (success, tailwinds); emerald follows green
     amber   → Bosch yellow for the light warning surfaces only; the darker
               amber text shades stay Tailwind's, which read better on white */
const gray = {
  50: '#f7f8f9', 100: '#eff1f2' /* * gray-95 */, 200: '#e0e2e5' /* * gray-90 */, 300: '#c1c7cc' /* * gray-80 */,
  400: '#8a9097' /* * gray-60 */, 500: '#71767c' /* * gray-50 */, 600: '#595e62' /* * gray-40 */,
  700: '#43464a', 800: '#2e3033', 900: '#232628' /* * gray-15 */, 950: '#1a1c1d',
}
const blue = {
  50: '#e8f1ff' /* * blue-95 */, 100: '#d1e4ff' /* * blue-90 */, 200: '#9dc9ff' /* * blue-80 */, 300: '#56b0ff',
  400: '#0096e8', 500: '#0088d4', 600: '#007bc0' /* * blue-50 */, 700: '#00629a' /* * blue-40 */,
  800: '#004975' /* * blue-30 */, 900: '#00304e', 950: '#001f33',
}
const red = {
  50: '#ffecec' /* * red-95 */, 100: '#ffd9d9', 200: '#ffb2b2', 300: '#ff7f7f', 400: '#ff4040',
  500: '#ed0007' /* * red-50 */, 600: '#d50005', 700: '#be0004' /* * red-40 */, 800: '#920002', 900: '#6b0001', 950: '#450001',
}
const green = {
  50: '#e2f5e7' /* * green-95 */, 100: '#c5ebd0', 200: '#9bdcaf', 300: '#5fc98a', 400: '#23b06a',
  500: '#00884a' /* * green-50 */, 600: '#007a42', 700: '#006c3a' /* * green-40 */, 800: '#00512a', 900: '#00391d', 950: '#002312',
}

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        slate: gray,
        teal: blue,
        red,
        green,
        emerald: green,
        amber: { 50: '#fff7e6', 100: '#ffefd1' /* * yellow-95 */, 200: '#ffdf95' },
      },
      fontFamily: {
        sans: ['"Bosch Sans"', '"Segoe UI"', 'system-ui', '-apple-system', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

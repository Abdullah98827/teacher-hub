/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
    "./contexts/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {},
  },
  safelist: [
    // Backgrounds
    "bg-black", "bg-white",
    "bg-neutral-900", "bg-neutral-800", "bg-neutral-950",
    "bg-gray-50", "bg-gray-100",
    // Borders
    "border-neutral-800", "border-neutral-700",
    "border-gray-200", "border-gray-300",
    // Text
    "text-white", "text-gray-900",
    "text-gray-400", "text-gray-500",
    // Status badge dark bg fallback
    "bg-orange-900", "bg-green-900", "bg-red-900",
    // Status light equivalents
    "bg-orange-100", "bg-green-100", "bg-red-100",
  ],
  plugins: [],
};
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui"] },
      colors: { ink: "#09090b", panel: "#18181b" },
      boxShadow: { soft: "0 14px 40px rgba(0,0,0,.08)" }
    }
  },
  plugins: []
};

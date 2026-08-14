/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgMain: "#0a0b10",
        bgCard: "rgba(18, 20, 32, 0.65)",
        cashIn: "#00ff73",
        cashInBg: "rgba(0, 255, 115, 0.1)",
        cashOut: "#ff1053",
        cashOutBg: "rgba(255, 16, 83, 0.1)",
        textMain: "#f1f5f9",
        textMuted: "#94a3b8",
        borderLight: "rgba(255, 255, 255, 0.08)",
        brandBlue: "#6366f1",
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
        'grand-total': 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        sm: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
        md: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
        'glow-primary': '0 0 15px rgba(99, 102, 241, 0.5)',
      },
    },
  },
  plugins: [],
}

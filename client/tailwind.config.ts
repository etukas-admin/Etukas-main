import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        etukas: {
          red: "#C52228",
          black: "#111111",
          pink: "#FFF0F0",
          green: "#2E7D32"
        }
      },
      boxShadow: {
        soft: "0 8px 24px rgba(17, 17, 17, 0.08)"
      }
    }
  },
  plugins: []
} satisfies Config;

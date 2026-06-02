import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        panel: "#1e293b",
        edge: "#334155",
        gold: "#d4af37",
      },
    },
  },
  plugins: [],
};
export default config;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#DC2626",
          soft: "#FEE2E2",
        },
        accent: "#F59E0B",
        success: "#10B981",
        surface: "#FFFFFF",
        "surface-dark": "#1E293B",
      },
      fontFamily: {
        sans: [
          "system-ui", "-apple-system", '"Segoe UI"', "Roboto",
          '"Apple SD Gothic Neo"', '"Malgun Gothic"', '"맑은 고딕"',
          '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"',
          '"Noto Sans SC"', "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
const rgb = (token) => `rgb(var(--rgb-${token}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  corePlugins: {
    // Storage / bundle diet — disable unused features.
    gradientColorStops: false,
    backgroundImage: false,
    backdropFilter: false,
    backdropBlur: false,
    blur: false,
  },
  theme: {
    extend: {
      colors: {
        bg: rgb("bg"),
        surface: rgb("surface"),
        fg: rgb("fg"),
        ink: rgb("fg"), // legacy alias — to be removed after callsites migrate
        muted: rgb("muted"),
        primary: rgb("primary"),
        "primary-soft": rgb("primary-soft"),
        accent: rgb("accent"),
        success: rgb("success"),
        divider: rgb("divider"),
        pinyin: rgb("pinyin"),
      },
      fontFamily: {
        sans: "var(--font-sans)",
        pinyin: "var(--font-pinyin)",
      },
      borderRadius: {
        card: "12px",
        btn: "8px",
        chip: "999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};

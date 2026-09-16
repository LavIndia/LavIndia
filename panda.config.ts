import { defineConfig, defineSemanticTokens, defineTokens } from "@pandacss/dev";

const tokens = defineTokens({
  colors: {
    // Jewellery-oriented palette: warm ivory ground, onyx ink, antique/bright gold accents.
    ivory: {
      50: { value: "#fffdf8" },
      100: { value: "#faf7ef" },
      200: { value: "#f3ede0" },
      300: { value: "#e9e0cc" },
    },
    onyx: {
      50: { value: "#f5f5f4" },
      200: { value: "#c9c7c2" },
      400: { value: "#6b6864" },
      600: { value: "#3a3835" },
      800: { value: "#1f1d1b" },
      900: { value: "#121110" },
    },
    gold: {
      50: { value: "#fbf6e7" },
      100: { value: "#f3e6b8" },
      200: { value: "#e8d488" },
      300: { value: "#dcc064" },
      400: { value: "#c9a94b" },
      500: { value: "#b8933a" },
      600: { value: "#96762c" },
      700: { value: "#725822" },
      glow: { value: "#f0d98c" },
    },
    rose: {
      300: { value: "#e8c7c2" },
      500: { value: "#c98d84" },
    },
    emerald: {
      500: { value: "#2f6b58" },
    },
    ruby: {
      500: { value: "#8a2c3b" },
    },
  },
  fonts: {
    display: { value: "var(--font-display)" },
    body: { value: "var(--font-body)" },
    mono: { value: "var(--font-mono)" },
  },
  radii: {
    xs: { value: "6px" },
    sm: { value: "10px" },
    md: { value: "16px" },
    lg: { value: "24px" },
    xl: { value: "32px" },
    full: { value: "999px" },
  },
  blurs: {
    glass: { value: "18px" },
    glassSm: { value: "10px" },
  },
  shadows: {
    glass: { value: "0 8px 32px rgba(18, 17, 16, 0.10), inset 0 1px 0 rgba(255,255,255,0.4)" },
    glassLg: { value: "0 20px 60px rgba(18, 17, 16, 0.16), inset 0 1px 0 rgba(255,255,255,0.35)" },
    gold: { value: "0 6px 24px rgba(184, 147, 58, 0.35)" },
    card: { value: "0 2px 10px rgba(18, 17, 16, 0.06)" },
  },
});

const semanticTokens = defineSemanticTokens({
  colors: {
    bg: {
      canvas: { value: { base: "{colors.ivory.100}", _dark: "{colors.onyx.900}" } },
      surface: { value: { base: "{colors.ivory.50}", _dark: "{colors.onyx.800}" } },
      glass: {
        value: {
          base: "rgba(255, 253, 248, 0.55)",
          _dark: "rgba(31, 29, 27, 0.55)",
        },
      },
      glassStrong: {
        value: {
          base: "rgba(255, 253, 248, 0.75)",
          _dark: "rgba(31, 29, 27, 0.75)",
        },
      },
    },
    fg: {
      default: { value: { base: "{colors.onyx.800}", _dark: "{colors.ivory.100}" } },
      muted: { value: { base: "{colors.onyx.400}", _dark: "{colors.onyx.200}" } },
      onGold: { value: { base: "{colors.onyx.900}", _dark: "{colors.onyx.900}" } },
    },
    border: {
      subtle: { value: { base: "rgba(31,29,27,0.08)", _dark: "rgba(255,253,248,0.10)" } },
      glass: { value: { base: "rgba(255,255,255,0.5)", _dark: "rgba(255,255,255,0.08)" } },
    },
    accent: {
      default: { value: "{colors.gold.400}" },
      hover: { value: "{colors.gold.300}" },
      pressed: { value: "{colors.gold.600}" },
    },
    danger: { value: "{colors.ruby.500}" },
    success: { value: "{colors.emerald.500}" },
  },
});

export default defineConfig({
  preflight: false, // Tailwind owns the reset until migration completes
  jsxFramework: "react",
  hash: true, // prevent utility class collisions with Tailwind during the transition

  include: ["./src/**/*.{js,jsx,ts,tsx}"],
  exclude: [],

  theme: {
    extend: {
      tokens,
      semanticTokens,
      breakpoints: {
        sm: "480px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
    },
  },

  utilities: {
    extend: {
      backdropBlur: {
        className: "backdrop-blur",
        values: "blurs",
        transform(value) {
          return { backdropFilter: `blur(${value})` };
        },
      },
    },
  },

  outdir: "styled-system",
});

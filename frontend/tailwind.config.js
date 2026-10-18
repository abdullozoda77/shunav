// Colors and type scale from the Шунав design.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Every colour is a CSS variable (index.css), so the dark and light themes only swap the variables.
      // "line" = thin borders (white in the dark theme, brown in the light one).
      colors: Object.fromEntries(
        [
          "surface", "surface-bright", "surface-container-lowest", "surface-container-low", "surface-container",
          "surface-container-high", "surface-container-highest", "surface-variant",
          "primary", "primary-container", "primary-fixed", "primary-fixed-dim", "on-primary", "on-primary-container",
          "secondary", "secondary-container", "secondary-fixed", "secondary-fixed-dim", "tertiary", "tertiary-fixed",
          "on-surface", "on-surface-variant", "outline", "outline-variant", "error", "line",
        ].map((name) => [name, `rgb(var(--c-${name}) / <alpha-value>)`])
      ),
      // Both fonts have the full Cyrillic alphabet with the Tajik letters (ӣ ӯ ҷ ҳ қ ғ)
      fontFamily: {
        serif: ["Philosopher", "PT Serif", "Georgia", "serif"], // PT Serif only fills in Ҳ ҳ, which Philosopher lacks
        sans: ["Manrope", "system-ui", "sans-serif"],
      },
      fontSize: {
        "label-sm": ["11px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "600" }],
        "label-md": ["13px", { lineHeight: "18px", letterSpacing: "0.03em", fontWeight: "500" }],
        "label-lg": ["15px", { lineHeight: "20px", letterSpacing: "0.02em", fontWeight: "600" }],
        "body-sm": ["14px", { lineHeight: "20px" }],
        "body-md": ["16px", { lineHeight: "26px" }],
        "headline-sm": ["20px", { lineHeight: "28px", fontWeight: "500" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "headline-lg-mobile": ["26px", { lineHeight: "34px", fontWeight: "600" }],
        "display-hero-mobile": ["32px", { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "700" }],
        verse: ["18px", { lineHeight: "34px", letterSpacing: "0.01em" }],
      },
      keyframes: {
        eq: { "0%,100%": { height: "4px" }, "50%": { height: "14px" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        drift: { from: { transform: "scale(1.15) translate(0, 0)" }, to: { transform: "scale(1.3) translate(-4%, -3%)" } },
      },
      animation: {
        eq: "eq 1s ease-in-out infinite",
        "fade-up": "fade-up 0.6s ease-out",
        drift: "drift 24s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
};

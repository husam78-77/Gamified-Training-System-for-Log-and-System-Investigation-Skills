/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        /* =========================================
           CORE BRAND COLORS (Overridden for Theme)
           ========================================= */
        "primary": "#FF003C",     // Neon Red
        "secondary": "#00FFFF",   // Neon Cyan
        "background": "#0A0A0A",  // Deep Dark Background
        "surface": "#131313",     // Base Surface

        /* =========================================
           SURFACE & BACKGROUND SCALES
           ========================================= */
        "surface-container-lowest": "#0e0e0e",
        "surface-container-low": "#1c1b1b",
        "surface-container": "#201f1f",
        "surface-container-high": "#2a2a2a",
        "surface-container-highest": "#353534",
        "surface-bright": "#3a3939",
        "surface-dim": "#131313",
        "surface-variant": "#353534",
        "inverse-surface": "#e5e2e1",
        "inverse-on-surface": "#313030",

        /* =========================================
           PRIMARY SCALES
           ========================================= */
        "primary-container": "#ff525c",
        "on-primary": "#680012",
        "on-primary-container": "#5b000f",
        "primary-fixed": "#ffdad8",
        "primary-fixed-dim": "#ffb3b2",
        "on-primary-fixed": "#410008",
        "on-primary-fixed-variant": "#92001e",
        "inverse-primary": "#bf002a",

        /* =========================================
           SECONDARY SCALES
           ========================================= */
        "secondary-container": "#00eefc",
        "on-secondary": "#00363a",
        "on-secondary-container": "#00686f",
        "secondary-fixed": "#7df4ff",
        "secondary-fixed-dim": "#00dbe9",
        "on-secondary-fixed": "#002022",
        "on-secondary-fixed-variant": "#004f54",

        /* =========================================
           TERTIARY SCALES
           ========================================= */
        "tertiary": "#c6c6c7",
        "tertiary-container": "#909191",
        "on-tertiary": "#2f3131",
        "on-tertiary-container": "#282a2a",
        "tertiary-fixed": "#e2e2e2",
        "tertiary-fixed-dim": "#c6c6c7",
        "on-tertiary-fixed": "#1a1c1c",
        "on-tertiary-fixed-variant": "#454747",

        /* =========================================
           ERROR SCALES
           ========================================= */
        "error": "#ffb4ab",
        "error-container": "#93000a",
        "on-error": "#690005",
        "on-error-container": "#ffdad6",

        /* =========================================
           OUTLINES & TEXT (ON-COLORS)
           ========================================= */
        "outline": "#af8786",
        "outline-variant": "#5f3e3e",
        "on-surface": "#e5e2e1",
        "on-surface-variant": "#e9bcba",
        "on-background": "#e5e2e1",
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "none": "0px",
        "sm": "0.125rem",
        "md": "0.375rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      fontFamily: {
        "headline": ["Epilogue", "sans-serif"],
        "body": ["Inter", "sans-serif"],
        "label": ["Space Grotesk", "sans-serif"]
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
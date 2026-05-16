import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand color (red from AppColors)
        primary: {
          DEFAULT: "#F21A1A", // AppColors.red
          50: "#fee2e2",
          100: "#fecaca",
          200: "#fca5a5",
          300: "#f87171",
          400: "#ef4444",
          500: "#F21A1A",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
        },
        // Dark blues from AppColors
        darkBlue: {
          "003": "#003D62", // darkBlue003
          "013": "#013453", // darkBlue013
          "203": "#203B7E", // darkBlue203
          "343": "#343B8C", // darkBlue343
        },
        // Grays from AppColors
        gray: {
          DEFAULT: "#57636C", // AppColors.gray
          light: "#D9D9D9", // AppColors.lightGray
          medium: "#808080", // AppColors.mediumGray
        },
        // Pale blues
        paleBlue: {
          DEFAULT: "#E0E3E7", // AppColors.paleBlue
          "2": "#E7E9EE", // AppColors.paleBlue2
        },
        // Accent colors
        accent: {
          green: "#249689", // AppColors.green
          yellow: "#F9CF58", // AppColors.yellow
          error: "#FF5963", // AppColors.errorRed
          success: "#4CAF50", // AppColors.success
        },
        // Base colors
        white: "#FFFFFF",
        black: "#000000",
        // FlutterFlow Theme Colors (Light Mode)
        theme: {
          primary: "#F21A1A",
          secondary: "#FFFFFF",
          tertiary: "#22C55E", // green
          alternate: "#000000",
          primaryText: "#000000",
          secondaryText: "#FFFFFF",
          primaryBackground: "#FFFFFF",
          secondaryBackground: "#D9D9D9",
          // Accents from FlutterFlow
          accent1: "#203B7E", // darkBlue203
          accent2: "#D9D9D9", // lightGray
          accent3: "#343B8C", // darkBlue343
          accent4: "#808080", // mediumGray
          accent5: "#E7E9EE", // paleBlue2
          accent6: "#013453", // darkBlue013
          accent7: "#FFFFFF",
          accent8: "#E7E9EE", // paleBlue2
          accent9: "#FFFFFF",
          accent10: "#EBEAEA",
          accent11: "#203B7E", // darkBlue203
          accent12: "#F3F3F3",
          accent13: "#E7E9EE", // paleBlue2
          accent14: "#747474",
          accent15: "#EBE9E9",
          accent16: "#EBE9E9",
          accent17: "#D9D9D9", // lightGray
          accent18: "#166534", // green[800]
          accent19: "#9a3412", // orange[800]
          success: "#22C55E",
          warning: "#22C55E",
          error: "#FF5963",
          info: "#22C55E",
        },
      },
      fontFamily: {
        // Inter Tight for headings (semibold/w600)
        display: ["Inter Tight", "system-ui", "sans-serif"],
        heading: ["Inter Tight", "system-ui", "sans-serif"],
        // Inter for body text (normal weight)
        body: ["Inter", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Display sizes (Inter Tight, w600)
        "display-large": ["64px", { lineHeight: "1.2", fontWeight: "600" }],
        "display-medium": ["44px", { lineHeight: "1.2", fontWeight: "600" }],
        "display-small": ["36px", { lineHeight: "1.2", fontWeight: "600" }],
        // Headline sizes (Inter Tight, w600)
        "headline-large": ["32px", { lineHeight: "1.2", fontWeight: "600" }],
        "headline-medium": ["28px", { lineHeight: "1.2", fontWeight: "600" }],
        "headline-small": ["24px", { lineHeight: "1.2", fontWeight: "600" }],
        // Title sizes (Inter Tight, w600)
        "title-large": ["20px", { lineHeight: "1.4", fontWeight: "600" }],
        "title-medium": ["18px", { lineHeight: "1.4", fontWeight: "600" }],
        "title-small": ["16px", { lineHeight: "1.4", fontWeight: "600" }],
        // Body sizes (Inter, normal)
        "body-large": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-medium": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-small": ["12px", { lineHeight: "1.5", fontWeight: "400" }],
        // Label sizes (Inter, normal, secondaryText color)
        "label-large": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "label-medium": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "label-small": ["12px", { lineHeight: "1.5", fontWeight: "400" }],
      },
      screens: {
        mobile: "479px",
        tablet: "1024px",
        desktop: "1025px",
      },
      spacing: {
        // Match Flutter spacing if needed
      },
      borderRadius: {
        // Match Flutter border radius values
      },
    },
  },
  plugins: [],
};
export default config;


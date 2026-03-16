export const tokens = {
  colors: {
    brandPrimary: "#1C1B1A",
    brandPrimaryOn: "#FFFFFF",
    brandAccent: "#5B52A3",
    brandAccentOn: "#FFFFFF",
    surfacePrimary: "#FAF8F5",
    surfaceSecondary: "#F3F0EB",
    surfaceTertiary: "#EBE7E0",
    textPrimary: "#1C1B1A",
    textSecondary: "#6B6966",
    textTertiary: "#9E9A95",
    success: "#2D9D5E",
    warning: "#D4920E",
    danger: "#D43B3B",
    info: "#3B82D4",
    borderDefault: "#E0DCD6",
    borderStrong: "#C5C0B8",
  },
  shadows: {
    sm: "0 1px 3px rgba(28, 27, 26, 0.08)",
    md: "0 4px 12px rgba(28, 27, 26, 0.12)",
    lg: "0 8px 24px rgba(28, 27, 26, 0.16)",
  },
  radius: {
    capPrimary: "2px 24px 2px 24px",
    capAlternate: "24px 2px 24px 2px",
    card: "3px 20px 3px 20px",
    surface: "3px 24px 3px 24px",
    sheet: "24px 24px 0 0",
  },
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  typography: {
    display: { size: 32, weight: 700, lineHeight: 1.2 },
    headingLg: { size: 24, weight: 600, lineHeight: 1.3 },
    headingMd: { size: 20, weight: 600, lineHeight: 1.3 },
    headingSm: { size: 16, weight: 600, lineHeight: 1.4 },
    body: { size: 16, weight: 400, lineHeight: 1.5 },
    bodySm: { size: 14, weight: 400, lineHeight: 1.5 },
    caption: { size: 12, weight: 400, lineHeight: 1.4 },
    button: { size: 16, weight: 600, lineHeight: 1.0 },
  },
  breakpoints: {
    compactMax: 600,
    regularMax: 1024,
  },
  motion: {
    quick: 200,
    normal: 300,
    slow: 500,
    easing: {
      default: "ease-out",
      enter: "ease-out",
      exit: "ease-in",
      emphasis: "cubic-bezier(0.2, 0, 0, 1)",
    },
  },
} as const;

export type LocaleCode = "en" | "ru" | "uz";
export type ThemePreference = "system" | "light" | "dark";
export type SizeClass = "compact" | "regular" | "expanded";

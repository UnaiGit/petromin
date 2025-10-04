export const tokens = {
  colors: {
    bg: "#F6F7FB",
    surface: "#FFFFFF",
    ink: "#0E1320",
    muted: "#6B7280",
    primary: "#0B1B3A",
    accent: "#224CFF",
    success: "#17A672",
    danger: "#EF4444",
    pill: "#E9EEF8",
  },
  radius: {
    sm: 12,
    md: 18,
    lg: 22,
    xl: 26,
  },
  elevation: {
    card: "0 10px 30px rgba(15,23,42,0.12)",
  },
  font: {
    family: '"Inter", "SF Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    sizeBase: 15,
    sizeTitle: 18,
    sizeHero: 22,
  },
} as const;

export type Tokens = typeof tokens;

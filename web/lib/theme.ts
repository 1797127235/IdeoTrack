/**
 * 主题 token —— 与 mobile/theme.ts、miniprogram 配色保持一致。
 * 整个 Web 后台复用这套色彩，避免散落硬编码。
 */
export const theme = {
  colors: {
    primary: "#0891B2",
    primaryLight: "#22D3EE",
    primaryDark: "#164E63",
    cta: "#22C55E",
    background: "#ECFEFF",
    surface: "#FFFFFF",
    text: "#164E63",
    textLight: "#64748B",
    error: "#EF4444",
    success: "#22C55E",
    border: "#E2E8F0",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
  },
  borderRadius: {
    sm: "8px",
    md: "12px",
    lg: "16px",
  },
} as const;

/**
 * 主题常量（TS 侧）— 与 app.wxss 的 CSS 变量保持一致。
 * 用于 JS 动态计算样式（如 badge 背景色按状态变化）。
 *
 * Token 来源：DESIGN.md（清新教育风：青色 + 绿色）
 */
export const theme = {
  colors: {
    primary: '#0891B2',
    primaryLight: '#22D3EE',
    primaryDark: '#164E63',
    cta: '#22C55E',
    background: '#ECFEFF',
    surface: '#FFFFFF',
    surfaceRaised: '#F0FDFF',
    text: '#164E63',
    textSecondary: '#64748B',
    textDisabled: '#94A3B8',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    border: '#E2E8F0',
    divider: '#F1F5F9',
  },
  spacing: {
    xs: 8, // rpx
    sm: 16,
    md: 24,
    lg: 32,
    xl: 40,
  },
  radius: {
    sm: 16, // rpx
    md: 32,
    lg: 48,
    full: 9999,
  },
} as const;

export type ThemeColor = keyof typeof theme.colors;

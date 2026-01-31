// Shared Design System - Based on Market and Bots Pages
// This file contains all shared constants, colors, and styles

export const colors = {
  background: "#1a1a1a",
  panelBackground: "#2a2a2a",
  border: "rgba(255, 174, 0, 0.2)",
  primary: "#FFAE00",
  text: "#ededed",
  secondaryText: "#888",
  success: "#22c55e",
  error: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
};

// Layout Styles
export const layoutStyle = {
  padding: "24px",
  width: "100%",
  color: colors.text,
};

export const panelStyle = {
  backgroundColor: colors.panelBackground,
  border: `1px solid ${colors.border}`,
  borderRadius: "12px",
  padding: "16px",
  display: "flex",
  flexDirection: "column" as const,
  gap: "12px",
};

// Input Styles
export const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  backgroundColor: colors.background,
  border: `1px solid ${colors.border}`,
  borderRadius: "8px",
  color: colors.text,
  fontSize: "14px",
};

export const selectStyle = {
  ...inputStyle,
  cursor: "pointer",
};

// Button Styles
export const buttonStyle = {
  padding: "10px 20px",
  backgroundColor: colors.primary,
  border: "none",
  borderRadius: "8px",
  color: colors.background,
  fontWeight: "600",
  cursor: "pointer",
  fontSize: "14px",
  transition: "opacity 0.2s",
};

export const buttonSecondaryStyle = {
  ...buttonStyle,
  backgroundColor: "transparent",
  border: `1px solid ${colors.border}`,
  color: colors.text,
};

export const buttonSuccessStyle = {
  ...buttonStyle,
  backgroundColor: colors.success,
};

export const buttonErrorStyle = {
  ...buttonStyle,
  backgroundColor: colors.error,
};

// Responsive breakpoints
export const breakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
};

// Typography
export const typography = {
  h1: {
    fontSize: "32px",
    fontWeight: "bold",
    color: colors.primary,
    margin: "0 0 24px 0",
  },
  h2: {
    fontSize: "24px",
    fontWeight: "600",
    color: colors.text,
    margin: "0 0 16px 0",
  },
  h3: {
    fontSize: "18px",
    fontWeight: "600",
    color: colors.text,
    margin: "0 0 12px 0",
  },
  body: {
    fontSize: "14px",
    color: colors.text,
    lineHeight: "1.5",
  },
  small: {
    fontSize: "12px",
    color: colors.secondaryText,
  },
};

// Spacing
export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  xxl: "32px",
};

// Shadows
export const shadows = {
  sm: "0 1px 2px rgba(0, 0, 0, 0.1)",
  md: "0 4px 6px rgba(0, 0, 0, 0.2)",
  lg: "0 8px 12px rgba(0, 0, 0, 0.3)",
};

// Transitions
export const transitions = {
  fast: "0.15s ease",
  normal: "0.2s ease",
  slow: "0.3s ease",
};


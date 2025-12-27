// Colors and Styles Constants - Same as Market Page

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

// Layout Style - Full Width
export const layoutStyle = {
  padding: "24px",
  width: "100%",
  color: "#ededed",
};

// Main Content Layout Pattern
export const mainLayoutStyle = {
  display: "flex",
  gap: "0.5rem",
  alignItems: "flex-start",
  height: "calc(100vh - 200px)",
  minHeight: "600px",
};

// Panel Style - Same as Market Page
export const panelStyle = {
  backgroundColor: "#2a2a2a",
  border: "1px solid rgba(255, 174, 0, 0.2)",
  borderRadius: "12px",
  padding: "16px",
  display: "flex",
  flexDirection: "column" as const,
  gap: "12px",
};

// Input Style
export const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  backgroundColor: colors.background,
  border: `1px solid ${colors.border}`,
  borderRadius: "8px",
  color: colors.text,
  fontSize: "14px",
};

// Select Style
export const selectStyle = {
  width: "100%",
  padding: "10px 12px",
  backgroundColor: colors.background,
  border: `1px solid ${colors.border}`,
  borderRadius: "8px",
  color: colors.text,
  fontSize: "14px",
  cursor: "pointer",
};

// Button Style
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


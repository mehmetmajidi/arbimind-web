"use client";

import { colors } from "./constants";

interface SymbolBadgeProps {
  symbol: string;
  size?: "small" | "medium" | "large";
}

export default function SymbolBadge({ symbol, size = "small" }: SymbolBadgeProps) {
  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return {
          padding: "2px 6px",
          fontSize: "10px",
          borderRadius: "4px",
        };
      case "large":
        return {
          padding: "4px 10px",
          fontSize: "13px",
          borderRadius: "6px",
        };
      default: // medium
        return {
          padding: "3px 8px",
          fontSize: "11px",
          borderRadius: "4px",
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <span
      style={{
        padding: sizeStyles.padding,
        backgroundColor: colors.background,
        border: `1px solid ${colors.border}`,
        borderRadius: sizeStyles.borderRadius,
        fontSize: sizeStyles.fontSize,
        color: colors.text,
        fontWeight: "500",
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      {symbol}
    </span>
  );
}


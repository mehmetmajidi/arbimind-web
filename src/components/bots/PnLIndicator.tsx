"use client";

import { colors } from "./constants";

interface PnLIndicatorProps {
  value: number | string;
  currency?: string;
  showPercent?: boolean;
  percentValue?: number | string;
  size?: "small" | "medium" | "large";
  showSign?: boolean;
}

export default function PnLIndicator({
  value,
  currency = "USDT",
  showPercent = false,
  percentValue,
  size = "medium",
  showSign = true,
}: PnLIndicatorProps) {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  const numPercent = percentValue 
    ? (typeof percentValue === "string" ? parseFloat(percentValue) : percentValue)
    : null;

  const isPositive = numValue >= 0;
  const color = isPositive ? colors.success : colors.error;
  const sign = showSign ? (isPositive ? "+" : "") : "";

  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return {
          fontSize: "12px",
          fontWeight: "600",
          gap: "4px",
        };
      case "large":
        return {
          fontSize: "20px",
          fontWeight: "700",
          gap: "8px",
        };
      default: // medium
        return {
          fontSize: "14px",
          fontWeight: "600",
          gap: "6px",
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <div style={{ 
      display: "inline-flex", 
      alignItems: "center", 
      gap: sizeStyles.gap,
      flexWrap: "wrap",
    }}>
      <span
        style={{
          color,
          fontSize: sizeStyles.fontSize,
          fontWeight: sizeStyles.fontWeight,
        }}
      >
        {sign}{numValue.toFixed(2)} {currency}
      </span>
      {showPercent && numPercent !== null && (
        <span
          style={{
            color,
            fontSize: `calc(${sizeStyles.fontSize} * 0.85)`,
            fontWeight: sizeStyles.fontWeight,
            opacity: 0.9,
          }}
        >
          ({numPercent >= 0 ? "+" : ""}{numPercent.toFixed(2)}%)
        </span>
      )}
    </div>
  );
}


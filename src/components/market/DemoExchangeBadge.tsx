"use client";

import { colors, typography } from "@/components/shared/designSystem";

interface DemoExchangeBadgeProps {
  className?: string;
  size?: "small" | "medium" | "large";
}

/**
 * Badge component to indicate Demo Exchange usage.
 * 
 * Shows a visual indicator that the user is trading on Demo Exchange.
 */
export default function DemoExchangeBadge({ 
  className = "", 
  size = "medium" 
}: DemoExchangeBadgeProps) {
  const sizeStyles = {
    small: {
      fontSize: "10px",
      padding: "4px 8px",
    },
    medium: {
      fontSize: "12px",
      padding: "6px 12px",
    },
    large: {
      fontSize: "14px",
      padding: "8px 16px",
    },
  };

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        backgroundColor: `${colors.primary}20`,
        border: `1px solid ${colors.primary}40`,
        borderRadius: "6px",
        fontWeight: "600",
        ...sizeStyles[size],
        ...typography.small,
        color: colors.primary, // Override typography.small color
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: colors.primary,
          display: "inline-block",
        }}
      />
      <span>Demo Exchange</span>
    </div>
  );
}


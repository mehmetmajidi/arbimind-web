"use client";

import { colors } from "./constants";

interface BotStatusBadgeProps {
  status: string;
  size?: "small" | "medium" | "large";
}

export default function BotStatusBadge({ status, size = "medium" }: BotStatusBadgeProps) {
  const getStatusConfig = () => {
    const normalizedStatus = status.toLowerCase();
    
    switch (normalizedStatus) {
      case "active":
        return {
          color: colors.success, // Green
          bgColor: "rgba(34, 197, 94, 0.2)",
          borderColor: "rgba(34, 197, 94, 0.4)",
          text: "Active",
          pulse: true,
        };
      case "stopped":
        return {
          color: colors.secondaryText, // Gray
          bgColor: "rgba(136, 136, 136, 0.2)",
          borderColor: "rgba(136, 136, 136, 0.4)",
          text: "Stopped",
          pulse: false,
        };
      case "error":
        return {
          color: colors.error, // Red
          bgColor: "rgba(239, 68, 68, 0.2)",
          borderColor: "rgba(239, 68, 68, 0.4)",
          text: "Error",
          pulse: false,
        };
      case "inactive":
        return {
          color: colors.warning || "#f59e0b", // Orange/Yellow
          bgColor: "rgba(245, 158, 11, 0.2)",
          borderColor: "rgba(245, 158, 11, 0.4)",
          text: "Inactive",
          pulse: false,
        };
      default:
        return {
          color: colors.secondaryText,
          bgColor: "rgba(136, 136, 136, 0.2)",
          borderColor: "rgba(136, 136, 136, 0.4)",
          text: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
          pulse: false,
        };
    }
  };

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
          padding: "6px 12px",
          fontSize: "14px",
          borderRadius: "6px",
        };
      default: // medium
        return {
          padding: "4px 10px",
          fontSize: "12px",
          borderRadius: "4px",
        };
    }
  };

  const config = getStatusConfig();
  const sizeStyles = getSizeStyles();

  return (
    <span
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
        border: `1px solid ${config.borderColor}`,
        padding: sizeStyles.padding,
        borderRadius: sizeStyles.borderRadius,
        fontSize: sizeStyles.fontSize,
        fontWeight: "600",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        animation: config.pulse ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" : "none",
        transition: "all 0.2s",
      }}
    >
      {config.text}
    </span>
  );
}


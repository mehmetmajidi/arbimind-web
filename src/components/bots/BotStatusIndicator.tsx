"use client";

import { colors } from "./constants";

interface BotStatusIndicatorProps {
  status: string;
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
}

export default function BotStatusIndicator({ 
  status, 
  size = "medium",
  showLabel = false,
}: BotStatusIndicatorProps) {
  const getStatusConfig = () => {
    const normalizedStatus = status.toLowerCase();
    
    switch (normalizedStatus) {
      case "active":
        return {
          color: colors.success, // Green
          text: "Active",
          pulse: true,
        };
      case "stopped":
        return {
          color: colors.secondaryText, // Gray
          text: "Stopped",
          pulse: false,
        };
      case "error":
        return {
          color: colors.error, // Red
          text: "Error",
          pulse: false,
        };
      case "inactive":
        return {
          color: colors.warning || "#f59e0b", // Orange/Yellow
          text: "Inactive",
          pulse: false,
        };
      default:
        return {
          color: colors.secondaryText,
          text: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
          pulse: false,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return {
          dotSize: "6px",
          fontSize: "10px",
          gap: "6px",
        };
      case "large":
        return {
          dotSize: "12px",
          fontSize: "14px",
          gap: "10px",
        };
      default: // medium
        return {
          dotSize: "8px",
          fontSize: "12px",
          gap: "8px",
        };
    }
  };

  const config = getStatusConfig();
  const sizeStyles = getSizeStyles();

  return (
    <div style={{ 
      display: "inline-flex", 
      alignItems: "center", 
      gap: sizeStyles.gap,
    }}>
      <div
        style={{
          width: sizeStyles.dotSize,
          height: sizeStyles.dotSize,
          borderRadius: "50%",
          backgroundColor: config.color,
          animation: config.pulse 
            ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" 
            : "none",
          transition: "background-color 0.2s",
          flexShrink: 0,
        }}
      />
      {showLabel && (
        <span style={{
          color: colors.text,
          fontSize: sizeStyles.fontSize,
          fontWeight: "500",
        }}>
          {config.text}
        </span>
      )}
    </div>
  );
}


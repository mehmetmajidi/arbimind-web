"use client";

import { useEffect } from "react";
import { colors } from "./constants";

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  showLabel?: boolean;
  label?: string;
  color?: string;
  height?: string;
  animated?: boolean;
}

export default function ProgressBar({
  value,
  max = 100,
  showLabel = false,
  label,
  color,
  height = "8px",
  animated = true,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const barColor = color || colors.primary;

  // Add animation keyframes to document if animated
  useEffect(() => {
    if (animated && typeof document !== "undefined") {
      const styleId = "progress-shimmer-animation";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          @keyframes progress-shimmer {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, [animated]);

  return (
    <div style={{ width: "100%" }}>
      {showLabel && (
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "4px",
        }}>
          <span style={{ color: colors.secondaryText, fontSize: "12px" }}>
            {label || "Progress"}
          </span>
          <span style={{ color: colors.text, fontSize: "12px", fontWeight: "600" }}>
            {percentage.toFixed(1)}%
          </span>
        </div>
      )}
      <div
        style={{
          width: "100%",
          height,
          backgroundColor: colors.background,
          borderRadius: "4px",
          overflow: "hidden",
          border: `1px solid ${colors.border}`,
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            backgroundColor: animated ? undefined : barColor,
            background: animated
              ? `linear-gradient(90deg, ${barColor} 0%, ${barColor} 50%, ${barColor}88 50%, ${barColor}88 100%)`
              : undefined,
            backgroundSize: animated ? "200% 100%" : undefined,
            borderRadius: "4px",
            transition: "width 0.3s ease-in-out",
            animation: animated ? "progress-shimmer 2s infinite" : undefined,
          }}
        />
      </div>
    </div>
  );
}


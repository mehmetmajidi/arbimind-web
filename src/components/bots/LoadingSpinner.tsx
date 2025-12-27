"use client";

import { useEffect } from "react";
import { colors } from "./constants";

interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
  color?: string;
  text?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({
  size = "medium",
  color,
  text,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const spinnerColor = color || colors.primary;

  // Add animation keyframes to document
  useEffect(() => {
    if (typeof document !== "undefined") {
      const styleId = "loading-spinner-animation";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return {
          spinnerSize: "16px",
          borderWidth: "2px",
          fontSize: "12px",
        };
      case "large":
        return {
          spinnerSize: "48px",
          borderWidth: "4px",
          fontSize: "16px",
        };
      default: // medium
        return {
          spinnerSize: "24px",
          borderWidth: "3px",
          fontSize: "14px",
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
      ...(fullScreen && {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(26, 26, 26, 0.8)",
        zIndex: 9999,
      }),
    }}>
      <div
        style={{
          width: sizeStyles.spinnerSize,
          height: sizeStyles.spinnerSize,
          border: `${sizeStyles.borderWidth} solid ${colors.border}`,
          borderTop: `${sizeStyles.borderWidth} solid ${spinnerColor}`,
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      {text && (
        <span style={{
          color: colors.text,
          fontSize: sizeStyles.fontSize,
        }}>
          {text}
        </span>
      )}
    </div>
  );
}

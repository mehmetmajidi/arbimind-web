"use client";

import { useState } from "react";
import { colors } from "./constants";

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
  dismissible?: boolean;
  fullWidth?: boolean;
}

export default function ErrorMessage({
  message,
  onDismiss,
  dismissible = true,
  fullWidth = false,
}: ErrorMessageProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <div
      style={{
        padding: "12px 16px",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        border: `1px solid ${colors.error}`,
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        width: fullWidth ? "100%" : "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
        <span style={{ color: colors.error, fontSize: "16px" }}>⚠️</span>
        <span style={{ color: colors.error, fontSize: "14px", fontWeight: "500" }}>
          {message}
        </span>
      </div>
      {dismissible && (
        <button
          onClick={handleDismiss}
          style={{
            padding: "4px 8px",
            backgroundColor: "transparent",
            border: "none",
            color: colors.error,
            cursor: "pointer",
            fontSize: "18px",
            lineHeight: "1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.7";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          title="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}


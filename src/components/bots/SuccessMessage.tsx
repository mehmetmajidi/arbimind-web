"use client";

import { useState, useEffect } from "react";
import { colors } from "./constants";

interface SuccessMessageProps {
  message: string;
  onDismiss?: () => void;
  dismissible?: boolean;
  autoDismiss?: boolean;
  autoDismissDelay?: number; // milliseconds
  fullWidth?: boolean;
}

export default function SuccessMessage({
  message,
  onDismiss,
  dismissible = true,
  autoDismiss = true,
  autoDismissDelay = 3000,
  fullWidth = false,
}: SuccessMessageProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoDismiss && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onDismiss) {
          onDismiss();
        }
      }, autoDismissDelay);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, autoDismissDelay, isVisible, onDismiss]);

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
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        border: `1px solid ${colors.success}`,
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        width: fullWidth ? "100%" : "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
        <span style={{ color: colors.success, fontSize: "16px" }}>✓</span>
        <span style={{ color: colors.success, fontSize: "14px", fontWeight: "500" }}>
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
            color: colors.success,
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


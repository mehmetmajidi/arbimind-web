"use client";

import { useEffect, useState } from "react";

/**
 * Alert Component
 * 
 * A reusable alert component that supports different types: error, warning, success, and info.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <Alert type="error" message="Something went wrong!" />
 * 
 * // With auto-close
 * <Alert 
 *   type="success" 
 *   message="Operation completed!" 
 *   autoClose={true}
 *   duration={3000}
 * />
 * 
 * // With custom close handler
 * <Alert 
 *   type="warning" 
 *   message="Please check your input" 
 *   onClose={() => console.log("Alert closed")}
 *   dismissible={true}
 * />
 * ```
 */

export type AlertType = "error" | "warning" | "success" | "info";

interface AlertProps {
     type: AlertType;
     message: string;
     onClose?: () => void;
     autoClose?: boolean;
     duration?: number; // in milliseconds
     dismissible?: boolean;
     className?: string;
}

const alertStyles: Record<AlertType, {
     backgroundColor: string;
     borderColor: string;
     textColor: string;
     icon: string;
}> = {
     error: {
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          borderColor: "rgba(239, 68, 68, 0.3)",
          textColor: "#ef4444",
          icon: "❌",
     },
     warning: {
          backgroundColor: "rgba(251, 191, 36, 0.1)",
          borderColor: "rgba(251, 191, 36, 0.3)",
          textColor: "#fbbf24",
          icon: "⚠️",
     },
     success: {
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          borderColor: "rgba(34, 197, 94, 0.3)",
          textColor: "#22c55e",
          icon: "✅",
     },
     info: {
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderColor: "rgba(59, 130, 246, 0.3)",
          textColor: "#3b82f6",
          icon: "ℹ️",
     },
};

export default function Alert({
     type,
     message,
     onClose,
     autoClose = false,
     duration = 5000,
     dismissible = true,
     className = "",
}: AlertProps) {
     const [isVisible, setIsVisible] = useState(true);
     const style = alertStyles[type];

     useEffect(() => {
          if (autoClose && isVisible) {
               const timer = setTimeout(() => {
                    setIsVisible(false);
                    if (onClose) {
                         setTimeout(onClose, 300); // Wait for fade out animation
                    }
               }, duration);

               return () => clearTimeout(timer);
          }
     }, [autoClose, duration, isVisible, onClose]);

     if (!isVisible) {
          return null;
     }

     const handleClose = () => {
          setIsVisible(false);
          if (onClose) {
               setTimeout(onClose, 300); // Wait for fade out animation
          }
     };

     return (
          <div
               className={className}
               style={{
                    padding: "16px",
                    backgroundColor: style.backgroundColor,
                    border: `1px solid ${style.borderColor}`,
                    borderRadius: "12px",
                    marginBottom: "16px",
                    color: style.textColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    transition: "all 0.3s ease",
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? "translateY(0)" : "translateY(-10px)",
               }}
          >
               <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                    <span style={{ fontSize: "20px", lineHeight: 1 }}>{style.icon}</span>
                    <span style={{ fontSize: "14px", fontWeight: "500", lineHeight: 1.5 }}>{message}</span>
               </div>
               {dismissible && (
                    <button
                         onClick={handleClose}
                         style={{
                              background: "none",
                              border: "none",
                              color: style.textColor,
                              cursor: "pointer",
                              fontSize: "20px",
                              padding: "0 8px",
                              fontWeight: "bold",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "24px",
                              height: "24px",
                              borderRadius: "4px",
                              transition: "background-color 0.2s",
                         }}
                         onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
                         }}
                         onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                         }}
                         aria-label="Close alert"
                    >
                         ×
                    </button>
               )}
          </div>
     );
}


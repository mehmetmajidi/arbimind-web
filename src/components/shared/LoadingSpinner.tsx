"use client";

import { colors } from "./designSystem";

interface LoadingSpinnerProps {
    size?: "small" | "medium" | "large";
    color?: string;
    text?: string;
    fullScreen?: boolean;
}

export default function LoadingSpinner({
    size = "medium",
    color = colors.primary,
    text,
    fullScreen = false,
}: LoadingSpinnerProps) {
    const sizeMap = {
        small: 20,
        medium: 32,
        large: 48,
    };

    const spinnerSize = sizeMap[size];

    // Add spin animation if not exists
    if (typeof document !== "undefined" && !document.head.querySelector('style[data-spinner-animation]')) {
        const style = document.createElement("style");
        style.setAttribute("data-spinner-animation", "true");
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    const spinner = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <div
                style={{
                    width: spinnerSize,
                    height: spinnerSize,
                    border: `3px solid ${color}30`,
                    borderTop: `3px solid ${color}`,
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                }}
            />
            {text && (
                <div style={{ color: colors.secondaryText, fontSize: "14px" }}>
                    {text}
                </div>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                }}
            >
                {spinner}
            </div>
        );
    }

    return spinner;
}


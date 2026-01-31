"use client";

import { useState, useEffect } from "react";
import { colors } from "./designSystem";
import { MdCheckCircle, MdClose } from "react-icons/md";

interface SuccessMessageProps {
    message: string;
    onDismiss?: () => void;
    autoDismiss?: boolean;
    autoDismissDelay?: number;
    compact?: boolean;
}

export default function SuccessMessage({
    message,
    onDismiss,
    autoDismiss = true,
    autoDismissDelay = 5000,
    compact = false,
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

    return (
        <div
            style={{
                padding: compact ? "12px" : "16px",
                backgroundColor: "rgba(34, 197, 94, 0.15)",
                border: "2px solid rgba(34, 197, 94, 0.5)",
                borderRadius: "8px",
                marginBottom: compact ? "12px" : "24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                <MdCheckCircle size={20} color={colors.success} />
                <div style={{ color: colors.success, fontSize: compact ? "13px" : "14px", fontWeight: "500", flex: 1 }}>
                    <strong>✓ Success:</strong> {message}
                </div>
            </div>
            {onDismiss && (
                <button
                    onClick={() => {
                        setIsVisible(false);
                        if (onDismiss) {
                            onDismiss();
                        }
                    }}
                    style={{
                        padding: "4px",
                        backgroundColor: "transparent",
                        border: "none",
                        color: colors.secondaryText,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = colors.text;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = colors.secondaryText;
                    }}
                >
                    <MdClose size={18} />
                </button>
            )}
        </div>
    );
}


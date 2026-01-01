"use client";

import { useEffect } from "react";

export type MessageModalType = "success" | "error" | "warning" | "info";

interface MessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: MessageModalType;
    title?: string;
    message: string;
    autoClose?: boolean;
    autoCloseDelay?: number; // in milliseconds
    showCloseButton?: boolean;
}

export default function MessageModal({
    isOpen,
    onClose,
    type,
    title,
    message,
    autoClose = false,
    autoCloseDelay = 3000,
    showCloseButton = true,
}: MessageModalProps) {
    // Auto close if enabled
    useEffect(() => {
        if (isOpen && autoClose) {
            const timer = setTimeout(() => {
                onClose();
            }, autoCloseDelay);

            return () => clearTimeout(timer);
        }
    }, [isOpen, autoClose, autoCloseDelay, onClose]);

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            // Prevent body scroll when modal is open
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const getConfig = () => {
        switch (type) {
            case "success":
                return {
                    icon: "✓",
                    iconBg: "rgba(34, 197, 94, 0.15)",
                    iconColor: "#22c55e",
                    borderColor: "rgba(34, 197, 94, 0.3)",
                    buttonBg: "#22c55e",
                    buttonHoverBg: "#16a34a",
                };
            case "error":
                return {
                    icon: "✕",
                    iconBg: "rgba(239, 68, 68, 0.15)",
                    iconColor: "#ef4444",
                    borderColor: "rgba(239, 68, 68, 0.3)",
                    buttonBg: "#ef4444",
                    buttonHoverBg: "#dc2626",
                };
            case "warning":
                return {
                    icon: "⚠",
                    iconBg: "rgba(245, 158, 11, 0.15)",
                    iconColor: "#f59e0b",
                    borderColor: "rgba(245, 158, 11, 0.3)",
                    buttonBg: "#f59e0b",
                    buttonHoverBg: "#d97706",
                };
            case "info":
                return {
                    icon: "ℹ",
                    iconBg: "rgba(59, 130, 246, 0.15)",
                    iconColor: "#3b82f6",
                    borderColor: "rgba(59, 130, 246, 0.3)",
                    buttonBg: "#3b82f6",
                    buttonHoverBg: "#2563eb",
                };
        }
    };

    const config = getConfig();
    const displayTitle = title || (type === "success" ? "Success" : type === "error" ? "Error" : type === "warning" ? "Warning" : "Info");

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.75)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                animation: "fadeIn 0.2s ease-in-out",
            }}
            onClick={onClose}
        >
            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
                @keyframes slideUp {
                    from {
                        transform: translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `}</style>
            <div
                style={{
                    backgroundColor: "#1a1a1a",
                    border: `1px solid ${config.borderColor}`,
                    borderRadius: "12px",
                    padding: "24px",
                    maxWidth: "400px",
                    width: "90%",
                    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
                    animation: "slideUp 0.3s ease-out",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Icon and Title */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                    <div
                        style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            backgroundColor: config.iconBg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "20px",
                            color: config.iconColor,
                            fontWeight: "bold",
                        }}
                    >
                        {config.icon}
                    </div>
                    <h3
                        style={{
                            color: "#FFAE00",
                            margin: 0,
                            fontSize: "18px",
                            fontWeight: "600",
                            flex: 1,
                        }}
                    >
                        {displayTitle}
                    </h3>
                    {showCloseButton && (
                        <button
                            onClick={onClose}
                            style={{
                                background: "transparent",
                                border: "none",
                                color: "#888",
                                cursor: "pointer",
                                fontSize: "20px",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = "#ededed";
                                e.currentTarget.style.backgroundColor = "#2a2a2a";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = "#888";
                                e.currentTarget.style.backgroundColor = "transparent";
                            }}
                        >
                            ×
                        </button>
                    )}
                </div>

                {/* Message */}
                <p
                    style={{
                        color: "#ededed",
                        fontSize: "14px",
                        margin: 0,
                        marginBottom: "20px",
                        lineHeight: "1.6",
                    }}
                >
                    {message}
                </p>

                {/* OK Button */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: "10px 24px",
                            backgroundColor: config.buttonBg,
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            minWidth: "80px",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = config.buttonHoverBg;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = config.buttonBg;
                        }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}


"use client";

import { useEffect, useState } from "react";
import { MdClose, MdCheckCircle, MdError, MdWarning, MdInfo } from "react-icons/md";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
    type: ToastType;
    message: string;
    duration?: number;
    onClose?: () => void;
}

export default function Toast({ 
    type, 
    message, 
    duration = 5000,
    onClose 
}: ToastProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(() => {
                    if (onClose) onClose();
                }, 300);
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const getConfig = () => {
        switch (type) {
            case "success":
                return {
                    icon: MdCheckCircle,
                    bgColor: "rgba(34, 197, 94, 0.2)",
                    borderColor: "rgba(34, 197, 94, 0.5)",
                    iconColor: "#22c55e",
                    textColor: "#22c55e",
                };
            case "error":
                return {
                    icon: MdError,
                    bgColor: "rgba(239, 68, 68, 0.2)",
                    borderColor: "rgba(239, 68, 68, 0.5)",
                    iconColor: "#ef4444",
                    textColor: "#ef4444",
                };
            case "warning":
                return {
                    icon: MdWarning,
                    bgColor: "rgba(245, 158, 11, 0.2)",
                    borderColor: "rgba(245, 158, 11, 0.5)",
                    iconColor: "#f59e0b",
                    textColor: "#f59e0b",
                };
            case "info":
                return {
                    icon: MdInfo,
                    bgColor: "rgba(59, 130, 246, 0.2)",
                    borderColor: "rgba(59, 130, 246, 0.5)",
                    iconColor: "#3b82f6",
                    textColor: "#3b82f6",
                };
        }
    };

    const config = getConfig();
    const Icon = config.icon;

    if (!isVisible) return null;

    return (
        <div
            style={{
                position: "fixed",
                top: "20px",
                right: "20px",
                zIndex: 10000,
                minWidth: "300px",
                maxWidth: "500px",
                padding: "12px 16px",
                backgroundColor: config.bgColor,
                border: `1px solid ${config.borderColor}`,
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                animation: "slideIn 0.3s ease-out",
                transition: "opacity 0.3s ease-out, transform 0.3s ease-out",
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateX(0)" : "translateX(100%)",
            }}
        >
            <Icon size={20} color={config.iconColor} />
            <span style={{ flex: 1, color: config.textColor, fontSize: "14px", fontWeight: "500" }}>
                {message}
            </span>
            {onClose && (
                <button
                    onClick={() => {
                        setIsVisible(false);
                        setTimeout(() => {
                            if (onClose) onClose();
                        }, 300);
                    }}
                    style={{
                        background: "none",
                        border: "none",
                        color: config.textColor,
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <MdClose size={18} />
                </button>
            )}
            <style jsx>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
}


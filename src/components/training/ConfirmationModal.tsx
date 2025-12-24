"use client";

import { MdWarning, MdError, MdInfo, MdCheckCircle } from "react-icons/md";

export type ConfirmationType = "warning" | "error" | "info" | "success";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    type?: ConfirmationType;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: string;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = "warning",
    confirmText = "Confirm",
    cancelText = "Cancel",
    confirmColor,
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    const getConfig = () => {
        switch (type) {
            case "error":
                return {
                    icon: MdError,
                    iconColor: "#ef4444",
                    bgColor: "rgba(239, 68, 68, 0.1)",
                    borderColor: "rgba(239, 68, 68, 0.3)",
                };
            case "success":
                return {
                    icon: MdCheckCircle,
                    iconColor: "#22c55e",
                    bgColor: "rgba(34, 197, 94, 0.1)",
                    borderColor: "rgba(34, 197, 94, 0.3)",
                };
            case "info":
                return {
                    icon: MdInfo,
                    iconColor: "#3b82f6",
                    bgColor: "rgba(59, 130, 246, 0.1)",
                    borderColor: "rgba(59, 130, 246, 0.3)",
                };
            default: // warning
                return {
                    icon: MdWarning,
                    iconColor: "#f59e0b",
                    bgColor: "rgba(245, 158, 11, 0.1)",
                    borderColor: "rgba(245, 158, 11, 0.3)",
                };
        }
    };

    const config = getConfig();
    const Icon = config.icon;
    const finalConfirmColor = confirmColor || config.iconColor;

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
                zIndex: 2000,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: "#202020",
                    border: "1px solid #2a2a2a",
                    borderRadius: "16px",
                    padding: "24px",
                    maxWidth: "400px",
                    width: "90%",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                    <Icon size={24} color={config.iconColor} />
                    <h3 style={{ color: "#FFAE00", margin: 0, fontSize: "18px", fontWeight: "600" }}>
                        {title}
                    </h3>
                </div>

                <p style={{ color: "#ededed", fontSize: "14px", marginBottom: "24px", lineHeight: "1.6" }}>
                    {message}
                </p>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: "10px 20px",
                            backgroundColor: "transparent",
                            color: "#888",
                            border: "1px solid #2a2a2a",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer",
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        style={{
                            padding: "10px 20px",
                            backgroundColor: finalConfirmColor,
                            color: "#1a1a1a",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer",
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}


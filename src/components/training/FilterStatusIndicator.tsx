"use client";

import { MdCheckCircle, MdCancel, MdWarning } from "react-icons/md";

interface FilterStatusIndicatorProps {
    status: "passed" | "failed" | "warning";
    text?: string;
    size?: "small" | "medium" | "large";
}

export default function FilterStatusIndicator({ 
    status, 
    text,
    size = "medium" 
}: FilterStatusIndicatorProps) {
    const getStatusConfig = () => {
        switch (status) {
            case "passed":
                return {
                    icon: MdCheckCircle,
                    color: "#22c55e", // Green
                    bgColor: "rgba(34, 197, 94, 0.2)",
                    defaultText: "Passed",
                };
            case "failed":
                return {
                    icon: MdCancel,
                    color: "#ef4444", // Red
                    bgColor: "rgba(239, 68, 68, 0.2)",
                    defaultText: "Failed",
                };
            case "warning":
                return {
                    icon: MdWarning,
                    color: "#f59e0b", // Orange
                    bgColor: "rgba(245, 158, 11, 0.2)",
                    defaultText: "Warning",
                };
            default:
                return {
                    icon: MdWarning,
                    color: "#888888",
                    bgColor: "rgba(136, 136, 136, 0.2)",
                    defaultText: "Unknown",
                };
        }
    };

    const getSizeStyles = () => {
        switch (size) {
            case "small":
                return {
                    iconSize: 14,
                    fontSize: "10px",
                    padding: "2px 6px",
                    gap: "4px",
                };
            case "large":
                return {
                    iconSize: 20,
                    fontSize: "14px",
                    padding: "6px 12px",
                    gap: "8px",
                };
            default: // medium
                return {
                    iconSize: 16,
                    fontSize: "12px",
                    padding: "4px 8px",
                    gap: "6px",
                };
        }
    };

    const config = getStatusConfig();
    const sizeStyles = getSizeStyles();
    const Icon = config.icon;

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: sizeStyles.gap,
                backgroundColor: config.bgColor,
                color: config.color,
                padding: sizeStyles.padding,
                borderRadius: "4px",
                fontSize: sizeStyles.fontSize,
                fontWeight: "600",
            }}
        >
            <Icon size={sizeStyles.iconSize} />
            {text || config.defaultText}
        </span>
    );
}


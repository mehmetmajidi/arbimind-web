"use client";

interface StatusBadgeProps {
    status: "running" | "completed" | "failed" | "rejected" | "pending" | "cancelled";
    size?: "small" | "medium" | "large";
}

export default function StatusBadge({ status, size = "medium" }: StatusBadgeProps) {
    const getStatusConfig = () => {
        switch (status) {
            case "running":
                return {
                    color: "#3b82f6", // Blue
                    bgColor: "rgba(59, 130, 246, 0.2)",
                    text: "Running",
                    pulse: true,
                };
            case "completed":
                return {
                    color: "#22c55e", // Green
                    bgColor: "rgba(34, 197, 94, 0.2)",
                    text: "Completed",
                    pulse: false,
                };
            case "failed":
                return {
                    color: "#ef4444", // Red
                    bgColor: "rgba(239, 68, 68, 0.2)",
                    text: "Failed",
                    pulse: false,
                };
            case "rejected":
                return {
                    color: "#f59e0b", // Orange
                    bgColor: "rgba(245, 158, 11, 0.2)",
                    text: "Rejected",
                    pulse: false,
                };
            case "pending":
                return {
                    color: "#888888", // Gray
                    bgColor: "rgba(136, 136, 136, 0.2)",
                    text: "Pending",
                    pulse: false,
                };
            case "cancelled":
                return {
                    color: "#888888", // Gray
                    bgColor: "rgba(136, 136, 136, 0.2)",
                    text: "Cancelled",
                    pulse: false,
                };
            default:
                return {
                    color: "#888888",
                    bgColor: "rgba(136, 136, 136, 0.2)",
                    text: "Unknown",
                    pulse: false,
                };
        }
    };

    const getSizeStyles = () => {
        switch (size) {
            case "small":
                return {
                    padding: "2px 6px",
                    fontSize: "10px",
                    borderRadius: "4px",
                };
            case "large":
                return {
                    padding: "6px 12px",
                    fontSize: "14px",
                    borderRadius: "6px",
                };
            default: // medium
                return {
                    padding: "3px 8px",
                    fontSize: "12px",
                    borderRadius: "4px",
                };
        }
    };

    const config = getStatusConfig();
    const sizeStyles = getSizeStyles();

    return (
        <span
            style={{
                backgroundColor: config.bgColor,
                color: config.color,
                padding: sizeStyles.padding,
                borderRadius: sizeStyles.borderRadius,
                fontSize: sizeStyles.fontSize,
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                animation: config.pulse ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" : "none",
            }}
        >
            {config.text.toUpperCase()}
        </span>
    );
}


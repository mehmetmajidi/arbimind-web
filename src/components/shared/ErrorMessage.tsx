"use client";

import React from "react";
import { colors } from "./designSystem";
import { MdError, MdClose } from "react-icons/md";
import { handleApiError } from "@/lib/errorHandler";

interface ErrorMessageProps {
    message: string | Error | any;
    onDismiss?: () => void;
    onRetry?: () => void;
    retryCount?: number;
    maxRetries?: number;
    compact?: boolean;
    showDetails?: boolean;
}

export default function ErrorMessage({
    message,
    onDismiss,
    onRetry,
    retryCount,
    maxRetries,
    compact = false,
    showDetails = false,
}: ErrorMessageProps) {
    const [showFullDetails, setShowFullDetails] = React.useState(false);
    const formattedMessage = handleApiError(message);
    const errorDetails = typeof message === "object" && message !== null && !(message instanceof Error)
        ? message
        : null;

    return (
        <div
            style={{
                padding: compact ? "12px" : "16px",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                border: "2px solid rgba(239, 68, 68, 0.5)",
                borderRadius: "8px",
                marginBottom: compact ? "12px" : "24px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                    <MdError size={20} color={colors.error} />
                    <div style={{ color: colors.error, fontSize: compact ? "13px" : "14px", fontWeight: "500", flex: 1 }}>
                        <strong>⚠️ Error:</strong> {formattedMessage}
                        {retryCount !== undefined && retryCount > 0 && maxRetries && (
                            <span style={{ color: colors.secondaryText, fontSize: "12px", marginLeft: "8px" }}>
                                (Retry attempt {retryCount}/{maxRetries})
                            </span>
                        )}
                    </div>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            style={{
                                padding: "6px 12px",
                                backgroundColor: colors.error,
                                border: "none",
                                borderRadius: "6px",
                                color: colors.text,
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: "pointer",
                                transition: "opacity 0.2s",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = "0.8";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = "1";
                            }}
                        >
                            Retry
                        </button>
                    )}
                    {onDismiss && (
                        <button
                            onClick={onDismiss}
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
            </div>
            {showDetails && errorDetails && (
                <div>
                    <button
                        onClick={() => setShowFullDetails(!showFullDetails)}
                        style={{
                            padding: "4px 8px",
                            backgroundColor: "transparent",
                            border: `1px solid ${colors.border}`,
                            borderRadius: "4px",
                            color: colors.secondaryText,
                            fontSize: "11px",
                            cursor: "pointer",
                        }}
                    >
                        {showFullDetails ? "Hide" : "Show"} Details
                    </button>
                    {showFullDetails && (
                        <pre
                            style={{
                                marginTop: "8px",
                                padding: "8px",
                                backgroundColor: colors.background,
                                border: `1px solid ${colors.border}`,
                                borderRadius: "4px",
                                fontSize: "11px",
                                color: colors.secondaryText,
                                overflow: "auto",
                                maxHeight: "200px",
                            }}
                        >
                            {JSON.stringify(errorDetails, null, 2)}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
}

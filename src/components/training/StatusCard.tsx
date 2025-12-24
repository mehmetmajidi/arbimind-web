"use client";

import { ReactNode } from "react";
import { formatTimestamp } from "./utils";

interface StatusCardProps {
    title: string;
    status: "active" | "inactive" | "pending" | "error";
    lastRun?: string;
    nextRun?: string;
    details?: ReactNode;
    actions?: ReactNode;
}

export default function StatusCard({
    title,
    status,
    lastRun,
    nextRun,
    details,
    actions,
}: StatusCardProps) {
    const getStatusConfig = () => {
        switch (status) {
            case "active":
                return {
                    color: "#22c55e",
                    bgColor: "rgba(34, 197, 94, 0.2)",
                    text: "Active",
                    dotColor: "#22c55e",
                };
            case "inactive":
                return {
                    color: "#888",
                    bgColor: "rgba(136, 136, 136, 0.2)",
                    text: "Inactive",
                    dotColor: "#888",
                };
            case "pending":
                return {
                    color: "#FFAE00",
                    bgColor: "rgba(255, 174, 0, 0.2)",
                    text: "Pending",
                    dotColor: "#FFAE00",
                };
            case "error":
                return {
                    color: "#ef4444",
                    bgColor: "rgba(239, 68, 68, 0.2)",
                    text: "Error",
                    dotColor: "#ef4444",
                };
            default:
                return {
                    color: "#888",
                    bgColor: "rgba(136, 136, 136, 0.2)",
                    text: "Unknown",
                    dotColor: "#888",
                };
        }
    };

    const config = getStatusConfig();

    return (
        <div
            style={{
                backgroundColor: "#1a1a1a",
                borderRadius: "12px",
                padding: "12px",
                border: "1px solid rgba(255, 174, 0, 0.2)",
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h4 style={{ color: "#FFAE00", margin: 0, fontSize: "12px", fontWeight: "600" }}>
                    {title}
                </h4>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div
                        style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: config.dotColor,
                            animation: status === "active" ? "pulse 2s infinite" : "none",
                        }}
                    />
                    <span
                        style={{
                            padding: "2px 6px",
                            backgroundColor: config.bgColor,
                            color: config.color,
                            borderRadius: "4px",
                            fontSize: "9px",
                            fontWeight: "600",
                        }}
                    >
                        {config.text}
                    </span>
                </div>
            </div>

            {details && (
                <div style={{ marginBottom: "8px", fontSize: "10px", color: "#888" }}>
                    {details}
                </div>
            )}

            {(lastRun || nextRun) && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "10px", color: "#888", marginBottom: "8px" }}>
                    {lastRun && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Last run:</span>
                            <span style={{ color: "#ededed" }}>{formatTimestamp(lastRun)}</span>
                        </div>
                    )}
                    {nextRun && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Next run:</span>
                            <span style={{ color: "#ededed" }}>{formatTimestamp(nextRun)}</span>
                        </div>
                    )}
                </div>
            )}

            {actions && (
                <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                    {actions}
                </div>
            )}
        </div>
    );
}


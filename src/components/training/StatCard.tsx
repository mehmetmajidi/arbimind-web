"use client";

import { ReactNode } from "react";

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: ReactNode;
    trend?: {
        value: number;
        isPositive?: boolean;
    };
    onClick?: () => void;
}

export default function StatCard({
    title,
    value,
    subtitle,
    icon,
    trend,
    onClick,
}: StatCardProps) {
    return (
        <div
            onClick={onClick}
            style={{
                backgroundColor: "#1a1a1a",
                borderRadius: "12px",
                padding: "12px",
                border: "1px solid rgba(255, 174, 0, 0.2)",
                cursor: onClick ? "pointer" : "default",
                transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
                if (onClick) {
                    e.currentTarget.style.backgroundColor = "#202020";
                    e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.4)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
                }
            }}
            onMouseLeave={(e) => {
                if (onClick) {
                    e.currentTarget.style.backgroundColor = "#1a1a1a";
                    e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.2)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                }
            }}
            onFocus={(e) => {
                if (onClick) {
                    e.currentTarget.style.outline = "2px solid rgba(255, 174, 0, 0.5)";
                    e.currentTarget.style.outlineOffset = "2px";
                }
            }}
            onBlur={(e) => {
                if (onClick) {
                    e.currentTarget.style.outline = "none";
                }
            }}
            tabIndex={onClick ? 0 : undefined}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {icon && <span style={{ color: "#FFAE00", fontSize: "14px" }}>{icon}</span>}
                    <h4 style={{ color: "#888", margin: 0, fontSize: "11px", fontWeight: "600" }}>
                        {title}
                    </h4>
                </div>
                {trend && (
                    <span
                        style={{
                            fontSize: "10px",
                            fontWeight: "600",
                            color: trend.isPositive !== false ? "#22c55e" : "#ef4444",
                        }}
                    >
                        {trend.isPositive !== false ? "+" : ""}
                        {trend.value}%
                    </span>
                )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ color: "#ededed", fontSize: "18px", fontWeight: "600" }}>
                    {typeof value === "number" ? value.toLocaleString() : value}
                </span>
                {subtitle && (
                    <span style={{ color: "#888", fontSize: "10px" }}>
                        {subtitle}
                    </span>
                )}
            </div>
        </div>
    );
}


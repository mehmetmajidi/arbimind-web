"use client";

import { ReactNode } from "react";
import FilterStatusIndicator from "./FilterStatusIndicator";

interface FilterStatusCardProps {
    title: string;
    passed: boolean;
    metrics?: {
        label: string;
        value: string | number;
        unit?: string;
    }[];
    recommendation?: string;
    details?: ReactNode;
}

export default function FilterStatusCard({
    title,
    passed,
    metrics,
    recommendation,
    details,
}: FilterStatusCardProps) {
    return (
        <div
            style={{
                backgroundColor: "#202020",
                borderRadius: "8px",
                padding: "10px",
                border: `1px solid ${passed ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h5 style={{ color: "#FFAE00", margin: 0, fontSize: "12px", fontWeight: "600" }}>
                    {title}
                </h5>
                <FilterStatusIndicator 
                    status={passed ? "passed" : "failed"}
                    size="small"
                />
            </div>

            {metrics && metrics.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px", fontSize: "10px" }}>
                    {metrics.map((metric, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#888" }}>{metric.label}:</span>
                            <span style={{ color: "#ededed" }}>
                                {typeof metric.value === "number" 
                                    ? metric.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                    : metric.value}
                                {metric.unit && ` ${metric.unit}`}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {recommendation && (
                <div
                    style={{
                        padding: "6px",
                        backgroundColor: passed 
                            ? "rgba(34, 197, 94, 0.1)" 
                            : "rgba(239, 68, 68, 0.1)",
                        borderRadius: "4px",
                        fontSize: "9px",
                        color: passed ? "#22c55e" : "#ef4444",
                        marginBottom: "6px",
                    }}
                >
                    {recommendation}
                </div>
            )}

            {details && (
                <div style={{ fontSize: "9px", color: "#888" }}>
                    {details}
                </div>
            )}
        </div>
    );
}


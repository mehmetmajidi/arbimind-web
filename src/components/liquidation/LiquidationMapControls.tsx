"use client";

import { useState, useEffect, useCallback } from "react";
import { MdRefresh, MdCameraAlt, MdSettings } from "react-icons/md";
import { AVAILABLE_SYMBOLS, AVAILABLE_TIMEFRAMES } from "./constants";

interface LiquidationMapControlsProps {
    selectedSymbol: string;
    selectedTimeframe: string;
    onSymbolChange: (symbol: string) => void;
    onTimeframeChange: (timeframe: string) => void;
    onRefresh: () => void;
    onExport?: () => void;
    loading?: boolean;
    autoRefreshInterval?: number;
    onAutoRefreshChange?: (interval: number) => void;
}

export default function LiquidationMapControls({
    selectedSymbol,
    selectedTimeframe,
    onSymbolChange,
    onTimeframeChange,
    onRefresh,
    onExport,
    loading = false,
    autoRefreshInterval,
    onAutoRefreshChange,
}: LiquidationMapControlsProps) {
    const [showSettings, setShowSettings] = useState(false);
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                backgroundColor: "#1a1a1a",
                borderRadius: "8px",
                border: "1px solid rgba(255, 174, 0, 0.2)",
                marginBottom: "12px",
            }}
        >
            {/* Symbol Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label
                    style={{
                        fontSize: "12px",
                        color: "#888",
                        fontWeight: "500",
                    }}
                >
                    Symbol:
                </label>
                <select
                    value={selectedSymbol}
                    onChange={(e) => onSymbolChange(e.target.value)}
                    disabled={loading}
                    style={{
                        padding: "6px 12px",
                        backgroundColor: "#2a2a2a",
                        border: "1px solid rgba(255, 174, 0, 0.2)",
                        borderRadius: "6px",
                        color: "#ffffff",
                        fontSize: "13px",
                        fontWeight: "500",
                        outline: "none",
                        cursor: loading ? "not-allowed" : "pointer",
                        opacity: loading ? 0.6 : 1,
                        minWidth: "100px",
                    }}
                    onFocus={(e) => {
                        if (!loading) e.target.style.borderColor = "#FFAE00";
                    }}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(255, 174, 0, 0.2)")}
                >
                    {AVAILABLE_SYMBOLS.map((symbol) => (
                        <option key={symbol} value={symbol}>
                            {symbol}
                        </option>
                    ))}
                </select>
            </div>

            {/* Timeframe Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label
                    style={{
                        fontSize: "12px",
                        color: "#888",
                        fontWeight: "500",
                    }}
                >
                    Timeframe:
                </label>
                <select
                    value={selectedTimeframe}
                    onChange={(e) => onTimeframeChange(e.target.value)}
                    disabled={loading}
                    style={{
                        padding: "6px 12px",
                        backgroundColor: "#2a2a2a",
                        border: "1px solid rgba(255, 174, 0, 0.2)",
                        borderRadius: "6px",
                        color: "#ffffff",
                        fontSize: "13px",
                        fontWeight: "500",
                        outline: "none",
                        cursor: loading ? "not-allowed" : "pointer",
                        opacity: loading ? 0.6 : 1,
                        minWidth: "100px",
                    }}
                    onFocus={(e) => {
                        if (!loading) e.target.style.borderColor = "#FFAE00";
                    }}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(255, 174, 0, 0.2)")}
                >
                    {AVAILABLE_TIMEFRAMES.map((tf) => (
                        <option key={tf.value} value={tf.value}>
                            {tf.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Export Button */}
            {onExport && (
                <button
                    onClick={onExport}
                    disabled={loading}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "6px 12px",
                        backgroundColor: "rgba(255, 174, 0, 0.1)",
                        border: "1px solid rgba(255, 174, 0, 0.2)",
                        borderRadius: "6px",
                        color: "#FFAE00",
                        fontSize: "16px",
                        cursor: loading ? "not-allowed" : "pointer",
                        outline: "none",
                        transition: "all 0.2s ease",
                        opacity: loading ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                        if (!loading) {
                            e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.2)";
                            e.currentTarget.style.borderColor = "#FFAE00";
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!loading) {
                            e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.1)";
                            e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.2)";
                        }
                    }}
                    title="Export chart as image"
                >
                    <MdCameraAlt />
                </button>
            )}

            {/* Refresh Button */}
            <button
                onClick={onRefresh}
                disabled={loading}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "6px 12px",
                    backgroundColor: loading ? "#2a2a2a" : "rgba(255, 174, 0, 0.1)",
                    border: "1px solid rgba(255, 174, 0, 0.2)",
                    borderRadius: "6px",
                    color: loading ? "#666" : "#FFAE00",
                    fontSize: "16px",
                    cursor: loading ? "not-allowed" : "pointer",
                    outline: "none",
                    transition: "all 0.2s ease",
                    opacity: loading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                    if (!loading) {
                        e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.2)";
                        e.currentTarget.style.borderColor = "#FFAE00";
                    }
                }}
                onMouseLeave={(e) => {
                    if (!loading) {
                        e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.1)";
                        e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.2)";
                    }
                }}
                title="Refresh data"
            >
                <MdRefresh
                    style={{
                        animation: loading ? "spin 1s linear infinite" : "none",
                    }}
                />
            </button>

            {/* Loading Indicator */}
            {loading && (
                <span
                    style={{
                        fontSize: "12px",
                        color: "#888",
                        marginLeft: "auto",
                    }}
                >
                    Loading...
                </span>
            )}

            <style jsx>{`
                @keyframes spin {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }
            `}</style>
        </div>
    );
}


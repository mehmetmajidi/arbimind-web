"use client";

import { useState, useCallback } from "react";
import { formatTimestamp } from "./utils";
import FilterStatusIndicator from "./FilterStatusIndicator";
import { getFilterStatus } from "@/lib/trainingApi";
import type { FilterStatus } from "@/types/training";

function FilterStatusPanel() {
    const [symbol, setSymbol] = useState<string>("");
    const [interval, setInterval] = useState<string>("1h");
    const [filterStatus, setFilterStatus] = useState<FilterStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedVolatility, setExpandedVolatility] = useState(false);
    const [expandedFreshness, setExpandedFreshness] = useState(false);

    const checkFilter = useCallback(async () => {
        if (!symbol.trim()) {
            setError("Please enter a symbol");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Normalize symbol format (add /USDT if not present)
            let normalizedSymbol = symbol.trim().toUpperCase();
            if (!normalizedSymbol.includes("/")) {
                normalizedSymbol = `${normalizedSymbol}/USDT`;
            }

            const data = await getFilterStatus(normalizedSymbol, interval);
            setFilterStatus(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error checking filter status");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [symbol, interval]);

    const formatTimestamp = (timestamp?: string) => {
        if (!timestamp) return "N/A";
        try {
            const date = new Date(timestamp);
            return date.toLocaleString("en-US", { 
                month: "short", 
                day: "numeric", 
                hour: "2-digit", 
                minute: "2-digit" 
            });
        } catch {
            return "N/A";
        }
    };

    return (
        <div style={{
            backgroundColor: "#1a1a1a",
            borderRadius: "12px",
            padding: "12px",
            border: "1px solid rgba(255, 174, 0, 0.2)",
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h4 style={{ color: "#FFAE00", margin: 0, fontSize: "14px", fontWeight: "600" }}>
                    Filter Status
                </h4>
            </div>

            {/* Symbol Search Section */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
                <input
                    type="text"
                    placeholder="Symbol (e.g., BTC/USDT)"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === "Enter") {
                            checkFilter();
                        }
                    }}
                    aria-label="Symbol to check filter status"
                    style={{
                        flex: 1,
                        padding: "6px 10px",
                        backgroundColor: "#202020",
                        border: "1px solid rgba(255, 174, 0, 0.2)",
                        borderRadius: "6px",
                        color: "#ededed",
                        fontSize: "11px",
                        transition: "all 0.2s ease",
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#FFAE00";
                        e.currentTarget.style.outline = "none";
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.2)";
                    }}
                />
                <select
                    value={interval}
                    onChange={(e) => setInterval(e.target.value)}
                    aria-label="Time interval"
                    style={{
                        padding: "6px 10px",
                        backgroundColor: "#202020",
                        border: "1px solid rgba(255, 174, 0, 0.2)",
                        borderRadius: "6px",
                        color: "#ededed",
                        fontSize: "11px",
                        transition: "all 0.2s ease",
                        cursor: "pointer",
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#FFAE00";
                        e.currentTarget.style.outline = "none";
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.2)";
                    }}
                >
                    <option value="1h">1h</option>
                    <option value="4h">4h</option>
                    <option value="1d">1d</option>
                </select>
                <button
                    onClick={checkFilter}
                    disabled={loading || !symbol.trim()}
                    aria-label="Check filter status"
                    style={{
                        padding: "6px 12px",
                        backgroundColor: loading || !symbol.trim() ? "rgba(255, 174, 0, 0.1)" : "#FFAE00",
                        color: loading || !symbol.trim() ? "#888" : "#1a1a1a",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "600",
                        cursor: loading || !symbol.trim() ? "not-allowed" : "pointer",
                        transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                        if (!loading && symbol.trim()) {
                            e.currentTarget.style.backgroundColor = "#ffb733";
                            e.currentTarget.style.transform = "scale(1.05)";
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!loading && symbol.trim()) {
                            e.currentTarget.style.backgroundColor = "#FFAE00";
                            e.currentTarget.style.transform = "scale(1)";
                        }
                    }}
                    onFocus={(e) => {
                        if (!loading && symbol.trim()) {
                            e.currentTarget.style.outline = "2px solid rgba(255, 174, 0, 0.5)";
                            e.currentTarget.style.outlineOffset = "2px";
                        }
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.outline = "none";
                    }}
                >
                    {loading ? "..." : "Check"}
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    padding: "8px",
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "6px",
                    color: "#ef4444",
                    fontSize: "10px",
                    marginBottom: "12px",
                }}>
                    {error}
                </div>
            )}

            {/* Filter Status Display */}
            {filterStatus && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {/* Volatility Card */}
                    {filterStatus.volatility && (
                        <div style={{
                            padding: "10px",
                            backgroundColor: "#202020",
                            borderRadius: "8px",
                            border: "1px solid rgba(255, 174, 0, 0.1)",
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <h5 style={{ color: "#FFAE00", margin: 0, fontSize: "12px", fontWeight: "600" }}>
                                    Volatility
                                </h5>
                                <FilterStatusIndicator 
                                    status={filterStatus.volatility.passed ? "passed" : "failed"}
                                    size="small"
                                />
                            </div>
                            {filterStatus.volatility.metrics && (
                                <>
                                    <div style={{ marginBottom: "6px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginBottom: "2px" }}>
                                            <span style={{ color: "#888" }}>Score:</span>
                                            <span style={{ color: "#ededed" }}>
                                                {filterStatus.volatility.metrics.price_volatility 
                                                    ? `${(filterStatus.volatility.metrics.price_volatility * 100).toFixed(2)}%`
                                                    : "N/A"}
                                            </span>
                                        </div>
                                        {filterStatus.volatility.metrics.price_volatility && (
                                            <div style={{
                                                width: "100%",
                                                height: "4px",
                                                backgroundColor: "#1a1a1a",
                                                borderRadius: "2px",
                                                overflow: "hidden",
                                            }}>
                                                <div style={{
                                                    width: `${Math.min(filterStatus.volatility.metrics.price_volatility * 1000, 100)}%`,
                                                    height: "100%",
                                                    backgroundColor: filterStatus.volatility.passed ? "#22c55e" : "#ef4444",
                                                }} />
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setExpandedVolatility(!expandedVolatility)}
                                        style={{
                                            width: "100%",
                                            padding: "4px",
                                            backgroundColor: "transparent",
                                            color: "#888",
                                            border: "none",
                                            fontSize: "9px",
                                            cursor: "pointer",
                                            textAlign: "left",
                                        }}
                                    >
                                        {expandedVolatility ? "▼ Hide details" : "▶ Show details"}
                                    </button>
                                    {expandedVolatility && filterStatus.volatility.metrics && (
                                        <div style={{ marginTop: "6px", fontSize: "10px", color: "#888" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                                <span>Price volatility:</span>
                                                <span style={{ color: "#ededed" }}>
                                                    {filterStatus.volatility.metrics.price_volatility 
                                                        ? `${(filterStatus.volatility.metrics.price_volatility * 100).toFixed(2)}%`
                                                        : "N/A"}
                                                </span>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                                <span>Daily range:</span>
                                                <span style={{ color: "#ededed" }}>
                                                    {filterStatus.volatility.metrics.daily_range_avg 
                                                        ? `${(filterStatus.volatility.metrics.daily_range_avg * 100).toFixed(2)}%`
                                                        : "N/A"}
                                                </span>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                                <span>Volume volatility:</span>
                                                <span style={{ color: "#ededed" }}>
                                                    {filterStatus.volatility.metrics.volume_volatility?.toFixed(2) || "N/A"}
                                                </span>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                <span>Movement frequency:</span>
                                                <span style={{ color: "#ededed" }}>
                                                    {filterStatus.volatility.metrics.movement_frequency 
                                                        ? `${(filterStatus.volatility.metrics.movement_frequency * 100).toFixed(1)}%`
                                                        : "N/A"}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {filterStatus.volatility.recommendation && (
                                        <div style={{
                                            marginTop: "6px",
                                            padding: "6px",
                                            backgroundColor: filterStatus.volatility.passed 
                                                ? "rgba(34, 197, 94, 0.1)" 
                                                : "rgba(239, 68, 68, 0.1)",
                                            borderRadius: "4px",
                                            fontSize: "9px",
                                            color: filterStatus.volatility.passed ? "#22c55e" : "#ef4444",
                                        }}>
                                            {filterStatus.volatility.recommendation}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Data Freshness Card */}
                    {filterStatus.data_freshness && (
                        <div style={{
                            padding: "10px",
                            backgroundColor: "#202020",
                            borderRadius: "8px",
                            border: "1px solid rgba(255, 174, 0, 0.1)",
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <h5 style={{ color: "#FFAE00", margin: 0, fontSize: "12px", fontWeight: "600" }}>
                                    Data Freshness
                                </h5>
                                <FilterStatusIndicator 
                                    status={filterStatus.data_freshness.is_fresh ? "passed" : "failed"}
                                    text={filterStatus.data_freshness.is_fresh ? "Fresh" : "Stale"}
                                    size="small"
                                />
                            </div>
                            <div style={{ fontSize: "10px", color: "#888", marginBottom: "6px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                    <span>Last candle:</span>
                                    <span style={{ color: "#ededed" }}>
                                        {formatTimestamp(filterStatus.data_freshness.last_candle_time)}
                                    </span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                    <span>Data age:</span>
                                    <span style={{ color: "#ededed" }}>
                                        {filterStatus.data_freshness.data_age_hours 
                                            ? `${filterStatus.data_freshness.data_age_hours.toFixed(1)}h`
                                            : "N/A"}
                                    </span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                    <span>Completeness:</span>
                                    <span style={{ color: "#ededed" }}>
                                        {filterStatus.data_freshness.completeness 
                                            ? `${(filterStatus.data_freshness.completeness * 100).toFixed(1)}%`
                                            : "N/A"}
                                    </span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>Gaps:</span>
                                    <span style={{ color: "#ededed" }}>
                                        {filterStatus.data_freshness.gaps?.length || 0}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setExpandedFreshness(!expandedFreshness)}
                                style={{
                                    width: "100%",
                                    padding: "4px",
                                    backgroundColor: "transparent",
                                    color: "#888",
                                    border: "none",
                                    fontSize: "9px",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    marginBottom: "6px",
                                }}
                            >
                                {expandedFreshness ? "▼ Hide gaps" : "▶ Show gaps"}
                            </button>
                            {expandedFreshness && filterStatus.data_freshness.gaps && filterStatus.data_freshness.gaps.length > 0 && (
                                <div style={{ fontSize: "9px", color: "#888", marginTop: "6px" }}>
                                    {filterStatus.data_freshness.gaps.map((gap, idx) => (
                                        <div key={idx} style={{ marginBottom: "4px" }}>
                                            {formatTimestamp(gap.start)} - {formatTimestamp(gap.end)} ({gap.count} candles)
                                        </div>
                                    ))}
                                </div>
                            )}
                            {filterStatus.data_freshness.recommendation && (
                                <div style={{
                                    marginTop: "6px",
                                    padding: "6px",
                                    backgroundColor: filterStatus.data_freshness.is_fresh 
                                        ? "rgba(34, 197, 94, 0.1)" 
                                        : "rgba(239, 68, 68, 0.1)",
                                    borderRadius: "4px",
                                    fontSize: "9px",
                                    color: filterStatus.data_freshness.is_fresh ? "#22c55e" : "#ef4444",
                                }}>
                                    {filterStatus.data_freshness.recommendation}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Overall Status */}
                    <div style={{
                        padding: "10px",
                        backgroundColor: filterStatus.can_train ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        borderRadius: "8px",
                        border: `1px solid ${filterStatus.can_train ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "600", color: filterStatus.can_train ? "#22c55e" : "#ef4444" }}>
                                Can Train:
                            </span>
                            <span style={{ fontSize: "11px", fontWeight: "600", color: filterStatus.can_train ? "#22c55e" : "#ef4444" }}>
                                {filterStatus.can_train ? "✅ Yes" : "❌ No"}
                            </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "600", color: filterStatus.can_predict ? "#22c55e" : "#ef4444" }}>
                                Can Predict:
                            </span>
                            <span style={{ fontSize: "11px", fontWeight: "600", color: filterStatus.can_predict ? "#22c55e" : "#ef4444" }}>
                                {filterStatus.can_predict ? "✅ Yes" : "❌ No"}
                            </span>
                        </div>
                        {filterStatus.reason && (
                            <div style={{
                                marginTop: "6px",
                                padding: "6px",
                                backgroundColor: "rgba(0, 0, 0, 0.2)",
                                borderRadius: "4px",
                                fontSize: "9px",
                                color: filterStatus.can_train ? "#22c55e" : "#ef4444",
                            }}>
                                {filterStatus.reason}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!filterStatus && !loading && !error && (
                <div style={{ padding: "20px", textAlign: "center", color: "#888", fontSize: "11px" }}>
                    Enter a symbol and click "Check" to see filter status
                </div>
            )}
        </div>
    );
}

export default FilterStatusPanel;

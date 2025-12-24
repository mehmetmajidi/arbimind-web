"use client";

import { useState, useEffect, useCallback } from "react";
import { formatTimestamp, getAuthToken } from "./utils";
import { getPeriodicStatus, triggerPeriodicRetrain } from "@/lib/trainingApi";
import type { PeriodicRetrainStatus } from "@/types/training";
import StatCard from "./StatCard";
import StatusCard from "./StatusCard";
import LoadingSpinner from "./LoadingSpinner";

interface TrainingControlsPanelProps {
    onStartTraining?: () => void;
    onCheckFilter?: () => void;
    onSettings?: () => void;
}

export default function TrainingControlsPanel({ 
    onStartTraining, 
    onCheckFilter, 
    onSettings 
}: TrainingControlsPanelProps) {
    const [periodicStatus, setPeriodicStatus] = useState<PeriodicRetrainStatus | null>(null);
    const [filterStats, setFilterStats] = useState<{
        total_filtered?: number;
        filtered_by_volatility?: number;
        filtered_by_data_freshness?: number;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const data = await getPeriodicStatus();
            setPeriodicStatus(data);
            
            // Extract filter stats from summary if available
            if (data.summary) {
                setFilterStats({
                    total_filtered: data.summary.total_filtered || 0,
                    filtered_by_volatility: data.summary.filtered_by_volatility || 0,
                    filtered_by_data_freshness: data.summary.filtered_by_data_freshness || 0,
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error fetching status");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const handleTriggerNow = async () => {
        try {
            await triggerPeriodicRetrain(1); // Trigger Tier 1
            // Refresh status after a moment
            setTimeout(() => {
                fetchStatus();
            }, 2000);
        } catch (err) {
            console.error("Error triggering retraining:", err);
            setError(err instanceof Error ? err.message : "Failed to trigger retraining");
        }
    };

    const handleProcessQueue = async () => {
        try {
            const token = getAuthToken();
            if (!token) return;

            // Process queue - refresh status after a moment
            setTimeout(() => {
                fetchStatus();
            }, 1000);
        } catch (err) {
            console.error("Error processing queue:", err);
        }
    };

    return (
        <div style={{
            backgroundColor: "#1a1a1a",
            borderRadius: "12px",
            padding: "16px",
            border: "1px solid rgba(255, 174, 0, 0.2)",
            minWidth: "280px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
        }}>
            {/* Periodic Retraining Status Card */}
            <div style={{
                padding: "12px",
                backgroundColor: "#202020",
                borderRadius: "8px",
                border: "1px solid rgba(255, 174, 0, 0.1)",
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h4 style={{ color: "#FFAE00", margin: 0, fontSize: "14px", fontWeight: "600" }}>
                        Periodic Retraining
                    </h4>
                    {periodicStatus?.scheduler?.enabled ? (
                        <span style={{
                            padding: "2px 8px",
                            backgroundColor: "rgba(34, 197, 94, 0.2)",
                            color: "#22c55e",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: "600",
                        }}>
                            Active
                        </span>
                    ) : (
                        <span style={{
                            padding: "2px 8px",
                            backgroundColor: "rgba(239, 68, 68, 0.2)",
                            color: "#ef4444",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: "600",
                        }}>
                            Paused
                        </span>
                    )}
                </div>
                {loading ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#888", fontSize: "11px" }}>
                        <LoadingSpinner size="small" />
                        Loading...
                    </div>
                ) : error ? (
                    <div style={{ 
                        padding: "8px", 
                        backgroundColor: "rgba(239, 68, 68, 0.1)", 
                        border: "1px solid rgba(239, 68, 68, 0.3)", 
                        borderRadius: "6px", 
                        color: "#ef4444", 
                        fontSize: "11px" 
                    }}>
                        {error}
                    </div>
                ) : (
                    <>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                                <span style={{ color: "#888" }}>Last run:</span>
                                <span style={{ color: "#ededed" }}>{formatTimestamp(periodicStatus?.last_run)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                                <span style={{ color: "#888" }}>Next run:</span>
                                <span style={{ color: "#ededed" }}>{formatTimestamp(periodicStatus?.next_run)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                                <span style={{ color: "#888" }}>Success rate (7d):</span>
                                <span style={{ color: "#22c55e", fontWeight: "600" }}>
                                    {periodicStatus?.stats_7d?.success_rate 
                                        ? `${(periodicStatus.stats_7d.success_rate * 100).toFixed(1)}%`
                                        : "N/A"}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={handleTriggerNow}
                            style={{
                                width: "100%",
                                padding: "6px 12px",
                                backgroundColor: "rgba(255, 174, 0, 0.1)",
                                color: "#FFAE00",
                                border: "1px solid rgba(255, 174, 0, 0.3)",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: "600",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.2)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.1)";
                            }}
                        >
                            Trigger Now
                        </button>
                    </>
                )}
            </div>

            {/* Filter Statistics Card */}
            <div style={{
                padding: "12px",
                backgroundColor: "#202020",
                borderRadius: "8px",
                border: "1px solid rgba(255, 174, 0, 0.1)",
            }}>
                <h4 style={{ color: "#FFAE00", margin: "0 0 12px 0", fontSize: "14px", fontWeight: "600" }}>
                    Filter Statistics
                </h4>
                {loading ? (
                    <div style={{ color: "#888", fontSize: "11px" }}>Loading...</div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                            <span style={{ color: "#888" }}>Total filtered:</span>
                            <span style={{ color: "#ededed", fontWeight: "600" }}>
                                {filterStats?.total_filtered || 0}
                            </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                            <span style={{ color: "#888" }}>By volatility:</span>
                            <span style={{ color: "#f59e0b", fontWeight: "600" }}>
                                {filterStats?.filtered_by_volatility || 0}
                            </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                            <span style={{ color: "#888" }}>By data freshness:</span>
                            <span style={{ color: "#f59e0b", fontWeight: "600" }}>
                                {filterStats?.filtered_by_data_freshness || 0}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Queue Status Card */}
            <div style={{
                padding: "12px",
                backgroundColor: "#202020",
                borderRadius: "8px",
                border: "1px solid rgba(255, 174, 0, 0.1)",
            }}>
                <h4 style={{ color: "#FFAE00", margin: "0 0 12px 0", fontSize: "14px", fontWeight: "600" }}>
                    Training Queue
                </h4>
                {loading ? (
                    <div style={{ color: "#888", fontSize: "11px" }}>Loading...</div>
                ) : (
                    <>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                                <span style={{ color: "#888" }}>Pending:</span>
                                <span style={{ color: "#f59e0b", fontWeight: "600" }}>
                                    {periodicStatus?.queue?.pending || 0}
                                </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                                <span style={{ color: "#888" }}>Running:</span>
                                <span style={{ color: "#FFAE00", fontWeight: "600" }}>
                                    {periodicStatus?.queue?.running || 0}
                                </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                                <span style={{ color: "#888" }}>Max concurrent:</span>
                                <span style={{ color: "#ededed" }}>
                                    {periodicStatus?.queue?.max_concurrent || 3}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={handleProcessQueue}
                            style={{
                                width: "100%",
                                padding: "6px 12px",
                                backgroundColor: "rgba(255, 174, 0, 0.1)",
                                color: "#FFAE00",
                                border: "1px solid rgba(255, 174, 0, 0.3)",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: "600",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.2)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.1)";
                            }}
                        >
                            Process Queue
                        </button>
                    </>
                )}
            </div>

            {/* Quick Actions Card */}
            <div style={{
                padding: "12px",
                backgroundColor: "#202020",
                borderRadius: "8px",
                border: "1px solid rgba(255, 174, 0, 0.1)",
            }}>
                <h4 style={{ color: "#FFAE00", margin: "0 0 12px 0", fontSize: "14px", fontWeight: "600" }}>
                    Quick Actions
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <button
                        onClick={onStartTraining}
                        style={{
                            width: "100%",
                            padding: "8px 12px",
                            backgroundColor: "#FFAE00",
                            color: "#1a1a1a",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#ffb733";
                            e.currentTarget.style.transform = "scale(1.02)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#FFAE00";
                            e.currentTarget.style.transform = "scale(1)";
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.outline = "2px solid rgba(255, 174, 0, 0.5)";
                            e.currentTarget.style.outlineOffset = "2px";
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.outline = "none";
                        }}
                    >
                        Start Training
                    </button>
                    <button
                        onClick={onCheckFilter}
                        style={{
                            width: "100%",
                            padding: "6px 12px",
                            backgroundColor: "rgba(255, 174, 0, 0.1)",
                            color: "#FFAE00",
                            border: "1px solid rgba(255, 174, 0, 0.3)",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.2)";
                            e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.5)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.1)";
                            e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.3)";
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.outline = "2px solid rgba(255, 174, 0, 0.5)";
                            e.currentTarget.style.outlineOffset = "2px";
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.outline = "none";
                        }}
                    >
                        Check Filter
                    </button>
                    <button
                        onClick={onSettings}
                        style={{
                            width: "100%",
                            padding: "6px 12px",
                            backgroundColor: "rgba(255, 174, 0, 0.1)",
                            color: "#FFAE00",
                            border: "1px solid rgba(255, 174, 0, 0.3)",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.2)";
                            e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.5)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.1)";
                            e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.3)";
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.outline = "2px solid rgba(255, 174, 0, 0.5)";
                            e.currentTarget.style.outlineOffset = "2px";
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.outline = "none";
                        }}
                    >
                        Settings
                    </button>
                </div>
            </div>
        </div>
    );
}


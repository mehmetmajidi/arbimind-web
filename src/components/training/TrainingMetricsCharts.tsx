"use client";

import { useState, useEffect, useCallback } from "react";
import { formatTimestamp, formatDuration } from "./utils";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getPeriodicStatus } from "@/lib/trainingApi";
import type { PeriodicRetrainSession } from "@/types/training";
import LoadingSpinner from "./LoadingSpinner";
import SkeletonLoader from "./SkeletonLoader";

function TrainingMetricsCharts() {
    const [periodicSessions, setPeriodicSessions] = useState<PeriodicRetrainSession[]>([]);
    const [filterStats, setFilterStats] = useState<{
        total_filtered?: number;
        filtered_by_volatility?: number;
        filtered_by_data_freshness?: number;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMetrics = useCallback(async () => {
        try {
            const data = await getPeriodicStatus();
            setPeriodicSessions(data.recent_periodic || []);
            
            // Extract filter stats
            if (data.summary) {
                setFilterStats({
                    total_filtered: data.summary.total_filtered || 0,
                    filtered_by_volatility: data.summary.filtered_by_volatility || 0,
                    filtered_by_data_freshness: data.summary.filtered_by_data_freshness || 0,
                });
            }
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error fetching metrics");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [fetchMetrics]);

    const formatTimestamp = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            return date.toLocaleString("en-US", { 
                month: "short", 
                day: "numeric", 
                hour: "2-digit", 
                minute: "2-digit" 
            });
        } catch {
            return timestamp;
        }
    };

    // Prepare chart data
    const sessionsChartData = periodicSessions.slice(-10).map((session, idx) => ({
        name: `Session ${periodicSessions.length - 9 + idx}`,
        timestamp: formatTimestamp(session.start_time),
        models: session.total_models,
        successful: session.successful,
        failed: session.failed,
    }));

    const successRateData = periodicSessions.slice(-10).map((session, idx) => ({
        name: `Session ${periodicSessions.length - 9 + idx}`,
        timestamp: formatTimestamp(session.start_time),
        rate: session.success_rate * 100,
    }));

    const filterReasonsData = filterStats ? [
        { name: "Volatility", value: filterStats.filtered_by_volatility || 0 },
        { name: "Data Freshness", value: filterStats.filtered_by_data_freshness || 0 },
    ].filter(item => item.value > 0) : [];

    const COLORS = ["#FFAE00", "#f59e0b", "#ef4444", "#22c55e"];

    const handleExport = () => {
        const exportData = {
            timestamp: new Date().toISOString(),
            periodic_sessions: periodicSessions,
            filter_stats: filterStats,
        };

        // Export as JSON
        const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const jsonUrl = URL.createObjectURL(jsonBlob);
        const jsonLink = document.createElement("a");
        jsonLink.href = jsonUrl;
        jsonLink.download = `training_metrics_${new Date().toISOString().split('T')[0]}.json`;
        jsonLink.click();
        URL.revokeObjectURL(jsonUrl);
    };

    return (
        <div style={{
            marginTop: "12px",
            backgroundColor: "#1a1a1a",
            borderRadius: "12px",
            padding: "16px",
            border: "1px solid rgba(255, 174, 0, 0.2)",
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ color: "#FFAE00", margin: 0, fontSize: "18px", fontWeight: "600" }}>
                    Metrics & Charts
                </h3>
                <button
                    onClick={handleExport}
                    style={{
                        padding: "6px 12px",
                        backgroundColor: "rgba(255, 174, 0, 0.1)",
                        color: "#FFAE00",
                        border: "1px solid rgba(255, 174, 0, 0.3)",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "600",
                        cursor: "pointer",
                    }}
                >
                    Export JSON
                </button>
            </div>

            {loading ? (
                <div style={{ padding: "40px", textAlign: "center" }}>
                    <LoadingSpinner size="large" text="Loading metrics..." />
                </div>
            ) : error ? (
                <div style={{ 
                    padding: "20px", 
                    backgroundColor: "rgba(239, 68, 68, 0.1)", 
                    border: "1px solid rgba(239, 68, 68, 0.3)", 
                    borderRadius: "8px", 
                    textAlign: "center", 
                    color: "#ef4444", 
                    fontSize: "12px" 
                }}>
                    {error}
                </div>
            ) : (
                <>
                    {/* Charts Grid */}
                    <div style={{ 
                        display: "grid", 
                        gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", 
                        gap: "16px", 
                        marginBottom: "24px" 
                    }}>
                        {/* Retraining Sessions Chart */}
                        {sessionsChartData.length > 0 && (
                            <div style={{ 
                                padding: "16px", 
                                backgroundColor: "#202020", 
                                borderRadius: "8px",
                                border: "1px solid rgba(255, 174, 0, 0.1)",
                            }}>
                                <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#ededed" }}>
                                    Retraining Sessions (Last 10)
                                </h4>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={sessionsChartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                                        <XAxis 
                                            dataKey="name" 
                                            stroke="#888" 
                                            fontSize={10}
                                            angle={-45}
                                            textAnchor="end"
                                            height={60}
                                        />
                                        <YAxis stroke="#888" fontSize={10} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "#202020",
                                                border: "1px solid #2a2a2a",
                                                borderRadius: "6px",
                                                color: "#ededed",
                                            }}
                                        />
                                        <Legend />
                                        <Bar dataKey="successful" fill="#22c55e" name="Successful" />
                                        <Bar dataKey="failed" fill="#ef4444" name="Failed" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Success Rate Trend Chart */}
                        {successRateData.length > 0 && (
                            <div style={{ 
                                padding: "16px", 
                                backgroundColor: "#202020", 
                                borderRadius: "8px",
                                border: "1px solid rgba(255, 174, 0, 0.1)",
                            }}>
                                <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#ededed" }}>
                                    Success Rate Trend
                                </h4>
                                <ResponsiveContainer width="100%" height={250}>
                                    <LineChart data={successRateData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                                        <XAxis 
                                            dataKey="name" 
                                            stroke="#888" 
                                            fontSize={10}
                                            angle={-45}
                                            textAnchor="end"
                                            height={60}
                                        />
                                        <YAxis stroke="#888" fontSize={10} domain={[0, 100]} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "#202020",
                                                border: "1px solid #2a2a2a",
                                                borderRadius: "6px",
                                                color: "#ededed",
                                            }}
                                        />
                                        <Legend />
                                        <Line 
                                            type="monotone" 
                                            dataKey="rate" 
                                            stroke="#FFAE00" 
                                            strokeWidth={2}
                                            dot={false}
                                            name="Success Rate (%)"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Filter Reasons Pie Chart */}
                        {filterReasonsData.length > 0 && (
                            <div style={{ 
                                padding: "16px", 
                                backgroundColor: "#202020", 
                                borderRadius: "8px",
                                border: "1px solid rgba(255, 174, 0, 0.1)",
                            }}>
                                <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#ededed" }}>
                                    Filter Reasons Breakdown
                                </h4>
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={filterReasonsData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={(props: { name?: string; percent?: number }) => {
                                                const name = props.name || "";
                                                const percent = props.percent || 0;
                                                return `${name}: ${(percent * 100).toFixed(0)}%`;
                                            }}
                                            outerRadius={80}
                                            fill="#888888"
                                            dataKey="value"
                                        >
                                            {filterReasonsData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "#202020",
                                                border: "1px solid #2a2a2a",
                                                borderRadius: "6px",
                                                color: "#ededed",
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Metrics Summary Table */}
                    <div style={{
                        backgroundColor: "#202020",
                        borderRadius: "8px",
                        padding: "16px",
                        border: "1px solid rgba(255, 174, 0, 0.1)",
                    }}>
                        <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#ededed" }}>
                            Recent Sessions (Last 10)
                        </h4>
                        {periodicSessions.length === 0 ? (
                            <div style={{ padding: "20px", textAlign: "center", color: "#888", fontSize: "11px" }}>
                                No sessions available
                            </div>
                        ) : (
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "1px solid rgba(255, 174, 0, 0.2)" }}>
                                            <th style={{ padding: "8px 4px", textAlign: "left", color: "#888", fontWeight: "600", fontSize: "10px" }}>Time</th>
                                            <th style={{ padding: "8px 4px", textAlign: "center", color: "#888", fontWeight: "600", fontSize: "10px" }}>Total</th>
                                            <th style={{ padding: "8px 4px", textAlign: "center", color: "#888", fontWeight: "600", fontSize: "10px" }}>Success</th>
                                            <th style={{ padding: "8px 4px", textAlign: "center", color: "#888", fontWeight: "600", fontSize: "10px" }}>Failed</th>
                                            <th style={{ padding: "8px 4px", textAlign: "center", color: "#888", fontWeight: "600", fontSize: "10px" }}>Rate</th>
                                            <th style={{ padding: "8px 4px", textAlign: "center", color: "#888", fontWeight: "600", fontSize: "10px" }}>Duration</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {periodicSessions.slice(-10).reverse().map((session, idx) => (
                                            <tr
                                                key={idx}
                                                style={{
                                                    borderBottom: "1px solid rgba(255, 174, 0, 0.1)",
                                                    backgroundColor: idx % 2 === 0 ? "transparent" : "rgba(255, 174, 0, 0.02)",
                                                }}
                                            >
                                                <td style={{ padding: "8px 4px", color: "#ededed", fontSize: "10px" }}>
                                                    {formatTimestamp(session.start_time)}
                                                </td>
                                                <td style={{ padding: "8px 4px", textAlign: "center", color: "#ededed", fontSize: "10px" }}>
                                                    {session.total_models}
                                                </td>
                                                <td style={{ padding: "8px 4px", textAlign: "center", color: "#22c55e", fontSize: "10px", fontWeight: "600" }}>
                                                    {session.successful}
                                                </td>
                                                <td style={{ padding: "8px 4px", textAlign: "center", color: "#ef4444", fontSize: "10px", fontWeight: "600" }}>
                                                    {session.failed}
                                                </td>
                                                <td style={{ padding: "8px 4px", textAlign: "center", color: session.success_rate > 0.7 ? "#22c55e" : session.success_rate > 0.5 ? "#f59e0b" : "#ef4444", fontSize: "10px", fontWeight: "600" }}>
                                                    {(session.success_rate * 100).toFixed(1)}%
                                                </td>
                                                <td style={{ padding: "8px 4px", textAlign: "center", color: "#888", fontSize: "10px" }}>
                                                    {Math.floor(session.duration_seconds / 60)}m
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

interface FilterConfig {
    volatility?: {
        min_volatility?: number;
        min_price_range?: number;
        min_volume_volatility?: number;
        min_movement_frequency?: number;
        window_days?: number;
    };
    data_freshness?: {
        max_data_age_hours?: number;
        min_completeness?: number;
        max_gap_candles?: number;
        check_window_days?: number;
    };
    enabled?: {
        volatility?: boolean;
        data_freshness?: boolean;
    };
    behavior?: {
        block_on_failure?: boolean;
    };
}


export default TrainingMetricsCharts;

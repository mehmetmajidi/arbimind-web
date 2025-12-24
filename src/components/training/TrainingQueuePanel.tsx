"use client";

import { useState, useEffect, useCallback } from "react";
import { getPeriodicStatus } from "@/lib/trainingApi";
import type { QueueStatus, QueueJob } from "@/types/training";
import { getAuthToken } from "./utils";
import LoadingSpinner from "./LoadingSpinner";
import SkeletonLoader from "./SkeletonLoader";

function TrainingQueuePanel() {
    const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
    const [summary, setSummary] = useState<{
        total_jobs_today?: number;
        success_rate?: number;
        avg_duration?: number;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchQueueStatus = useCallback(async () => {
        try {
            const data = await getPeriodicStatus();
            setQueueStatus(data.queue || null);
            
            // Extract summary from stats_7d
            if (data.stats_7d) {
                setSummary({
                    total_jobs_today: data.stats_7d.total_models || 0,
                    success_rate: data.stats_7d.success_rate || 0,
                    avg_duration: data.stats_7d.avg_duration_minutes || 0,
                });
            }
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error fetching queue status");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQueueStatus();
        const interval = setInterval(fetchQueueStatus, 10000); // Refresh every 10 seconds
        return () => clearInterval(interval);
    }, [fetchQueueStatus]);

    const handleProcessQueue = async () => {
        try {
            const token = getAuthToken();
            if (!token) return;

            // Process queue - refresh status after a moment
            setTimeout(() => {
                fetchQueueStatus();
            }, 1000);
        } catch (err) {
            console.error("Error processing queue:", err);
        }
    };

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

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "tier_1":
                return "#FFAE00";
            case "tier_2":
                return "#f59e0b";
            case "tier_3":
                return "#888";
            default:
                return "#888";
        }
    };

    return (
        <div style={{
            width: "320px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "12px",
        }}>
            {/* Queue Panel */}
            <div style={{
                backgroundColor: "#1a1a1a",
                borderRadius: "12px",
                padding: "12px",
                border: "1px solid rgba(255, 174, 0, 0.2)",
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h4 style={{ color: "#FFAE00", margin: 0, fontSize: "14px", fontWeight: "600" }}>
                        Training Queue
                    </h4>
                </div>

                {loading ? (
                    <div style={{ padding: "20px" }}>
                        <SkeletonLoader type="card" />
                    </div>
                ) : error ? (
                    <div style={{ 
                        padding: "12px", 
                        backgroundColor: "rgba(239, 68, 68, 0.1)", 
                        border: "1px solid rgba(239, 68, 68, 0.3)", 
                        borderRadius: "6px", 
                        color: "#ef4444", 
                        fontSize: "11px", 
                        textAlign: "center" 
                    }}>
                        {error}
                    </div>
                ) : queueStatus ? (
                    <>
                        {/* Queue Stats */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                                <span style={{ color: "#888" }}>Pending:</span>
                                <span style={{ color: "#f59e0b", fontWeight: "600" }}>
                                    {queueStatus.pending || 0}
                                </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                                <span style={{ color: "#888" }}>Running:</span>
                                <span style={{ color: "#FFAE00", fontWeight: "600" }}>
                                    {queueStatus.running || 0}
                                </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                                <span style={{ color: "#888" }}>Max concurrent:</span>
                                <span style={{ color: "#ededed" }}>
                                    {queueStatus.max_concurrent || 3}
                                </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                                <span style={{ color: "#888" }}>Available slots:</span>
                                <span style={{ color: "#22c55e", fontWeight: "600" }}>
                                    {queueStatus.available_slots || 0}
                                </span>
                            </div>
                        </div>

                        {/* Next Jobs List */}
                        {queueStatus.next_jobs && queueStatus.next_jobs.length > 0 && (
                            <div style={{ marginBottom: "12px" }}>
                                <div style={{ fontSize: "10px", color: "#888", marginBottom: "6px", fontWeight: "600" }}>
                                    Next Jobs:
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "150px", overflowY: "auto" }}>
                                    {queueStatus.next_jobs.slice(0, 5).map((job, idx) => (
                                        <div
                                            key={job.job_id}
                                            style={{
                                                padding: "6px",
                                                backgroundColor: "#202020",
                                                borderRadius: "4px",
                                                fontSize: "9px",
                                            }}
                                        >
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                                                <span style={{ color: "#FFAE00", fontWeight: "600" }}>
                                                    {job.symbol || "N/A"}
                                                </span>
                                                <span style={{
                                                    color: getPriorityColor(job.priority),
                                                    fontSize: "8px",
                                                }}>
                                                    {job.priority.toUpperCase()}
                                                </span>
                                            </div>
                                            <div style={{ color: "#888", fontSize: "8px" }}>
                                                {job.model_type} - {job.horizon}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Running Jobs List */}
                        {queueStatus.running_jobs && queueStatus.running_jobs.length > 0 && (
                            <div style={{ marginBottom: "12px" }}>
                                <div style={{ fontSize: "10px", color: "#888", marginBottom: "6px", fontWeight: "600" }}>
                                    Running:
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "150px", overflowY: "auto" }}>
                                    {queueStatus.running_jobs.map((job) => (
                                        <div
                                            key={job.job_id}
                                            style={{
                                                padding: "6px",
                                                backgroundColor: "rgba(255, 174, 0, 0.1)",
                                                borderRadius: "4px",
                                                fontSize: "9px",
                                            }}
                                        >
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                                                <span style={{ color: "#FFAE00", fontWeight: "600" }}>
                                                    {job.symbol || "N/A"}
                                                </span>
                                                <span style={{ color: "#22c55e", fontSize: "8px" }}>
                                                    RUNNING
                                                </span>
                                            </div>
                                            <div style={{ color: "#888", fontSize: "8px" }}>
                                                {job.model_type} - {job.horizon}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <button
                            onClick={handleProcessQueue}
                            aria-label="Process training queue"
                            style={{
                                width: "100%",
                                padding: "6px 12px",
                                backgroundColor: "#FFAE00",
                                color: "#1a1a1a",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "11px",
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
                            Process Queue
                        </button>
                    </>
                ) : (
                    <div style={{ color: "#888", fontSize: "11px", textAlign: "center", padding: "20px" }}>
                        No queue data available
                    </div>
                )}
            </div>

            {/* Summary Panel */}
            <div style={{
                backgroundColor: "#1a1a1a",
                borderRadius: "12px",
                padding: "12px",
                border: "1px solid rgba(255, 174, 0, 0.2)",
            }}>
                <h4 style={{ color: "#FFAE00", margin: "0 0 12px 0", fontSize: "14px", fontWeight: "600" }}>
                    Quick Stats
                </h4>
                {loading ? (
                    <div style={{ color: "#888", fontSize: "11px", textAlign: "center", padding: "20px" }}>
                        Loading...
                    </div>
                ) : summary ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", padding: "6px 0", borderBottom: "1px solid rgba(255, 174, 0, 0.1)" }}>
                            <span style={{ color: "#888" }}>Total jobs (7d):</span>
                            <span style={{ color: "#ededed", fontWeight: "600" }}>
                                {summary.total_jobs_today || 0}
                            </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", padding: "6px 0", borderBottom: "1px solid rgba(255, 174, 0, 0.1)" }}>
                            <span style={{ color: "#888" }}>Success rate:</span>
                            <span style={{
                                color: summary.success_rate && summary.success_rate > 0.7 ? "#22c55e" : summary.success_rate && summary.success_rate > 0.5 ? "#f59e0b" : "#ef4444",
                                fontWeight: "600",
                            }}>
                                {summary.success_rate 
                                    ? `${(summary.success_rate * 100).toFixed(1)}%`
                                    : "N/A"}
                            </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", padding: "6px 0" }}>
                            <span style={{ color: "#888" }}>Avg duration:</span>
                            <span style={{ color: "#ededed", fontWeight: "600" }}>
                                {summary.avg_duration 
                                    ? `${summary.avg_duration.toFixed(1)}m`
                                    : "N/A"}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div style={{ color: "#888", fontSize: "11px", textAlign: "center", padding: "20px" }}>
                        No stats available
                    </div>
                )}
            </div>
        </div>
    );
}

export default TrainingQueuePanel;

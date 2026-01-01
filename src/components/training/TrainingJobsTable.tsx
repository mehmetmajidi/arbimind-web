"use client";

import { useState, useEffect, useCallback } from "react";
import { formatTimestamp, formatDuration } from "./utils";
import { MdRefresh, MdExpandMore, MdExpandLess, MdPlayArrow, MdPause, MdCheckCircle, MdCancel, MdHourglassEmpty, MdDelete } from "react-icons/md";
import StatusBadge from "./StatusBadge";
import JobLogsModal from "./JobLogsModal";
import TrainingProgress from "./TrainingProgress";
import SkeletonLoader from "./SkeletonLoader";
import { showToast } from "./ToastContainer";
import ConfirmationModal from "./ConfirmationModal";
import { getTrainingJobs, cancelTraining, retrainJob, pauseTraining, resumeTraining, deleteTraining } from "@/lib/trainingApi";
import { getTrainingWebSocketService } from "@/lib/trainingWebSocket";
import type { TrainingJob } from "@/types/training";

function TrainingJobsTable({ 
    onStartTraining 
}: { 
    onStartTraining?: () => void;
}) {
    const [jobs, setJobs] = useState<TrainingJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true); // Enable auto-refresh by default
    const [selectedJobForLogs, setSelectedJobForLogs] = useState<string | null>(null);
    const [cancelConfirmJob, setCancelConfirmJob] = useState<string | null>(null);
    const [deleteConfirmJob, setDeleteConfirmJob] = useState<string | null>(null);
    const [processingJobs, setProcessingJobs] = useState<Set<string>>(new Set()); // Track jobs being paused/resumed
    
    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [symbolFilter, setSymbolFilter] = useState<string>("");
    const [modelTypeFilter, setModelTypeFilter] = useState<string>("all");

    const fetchJobs = useCallback(async (showError = true) => {
        try {
            const data = await getTrainingJobs();
            setJobs(data.jobs || []);
            setError(null);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Error fetching training jobs";
            setError(errorMessage);
            if (showError) {
                showToast("error", errorMessage);
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    // Listen for manual refresh events (e.g., after starting a new job)
    useEffect(() => {
        const handleRefresh = () => {
            fetchJobs(false); // Don't show error toast on manual refresh
        };
        
        window.addEventListener("refreshTrainingJobs", handleRefresh);
        return () => {
            window.removeEventListener("refreshTrainingJobs", handleRefresh);
        };
    }, [fetchJobs]);

    // WebSocket connection for real-time updates
    useEffect(() => {
        const wsService = getTrainingWebSocketService();
        
        // Try to connect to WebSocket
        try {
            wsService.connect();
        } catch (error) {
            console.warn("WebSocket not available, using polling instead:", error);
        }

        // Subscribe to job status updates
        const unsubscribe = wsService.onJobStatusUpdate((updatedJob: TrainingJob) => {
            setJobs((prevJobs) => {
                const index = prevJobs.findIndex((j) => j.job_id === updatedJob.job_id);
                if (index >= 0) {
                    // Update existing job
                    const newJobs = [...prevJobs];
                    newJobs[index] = updatedJob;
                    return newJobs;
                } else {
                    // Add new job if it doesn't exist (prepend to show newest first)
                    return [updatedJob, ...prevJobs];
                }
            });
        });

        // Fallback to polling if WebSocket is not connected
        let pollingInterval: NodeJS.Timeout | null = null;
        if (autoRefresh && !wsService.isConnected()) {
            pollingInterval = setInterval(() => {
                fetchJobs();
            }, 5000); // Refresh every 5 seconds
        }

        return () => {
            unsubscribe();
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
        };
    }, [autoRefresh, fetchJobs]);


    const handleCancel = (jobId: string) => {
        setCancelConfirmJob(jobId);
    };

    const handleRetrain = async (jobId: string) => {
        try {
            const result = await retrainJob(jobId);
            showToast("success", `Retraining job started: ${result.new_job_id}`);
            fetchJobs(); // Refresh the list
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to retrain job";
            showToast("error", errorMessage);
            console.error(err);
        }
    };

    const handlePause = async (jobId: string) => {
        if (processingJobs.has(jobId)) return; // Prevent double-click
        
        setProcessingJobs(prev => new Set(prev).add(jobId));
        try {
            const result = await pauseTraining(jobId);
            showToast("success", result.message || "Training job paused successfully");
            fetchJobs(); // Refresh the list
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to pause training job";
            showToast("error", errorMessage);
            console.error(err);
        } finally {
            setProcessingJobs(prev => {
                const next = new Set(prev);
                next.delete(jobId);
                return next;
            });
        }
    };

    const handleResume = async (jobId: string, checkpointPath?: string) => {
        if (processingJobs.has(jobId)) return; // Prevent double-click
        
        setProcessingJobs(prev => new Set(prev).add(jobId));
        try {
            const result = await resumeTraining(jobId, checkpointPath);
            const message = result.message || `Training job resumed: ${result.new_job_id}`;
            showToast("success", message);
            fetchJobs(); // Refresh the list
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to resume training job";
            showToast("error", errorMessage);
            console.error(err);
        } finally {
            setProcessingJobs(prev => {
                const next = new Set(prev);
                next.delete(jobId);
                return next;
            });
        }
    };

    const confirmCancel = async () => {
        if (!cancelConfirmJob) return;

        try {
            const result = await cancelTraining(cancelConfirmJob);
            const message = result.message || "Training job cancelled successfully";
            showToast("success", message);
            // Refresh jobs list after a short delay to see updated status
            setTimeout(() => {
                fetchJobs(false);
            }, 500);
            setCancelConfirmJob(null);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Error cancelling training job";
            showToast("error", errorMessage);
            console.error("Cancel training job error:", err);
        }
    };

    const handleDelete = (jobId: string) => {
        setDeleteConfirmJob(jobId);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmJob) return;
        
        const jobId = deleteConfirmJob;
        setDeleteConfirmJob(null);
        
        if (processingJobs.has(jobId)) return;
        
        setProcessingJobs(prev => new Set(prev).add(jobId));
        try {
            const result = await deleteTraining(jobId);
            showToast("success", result.message || "Training job deleted successfully");
            fetchJobs(); // Refresh the list
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to delete training job";
            showToast("error", errorMessage);
            console.error(err);
        } finally {
            setProcessingJobs(prev => {
                const next = new Set(prev);
                next.delete(jobId);
                return next;
            });
        }
    };


    const formatDuration = (seconds?: number) => {
        if (!seconds) return "N/A";
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
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

    // Filter jobs
    const filteredJobs = jobs.filter(job => {
        if (statusFilter !== "all" && job.status !== statusFilter) return false;
        if (symbolFilter && !job.symbol?.toLowerCase().includes(symbolFilter.toLowerCase())) return false;
        if (modelTypeFilter !== "all" && job.model_type !== modelTypeFilter) return false;
        return true;
    });

    return (
        <div style={{
            flex: "1",
            minWidth: "0",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
        }}>
            <div style={{
                backgroundColor: "#1a1a1a",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid rgba(255, 174, 0, 0.2)",
            }}>
                {/* Table Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h3 style={{ color: "#FFAE00", margin: 0, fontSize: "18px", fontWeight: "600" }}>
                        Training Jobs ({filteredJobs.length})
                    </h3>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                            onClick={onStartTraining}
                            style={{
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
                                e.currentTarget.style.transform = "scale(1.05)";
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
                            onClick={() => fetchJobs()}
                            style={{
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
                            Refresh
                        </button>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", cursor: "pointer" }}>
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                style={{ cursor: "pointer" }}
                            />
                            Auto-refresh
                        </label>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            padding: "6px 10px",
                            backgroundColor: "#202020",
                            border: "1px solid rgba(255, 174, 0, 0.2)",
                            borderRadius: "6px",
                            color: "#ededed",
                            fontSize: "11px",
                        }}
                    >
                        <option value="all">All Status</option>
                        <option value="running">Running</option>
                        <option value="paused">Paused</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                        <option value="rejected">Rejected</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="pending">Pending</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Search symbol..."
                        value={symbolFilter}
                        onChange={(e) => setSymbolFilter(e.target.value)}
                        style={{
                            padding: "6px 10px",
                            backgroundColor: "#202020",
                            border: "1px solid rgba(255, 174, 0, 0.2)",
                            borderRadius: "6px",
                            color: "#ededed",
                            fontSize: "11px",
                            minWidth: "150px",
                        }}
                    />
                    <select
                        value={modelTypeFilter}
                        onChange={(e) => setModelTypeFilter(e.target.value)}
                        style={{
                            padding: "6px 10px",
                            backgroundColor: "#202020",
                            border: "1px solid rgba(255, 174, 0, 0.2)",
                            borderRadius: "6px",
                            color: "#ededed",
                            fontSize: "11px",
                        }}
                    >
                        <option value="all">All Models</option>
                        <option value="lightgbm">LightGBM</option>
                        <option value="lstm">LSTM</option>
                        <option value="transformer">Transformer</option>
                    </select>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        padding: "8px 12px",
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        borderRadius: "6px",
                        color: "#ef4444",
                        fontSize: "11px",
                        marginBottom: "12px",
                    }}>
                        {error}
                    </div>
                )}

                {/* Table */}
                {loading ? (
                    <div style={{ padding: "40px" }}>
                        <SkeletonLoader type="table" lines={5} />
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#888", fontSize: "12px" }}>
                        No training jobs found
                    </div>
                ) : (
                    <div style={{ 
                        maxHeight: "calc(-330px + 100vh)",
                        overflowY: "auto",
                        overflowX: "auto"
                    }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                            <thead>
                                <tr style={{ 
                                    position: "sticky", 
                                    top: 0, 
                                    zIndex: 10,
                                    borderBottom: "1px solid rgba(255, 174, 0, 0.2)"
                                }}>
                                    <th style={{ padding: "8px 4px", textAlign: "left", color: "#888", fontWeight: "600", fontSize: "10px", backgroundColor: "#1a1a1a" }}>Job ID</th>
                                    <th style={{ padding: "8px 4px", textAlign: "left", color: "#888", fontWeight: "600", fontSize: "10px", backgroundColor: "#1a1a1a" }}>Symbol</th>
                                    <th style={{ padding: "8px 4px", textAlign: "left", color: "#888", fontWeight: "600", fontSize: "10px", backgroundColor: "#1a1a1a" }}>Model</th>
                                    <th style={{ padding: "8px 4px", textAlign: "left", color: "#888", fontWeight: "600", fontSize: "10px", backgroundColor: "#1a1a1a" }}>Horizon</th>
                                    <th style={{ padding: "8px 4px", textAlign: "center", color: "#888", fontWeight: "600", fontSize: "10px", backgroundColor: "#1a1a1a" }}>Status</th>
                                    <th style={{ padding: "8px 4px", textAlign: "left", color: "#888", fontWeight: "600", fontSize: "10px", backgroundColor: "#1a1a1a" }}>Started</th>
                                    <th style={{ padding: "8px 4px", textAlign: "left", color: "#888", fontWeight: "600", fontSize: "10px", backgroundColor: "#1a1a1a" }}>Duration</th>
                                    <th style={{ padding: "8px 4px", textAlign: "center", color: "#888", fontWeight: "600", fontSize: "10px", backgroundColor: "#1a1a1a" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredJobs.map((job, index) => (
                                    <tr
                                        key={job.job_id}
                                        style={{
                                            borderBottom: "1px solid rgba(255, 174, 0, 0.1)",
                                            backgroundColor: index % 2 === 0 ? "transparent" : "rgba(255, 174, 0, 0.02)",
                                            transition: "background-color 0.2s",
                                            cursor: "pointer",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.05)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = index % 2 === 0 ? "transparent" : "rgba(255, 174, 0, 0.02)";
                                        }}
                                        onClick={() => setSelectedJobForLogs(job.job_id)}
                                    >
                                        <td style={{ padding: "8px 4px", color: "#FFAE00", fontWeight: "600", fontSize: "10px" }}>
                                            {job.job_id.substring(0, 8)}...
                                        </td>
                                        <td style={{ padding: "8px 4px", color: "#ededed", fontSize: "11px" }}>
                                            {job.symbol || "N/A"}
                                        </td>
                                        <td style={{ padding: "8px 4px", color: "#ededed", fontSize: "11px" }}>
                                            {job.model_type || "N/A"}
                                        </td>
                                        <td style={{ padding: "8px 4px", color: "#ededed", fontSize: "11px" }}>
                                            {job.horizon || "N/A"}
                                        </td>
                                        <td style={{ padding: "8px 4px", textAlign: "center" }}>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
                                                <StatusBadge status={job.status as any} size="small" />
                                                {job.parent_job_id && (
                                                    <div style={{ 
                                                        fontSize: "8px", 
                                                        color: "#3b82f6",
                                                        cursor: "pointer",
                                                        textDecoration: "underline",
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedJobForLogs(job.parent_job_id!);
                                                    }}
                                                    title="View parent job"
                                                    >
                                                        Parent: {job.parent_job_id.substring(0, 8)}...
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: "8px 4px", color: "#888", fontSize: "10px" }}>
                                            {formatTimestamp(job.started_at)}
                                        </td>
                                        <td style={{ padding: "8px 4px", color: "#888", fontSize: "10px" }}>
                                            {formatDuration(job.duration)}
                                        </td>
                                        <td style={{ padding: "8px 4px", textAlign: "center" }}>
                                            <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedJobForLogs(job.job_id);
                                                    }}
                                                    style={{
                                                        padding: "4px 8px",
                                                        backgroundColor: "rgba(255, 174, 0, 0.1)",
                                                        color: "#FFAE00",
                                                        border: "1px solid rgba(255, 174, 0, 0.3)",
                                                        borderRadius: "4px",
                                                        fontSize: "9px",
                                                        fontWeight: "600",
                                                        cursor: "pointer",
                                                        transition: "all 0.2s ease",
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.2)";
                                                        e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.5)";
                                                        e.currentTarget.style.transform = "scale(1.05)";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.1)";
                                                        e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.3)";
                                                        e.currentTarget.style.transform = "scale(1)";
                                                    }}
                                                    onFocus={(e) => {
                                                        e.currentTarget.style.outline = "2px solid rgba(255, 174, 0, 0.5)";
                                                        e.currentTarget.style.outlineOffset = "1px";
                                                    }}
                                                    onBlur={(e) => {
                                                        e.currentTarget.style.outline = "none";
                                                    }}
                                                >
                                                    View Logs
                                                </button>
                                                {job.status === "running" && (
                                                    <>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handlePause(job.job_id);
                                                            }}
                                                            disabled={processingJobs.has(job.job_id)}
                                                            style={{
                                                                padding: "4px 8px",
                                                                backgroundColor: "rgba(251, 191, 36, 0.1)",
                                                                color: "#fbbf24",
                                                                border: "1px solid rgba(251, 191, 36, 0.3)",
                                                                borderRadius: "4px",
                                                                fontSize: "9px",
                                                                fontWeight: "600",
                                                                cursor: "pointer",
                                                                transition: "all 0.2s ease",
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor = "rgba(251, 191, 36, 0.2)";
                                                                e.currentTarget.style.borderColor = "rgba(251, 191, 36, 0.5)";
                                                                e.currentTarget.style.transform = "scale(1.05)";
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = "rgba(251, 191, 36, 0.1)";
                                                                e.currentTarget.style.borderColor = "rgba(251, 191, 36, 0.3)";
                                                                e.currentTarget.style.transform = "scale(1)";
                                                            }}
                                                            onFocus={(e) => {
                                                                e.currentTarget.style.outline = "2px solid rgba(251, 191, 36, 0.5)";
                                                                e.currentTarget.style.outlineOffset = "1px";
                                                            }}
                                                            onBlur={(e) => {
                                                                e.currentTarget.style.outline = "none";
                                                            }}
                                                        >
                                                            {processingJobs.has(job.job_id) ? (
                                                                <>⏳ Pausing...</>
                                                            ) : (
                                                                <>
                                                                    <MdPause style={{ display: "inline", marginRight: "2px", verticalAlign: "middle" }} />
                                                                    Pause
                                                                </>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCancel(job.job_id);
                                                            }}
                                                            style={{
                                                                padding: "4px 8px",
                                                                backgroundColor: "rgba(239, 68, 68, 0.1)",
                                                                color: "#ef4444",
                                                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                                                borderRadius: "4px",
                                                                fontSize: "9px",
                                                                fontWeight: "600",
                                                                cursor: "pointer",
                                                                transition: "all 0.2s ease",
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
                                                                e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.5)";
                                                                e.currentTarget.style.transform = "scale(1.05)";
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
                                                                e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
                                                                e.currentTarget.style.transform = "scale(1)";
                                                            }}
                                                            onFocus={(e) => {
                                                                e.currentTarget.style.outline = "2px solid rgba(239, 68, 68, 0.5)";
                                                                e.currentTarget.style.outlineOffset = "1px";
                                                            }}
                                                            onBlur={(e) => {
                                                                e.currentTarget.style.outline = "none";
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </>
                                                )}
                                                {job.status === "paused" && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleResume(job.job_id, job.checkpoint_path);
                                                        }}
                                                        disabled={processingJobs.has(job.job_id)}
                                                        style={{
                                                            padding: "4px 8px",
                                                            backgroundColor: "rgba(59, 130, 246, 0.1)",
                                                            color: "#3b82f6",
                                                            border: "1px solid rgba(59, 130, 246, 0.3)",
                                                            borderRadius: "4px",
                                                            fontSize: "9px",
                                                            fontWeight: "600",
                                                            cursor: processingJobs.has(job.job_id) ? "not-allowed" : "pointer",
                                                            opacity: processingJobs.has(job.job_id) ? 0.6 : 1,
                                                            transition: "all 0.2s ease",
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (processingJobs.has(job.job_id)) return;
                                                            e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
                                                            e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.5)";
                                                            e.currentTarget.style.transform = "scale(1.05)";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
                                                            e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.3)";
                                                            e.currentTarget.style.transform = "scale(1)";
                                                        }}
                                                        onFocus={(e) => {
                                                            e.currentTarget.style.outline = "2px solid rgba(59, 130, 246, 0.5)";
                                                            e.currentTarget.style.outlineOffset = "1px";
                                                        }}
                                                        onBlur={(e) => {
                                                            e.currentTarget.style.outline = "none";
                                                        }}
                                                    >
                                                        {processingJobs.has(job.job_id) ? (
                                                            <>⏳ Resuming...</>
                                                        ) : (
                                                            <>
                                                                <MdPlayArrow style={{ display: "inline", marginRight: "2px", verticalAlign: "middle" }} />
                                                                Resume
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                                {job.status !== "running" && job.status !== "paused" && (
                                                    <>
                                                        {(job.status === "cancelled" || job.status === "failed") && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleResume(job.job_id, job.checkpoint_path);
                                                                }}
                                                                disabled={processingJobs.has(job.job_id)}
                                                                style={{
                                                                    padding: "4px 8px",
                                                                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                                                                    color: "#3b82f6",
                                                                    border: "1px solid rgba(59, 130, 246, 0.3)",
                                                                    borderRadius: "4px",
                                                                    fontSize: "9px",
                                                                    fontWeight: "600",
                                                                    cursor: processingJobs.has(job.job_id) ? "not-allowed" : "pointer",
                                                                    opacity: processingJobs.has(job.job_id) ? 0.6 : 1,
                                                                    transition: "all 0.2s ease",
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    if (processingJobs.has(job.job_id)) return;
                                                                    e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
                                                                    e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.5)";
                                                                    e.currentTarget.style.transform = "scale(1.05)";
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
                                                                    e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.3)";
                                                                    e.currentTarget.style.transform = "scale(1)";
                                                                }}
                                                                onFocus={(e) => {
                                                                    e.currentTarget.style.outline = "2px solid rgba(59, 130, 246, 0.5)";
                                                                    e.currentTarget.style.outlineOffset = "1px";
                                                                }}
                                                                onBlur={(e) => {
                                                                    e.currentTarget.style.outline = "none";
                                                                }}
                                                            >
                                                                {processingJobs.has(job.job_id) ? (
                                                                    <>⏳ Resuming...</>
                                                                ) : (
                                                                    <>
                                                                        <MdPlayArrow style={{ display: "inline", marginRight: "2px", verticalAlign: "middle" }} />
                                                                        Resume
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRetrain(job.job_id);
                                                            }}
                                                            style={{
                                                                padding: "4px 8px",
                                                                backgroundColor: "rgba(34, 197, 94, 0.1)",
                                                                color: "#22c55e",
                                                                border: "1px solid rgba(34, 197, 94, 0.3)",
                                                                borderRadius: "4px",
                                                                fontSize: "9px",
                                                                fontWeight: "600",
                                                                cursor: "pointer",
                                                                transition: "all 0.2s ease",
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 0.2)";
                                                                e.currentTarget.style.borderColor = "rgba(34, 197, 94, 0.5)";
                                                                e.currentTarget.style.transform = "scale(1.05)";
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 0.1)";
                                                                e.currentTarget.style.borderColor = "rgba(34, 197, 94, 0.3)";
                                                                e.currentTarget.style.transform = "scale(1)";
                                                            }}
                                                            onFocus={(e) => {
                                                                e.currentTarget.style.outline = "2px solid rgba(34, 197, 94, 0.5)";
                                                                e.currentTarget.style.outlineOffset = "1px";
                                                            }}
                                                            onBlur={(e) => {
                                                                e.currentTarget.style.outline = "none";
                                                            }}
                                                        >
                                                            Retrain
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(job.job_id);
                                                            }}
                                                            disabled={processingJobs.has(job.job_id)}
                                                            style={{
                                                                padding: "4px 8px",
                                                                backgroundColor: "rgba(239, 68, 68, 0.1)",
                                                                color: "#ef4444",
                                                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                                                borderRadius: "4px",
                                                                fontSize: "9px",
                                                                fontWeight: "600",
                                                                cursor: processingJobs.has(job.job_id) ? "not-allowed" : "pointer",
                                                                opacity: processingJobs.has(job.job_id) ? 0.6 : 1,
                                                                transition: "all 0.2s ease",
                                                                marginLeft: "4px",
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (!processingJobs.has(job.job_id)) {
                                                                    e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
                                                                    e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.5)";
                                                                    e.currentTarget.style.transform = "scale(1.05)";
                                                                }
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
                                                                e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
                                                                e.currentTarget.style.transform = "scale(1)";
                                                            }}
                                                            onFocus={(e) => {
                                                                e.currentTarget.style.outline = "2px solid rgba(239, 68, 68, 0.5)";
                                                                e.currentTarget.style.outlineOffset = "1px";
                                                            }}
                                                            onBlur={(e) => {
                                                                e.currentTarget.style.outline = "none";
                                                            }}
                                                        >
                                                            <MdDelete style={{ display: "inline", marginRight: "2px", verticalAlign: "middle" }} />
                                                            {processingJobs.has(job.job_id) ? "Deleting..." : "Delete"}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

            </div>

            {/* Job Logs Modal */}
            {selectedJobForLogs && (
                <JobLogsModal
                    isOpen={!!selectedJobForLogs}
                    onClose={() => setSelectedJobForLogs(null)}
                    jobId={selectedJobForLogs}
                    autoRefresh={jobs.find(j => j.job_id === selectedJobForLogs)?.status === "running"}
                    setSelectedJobForLogs={setSelectedJobForLogs}
                />
            )}

            {/* Cancel Confirmation Modal */}
            {cancelConfirmJob && (
                <ConfirmationModal
                    isOpen={!!cancelConfirmJob}
                    onClose={() => setCancelConfirmJob(null)}
                    onConfirm={confirmCancel}
                    title="Cancel Training Job"
                    message={`Are you sure you want to cancel training job "${cancelConfirmJob.substring(0, 8)}..."? This action cannot be undone.`}
                    type="warning"
                    confirmText="Cancel Job"
                    cancelText="Keep Running"
                    confirmColor="#ef4444"
                />
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmJob && (
                <ConfirmationModal
                    isOpen={!!deleteConfirmJob}
                    onClose={() => setDeleteConfirmJob(null)}
                    onConfirm={confirmDelete}
                    title="Delete Training Job"
                    message={`Are you sure you want to delete training job "${deleteConfirmJob.substring(0, 8)}..."? This action cannot be undone and the job will be permanently removed from the queue.`}
                    type="error"
                    confirmText="Delete Job"
                    cancelText="Cancel"
                    confirmColor="#ef4444"
                />
            )}
        </div>
    );
}

interface QueueJob {
    job_id: string;
    symbol: string;
    model_type: string;
    horizon: string;
    priority: string;
    status: string;
    created_at?: string;
}

interface QueueStatus {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    max_concurrent: number;
    available_slots: number;
    next_jobs?: QueueJob[];
    running_jobs?: QueueJob[];
}


export default TrainingJobsTable;

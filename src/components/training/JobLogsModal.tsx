"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MdClose, MdDownload, MdSearch, MdExpandMore, MdExpandLess, MdInfo, MdRefresh } from "react-icons/md";
import { getJobLogs, getTrainingJobStatus } from "@/lib/trainingApi";
import { apiGet } from "@/lib/apiClient";
import { handleApiError } from "@/lib/errorHandler";
import { ErrorMessage } from "@/components/shared";
import type { TrainingJob } from "@/types/training";

interface JobLogsModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: string;
    autoRefresh?: boolean;
    setSelectedJobForLogs?: (jobId: string) => void;
}

export default function JobLogsModal({ 
    isOpen, 
    onClose, 
    jobId,
    autoRefresh = true,
    setSelectedJobForLogs
}: JobLogsModalProps) {
    const [logs, setLogs] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [autoScroll, setAutoScroll] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [expanded, setExpanded] = useState(true);
    const [showJobInfo, setShowJobInfo] = useState(false);
    const [jobInfo, setJobInfo] = useState<TrainingJob | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const fetchLogs = useCallback(async (isManualRefresh = false) => {
        if (isManualRefresh) {
            setIsRefreshing(true);
        } else if (!loading) {
            setLoading(true);
        }

        try {
            const data = await apiGet<{ job_id: string; status: string; log: string; error_log: string }>(
                `/train/logs/${jobId}?lines=10000`,
                {
                    retry: {
                        maxRetries: 3,
                        retryDelay: 1000,
                        retryCondition: (error) => {
                            // Retry on network errors or 5xx errors
                            if (error instanceof TypeError && error.message.includes("fetch")) {
                                return true;
                            }
                            if (error && typeof error === "object" && "status" in error) {
                                const status = (error as any).status;
                                return status >= 500 || status === 0;
                            }
                            return false;
                        },
                        onRetry: (attempt) => {
                            setRetryCount(attempt);
                        },
                    },
                    errorContext: {
                        component: "JobLogsModal",
                        action: "fetchLogs",
                        additionalData: { jobId },
                    },
                }
            );

            const combinedLogs = [
                data.log || "",
                data.error_log || "",
            ]
                .filter(Boolean)
                .join("\n");

            if (combinedLogs.trim()) {
                setLogs(combinedLogs);
                setError(null);
            } else {
                // No logs yet - show informative message
                const statusMessage = data.status === "running"
                    ? "[INFO] Training is in progress. Logs will appear here once the training script starts writing output.\n"
                    : `[INFO] No logs available yet. Job status: ${data.status}\n`;
                setLogs(statusMessage);
                setError(null);
            }
            setRetryCount(0);
        } catch (err) {
            const errorMessage = handleApiError(err);
            setError(errorMessage);
            console.error("Error fetching logs:", err);
            
            // If it's a 404, show a more helpful message
            if (err && typeof err === "object" && "status" in err && (err as any).status === 404) {
                setError(`Training job '${jobId}' not found. It may have been deleted or never started.`);
            }
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [jobId, loading]);

    const fetchJobInfo = useCallback(async () => {
        try {
            const info = await getTrainingJobStatus(jobId);
            setJobInfo(info);
        } catch (err) {
            console.error("Error fetching job info:", err);
        }
    }, [jobId]);

    useEffect(() => {
        if (isOpen && jobId) {
            setLoading(true);
            fetchLogs();
            fetchJobInfo();
        }
    }, [isOpen, jobId, fetchLogs, fetchJobInfo]);

    // Auto-refresh for running jobs
    useEffect(() => {
        if (!isOpen || !autoRefresh) return;

        const interval = setInterval(() => {
            fetchLogs(false); // Don't show loading spinner on auto-refresh
        }, 3000); // Refresh every 3 seconds

        return () => clearInterval(interval);
    }, [isOpen, autoRefresh, fetchLogs]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (autoScroll && logContainerRef.current) {
            // Clear any pending scroll
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            scrollTimeoutRef.current = setTimeout(() => {
                if (logContainerRef.current) {
                    logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
                }
            }, 100);
        }
    }, [logs, autoScroll]);

    const handleDownload = () => {
        const blob = new Blob([logs], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `training-job-${jobId}-logs.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const highlightErrors = (text: string): React.ReactNode[] => {
        if (!text) return [];
        // Highlight lines containing error keywords
        const errorKeywords = ["error", "failed", "exception", "traceback", "critical"];
        return text.split("\n").map((line, index) => {
            const lowerLine = line.toLowerCase();
            const hasError = errorKeywords.some((keyword) => lowerLine.includes(keyword));
            return (
                <div
                    key={index}
                    style={{
                        backgroundColor: hasError ? "rgba(239, 68, 68, 0.3)" : "transparent",
                        color: hasError ? "#ef4444" : "#ededed",
                    }}
                >
                    {line}
                </div>
            );
        });
    };

    const filterLogs = (text: string, search: string): string => {
        if (!search.trim()) return text;
        const searchLower = search.toLowerCase();
        return text
            .split("\n")
            .filter((line) => line.toLowerCase().includes(searchLower))
            .join("\n");
    };

    const displayLogs = filterLogs(logs, searchTerm);
    const highlightedLogs = highlightErrors(displayLogs);

    if (!isOpen) return null;

    return (
        <>
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .refresh-spinning {
                    animation: spin 1s linear infinite;
                }
            `}</style>
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 2000,
                }}
                onClick={onClose}
            >
            <div
                style={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "12px",
                    width: "90%",
                    maxWidth: "1200px",
                    maxHeight: "90vh",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px 20px",
                    borderBottom: "1px solid #2a2a2a",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#FFAE00", margin: 0 }}>
                            Job Logs: {jobId.substring(0, 8)}...
                        </h2>
                        <button
                            onClick={() => setShowJobInfo(!showJobInfo)}
                            style={{
                                background: "none",
                                border: "none",
                                color: showJobInfo ? "#FFAE00" : "#888",
                                cursor: "pointer",
                                padding: "4px",
                                display: "flex",
                                alignItems: "center",
                                transition: "color 0.2s",
                            }}
                            title="Show job information"
                        >
                            <MdInfo size={20} />
                        </button>
                        <button
                            onClick={() => setExpanded(!expanded)}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#888",
                                cursor: "pointer",
                                padding: "4px",
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            {expanded ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
                        </button>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                            onClick={() => fetchLogs(true)}
                            disabled={isRefreshing}
                            style={{
                                padding: "6px 12px",
                                backgroundColor: "rgba(59, 130, 246, 0.1)",
                                color: "#3b82f6",
                                border: "1px solid rgba(59, 130, 246, 0.3)",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: isRefreshing ? "not-allowed" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                opacity: isRefreshing ? 0.5 : 1,
                            }}
                            title="Refresh logs"
                        >
                            <MdRefresh 
                                size={16} 
                                className={isRefreshing ? "refresh-spinning" : ""}
                            />
                            {isRefreshing ? "Refreshing..." : "Refresh"}
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={!logs || logs.trim().startsWith("[INFO]")}
                            style={{
                                padding: "6px 12px",
                                backgroundColor: "rgba(255, 174, 0, 0.1)",
                                color: "#FFAE00",
                                border: "1px solid rgba(255, 174, 0, 0.3)",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: logs && !logs.trim().startsWith("[INFO]") ? "pointer" : "not-allowed",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                opacity: logs && !logs.trim().startsWith("[INFO]") ? 1 : 0.5,
                            }}
                        >
                            <MdDownload size={16} />
                            Download
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#888888",
                                fontSize: "24px",
                                cursor: "pointer",
                                padding: "4px",
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <MdClose size={20} />
                        </button>
                    </div>
                </div>

                {/* Job Info */}
                {showJobInfo && jobInfo && (
                    <div style={{
                        padding: "16px 20px",
                        borderBottom: "1px solid #2a2a2a",
                        backgroundColor: "rgba(255, 174, 0, 0.05)",
                    }}>
                        <div style={{ 
                            display: "grid", 
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                            gap: "12px",
                            fontSize: "12px",
                        }}>
                            {jobInfo.symbol && (
                                <div>
                                    <div style={{ color: "#888", fontSize: "10px", marginBottom: "4px" }}>Symbol</div>
                                    <div style={{ color: "#FFAE00", fontWeight: "600" }}>{jobInfo.symbol}</div>
                                </div>
                            )}
                            {jobInfo.model_type && (
                                <div>
                                    <div style={{ color: "#888", fontSize: "10px", marginBottom: "4px" }}>Model Type</div>
                                    <div style={{ color: "#ededed" }}>{jobInfo.model_type}</div>
                                </div>
                            )}
                            {jobInfo.horizon && (
                                <div>
                                    <div style={{ color: "#888", fontSize: "10px", marginBottom: "4px" }}>Horizon</div>
                                    <div style={{ color: "#ededed" }}>{jobInfo.horizon}</div>
                                </div>
                            )}
                            {jobInfo.checkpoint_path && (
                                <div style={{ gridColumn: "1 / -1" }}>
                                    <div style={{ color: "#888", fontSize: "10px", marginBottom: "4px" }}>Checkpoint Path</div>
                                    <div style={{ 
                                        color: "#22c55e", 
                                        fontFamily: "monospace", 
                                        fontSize: "11px",
                                        wordBreak: "break-all",
                                        backgroundColor: "rgba(34, 197, 94, 0.1)",
                                        padding: "6px 8px",
                                        borderRadius: "4px",
                                    }}>
                                        {jobInfo.checkpoint_path}
                                    </div>
                                </div>
                            )}
                            {jobInfo.parent_job_id && (
                                <div style={{ gridColumn: "1 / -1" }}>
                                    <div style={{ color: "#888", fontSize: "10px", marginBottom: "4px" }}>Parent Job</div>
                                    <div style={{ 
                                        color: "#3b82f6", 
                                        fontFamily: "monospace", 
                                        fontSize: "11px",
                                        backgroundColor: "rgba(59, 130, 246, 0.1)",
                                        padding: "6px 8px",
                                        borderRadius: "4px",
                                        display: "inline-block",
                                        cursor: "pointer",
                                    }}
                                    onClick={() => {
                                        setSelectedJobForLogs?.(jobInfo.parent_job_id!);
                                        setShowJobInfo(false);
                                    }}
                                    title="Click to view parent job logs"
                                    >
                                        {jobInfo.parent_job_id}
                                    </div>
                                    <div style={{ color: "#888", fontSize: "10px", marginTop: "4px" }}>
                                        This job was resumed from the parent job above
                                    </div>
                                </div>
                            )}
                            {jobInfo.paused_at && (
                                <div>
                                    <div style={{ color: "#888", fontSize: "10px", marginBottom: "4px" }}>Paused At</div>
                                    <div style={{ color: "#f59e0b" }}>
                                        {new Date(jobInfo.paused_at).toLocaleString()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Controls */}
                {expanded && (
                    <div style={{
                        padding: "12px 20px",
                        borderBottom: "1px solid #2a2a2a",
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                    }}>
                        <div style={{ position: "relative", flex: 1 }}>
                            <MdSearch 
                                size={16} 
                                style={{
                                    position: "absolute",
                                    left: "10px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: "#888",
                                }}
                            />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search logs..."
                                style={{
                                    width: "100%",
                                    padding: "8px 10px 8px 36px",
                                    backgroundColor: "#202020",
                                    border: "1px solid #2a2a2a",
                                    borderRadius: "6px",
                                    color: "#ededed",
                                    fontSize: "12px",
                                }}
                            />
                        </div>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", color: "#888" }}>
                            <input
                                type="checkbox"
                                checked={autoScroll}
                                onChange={(e) => setAutoScroll(e.target.checked)}
                                style={{ cursor: "pointer" }}
                            />
                            Auto-scroll
                        </label>
                    </div>
                )}

                {/* Log Display */}
                <div
                    ref={logContainerRef}
                    style={{
                        flex: 1,
                        padding: "16px 20px",
                        overflowY: "auto",
                        backgroundColor: "#0a0a0a",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        lineHeight: "1.6",
                        color: "#ededed",
                    }}
                >
                    {loading && !isRefreshing ? (
                        <div style={{ color: "#888", textAlign: "center", padding: "40px" }}>
                            <div style={{ marginBottom: "12px" }}>Loading logs...</div>
                            {retryCount > 0 && (
                                <div style={{ fontSize: "11px", color: "#666" }}>
                                    Retry attempt {retryCount}/3
                                </div>
                            )}
                        </div>
                    ) : error ? (
                        <div style={{ padding: "20px" }}>
                            <ErrorMessage
                                message={error}
                                onDismiss={() => setError(null)}
                                onRetry={() => fetchLogs(true)}
                                retryCount={retryCount}
                                maxRetries={3}
                                showDetails={true}
                            />
                        </div>
                    ) : !logs || logs.trim() === "" ? (
                        <div style={{ color: "#888", textAlign: "center", padding: "40px" }}>
                            <div style={{ marginBottom: "12px" }}>No logs available yet</div>
                            <div style={{ fontSize: "11px", color: "#666" }}>
                                {jobInfo?.status === "running"
                                    ? "Logs will appear here once the training script starts writing output."
                                    : `Job status: ${jobInfo?.status || "unknown"}`}
                            </div>
                        </div>
                    ) : (
                        <pre
                            style={{
                                margin: 0,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-all",
                            }}
                        >
                            {highlightedLogs}
                        </pre>
                    )}
                </div>
            </div>
        </div>
        </>
    );
}


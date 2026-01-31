"use client";

import { useState, useEffect, useCallback } from "react";
import { MdCheckCircle, MdError, MdWarning, MdInfo } from "react-icons/md";

// Add pulse animation style
if (typeof document !== "undefined" && !document.head.querySelector('style[data-health-pulse]')) {
    const style = document.createElement("style");
    style.setAttribute("data-health-pulse", "true");
    style.textContent = `
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    `;
    document.head.appendChild(style);
}

interface HealthStatus {
    name: string;
    version: string;
    status: "ok" | "degraded" | "error";
}

interface DetailedHealthStatus extends HealthStatus {
    database: {
        status: string;
        connected: boolean;
        error?: string;
    };
    redis: {
        status: string;
        connected: boolean;
        error?: string;
    };
    timestamp: string;
}

interface HealthCheckProps {
    apiUrl: string;
    showDetailed?: boolean;
    compact?: boolean;
}

export default function HealthCheck({ apiUrl, showDetailed = false, compact = false }: HealthCheckProps) {
    const [basicHealth, setBasicHealth] = useState<HealthStatus | null>(null);
    const [detailedHealth, setDetailedHealth] = useState<DetailedHealthStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    const fetchBasicHealth = useCallback(async () => {
        try {
            const response = await fetch(`${apiUrl}/health/`);
            if (response.ok) {
                const data = await response.json();
                setBasicHealth(data);
                setError(null);
            } else {
                setError("Health check failed");
            }
        } catch (err) {
            setError("Connection error");
            setBasicHealth(null);
        }
    }, [apiUrl]);

    const fetchDetailedHealth = useCallback(async () => {
        try {
            const response = await fetch(`${apiUrl}/health/detailed`);
            if (response.ok) {
                const data = await response.json();
                setDetailedHealth(data);
                setError(null);
            } else {
                setError("Detailed health check failed");
            }
        } catch (err) {
            setError("Connection error");
            setDetailedHealth(null);
        }
    }, [apiUrl]);

    useEffect(() => {
        const loadHealth = async () => {
            setLoading(true);
            await fetchBasicHealth();
            if (showDetailed) {
                await fetchDetailedHealth();
            }
            setLoading(false);
        };

        loadHealth();

        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            fetchBasicHealth();
            if (showDetailed || showDetails) {
                fetchDetailedHealth();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [apiUrl, showDetailed, fetchBasicHealth, fetchDetailedHealth, showDetails]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "ok":
                return "#10b981";
            case "degraded":
                return "#f59e0b";
            case "error":
                return "#ef4444";
            default:
                return "#888888";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "ok":
                return <MdCheckCircle size={16} color="#10b981" />;
            case "degraded":
                return <MdWarning size={16} color="#f59e0b" />;
            case "error":
                return <MdError size={16} color="#ef4444" />;
            default:
                return <MdInfo size={16} color="#888888" />;
        }
    };

    if (loading && !basicHealth) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: compact ? "4px 8px" : "6px 12px",
                    backgroundColor: "#202020",
                    borderRadius: "6px",
                    fontSize: compact ? "12px" : "13px",
                    color: "#888888",
                }}
            >
                <div
                    style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#888888",
                        opacity: 0.7,
                        animation: "pulse 1.5s ease-in-out infinite",
                    }}
                />
                Checking...
            </div>
        );
    }

    if (error && !basicHealth) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: compact ? "4px 8px" : "6px 12px",
                    backgroundColor: "#2a1a1a",
                    border: "1px solid #ef4444",
                    borderRadius: "6px",
                    fontSize: compact ? "12px" : "13px",
                    color: "#ef4444",
                    cursor: "pointer",
                }}
                onClick={() => {
                    setLoading(true);
                    fetchBasicHealth();
                    if (showDetailed || showDetails) {
                        fetchDetailedHealth();
                    }
                    setLoading(false);
                }}
                title="Click to retry"
            >
                <MdError size={16} />
                {compact ? "Error" : "Health Check Failed"}
            </div>
        );
    }

    const status = basicHealth?.status || "unknown";
    const statusColor = getStatusColor(status);

    return (
        <div style={{ position: "relative" }}>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: compact ? "4px 8px" : "6px 12px",
                    backgroundColor: "#202020",
                    border: `1px solid ${statusColor}40`,
                    borderRadius: "6px",
                    fontSize: compact ? "12px" : "13px",
                    color: "#ffffff",
                    cursor: showDetailed ? "default" : "pointer",
                }}
                onClick={() => {
                    if (!showDetailed) {
                        setShowDetails(!showDetails);
                        if (!showDetails && !detailedHealth) {
                            fetchDetailedHealth();
                        }
                    }
                }}
                title={showDetailed ? undefined : "Click for details"}
            >
                {getStatusIcon(status)}
                <span style={{ color: statusColor, fontWeight: "600" }}>
                    {compact ? status.toUpperCase() : `API ${status.toUpperCase()}`}
                </span>
                {!compact && showDetailed && (
                    <span style={{ color: "#888", fontSize: "11px" }}>
                        v{basicHealth?.version || "?"}
                    </span>
                )}
            </div>

            {/* Detailed Health Popup */}
            {(showDetails || showDetailed) && detailedHealth && (
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        right: 0,
                        marginTop: "8px",
                        padding: "16px",
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #2a2a2a",
                        borderRadius: "8px",
                        minWidth: "300px",
                        zIndex: 1000,
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div style={{ marginBottom: "12px", fontSize: "14px", fontWeight: "600", color: "#FFAE00" }}>
                        System Health
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#888" }}>Status:</span>
                            <span style={{ color: statusColor, fontWeight: "600" }}>{detailedHealth.status.toUpperCase()}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#888" }}>Version:</span>
                            <span style={{ color: "#ffffff" }}>{detailedHealth.version}</span>
                        </div>
                        <div style={{ height: "1px", backgroundColor: "#2a2a2a", margin: "8px 0" }} />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#888" }}>Database:</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                {detailedHealth.database.connected ? (
                                    <MdCheckCircle size={14} color="#10b981" />
                                ) : (
                                    <MdError size={14} color="#ef4444" />
                                )}
                                <span style={{ color: detailedHealth.database.connected ? "#10b981" : "#ef4444" }}>
                                    {detailedHealth.database.status}
                                </span>
                            </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#888" }}>Redis:</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                {detailedHealth.redis.connected ? (
                                    <MdCheckCircle size={14} color="#10b981" />
                                ) : (
                                    <MdError size={14} color="#ef4444" />
                                )}
                                <span style={{ color: detailedHealth.redis.connected ? "#10b981" : "#ef4444" }}>
                                    {detailedHealth.redis.status}
                                </span>
                            </div>
                        </div>
                        {detailedHealth.timestamp && (
                            <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
                                {new Date(detailedHealth.timestamp).toLocaleString()}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}


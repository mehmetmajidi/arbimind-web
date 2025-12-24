"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface TrainingJob {
    job_id: string;
    status: "running" | "completed" | "failed" | "unknown";
    log_file: string;
    error_file: string;
    log_size: number;
    error_size: number;
    last_log_lines: string[];
    error_lines: string[];
    log_file_exists: boolean;
    error_file_exists: boolean;
}

interface Model {
    model_version: string;
    model_type: string;
    symbol: string;
    horizon_minutes: number;
    created_at: string;
    file_path: string;
}

interface TrainingMetrics {
    epoch: number;
    train_loss?: number;
    val_loss?: number;
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1?: number;
    learning_rate?: number;
}

const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getAuthToken = () => {
    return localStorage.getItem("auth_token") || "";
};

export default function TrainingPage() {
    const [jobs, setJobs] = useState<TrainingJob[]>([]);
    const [models, setModels] = useState<Model[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [selectedJob, setSelectedJob] = useState<string | null>(null);
    const [jobLogs, setJobLogs] = useState<string>("");
    const [showStartForm, setShowStartForm] = useState(false);
    const [showRetrainForm, setShowRetrainForm] = useState(false);
    const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

    // Start Training Form State
    const [startFormData, setStartFormData] = useState({
        model_type: "lightgbm",
        symbol: "",
        horizon: "",
        retrain: false,
        model_version: "",
    });

    // Retrain Form State
    const [retrainFormData, setRetrainFormData] = useState({
        model_version: "",
    });

    // Fetch training jobs
    const fetchJobs = useCallback(async () => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${apiUrl}/train/status`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setJobs(data.jobs || []);
            } else {
                setError("Failed to fetch training jobs");
            }
        } catch (err) {
            setError("Error fetching training jobs");
            console.error(err);
        }
    }, []);

    // Fetch available models
    const fetchModels = useCallback(async () => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${apiUrl}/train/models`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setModels(data.models || []);
            }
        } catch (err) {
            console.error("Error fetching models:", err);
        }
    }, []);

    // Fetch job logs
    const fetchJobLogs = useCallback(async (jobId: string) => {
        try {
            const token = getAuthToken();
            // Fetch more lines to get all metrics (up to 10000 lines)
            const response = await fetch(`${apiUrl}/train/logs/${jobId}?lines=10000`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                // Combine log and error_log (error_log contains stdout for some models like hybrid_jump)
                const combinedLogs = [
                    data.log || "",
                    data.error_log || "",
                ].filter(Boolean).join("\n");
                setJobLogs(combinedLogs);
            }
        } catch (err) {
            console.error("Error fetching job logs:", err);
        }
    }, []);

    // Start training
    const handleStartTraining = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const token = getAuthToken();
            const requestBody: Record<string, string | boolean> = {
                model_type: startFormData.model_type,
                retrain: startFormData.retrain,
            };

            if (startFormData.symbol) requestBody.symbol = startFormData.symbol;
            if (startFormData.horizon) requestBody.horizon = startFormData.horizon;
            if (startFormData.model_version) requestBody.model_version = startFormData.model_version;

            const response = await fetch(`${apiUrl}/train/start`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(`Training job started: ${data.job_id}`);
                setShowStartForm(false);
                setStartFormData({
                    model_type: "lightgbm",
                    symbol: "",
                    horizon: "",
                    retrain: false,
                    model_version: "",
                });
                fetchJobs();
            } else {
                setError(data.detail || "Failed to start training");
            }
        } catch (err) {
            setError("Error starting training");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Retrain model
    const handleRetrain = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const token = getAuthToken();
            const response = await fetch(`${apiUrl}/train/retrain`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model_version: retrainFormData.model_version,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(`Retraining job started: ${data.job_id}`);
                setShowRetrainForm(false);
                setRetrainFormData({ model_version: "" });
                fetchJobs();
            } else {
                setError(data.detail || "Failed to start retraining");
            }
        } catch (err) {
            setError("Error starting retraining");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Auto-refresh
    useEffect(() => {
        fetchJobs();
        fetchModels();
    }, [fetchJobs, fetchModels]);

    // Validate selectedJob when jobs change (e.g., after refresh)
    useEffect(() => {
        if (selectedJob && jobs.length > 0) {
            const jobExists = jobs.some(j => j.job_id === selectedJob);
            if (!jobExists) {
                // Job no longer exists, clear selection
                setSelectedJob(null);
                setJobLogs("");
            }
        }
    }, [jobs, selectedJob]);

    useEffect(() => {
        if (autoRefresh) {
            const interval = setInterval(() => {
                fetchJobs();
            }, 5000); // Refresh every 5 seconds

            return () => clearInterval(interval);
        }
    }, [autoRefresh, fetchJobs]);

    // Fetch logs when job is selected
    useEffect(() => {
        if (selectedJob) {
            // Find the selected job to check its status
            const job = jobs.find(j => j.job_id === selectedJob);
            
            // Only proceed if job exists
            if (!job) {
                return;
            }
            
            fetchJobLogs(selectedJob);
            
            const isJobRunning = job.status === "running" || job.status === "unknown";
            
            // Only poll if job is still running
            if (isJobRunning) {
                const interval = setInterval(() => {
                    fetchJobLogs(selectedJob);
                }, 3000);
                return () => clearInterval(interval);
            }
        }
    }, [selectedJob, fetchJobLogs, jobs]);

    // Parse training metrics from logs
    const parseTrainingMetrics = useCallback((logs: string): TrainingMetrics[] => {
        const metrics: TrainingMetrics[] = [];
        const lines = logs.split("\n");

        for (const line of lines) {
            // Match patterns like: "Epoch 1/100 - Train Loss: 0.123456, Val Loss: 0.234567, LR: 1.00e-04"
            // Also match: "2025-11-23 17:07:23,115 INFO __main__ - Epoch 1/100 - Train Loss: 0.128652, Val Loss: 0.102022, Accuracy: 0.9586, Precision: 0.8750, Recall: 0.3196, F1: 0.4682, LR: 1.00e-03"
            const epochMatch = line.match(/Epoch\s+(\d+)\/(\d+)/);
            if (epochMatch) {
                const epoch = parseInt(epochMatch[1]);
                const trainLossMatch = line.match(/Train Loss:\s+([\d.]+)/);
                const valLossMatch = line.match(/Val Loss:\s+([\d.]+)/);
                const lrMatch = line.match(/LR:\s+([\d.e-]+)/);
                const accuracyMatch = line.match(/Accuracy:\s+([\d.]+)/);
                const precisionMatch = line.match(/Precision:\s+([\d.]+)/);
                const recallMatch = line.match(/Recall:\s+([\d.]+)/);
                const f1Match = line.match(/F1:\s+([\d.]+)/);

                const metric: TrainingMetrics = { epoch };
                if (trainLossMatch) metric.train_loss = parseFloat(trainLossMatch[1]);
                if (valLossMatch) metric.val_loss = parseFloat(valLossMatch[1]);
                if (lrMatch) {
                    // Handle scientific notation like "1.00e-03"
                    const lrValue = lrMatch[1];
                    metric.learning_rate = parseFloat(lrValue);
                }
                if (accuracyMatch) metric.accuracy = parseFloat(accuracyMatch[1]);
                if (precisionMatch) metric.precision = parseFloat(precisionMatch[1]);
                if (recallMatch) metric.recall = parseFloat(recallMatch[1]);
                if (f1Match) metric.f1 = parseFloat(f1Match[1]);

                // Include metric if it has at least one value
                if (metric.train_loss !== undefined || metric.val_loss !== undefined || 
                    metric.accuracy !== undefined || metric.precision !== undefined || 
                    metric.recall !== undefined || metric.f1 !== undefined) {
                    metrics.push(metric);
                }
            }
        }

        return metrics;
    }, []);

    // Get metrics for selected job
    const selectedJobMetrics = useMemo(() => {
        if (!selectedJob || !jobLogs) return [];
        return parseTrainingMetrics(jobLogs);
    }, [selectedJob, jobLogs, parseTrainingMetrics]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "running":
                return "#FFAE00";
            case "completed":
                return "#00ff00";
            case "failed":
                return "#ff4444";
            default:
                return "#888888";
        }
    };

    const runningJobs = jobs.filter((j) => j.status === "running");
    const completedJobs = jobs.filter((j) => j.status === "completed");
    const failedJobs = jobs.filter((j) => j.status === "failed");

    return (
        <div style={{  padding: "16px 24px", minHeight: "100vh", backgroundColor: "#1a1a1a", color: "#ffffff" }}>
            <div style={{ maxWidth: "1800px", margin: "0 auto" }}>
                <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "24px", color: "#FFAE00" }}>
                    🎓 Training Management
                </h1>

                {/* Messages */}
                {error && (
                    <div
                        style={{
                            padding: "16px",
                            backgroundColor: "rgba(255, 68, 68, 0.1)",
                            border: "1px solid rgba(255, 68, 68, 0.3)",
                            borderRadius: "8px",
                            marginBottom: "24px",
                            color: "#ff4444",
                        }}
                    >
                        {error}
                    </div>
                )}

                {success && (
                    <div
                        style={{
                            padding: "16px",
                            backgroundColor: "rgba(0, 255, 0, 0.1)",
                            border: "1px solid rgba(0, 255, 0, 0.3)",
                            borderRadius: "8px",
                            marginBottom: "24px",
                            color: "#00ff00",
                        }}
                    >
                        {success}
                    </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "12px", marginBottom: "32px", flexWrap: "wrap" }}>
                    <button
                        onClick={() => {
                            setShowStartForm(!showStartForm);
                            setShowRetrainForm(false);
                        }}
                        style={{
                            padding: "12px 24px",
                            backgroundColor: showStartForm ? "#FFAE00" : "rgba(255, 174, 0, 0.1)",
                            color: showStartForm ? "#1a1a1a" : "#FFAE00",
                            border: "1px solid rgba(255, 174, 0, 0.3)",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "15px",
                            fontWeight: "600",
                            transition: "all 0.2s ease",
                        }}
                    >
                        ➕ Start Training
                    </button>
                    <button
                        onClick={() => {
                            setShowRetrainForm(!showRetrainForm);
                            setShowStartForm(false);
                        }}
                        style={{
                            padding: "12px 24px",
                            backgroundColor: showRetrainForm ? "#FFAE00" : "rgba(255, 174, 0, 0.1)",
                            color: showRetrainForm ? "#1a1a1a" : "#FFAE00",
                            border: "1px solid rgba(255, 174, 0, 0.3)",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "15px",
                            fontWeight: "600",
                            transition: "all 0.2s ease",
                        }}
                    >
                        🔄 Retrain Model
                    </button>
                    <button
                        onClick={() => {
                            fetchJobs();
                            fetchModels();
                        }}
                        style={{
                            padding: "12px 24px",
                            backgroundColor: "rgba(255, 174, 0, 0.1)",
                            color: "#FFAE00",
                            border: "1px solid rgba(255, 174, 0, 0.3)",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "15px",
                            fontWeight: "600",
                            transition: "all 0.2s ease",
                        }}
                    >
                        🔃 Refresh
                    </button>
                    <label
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "12px 24px",
                            backgroundColor: "rgba(255, 174, 0, 0.1)",
                            border: "1px solid rgba(255, 174, 0, 0.3)",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "15px",
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            style={{ cursor: "pointer" }}
                        />
                        Auto-refresh
                    </label>
                </div>

                {/* Start Training Modal */}
                {showStartForm && (
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(0, 0, 0, 0.7)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 1000,
                        }}
                        onClick={() => setShowStartForm(false)}
                    >
                        <div
                            style={{
                                backgroundColor: "#202020",
                                border: "1px solid #2a2a2a",
                                borderRadius: "16px",
                                padding: "32px",
                                maxWidth: "600px",
                                width: "90%",
                                maxHeight: "90vh",
                                overflowY: "auto",
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                                <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#FFAE00", margin: 0 }}>
                                    Start New Training Job
                                </h2>
                                <button
                                    onClick={() => setShowStartForm(false)}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "#888888",
                                        fontSize: "24px",
                                        cursor: "pointer",
                                        padding: "0",
                                        width: "32px",
                                        height: "32px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                            <form onSubmit={handleStartTraining}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                                <div>
                                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888888" }}>
                                        Model Type *
                                    </label>
                                    <select
                                        value={startFormData.model_type}
                                        onChange={(e) => setStartFormData({ ...startFormData, model_type: e.target.value })}
                                        required
                                        style={{
                                            width: "100%",
                                            padding: "10px",
                                            backgroundColor: "#1a1a1a",
                                            border: "1px solid #2a2a2a",
                                            borderRadius: "6px",
                                            color: "#ffffff",
                                            fontSize: "14px",
                                        }}
                                    >
                                        <option value="lightgbm">LightGBM</option>
                                        <option value="lstm">LSTM</option>
                                        <option value="transformer">Transformer</option>
                                        <option value="enhanced_lstm">Enhanced LSTM</option>
                                        <option value="enhanced_transformer">Enhanced Transformer</option>
                                        <option value="tft">TFT</option>
                                        <option value="jump_detection">Jump Detection</option>
                                        <option value="hybrid_jump">Hybrid Jump</option>
                                        <option value="all">All Models</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888888" }}>
                                        Symbol (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={startFormData.symbol}
                                        onChange={(e) => setStartFormData({ ...startFormData, symbol: e.target.value.toUpperCase() })}
                                        placeholder="e.g., BTCUSDT"
                                        style={{
                                            width: "100%",
                                            padding: "10px",
                                            backgroundColor: "#1a1a1a",
                                            border: "1px solid #2a2a2a",
                                            borderRadius: "6px",
                                            color: "#ffffff",
                                            fontSize: "14px",
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888888" }}>
                                        Horizon (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={startFormData.horizon}
                                        onChange={(e) => setStartFormData({ ...startFormData, horizon: e.target.value })}
                                        placeholder="e.g., 60m, 1h, 1d"
                                        style={{
                                            width: "100%",
                                            padding: "10px",
                                            backgroundColor: "#1a1a1a",
                                            border: "1px solid #2a2a2a",
                                            borderRadius: "6px",
                                            color: "#ffffff",
                                            fontSize: "14px",
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: "16px", marginBottom: "20px", alignItems: "center" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        checked={startFormData.retrain}
                                        onChange={(e) => setStartFormData({ ...startFormData, retrain: e.target.checked })}
                                    />
                                    <span style={{ fontSize: "14px" }}>Retrain existing model</span>
                                </label>
                            </div>
                            {startFormData.retrain && (
                                <div style={{ marginBottom: "20px" }}>
                                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888888" }}>
                                        Model Version *
                                    </label>
                                    <select
                                        value={startFormData.model_version}
                                        onChange={(e) => setStartFormData({ ...startFormData, model_version: e.target.value })}
                                        required={startFormData.retrain}
                                        style={{
                                            width: "100%",
                                            padding: "10px",
                                            backgroundColor: "#1a1a1a",
                                            border: "1px solid #2a2a2a",
                                            borderRadius: "6px",
                                            color: "#ffffff",
                                            fontSize: "14px",
                                        }}
                                    >
                                        <option value="">Select model version...</option>
                                        {models.map((model) => (
                                            <option key={model.model_version} value={model.model_version}>
                                                {model.model_version} ({model.model_type} - {model.symbol} - {model.horizon_minutes}m)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div style={{ display: "flex", gap: "12px" }}>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        padding: "12px 24px",
                                        backgroundColor: "#FFAE00",
                                        color: "#1a1a1a",
                                        border: "none",
                                        borderRadius: "8px",
                                        cursor: loading ? "not-allowed" : "pointer",
                                        fontSize: "15px",
                                        fontWeight: "600",
                                        opacity: loading ? 0.6 : 1,
                                    }}
                                >
                                    {loading ? "Starting..." : "Start Training"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowStartForm(false);
                                        setStartFormData({
                                            model_type: "lightgbm",
                                            symbol: "",
                                            horizon: "",
                                            retrain: false,
                                            model_version: "",
                                        });
                                    }}
                                    style={{
                                        padding: "12px 24px",
                                        backgroundColor: "transparent",
                                        color: "#888888",
                                        border: "1px solid #2a2a2a",
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        fontSize: "15px",
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                        </div>
                    </div>
                )}

                {/* Retrain Modal */}
                {showRetrainForm && (
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(0, 0, 0, 0.7)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 1000,
                        }}
                        onClick={() => setShowRetrainForm(false)}
                    >
                        <div
                            style={{
                                backgroundColor: "#202020",
                                border: "1px solid #2a2a2a",
                                borderRadius: "16px",
                                padding: "32px",
                                maxWidth: "500px",
                                width: "90%",
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                                <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#FFAE00", margin: 0 }}>
                                    Retrain Model
                                </h2>
                                <button
                                    onClick={() => setShowRetrainForm(false)}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "#888888",
                                        fontSize: "24px",
                                        cursor: "pointer",
                                        padding: "0",
                                        width: "32px",
                                        height: "32px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                            <form onSubmit={handleRetrain}>
                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888888" }}>
                                    Model Version *
                                </label>
                                <select
                                    value={retrainFormData.model_version}
                                    onChange={(e) => setRetrainFormData({ ...retrainFormData, model_version: e.target.value })}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "10px",
                                        backgroundColor: "#1a1a1a",
                                        border: "1px solid #2a2a2a",
                                        borderRadius: "6px",
                                        color: "#ffffff",
                                        fontSize: "14px",
                                    }}
                                >
                                    <option value="">Select model version...</option>
                                    {models.map((model) => (
                                        <option key={model.model_version} value={model.model_version}>
                                            {model.model_version} ({model.model_type} - {model.symbol} - {model.horizon_minutes}m)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: "flex", gap: "12px" }}>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        padding: "12px 24px",
                                        backgroundColor: "#FFAE00",
                                        color: "#1a1a1a",
                                        border: "none",
                                        borderRadius: "8px",
                                        cursor: loading ? "not-allowed" : "pointer",
                                        fontSize: "15px",
                                        fontWeight: "600",
                                        opacity: loading ? 0.6 : 1,
                                    }}
                                >
                                    {loading ? "Starting..." : "Start Retraining"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowRetrainForm(false);
                                        setRetrainFormData({ model_version: "" });
                                    }}
                                    style={{
                                        padding: "12px 24px",
                                        backgroundColor: "transparent",
                                        color: "#888888",
                                        border: "1px solid #2a2a2a",
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        fontSize: "15px",
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                        </div>
                    </div>
                )}

                {/* Statistics */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
                    <div style={{ padding: "20px", backgroundColor: "#202020", border: "1px solid #2a2a2a", borderRadius: "12px" }}>
                        <div style={{ fontSize: "14px", color: "#888888", marginBottom: "8px" }}>Total Jobs</div>
                        <div style={{ fontSize: "32px", fontWeight: "700", color: "#ffffff" }}>{jobs.length}</div>
                    </div>
                    <div style={{ padding: "20px", backgroundColor: "#202020", border: "1px solid #2a2a2a", borderRadius: "12px" }}>
                        <div style={{ fontSize: "14px", color: "#888888", marginBottom: "8px" }}>Running</div>
                        <div style={{ fontSize: "32px", fontWeight: "700", color: "#FFAE00" }}>{runningJobs.length}</div>
                    </div>
                    <div style={{ padding: "20px", backgroundColor: "#202020", border: "1px solid #2a2a2a", borderRadius: "12px" }}>
                        <div style={{ fontSize: "14px", color: "#888888", marginBottom: "8px" }}>Completed</div>
                        <div style={{ fontSize: "32px", fontWeight: "700", color: "#00ff00" }}>{completedJobs.length}</div>
                    </div>
                    <div style={{ padding: "20px", backgroundColor: "#202020", border: "1px solid #2a2a2a", borderRadius: "12px" }}>
                        <div style={{ fontSize: "14px", color: "#888888", marginBottom: "8px" }}>Failed</div>
                        <div style={{ fontSize: "32px", fontWeight: "700", color: "#ff4444" }}>{failedJobs.length}</div>
                    </div>
                </div>

                {/* Training Jobs */}
                <div style={{ marginBottom: "32px" }}>
                    <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "20px", color: "#FFAE00" }}>
                        Training Jobs ({jobs.length})
                    </h2>
                    {jobs.length === 0 ? (
                        <div style={{ padding: "40px", textAlign: "center", color: "#888888" }}>No training jobs found</div>
                    ) : (
                        <div style={{ display: "grid", gap: "16px" }}>
                            {jobs.map((job) => (
                                <div
                                    key={job.job_id}
                                    style={{
                                        padding: "20px",
                                        backgroundColor: "#202020",
                                        border: "1px solid #2a2a2a",
                                        borderRadius: "12px",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease",
                                    }}
                                   onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "#FFAE00";
                                        e.currentTarget.style.backgroundColor = "#252525";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "#2a2a2a";
                                        e.currentTarget.style.backgroundColor = "#202020";
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                        <div onClick={() => setSelectedJob(selectedJob === job.job_id ? null : job.job_id)}>
                                            <div style={{ fontSize: "18px", fontWeight: "600", color: "#ffffff", marginBottom: "4px" }}>
                                                {job.job_id}
                                            </div>
                                            <div style={{ fontSize: "14px", color: "#888888" }}>
                                                Status:{" "}
                                                <span style={{ color: getStatusColor(job.status), fontWeight: "600" }}>
                                                    {job.status.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                            <div style={{ fontSize: "14px", color: "#888888" }}>
                                                Log: {(job.log_size / 1024).toFixed(2)} KB
                                                {job.error_size > 0 && ` | Error: ${(job.error_size / 1024).toFixed(2)} KB`}
                                            </div>
                                            {job.status === "running" && (
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (confirm(`Are you sure you want to cancel training job "${job.job_id}"?`)) {
                                                            try {
                                                                const token = getAuthToken();
                                                                const response = await fetch(`${apiUrl}/train/cancel/${job.job_id}`, {
                                                                    method: "POST",
                                                                    headers: { Authorization: `Bearer ${token}` },
                                                                });
                                                                const data = await response.json();
                                                                if (response.ok) {
                                                                    setSuccess(data.message || "Training job cancelled successfully");
                                                                    fetchJobs();
                                                                } else {
                                                                    setError(data.detail || "Failed to cancel training job");
                                                                }
                                                            } catch (err) {
                                                                setError("Error cancelling training job");
                                                                console.error(err);
                                                            }
                                                        }
                                                    }}
                                                    style={{
                                                        padding: "6px 12px",
                                                        backgroundColor: "rgba(255, 68, 68, 0.1)",
                                                        color: "#ff4444",
                                                        border: "1px solid rgba(255, 68, 68, 0.3)",
                                                        borderRadius: "6px",
                                                        cursor: "pointer",
                                                        fontSize: "12px",
                                                        fontWeight: "600",
                                                    }}
                                                >
                                                    ⛔ Cancel
                                                </button>
                                            )}
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    try {
                                                        const token = getAuthToken();
                                                        const response = await fetch(`${apiUrl}/train/logs/${job.job_id}?lines=10000`, {
                                                            headers: { Authorization: `Bearer ${token}` },
                                                        });
                                                        const data = await response.json();
                                                        
                                                        // Export logs as text file
                                                        const logsContent = data.log || job.last_log_lines.join("\n");
                                                        const errorsContent = data.error_log || job.error_lines.join("\n");
                                                        
                                                        // Parse metrics from full logs and errors (error file contains stdout for hybrid_jump)
                                                        let metrics = selectedJobMetrics;
                                                        if (job.job_id === selectedJob && metrics.length === 0) {
                                                            // Try parsing from logs first
                                                            if (logsContent) {
                                                                metrics = parseTrainingMetrics(logsContent);
                                                            }
                                                            // If no metrics found in logs, try error file (which contains stdout for some models)
                                                            if (metrics.length === 0 && errorsContent) {
                                                                metrics = parseTrainingMetrics(errorsContent);
                                                            }
                                                        } else if (metrics.length === 0) {
                                                            // If not selected job, parse from available content
                                                            const contentToParse = errorsContent || logsContent || "";
                                                            if (contentToParse) {
                                                                metrics = parseTrainingMetrics(contentToParse);
                                                            }
                                                        }
                                                        
                                                        // Create export data
                                                        const exportData = {
                                                            job_id: job.job_id,
                                                            status: job.status,
                                                            export_date: new Date().toISOString(),
                                                            log_file: job.log_file,
                                                            error_file: job.error_file,
                                                            log_size_kb: (job.log_size / 1024).toFixed(2),
                                                            error_size_kb: (job.error_size / 1024).toFixed(2),
                                                            logs: logsContent,
                                                            errors: errorsContent,
                                                            metrics: metrics,
                                                            metrics_summary: metrics.length > 0 ? {
                                                                total_epochs: metrics.length,
                                                                final_train_loss: metrics[metrics.length - 1].train_loss,
                                                                final_val_loss: metrics[metrics.length - 1].val_loss,
                                                                final_accuracy: metrics[metrics.length - 1].accuracy,
                                                                final_precision: metrics[metrics.length - 1].precision,
                                                                final_recall: metrics[metrics.length - 1].recall,
                                                                final_f1: metrics[metrics.length - 1].f1,
                                                                best_val_loss: Math.min(...metrics.filter(m => m.val_loss !== undefined).map(m => m.val_loss!)),
                                                                best_accuracy: Math.max(...metrics.filter(m => m.accuracy !== undefined).map(m => m.accuracy!)),
                                                            } : null,
                                                        };
                                                        
                                                        // Export as JSON
                                                        const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                                                        const jsonUrl = URL.createObjectURL(jsonBlob);
                                                        const jsonLink = document.createElement("a");
                                                        jsonLink.href = jsonUrl;
                                                        jsonLink.download = `${job.job_id}_export.json`;
                                                        jsonLink.click();
                                                        URL.revokeObjectURL(jsonUrl);
                                                        
                                                        // Also export logs as text
                                                        const textBlob = new Blob([logsContent + (errorsContent ? "\n\n=== ERRORS ===\n" + errorsContent : "")], { type: "text/plain" });
                                                        const textUrl = URL.createObjectURL(textBlob);
                                                        const textLink = document.createElement("a");
                                                        textLink.href = textUrl;
                                                        textLink.download = `${job.job_id}_logs.txt`;
                                                        textLink.click();
                                                        URL.revokeObjectURL(textUrl);
                                                        
                                                        // Export metrics as CSV if available
                                                        if (metrics.length > 0) {
                                                            const csvHeaders = ["epoch", "train_loss", "val_loss", "accuracy", "precision", "recall", "f1", "learning_rate"].filter(h => 
                                                                metrics.some(m => m[h as keyof TrainingMetrics] !== undefined)
                                                            );
                                                            const csvRows = [
                                                                csvHeaders.join(","),
                                                                ...metrics.map(m => 
                                                                    csvHeaders.map(h => m[h as keyof TrainingMetrics] ?? "").join(",")
                                                                )
                                                            ];
                                                            const csvBlob = new Blob([csvRows.join("\n")], { type: "text/csv" });
                                                            const csvUrl = URL.createObjectURL(csvBlob);
                                                            const csvLink = document.createElement("a");
                                                            csvLink.href = csvUrl;
                                                            csvLink.download = `${job.job_id}_metrics.csv`;
                                                            csvLink.click();
                                                            URL.revokeObjectURL(csvUrl);
                                                        }
                                                        
                                                        setSuccess(`Exported training results for ${job.job_id}`);
                                                    } catch (err) {
                                                        setError("Error exporting training results");
                                                        console.error(err);
                                                    }
                                                }}
                                                style={{
                                                    padding: "6px 12px",
                                                    backgroundColor: "rgba(255, 174, 0, 0.1)",
                                                    color: "#FFAE00",
                                                    border: "1px solid rgba(255, 174, 0, 0.3)",
                                                    borderRadius: "6px",
                                                    cursor: "pointer",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                📥 Export
                                            </button>
                                        </div>
                                    </div>
                                    {selectedJob === job.job_id && (
                                        <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #2a2a2a" }}>
                                            {/* Training Metrics Charts */}
                                            {selectedJobMetrics.length > 0 && (
                                                <div style={{ marginBottom: "24px" }}>
                                                    <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "#FFAE00" }}>
                                                        Training Metrics
                                                    </h3>
                                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "16px" }}>
                                                        {/* Loss Chart */}
                                                        {(selectedJobMetrics.some((m) => m.train_loss !== undefined || m.val_loss !== undefined)) && (
                                                            <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                                                <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#ffffff" }}>
                                                                    Loss Over Time
                                                                </h4>
                                                                <ResponsiveContainer width="100%" height={250}>
                                                                    <LineChart data={selectedJobMetrics}>
                                                                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                                                                        <XAxis dataKey="epoch" stroke="#888888" />
                                                                        <YAxis stroke="#888888" />
                                                                        <Tooltip
                                                                            contentStyle={{
                                                                                backgroundColor: "#202020",
                                                                                border: "1px solid #2a2a2a",
                                                                                borderRadius: "6px",
                                                                                color: "#ffffff",
                                                                            }}
                                                                        />
                                                                        <Legend />
                                                                        {selectedJobMetrics.some((m) => m.train_loss !== undefined) && (
                                                                            <Line
                                                                                type="monotone"
                                                                                dataKey="train_loss"
                                                                                stroke="#FFAE00"
                                                                                strokeWidth={2}
                                                                                dot={false}
                                                                                name="Train Loss"
                                                                            />
                                                                        )}
                                                                        {selectedJobMetrics.some((m) => m.val_loss !== undefined) && (
                                                                            <Line
                                                                                type="monotone"
                                                                                dataKey="val_loss"
                                                                                stroke="#00ff00"
                                                                                strokeWidth={2}
                                                                                dot={false}
                                                                                name="Validation Loss"
                                                                            />
                                                                        )}
                                                                    </LineChart>
                                                                </ResponsiveContainer>
                                                            </div>
                                                        )}

                                                        {/* Classification Metrics Chart */}
                                                        {(selectedJobMetrics.some((m) => m.accuracy !== undefined || m.precision !== undefined || m.recall !== undefined || m.f1 !== undefined)) && (
                                                            <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                                                <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#ffffff" }}>
                                                                    Classification Metrics
                                                                </h4>
                                                                <ResponsiveContainer width="100%" height={250}>
                                                                    <LineChart data={selectedJobMetrics}>
                                                                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                                                                        <XAxis dataKey="epoch" stroke="#888888" />
                                                                        <YAxis stroke="#888888" domain={[0, 1]} />
                                                                        <Tooltip
                                                                            contentStyle={{
                                                                                backgroundColor: "#202020",
                                                                                border: "1px solid #2a2a2a",
                                                                                borderRadius: "6px",
                                                                                color: "#ffffff",
                                                                            }}
                                                                        />
                                                                        <Legend />
                                                                        {selectedJobMetrics.some((m) => m.accuracy !== undefined) && (
                                                                            <Line
                                                                                type="monotone"
                                                                                dataKey="accuracy"
                                                                                stroke="#00ff00"
                                                                                strokeWidth={2}
                                                                                dot={false}
                                                                                name="Accuracy"
                                                                            />
                                                                        )}
                                                                        {selectedJobMetrics.some((m) => m.precision !== undefined) && (
                                                                            <Line
                                                                                type="monotone"
                                                                                dataKey="precision"
                                                                                stroke="#FFAE00"
                                                                                strokeWidth={2}
                                                                                dot={false}
                                                                                name="Precision"
                                                                            />
                                                                        )}
                                                                        {selectedJobMetrics.some((m) => m.recall !== undefined) && (
                                                                            <Line
                                                                                type="monotone"
                                                                                dataKey="recall"
                                                                                stroke="#0088ff"
                                                                                strokeWidth={2}
                                                                                dot={false}
                                                                                name="Recall"
                                                                            />
                                                                        )}
                                                                        {selectedJobMetrics.some((m) => m.f1 !== undefined) && (
                                                                            <Line
                                                                                type="monotone"
                                                                                dataKey="f1"
                                                                                stroke="#ff00ff"
                                                                                strokeWidth={2}
                                                                                dot={false}
                                                                                name="F1 Score"
                                                                            />
                                                                        )}
                                                                    </LineChart>
                                                                </ResponsiveContainer>
                                                            </div>
                                                        )}

                                                        {/* Learning Rate Chart */}
                                                        {selectedJobMetrics.some((m) => m.learning_rate !== undefined) && (
                                                            <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                                                <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#ffffff" }}>
                                                                    Learning Rate
                                                                </h4>
                                                                <ResponsiveContainer width="100%" height={250}>
                                                                    <LineChart data={selectedJobMetrics}>
                                                                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                                                                        <XAxis dataKey="epoch" stroke="#888888" />
                                                                        <YAxis stroke="#888888" scale="log" />
                                                                        <Tooltip
                                                                            contentStyle={{
                                                                                backgroundColor: "#202020",
                                                                                border: "1px solid #2a2a2a",
                                                                                borderRadius: "6px",
                                                                                color: "#ffffff",
                                                                            }}
                                                                        />
                                                                        <Legend />
                                                                        <Line
                                                                            type="monotone"
                                                                            dataKey="learning_rate"
                                                                            stroke="#ff8800"
                                                                            strokeWidth={2}
                                                                            dot={false}
                                                                            name="Learning Rate"
                                                                        />
                                                                    </LineChart>
                                                                </ResponsiveContainer>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                                                <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#FFAE00", margin: 0 }}>
                                                    Logs
                                                </h3>
                                                <div style={{ display: "flex", gap: "8px" }}>
                                                    <button
                                                        onClick={() => {
                                                            const logsText = jobLogs || job.last_log_lines.join("\n") || "No logs available";
                                                            navigator.clipboard.writeText(logsText).then(() => {
                                                                setSuccess("Logs copied to clipboard!");
                                                                setTimeout(() => setSuccess(null), 2000);
                                                            }).catch(() => {
                                                                setError("Failed to copy logs");
                                                                setTimeout(() => setError(null), 2000);
                                                            });
                                                        }}
                                                        style={{
                                                            padding: "4px 8px",
                                                            backgroundColor: "rgba(255, 174, 0, 0.1)",
                                                            color: "#FFAE00",
                                                            border: "1px solid rgba(255, 174, 0, 0.3)",
                                                            borderRadius: "4px",
                                                            cursor: "pointer",
                                                            fontSize: "11px",
                                                            fontWeight: "600",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "4px",
                                                        }}
                                                        title="Copy logs"
                                                    >
                                                        📋 Copy
                                                    </button>
                                                    <button
                                                        onClick={() => setExpandedLogs(prev => ({ ...prev, [job.job_id]: !prev[job.job_id] }))}
                                                        style={{
                                                            padding: "4px 8px",
                                                            backgroundColor: "rgba(255, 174, 0, 0.1)",
                                                            color: "#FFAE00",
                                                            border: "1px solid rgba(255, 174, 0, 0.3)",
                                                            borderRadius: "4px",
                                                            cursor: "pointer",
                                                            fontSize: "11px",
                                                            fontWeight: "600",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "4px",
                                                        }}
                                                        title={expandedLogs[job.job_id] ? "Collapse logs" : "Expand logs"}
                                                    >
                                                        {expandedLogs[job.job_id] ? "▼" : "▶"} {expandedLogs[job.job_id] ? "Collapse" : "Expand"}
                                                    </button>
                                                </div>
                                            </div>
                                            {expandedLogs[job.job_id] && (
                                                <div
                                                    style={{
                                                        padding: "12px",
                                                        backgroundColor: "#1a1a1a",
                                                        borderRadius: "6px",
                                                        maxHeight: "300px",
                                                        overflowY: "auto",
                                                        fontSize: "12px",
                                                        fontFamily: "monospace",
                                                        color: "#888888",
                                                        whiteSpace: "pre-wrap",
                                                        userSelect: "text",
                                                    }}
                                                >
                                                    {jobLogs || job.last_log_lines.join("\n") || "No logs available"}
                                                </div>
                                            )}
                                            {job.error_lines.length > 0 && (
                                                <div style={{ marginTop: "12px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                                                        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#ff4444", margin: 0 }}>
                                                            Errors
                                                        </h3>
                                                        <button
                                                            onClick={() => {
                                                                const errorsText = job.error_lines.join("\n");
                                                                navigator.clipboard.writeText(errorsText).then(() => {
                                                                    setSuccess("Errors copied to clipboard!");
                                                                    setTimeout(() => setSuccess(null), 2000);
                                                                }).catch(() => {
                                                                    setError("Failed to copy errors");
                                                                    setTimeout(() => setError(null), 2000);
                                                                });
                                                            }}
                                                            style={{
                                                                padding: "4px 8px",
                                                                backgroundColor: "rgba(255, 68, 68, 0.1)",
                                                                color: "#ff4444",
                                                                border: "1px solid rgba(255, 68, 68, 0.3)",
                                                                borderRadius: "4px",
                                                                cursor: "pointer",
                                                                fontSize: "11px",
                                                                fontWeight: "600",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "4px",
                                                            }}
                                                            title="Copy errors"
                                                        >
                                                            📋 Copy
                                                        </button>
                                                    </div>
                                                    <div
                                                        style={{
                                                            padding: "12px",
                                                            backgroundColor: "rgba(255, 68, 68, 0.1)",
                                                            borderRadius: "6px",
                                                            maxHeight: "200px",
                                                            overflowY: "auto",
                                                            fontSize: "12px",
                                                            fontFamily: "monospace",
                                                            color: "#ff4444",
                                                            whiteSpace: "pre-wrap",
                                                            userSelect: "text",
                                                        }}
                                                    >
                                                        {job.error_lines.join("\n")}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


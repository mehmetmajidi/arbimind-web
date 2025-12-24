"use client";

import { useState, useEffect, useCallback } from "react";
import FilterStatusIndicator from "./FilterStatusIndicator";
import LoadingSpinner from "./LoadingSpinner";
import { showToast } from "./ToastContainer";
import { startTraining, getFilterStatus } from "@/lib/trainingApi";
import type { FilterStatus } from "@/types/training";

interface StartTrainingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const MODEL_TYPES = [
    { value: "lightgbm", label: "LightGBM" },
    { value: "lstm", label: "LSTM" },
    { value: "transformer", label: "Transformer" },
    { value: "enhanced_lstm", label: "Enhanced LSTM" },
    { value: "enhanced_transformer", label: "Enhanced Transformer" },
    { value: "tft", label: "TFT" },
    { value: "jump_detection", label: "Jump Detection" },
    { value: "hybrid_jump", label: "Hybrid Jump" },
    { value: "all", label: "All Models" },
];

const HORIZONS = [
    { value: "10m", label: "10 Minutes" },
    { value: "30m", label: "30 Minutes" },
    { value: "1h", label: "1 Hour" },
    { value: "4h", label: "4 Hours" },
    { value: "1d", label: "1 Day" },
];

export default function StartTrainingModal({ 
    isOpen, 
    onClose, 
    onSuccess 
}: StartTrainingModalProps) {
    const [symbol, setSymbol] = useState("");
    const [modelType, setModelType] = useState("lightgbm");
    const [horizon, setHorizon] = useState("1h");
    const [skipFilters, setSkipFilters] = useState(false);
    const [filterStatus, setFilterStatus] = useState<FilterStatus | null>(null);
    const [checkingFilter, setCheckingFilter] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-determine interval from horizon
    const getInterval = (horizon: string): string => {
        if (horizon === "10m" || horizon === "30m") return "1h";
        if (horizon === "1h" || horizon === "4h") return "1h";
        if (horizon === "1d") return "1d";
        return "1h";
    };

    const interval = getInterval(horizon);

    // Check filter status when symbol changes
    useEffect(() => {
        if (!symbol.trim() || skipFilters) {
            setFilterStatus(null);
            return;
        }

        const checkFilter = async () => {
            setCheckingFilter(true);
            try {
                // Normalize symbol
                let normalizedSymbol = symbol.trim().toUpperCase();
                if (!normalizedSymbol.includes("/")) {
                    normalizedSymbol = `${normalizedSymbol}/USDT`;
                }

                const data = await getFilterStatus(normalizedSymbol, interval);
                setFilterStatus(data);
            } catch (err) {
                console.error("Error checking filter:", err);
                setFilterStatus(null);
            } finally {
                setCheckingFilter(false);
            }
        };

        const timeoutId = setTimeout(checkFilter, 500); // Debounce
        return () => clearTimeout(timeoutId);
    }, [symbol, interval, skipFilters]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            // Validate
            if (!modelType) {
                setError("Please select a model type");
                setSubmitting(false);
                return;
            }

            if (!horizon) {
                setError("Please select a horizon");
                setSubmitting(false);
                return;
            }

            // Normalize symbol
            let normalizedSymbol = symbol.trim().toUpperCase();
            if (normalizedSymbol && !normalizedSymbol.includes("/")) {
                normalizedSymbol = `${normalizedSymbol}/USDT`;
            }

            const requestBody = {
                model_type: modelType as any,
                horizon: horizon,
                ...(normalizedSymbol && { symbol: normalizedSymbol }),
                ...(skipFilters && { skip_filters: true }),
            };

            const result = await startTraining(requestBody);
            
            showToast("success", `Training job started successfully! Job ID: ${result.job_id?.substring(0, 8)}...`);
            
            if (onSuccess) onSuccess();
            onClose();
            // Reset form
            setSymbol("");
            setModelType("lightgbm");
            setHorizon("1h");
            setSkipFilters(false);
            setFilterStatus(null);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Error starting training";
            setError(errorMessage);
            showToast("error", errorMessage);
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const showFilterWarning = !skipFilters && filterStatus && !filterStatus.can_train;

    return (
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
            onClick={onClose}
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
                        onClick={onClose}
                        aria-label="Close modal"
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
                            borderRadius: "4px",
                            transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                            e.currentTarget.style.color = "#ededed";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.color = "#888888";
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.outline = "2px solid rgba(255, 174, 0, 0.5)";
                            e.currentTarget.style.outlineOffset = "2px";
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.outline = "none";
                        }}
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {/* Symbol Input */}
                        <div>
                            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888888" }}>
                                Symbol (optional)
                            </label>
                            <input
                                type="text"
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                placeholder="e.g., BTC/USDT or BTCUSDT"
                                aria-label="Trading symbol"
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    backgroundColor: "#1a1a1a",
                                    border: "1px solid #2a2a2a",
                                    borderRadius: "6px",
                                    color: "#ffffff",
                                    fontSize: "14px",
                                    transition: "all 0.2s ease",
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = "#FFAE00";
                                    e.currentTarget.style.outline = "none";
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = "#2a2a2a";
                                }}
                            />
                        </div>

                        {/* Filter Status Indicator */}
                        {symbol && !skipFilters && (
                            <div>
                                {checkingFilter ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#888", fontSize: "12px" }}>
                                        <LoadingSpinner size="small" />
                                        Checking filter status...
                                    </div>
                                ) : filterStatus ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <FilterStatusIndicator 
                                            status={filterStatus.can_train ? "passed" : "failed"}
                                            text={filterStatus.can_train ? "Filter check passed" : "Filter check failed"}
                                        />
                                        {filterStatus.reason && (
                                            <span style={{ fontSize: "11px", color: "#888" }}>
                                                {filterStatus.reason}
                                            </span>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        )}

                        {/* Warning Message */}
                        {showFilterWarning && (
                            <div style={{
                                padding: "12px",
                                backgroundColor: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                borderRadius: "6px",
                                color: "#ef4444",
                                fontSize: "12px",
                            }}>
                                ⚠️ Warning: This symbol failed filter checks. Training may not be recommended.
                            </div>
                        )}

                        {/* Model Type */}
                        <div>
                            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888888" }}>
                                Model Type *
                            </label>
                            <select
                                value={modelType}
                                onChange={(e) => setModelType(e.target.value)}
                                required
                                aria-label="Model type"
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    backgroundColor: "#1a1a1a",
                                    border: "1px solid #2a2a2a",
                                    borderRadius: "6px",
                                    color: "#ffffff",
                                    fontSize: "14px",
                                    transition: "all 0.2s ease",
                                    cursor: "pointer",
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = "#FFAE00";
                                    e.currentTarget.style.outline = "none";
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = "#2a2a2a";
                                }}
                            >
                                {MODEL_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Horizon */}
                        <div>
                            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888888" }}>
                                Horizon *
                            </label>
                            <select
                                value={horizon}
                                onChange={(e) => setHorizon(e.target.value)}
                                required
                                aria-label="Prediction horizon"
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    backgroundColor: "#1a1a1a",
                                    border: "1px solid #2a2a2a",
                                    borderRadius: "6px",
                                    color: "#ffffff",
                                    fontSize: "14px",
                                    transition: "all 0.2s ease",
                                    cursor: "pointer",
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = "#FFAE00";
                                    e.currentTarget.style.outline = "none";
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = "#2a2a2a";
                                }}
                            >
                                {HORIZONS.map((h) => (
                                    <option key={h.value} value={h.value}>
                                        {h.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Interval (Read-only) */}
                        <div>
                            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888888" }}>
                                Interval (auto-determined)
                            </label>
                            <input
                                type="text"
                                value={interval}
                                readOnly
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    backgroundColor: "#1a1a1a",
                                    border: "1px solid #2a2a2a",
                                    borderRadius: "6px",
                                    color: "#888888",
                                    fontSize: "14px",
                                    cursor: "not-allowed",
                                }}
                            />
                        </div>

                        {/* Skip Filters Checkbox */}
                        <div>
                            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                                <input
                                    type="checkbox"
                                    checked={skipFilters}
                                    onChange={(e) => setSkipFilters(e.target.checked)}
                                    style={{ cursor: "pointer" }}
                                />
                                <span style={{ fontSize: "12px", color: "#888888" }}>
                                    Skip Filters (Admin only - bypass volatility and data freshness checks)
                                </span>
                            </label>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div style={{
                                padding: "12px",
                                backgroundColor: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                borderRadius: "6px",
                                color: "#ef4444",
                                fontSize: "12px",
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting}
                                aria-label="Cancel training"
                                style={{
                                    padding: "10px 20px",
                                    backgroundColor: "transparent",
                                    color: "#888888",
                                    border: "1px solid #2a2a2a",
                                    borderRadius: "8px",
                                    cursor: submitting ? "not-allowed" : "pointer",
                                    fontSize: "14px",
                                    transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                    if (!submitting) {
                                        e.currentTarget.style.borderColor = "#666";
                                        e.currentTarget.style.color = "#ededed";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!submitting) {
                                        e.currentTarget.style.borderColor = "#2a2a2a";
                                        e.currentTarget.style.color = "#888888";
                                    }
                                }}
                                onFocus={(e) => {
                                    if (!submitting) {
                                        e.currentTarget.style.outline = "2px solid rgba(255, 174, 0, 0.5)";
                                        e.currentTarget.style.outlineOffset = "2px";
                                    }
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.outline = "none";
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                aria-label="Start training job"
                                style={{
                                    padding: "10px 20px",
                                    backgroundColor: submitting ? "#666" : "#FFAE00",
                                    color: "#1a1a1a",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: submitting ? "not-allowed" : "pointer",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                    if (!submitting) {
                                        e.currentTarget.style.backgroundColor = "#ffb733";
                                        e.currentTarget.style.transform = "scale(1.02)";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!submitting) {
                                        e.currentTarget.style.backgroundColor = "#FFAE00";
                                        e.currentTarget.style.transform = "scale(1)";
                                    }
                                }}
                                onFocus={(e) => {
                                    if (!submitting) {
                                        e.currentTarget.style.outline = "2px solid rgba(255, 174, 0, 0.5)";
                                        e.currentTarget.style.outlineOffset = "2px";
                                    }
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.outline = "none";
                                }}
                            >
                                {submitting ? "Starting..." : "Start Training"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}


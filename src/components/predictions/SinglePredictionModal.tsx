"use client";

import { useState, useEffect } from "react";
import { useFormValidation } from "@/hooks/useFormValidation";
import { commonRules } from "@/lib/validation";
import { ErrorMessage } from "@/components/shared";
import { apiGet } from "@/lib/apiClient";
import { handleApiError } from "@/lib/errorHandler";

interface ExchangeAccount {
    id: number;
    exchange_name: string;
    is_active: boolean;
}

interface Market {
    symbol: string;
    base: string;
    quote: string;
}

interface SinglePredictionResult {
    predicted_price: number;
    current_price: number;
    confidence: number;
    upper_bound: number;
    lower_bound: number;
    price_change_percent: number;
}

interface SinglePredictionModalProps {
    isOpen: boolean;
    onClose: () => void;
    accounts: ExchangeAccount[];
    selectedAccountId: number | null;
    apiUrl: string;
}

const SUPPORTED_HORIZONS = ["10m", "30m", "1h", "4h", "24h"];

export default function SinglePredictionModal({
    isOpen,
    onClose,
    accounts,
    selectedAccountId,
    apiUrl,
}: SinglePredictionModalProps) {
    const [accountId, setAccountId] = useState<number | null>(null);
    const [modelType, setModelType] = useState<string>("ensemble");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<SinglePredictionResult | null>(null);
    const [markets, setMarkets] = useState<Market[]>([]);

    // Form validation
    const {
        values,
        errors,
        touched,
        isValid,
        handleChange,
        handleBlur,
        validate,
        setValue,
    } = useFormValidation({
        validationRules: {
            symbol: {
                ...commonRules.symbol,
                custom: (value) => {
                    if (!value) return "Symbol is required";
                    const symbolPattern = /^[A-Z0-9]+\/[A-Z0-9]+$/;
                    if (!symbolPattern.test(value)) {
                        return "Invalid symbol format. Use format like BTC/USDT";
                    }
                    return true;
                },
            },
            horizon: {
                required: true,
                custom: (value) => {
                    if (!SUPPORTED_HORIZONS.includes(value)) {
                        return `Unsupported horizon. Supported: ${SUPPORTED_HORIZONS.join(", ")}`;
                    }
                    return true;
                },
            },
        },
        initialValues: {
            symbol: "",
            horizon: "10m",
        },
        validateOnChange: true,
        validateOnBlur: true,
    });

    // Initialize account ID when modal opens
    useEffect(() => {
        if (isOpen && selectedAccountId && !accountId) {
            setAccountId(selectedAccountId);
        }
    }, [isOpen, selectedAccountId, accountId]);

    // Fetch markets when account changes
    useEffect(() => {
        const fetchMarkets = async () => {
            if (!accountId || !isOpen) return;

            try {
                const token = localStorage.getItem("auth_token");
                if (!token) return;

                const response = await fetch(`${apiUrl}/market/pairs/${accountId}/db?active_only=true`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (response.ok) {
                    const data = await response.json();
                    setMarkets(data.pairs || []);
                }
            } catch (err) {
                console.error("Error fetching markets:", err);
            }
        };

        if (isOpen && accountId) {
            fetchMarkets();
        }
    }, [isOpen, accountId, apiUrl]);

    const handleGetPrediction = async () => {
        // Validate form
        if (!validate()) {
            setError("Please fix validation errors");
            return;
        }

        if (!accountId) {
            setError("Please select an exchange account");
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const encodedSymbol = encodeURIComponent(values.symbol.trim());
            const params = new URLSearchParams();
            params.append("exchange_account_id", accountId.toString());
            params.append("model_type", modelType);

            const data = await apiGet<SinglePredictionResult>(
                `/predictions/symbol/${encodedSymbol}/horizon/${values.horizon}?${params.toString()}`,
                {
                    retry: {
                        maxRetries: 3,
                        retryDelay: 1000,
                    },
                    errorContext: {
                        component: "SinglePredictionModal",
                        action: "getPrediction",
                        additionalData: {
                            symbol: values.symbol,
                            horizon: values.horizon,
                            accountId,
                        },
                    },
                }
            );

            setResult(data);
        } catch (err) {
            const errorMessage = handleApiError(err);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setValue("symbol", "");
        setValue("horizon", "10m");
        setAccountId(selectedAccountId);
        setModelType("ensemble");
        setError(null);
        setResult(null);
        onClose();
    };

    if (!isOpen) return null;

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
            onClick={handleClose}
        >
            <div
                style={{
                    backgroundColor: "#1a1a1a",
                    borderRadius: "12px",
                    padding: "24px",
                    width: "90%",
                    maxWidth: "600px",
                    maxHeight: "90vh",
                    overflow: "auto",
                    border: "1px solid #2a2a2a",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600", color: "#FFAE00" }}>
                        Get Single Prediction
                    </h2>
                    <button
                        onClick={handleClose}
                        style={{
                            background: "none",
                            border: "none",
                            color: "#888",
                            fontSize: "24px",
                            cursor: "pointer",
                            padding: "0",
                            width: "30px",
                            height: "30px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        ×
                    </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {/* Exchange Account */}
                    <div>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888888" }}>
                            Exchange Account *
                        </label>
                        <select
                            value={accountId || ""}
                            onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : null)}
                            style={{
                                width: "100%",
                                padding: "10px",
                                backgroundColor: "#202020",
                                border: "1px solid #2a2a2a",
                                borderRadius: "6px",
                                color: "#ffffff",
                                fontSize: "14px",
                            }}
                        >
                            <option value="">Select account...</option>
                            {accounts
                                .filter((acc) => acc.is_active)
                                .map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.exchange_name} (ID: {acc.id})
                                    </option>
                                ))}
                        </select>
                    </div>

                    {/* Symbol */}
                    <div>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888888" }}>
                            Symbol *
                        </label>
                        <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                            <input
                                type="text"
                                value={values.symbol}
                                onChange={(e) => {
                                    const upperValue = e.target.value.toUpperCase();
                                    handleChange("symbol", upperValue);
                                }}
                                onBlur={() => handleBlur("symbol")}
                                placeholder="BTC/USDT"
                                list="symbols-list"
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    backgroundColor: "#202020",
                                    border: `1px solid ${touched.symbol && errors.symbol ? "#ef4444" : "#2a2a2a"}`,
                                    borderRadius: "6px",
                                    color: "#ffffff",
                                    fontSize: "14px",
                                }}
                            />
                            <datalist id="symbols-list">
                                {markets.map((market) => (
                                    <option key={market.symbol} value={market.symbol} />
                                ))}
                            </datalist>
                            {touched.symbol && errors.symbol && (
                                <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                                    {errors.symbol}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Horizon */}
                    <div>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888888" }}>
                            Horizon *
                        </label>
                        <select
                            value={values.horizon}
                            onChange={(e) => handleChange("horizon", e.target.value)}
                            onBlur={() => handleBlur("horizon")}
                            style={{
                                width: "100%",
                                padding: "10px",
                                backgroundColor: "#202020",
                                border: `1px solid ${touched.horizon && errors.horizon ? "#ef4444" : "#2a2a2a"}`,
                                borderRadius: "6px",
                                color: "#ffffff",
                                fontSize: "14px",
                            }}
                        >
                            {SUPPORTED_HORIZONS.map((h) => (
                                <option key={h} value={h}>
                                    {h}
                                </option>
                            ))}
                        </select>
                        {touched.horizon && errors.horizon && (
                            <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                                {errors.horizon}
                            </div>
                        )}
                    </div>

                    {/* Model Type */}
                    <div>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888888" }}>
                            Model Type
                        </label>
                        <select
                            value={modelType}
                            onChange={(e) => setModelType(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "10px",
                                backgroundColor: "#202020",
                                border: "1px solid #2a2a2a",
                                borderRadius: "6px",
                                color: "#ffffff",
                                fontSize: "14px",
                            }}
                        >
                            <option value="ensemble">Ensemble (Default)</option>
                            <option value="lightgbm">LightGBM</option>
                            <option value="lstm">LSTM</option>
                            <option value="transformer">Transformer</option>
                            <option value="enhanced_lstm">Enhanced LSTM</option>
                            <option value="enhanced_transformer">Enhanced Transformer</option>
                            <option value="tft">TFT</option>
                            <option value="ml">ML</option>
                        </select>
                    </div>

                    {/* Error */}
                    {error && (
                        <ErrorMessage
                            message={error}
                            onDismiss={() => setError(null)}
                            compact={true}
                            showDetails={true}
                        />
                    )}

                    {/* Result */}
                    {result && (
                        <div
                            style={{
                                padding: "20px",
                                backgroundColor: "#202020",
                                border: "1px solid #2a2a2a",
                                borderRadius: "8px",
                            }}
                        >
                            <h3 style={{ marginBottom: "16px", fontSize: "18px", color: "#FFAE00" }}>
                                Prediction Result
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                    <div style={{ padding: "12px", backgroundColor: "#1a1a1a", borderRadius: "6px" }}>
                                        <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Current Price</div>
                                        <div style={{ fontSize: "18px", fontWeight: "600", color: "#ffffff" }}>
                                            ${result.current_price.toFixed(8)}
                                        </div>
                                    </div>
                                    <div style={{ padding: "12px", backgroundColor: "#1a1a1a", borderRadius: "6px" }}>
                                        <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Predicted Price</div>
                                        <div style={{ fontSize: "18px", fontWeight: "600", color: "#FFAE00" }}>
                                            ${result.predicted_price.toFixed(8)}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                    <div style={{ padding: "12px", backgroundColor: "#1a1a1a", borderRadius: "6px" }}>
                                        <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Lower Bound</div>
                                        <div style={{ fontSize: "16px", fontWeight: "600", color: "#ef4444" }}>
                                            ${result.lower_bound.toFixed(8)}
                                        </div>
                                    </div>
                                    <div style={{ padding: "12px", backgroundColor: "#1a1a1a", borderRadius: "6px" }}>
                                        <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Upper Bound</div>
                                        <div style={{ fontSize: "16px", fontWeight: "600", color: "#10b981" }}>
                                            ${result.upper_bound.toFixed(8)}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                    <div style={{ padding: "12px", backgroundColor: "#1a1a1a", borderRadius: "6px" }}>
                                        <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Confidence</div>
                                        <div style={{ fontSize: "16px", fontWeight: "600", color: "#FFAE00" }}>
                                            {(result.confidence * 100).toFixed(2)}%
                                        </div>
                                    </div>
                                    <div style={{ padding: "12px", backgroundColor: "#1a1a1a", borderRadius: "6px" }}>
                                        <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Price Change</div>
                                        <div
                                            style={{
                                                fontSize: "16px",
                                                fontWeight: "600",
                                                color: result.price_change_percent >= 0 ? "#10b981" : "#ef4444",
                                            }}
                                        >
                                            {result.price_change_percent >= 0 ? "+" : ""}
                                            {result.price_change_percent.toFixed(2)}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                        <button
                            onClick={handleClose}
                            style={{
                                padding: "10px 20px",
                                backgroundColor: "transparent",
                                border: "1px solid #2a2a2a",
                                borderRadius: "6px",
                                color: "#ffffff",
                                fontSize: "14px",
                                cursor: "pointer",
                            }}
                        >
                            Close
                        </button>
                        <button
                            onClick={handleGetPrediction}
                            disabled={loading || !isValid || !accountId}
                            style={{
                                padding: "10px 20px",
                                backgroundColor: loading || !isValid || !accountId ? "#6b7280" : "#FFAE00",
                                border: "none",
                                borderRadius: "6px",
                                color: "#1a1a1a",
                                fontSize: "14px",
                                fontWeight: "600",
                                cursor: loading || !isValid || !accountId ? "not-allowed" : "pointer",
                                opacity: loading || !isValid || !accountId ? 0.5 : 1,
                            }}
                        >
                            {loading ? "Getting Prediction..." : "Get Prediction"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}


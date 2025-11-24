"use client";

import { useState, useEffect, useCallback } from "react";
import { useExchange } from "@/contexts/ExchangeContext";
import PredictionFilters from "@/components/predictions/PredictionFilters";
import PredictionStats from "@/components/predictions/PredictionStats";
import PredictionTable from "@/components/predictions/PredictionTable";
import PredictionPagination from "@/components/predictions/PredictionPagination";
import GetPredictionModal from "@/components/predictions/GetPredictionModal";

interface Prediction {
    id: number;
    symbol: string;
    horizon: string;
    predicted_price: string;
    current_price_at_prediction: string;
    actual_price: string | null;
    confidence: string;
    upper_bound: string;
    lower_bound: string;
    is_verified: boolean;
    price_error: string | null;
    price_error_percent: string | null;
    within_confidence: boolean | null;
    predicted_at: string;
    verified_at: string | null;
    exchange_name: string | null;
    price_change_percent: string | null;
}

interface PredictionHistoryResponse {
    predictions: Prediction[];
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
}

interface NewPredictionData {
    symbol: string;
    horizons: string[];
    exchange_account_id: number | null;
    predictions: Record<string, {
        predicted_price: number;
        current_price: number;
        confidence: number;
        upper_bound: number;
        lower_bound: number;
        price_change_percent: number;
    }>;
}

export default function PredictionsPage() {
    const { accounts, selectedAccountId } = useExchange();
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);

    // Filters
    const [symbolFilter, setSymbolFilter] = useState<string>("");
    const [horizonFilter, setHorizonFilter] = useState<string>("");
    const [verifiedFilter, setVerifiedFilter] = useState<string>("all"); // "all", "verified", "unverified"
    const [limit, setLimit] = useState(50);
    const [offset, setOffset] = useState(0);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(30); // seconds

    // Get Prediction Modal
    const [showGetPredictionModal, setShowGetPredictionModal] = useState(false);
    const [showBatchPredictionModal, setShowBatchPredictionModal] = useState(false);
    const [showFiltersModal, setShowFiltersModal] = useState(false);
    const [getPredictionSymbol, setGetPredictionSymbol] = useState<string>("");
    const [getPredictionAccountId, setGetPredictionAccountId] = useState<number | null>(null);
    const [getPredictionHorizons, setGetPredictionHorizons] = useState<string[]>(["10m", "30m", "1h"]);
    const [getPredictionLoading, setGetPredictionLoading] = useState(false);
    const [getPredictionResult, setGetPredictionResult] = useState<NewPredictionData | null>(null);
    const [getPredictionError, setGetPredictionError] = useState<string | null>(null);
    const [markets, setMarkets] = useState<Array<{ symbol: string; base: string; quote: string }>>([]);

    // Batch Prediction state
    const [batchSymbols, setBatchSymbols] = useState<string[]>([]);
    const [batchHorizons, setBatchHorizons] = useState<string[]>(["10m", "30m", "1h"]);
    const [batchModelType, setBatchModelType] = useState<string>("ensemble");
    const [batchAccountId, setBatchAccountId] = useState<number | null>(null);
    const [batchLoading, setBatchLoading] = useState(false);
    const [batchResults, setBatchResults] = useState<Record<string, Record<string, any>> | null>(null);
    const [batchErrors, setBatchErrors] = useState<Record<string, string>>({});

    // Initialize account ID when modal opens
    useEffect(() => {
        if (showGetPredictionModal && selectedAccountId && !getPredictionAccountId) {
            setGetPredictionAccountId(selectedAccountId);
        }
        if (showBatchPredictionModal && selectedAccountId && !batchAccountId) {
            setBatchAccountId(selectedAccountId);
        }
    }, [showGetPredictionModal, showBatchPredictionModal, selectedAccountId, getPredictionAccountId, batchAccountId]);

    const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const fetchPredictions = useCallback(async () => {
        try {
            const token = localStorage.getItem("auth_token");
            if (!token) {
                setError("Not authenticated");
                return;
            }

            const params = new URLSearchParams();
            if (symbolFilter) params.append("symbol", symbolFilter);
            if (horizonFilter) params.append("horizon", horizonFilter);
            if (verifiedFilter !== "all") {
                params.append("verified_only", verifiedFilter === "verified" ? "true" : "false");
            }
            params.append("limit", limit.toString());
            params.append("offset", offset.toString());

            const response = await fetch(`${apiUrl}/predictions/history?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch predictions: ${response.statusText}`);
            }

            const data: PredictionHistoryResponse = await response.json();
            setPredictions(data.predictions);
            setTotal(data.total);
            setHasMore(data.has_more);
            setError(null);
        } catch (err) {
            console.error("Error fetching predictions:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch predictions");
        } finally {
            setLoading(false);
        }
    }, [symbolFilter, horizonFilter, verifiedFilter, limit, offset, apiUrl]);

    useEffect(() => {
        fetchPredictions();
    }, [fetchPredictions]);

    // Auto-refresh
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            fetchPredictions();
        }, refreshInterval * 1000);

        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval, fetchPredictions]);

    const handlePreviousPage = () => {
        if (offset > 0) {
            setOffset(Math.max(0, offset - limit));
        }
    };

    const handleNextPage = () => {
        if (hasMore) {
            setOffset(offset + limit);
        }
    };

    const formatPrice = (price: string | null) => {
        if (!price) return "N/A";
        // Return the original string to preserve all decimal places exactly as stored
        return price;
    };

    const formatPercent = (percent: string | null) => {
        if (!percent) return "N/A";
        return `${(parseFloat(percent) * 100).toFixed(2)}%`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Parse symbol into coin name and currency
    const parseSymbol = (symbol: string) => {
        // Handle formats like "BTC/USDT", "BTCUSDT", "BTC-USDT"
        const normalized = symbol.replace(/[-_]/g, "/");
        const parts = normalized.split("/");
        if (parts.length === 2) {
            return { coin: parts[0], currency: parts[1] };
        }
        // Try to extract from formats like "BTCUSDT"
        const match = symbol.match(/^([A-Z]+)(USDT|USD|EUR|BTC|ETH)$/i);
        if (match) {
            return { coin: match[1], currency: match[2] };
        }
        return { coin: symbol, currency: "" };
    };

    // Fetch markets for selected account
    useEffect(() => {
        const fetchMarkets = async () => {
            if (!getPredictionAccountId || !showGetPredictionModal) {
                setMarkets([]);
                return;
            }

            try {
                const token = localStorage.getItem("auth_token");
                if (!token) return;

                const response = await fetch(`${apiUrl}/market/pairs/${getPredictionAccountId}/db?active_only=true`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (response.ok) {
                    const data = await response.json();
                    // The endpoint returns {exchange, count, markets: [...]}
                    setMarkets(data.markets || []);
                } else {
                    console.error("Failed to fetch markets:", response.status, response.statusText);
                    setMarkets([]);
                }
            } catch (err) {
                console.error("Error fetching markets:", err);
            }
        };

        if (showGetPredictionModal && getPredictionAccountId) {
            fetchMarkets();
        }
    }, [showGetPredictionModal, getPredictionAccountId, apiUrl]);

    // Handle Get Prediction
    const handleGetPrediction = async () => {
        if (!getPredictionSymbol || !getPredictionAccountId || getPredictionHorizons.length === 0) {
            setGetPredictionError("Please select symbol, account, and at least one horizon");
            return;
        }

        setGetPredictionLoading(true);
        setGetPredictionError(null);
        setGetPredictionResult(null);

        try {
            const token = localStorage.getItem("auth_token");
            if (!token) {
                setGetPredictionError("Not authenticated");
                return;
            }

            const encodedSymbol = encodeURIComponent(getPredictionSymbol);
            const horizonsParam = getPredictionHorizons.join(",");

            const response = await fetch(
                `${apiUrl}/predictions/symbol/${encodedSymbol}?horizons=${horizonsParam}&exchange_account_id=${getPredictionAccountId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Failed to get prediction: ${response.statusText}`);
            }

            const data = await response.json();
            setGetPredictionResult({
                symbol: getPredictionSymbol,
                horizons: getPredictionHorizons,
                exchange_account_id: getPredictionAccountId,
                predictions: data.predictions || {},
            });

            // Refresh predictions list
            fetchPredictions();
        } catch (err) {
            console.error("Error getting prediction:", err);
            setGetPredictionError(err instanceof Error ? err.message : "Failed to get prediction");
        } finally {
            setGetPredictionLoading(false);
        }
    };

    // Handle Batch Predictions
    const handleBatchPredictions = async () => {
        if (!batchAccountId) {
            setBatchErrors({ general: "Please select an exchange account" });
            return;
        }
        if (batchSymbols.length === 0) {
            setBatchErrors({ general: "Please select at least one symbol" });
            return;
        }
        if (batchSymbols.length > 10) {
            setBatchErrors({ general: "Maximum 10 symbols allowed" });
            return;
        }
        if (batchHorizons.length === 0) {
            setBatchErrors({ general: "Please select at least one horizon" });
            return;
        }

        setBatchLoading(true);
        setBatchErrors({});
        setBatchResults(null);

        try {
            const token = localStorage.getItem("auth_token");
            if (!token) {
                setBatchErrors({ general: "Not authenticated" });
                return;
            }

            const response = await fetch(
                `${apiUrl}/predictions/batch?exchange_account_id=${batchAccountId}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        symbols: batchSymbols,
                        horizons: batchHorizons,
                        model_type: batchModelType,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Failed to get batch predictions: ${response.statusText}`);
            }

            const data = await response.json();
            setBatchResults(data.predictions || {});

            // Check for errors in results
            const errors: Record<string, string> = {};
            Object.entries(data.predictions || {}).forEach(([symbol, horizons]: [string, any]) => {
                Object.entries(horizons || {}).forEach(([horizon, pred]: [string, any]) => {
                    if (!pred) {
                        errors[`${symbol}_${horizon}`] = "Prediction failed";
                    }
                });
            });
            setBatchErrors(errors);

            // Refresh predictions list
            fetchPredictions();
        } catch (err) {
            console.error("Error getting batch predictions:", err);
            setBatchErrors({ general: err instanceof Error ? err.message : "Failed to get batch predictions" });
        } finally {
            setBatchLoading(false);
        }
    };


    if (loading && predictions.length === 0) {
        return (
            <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
                <p>Loading predictions...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: "32px", maxWidth: "1600px", margin: "0 auto" }}>
            <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#fff", marginBottom: "8px" }}>
                        Prediction History
                    </h1>
                    <p style={{ color: "#888", fontSize: "16px" }}>
                        View all predictions and their verification status
                    </p>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                    <button
                        onClick={() => setShowFiltersModal(true)}
                        style={{
                            padding: "12px 24px",
                            backgroundColor: "#2a2a2a",
                            color: "#ededed",
                            border: "1px solid #2a2a2a",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "16px",
                            fontWeight: "600",
                            transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#3a3a3a";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#2a2a2a";
                        }}
                    >
                        🔍 Filters
                    </button>
                    <button
                        onClick={() => setShowGetPredictionModal(true)}
                        style={{
                            padding: "12px 24px",
                            backgroundColor: "#FFAE00",
                            color: "#000",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "16px",
                            fontWeight: "600",
                            transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#ffb84d";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#FFAE00";
                        }}
                    >
                        + Get Prediction
                    </button>
                    <button
                        onClick={() => setShowBatchPredictionModal(true)}
                        style={{
                            padding: "12px 24px",
                            backgroundColor: "#6366f1",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "16px",
                            fontWeight: "600",
                            transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#7c3aed";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#6366f1";
                        }}
                    >
                        📊 Batch Predictions
                    </button>
                </div>
            </div>

            {/* Filters Modal */}
            <PredictionFilters
                isOpen={showFiltersModal}
                onClose={() => setShowFiltersModal(false)}
                symbolFilter={symbolFilter}
                setSymbolFilter={setSymbolFilter}
                horizonFilter={horizonFilter}
                setHorizonFilter={setHorizonFilter}
                verifiedFilter={verifiedFilter}
                setVerifiedFilter={setVerifiedFilter}
                limit={limit}
                setLimit={setLimit}
                autoRefresh={autoRefresh}
                setAutoRefresh={setAutoRefresh}
                refreshInterval={refreshInterval}
                setRefreshInterval={setRefreshInterval}
                onRefresh={fetchPredictions}
                onFilterChange={() => setOffset(0)}
            />

            {/* Error */}
            {error && (
                <div
                    style={{
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        borderRadius: "8px",
                        padding: "16px",
                        marginBottom: "24px",
                        color: "#ef4444",
                    }}
                >
                    {error}
                </div>
            )}

            {/* Stats */}
            <PredictionStats total={total} predictions={predictions} />

            {/* Table */}
            <PredictionTable
                predictions={predictions}
                formatDate={formatDate}
                formatPrice={formatPrice}
                formatPercent={formatPercent}
                parseSymbol={parseSymbol}
            />

            {/* Pagination */}
            <PredictionPagination
                offset={offset}
                limit={limit}
                total={total}
                hasMore={hasMore}
                onPrevious={handlePreviousPage}
                onNext={handleNextPage}
            />

            {/* Get Prediction Modal */}
            <GetPredictionModal
                isOpen={showGetPredictionModal}
                onClose={() => {
                    setShowGetPredictionModal(false);
                    setGetPredictionSymbol("");
                    setGetPredictionError(null);
                    setGetPredictionResult(null);
                }}
                accounts={accounts}
                selectedAccountId={selectedAccountId}
                symbol={getPredictionSymbol}
                setSymbol={setGetPredictionSymbol}
                accountId={getPredictionAccountId}
                setAccountId={setGetPredictionAccountId}
                horizons={getPredictionHorizons}
                setHorizons={setGetPredictionHorizons}
                markets={markets}
                loading={getPredictionLoading}
                error={getPredictionError}
                result={getPredictionResult}
                onGetPrediction={handleGetPrediction}
                apiUrl={apiUrl}
            />

            {/* Batch Predictions Modal */}
            {showBatchPredictionModal && (
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
                        zIndex: 1000,
                        padding: "20px",
                    }}
                    onClick={() => {
                        setShowBatchPredictionModal(false);
                        setBatchSymbols([]);
                        setBatchResults(null);
                        setBatchErrors({});
                    }}
                >
                    <div
                        style={{
                            backgroundColor: "#1a1a1a",
                            border: "1px solid #2a2a2a",
                            borderRadius: "12px",
                            padding: "32px",
                            maxWidth: "900px",
                            width: "100%",
                            maxHeight: "90vh",
                            overflowY: "auto",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                            <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#FFAE00" }}>Batch Predictions</h2>
                            <button
                                onClick={() => {
                                    setShowBatchPredictionModal(false);
                                    setBatchSymbols([]);
                                    setBatchResults(null);
                                    setBatchErrors({});
                                }}
                                style={{
                                    backgroundColor: "transparent",
                                    border: "none",
                                    color: "#888",
                                    fontSize: "24px",
                                    cursor: "pointer",
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Form */}
                        <div style={{ marginBottom: "24px" }}>
                            {/* Exchange Account */}
                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888" }}>
                                    Exchange Account *
                                </label>
                                <select
                                    value={batchAccountId || ""}
                                    onChange={(e) => setBatchAccountId(parseInt(e.target.value) || null)}
                                    style={{
                                        width: "100%",
                                        padding: "10px",
                                        backgroundColor: "#1a1a1a",
                                        border: "1px solid #2a2a2a",
                                        borderRadius: "6px",
                                        color: "#fff",
                                        fontSize: "14px",
                                    }}
                                >
                                    <option value="">Select account...</option>
                                    {accounts.map((acc) => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.exchange_name} (ID: {acc.id})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Symbols Selection */}
                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888" }}>
                                    Symbols * (Max 10, Selected: {batchSymbols.length})
                                </label>
                                <div
                                    style={{
                                        maxHeight: "200px",
                                        overflowY: "auto",
                                        padding: "12px",
                                        backgroundColor: "#1a1a1a",
                                        border: "1px solid #2a2a2a",
                                        borderRadius: "6px",
                                    }}
                                >
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "8px" }}>
                                        {markets.map((market) => (
                                            <label
                                                key={market.symbol}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "6px",
                                                    cursor: "pointer",
                                                    padding: "6px",
                                                    borderRadius: "4px",
                                                    backgroundColor: batchSymbols.includes(market.symbol) ? "#FFAE00/20" : "transparent",
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={batchSymbols.includes(market.symbol)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            if (batchSymbols.length < 10) {
                                                                setBatchSymbols([...batchSymbols, market.symbol]);
                                                            }
                                                        } else {
                                                            setBatchSymbols(batchSymbols.filter((s) => s !== market.symbol));
                                                        }
                                                    }}
                                                    disabled={!batchSymbols.includes(market.symbol) && batchSymbols.length >= 10}
                                                />
                                                <span style={{ fontSize: "13px", color: "#fff" }}>{market.symbol}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Horizons Selection */}
                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888" }}>
                                    Horizons *
                                </label>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                    {["10m", "30m", "1h", "4h", "1d"].map((horizon) => (
                                        <label
                                            key={horizon}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                padding: "8px 12px",
                                                backgroundColor: batchHorizons.includes(horizon) ? "#FFAE00/20" : "#1a1a1a",
                                                border: `1px solid ${batchHorizons.includes(horizon) ? "#FFAE00" : "#2a2a2a"}`,
                                                borderRadius: "6px",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={batchHorizons.includes(horizon)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setBatchHorizons([...batchHorizons, horizon]);
                                                    } else {
                                                        setBatchHorizons(batchHorizons.filter((h) => h !== horizon));
                                                    }
                                                }}
                                            />
                                            <span style={{ fontSize: "13px", color: "#fff" }}>{horizon}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Model Type */}
                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888" }}>
                                    Model Type
                                </label>
                                <select
                                    value={batchModelType}
                                    onChange={(e) => setBatchModelType(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "10px",
                                        backgroundColor: "#1a1a1a",
                                        border: "1px solid #2a2a2a",
                                        borderRadius: "6px",
                                        color: "#fff",
                                        fontSize: "14px",
                                    }}
                                >
                                    <option value="ensemble">Ensemble</option>
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
                            {batchErrors.general && (
                                <div
                                    style={{
                                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                                        border: "1px solid rgba(239, 68, 68, 0.3)",
                                        borderRadius: "6px",
                                        padding: "12px",
                                        marginBottom: "16px",
                                        color: "#ef4444",
                                        fontSize: "14px",
                                    }}
                                >
                                    {batchErrors.general}
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                onClick={handleBatchPredictions}
                                disabled={batchLoading}
                                style={{
                                    width: "100%",
                                    padding: "12px",
                                    backgroundColor: batchLoading ? "#666" : "#6366f1",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "6px",
                                    fontSize: "16px",
                                    fontWeight: "600",
                                    cursor: batchLoading ? "not-allowed" : "pointer",
                                }}
                            >
                                {batchLoading ? "Processing..." : "Get Batch Predictions"}
                            </button>
                        </div>

                        {/* Results */}
                        {batchResults && (
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                    <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#FFAE00" }}>Results</h3>
                                    <button
                                        onClick={() => {
                                            // Export to JSON
                                            const jsonBlob = new Blob([JSON.stringify(batchResults, null, 2)], { type: "application/json" });
                                            const url = URL.createObjectURL(jsonBlob);
                                            const a = document.createElement("a");
                                            a.href = url;
                                            a.download = `batch_predictions_${new Date().toISOString().split("T")[0]}.json`;
                                            a.click();
                                            URL.revokeObjectURL(url);
                                        }}
                                        style={{
                                            padding: "8px 16px",
                                            backgroundColor: "#FFAE00",
                                            color: "#000",
                                            border: "none",
                                            borderRadius: "6px",
                                            fontSize: "14px",
                                            fontWeight: "600",
                                            cursor: "pointer",
                                        }}
                                    >
                                        📥 Export JSON
                                    </button>
                                </div>
                                <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                        <thead>
                                            <tr style={{ backgroundColor: "#1a1a1a", borderBottom: "1px solid #2a2a2a" }}>
                                                <th style={{ padding: "12px", textAlign: "left", color: "#fff", fontSize: "14px" }}>Symbol</th>
                                                <th style={{ padding: "12px", textAlign: "left", color: "#fff", fontSize: "14px" }}>Horizon</th>
                                                <th style={{ padding: "12px", textAlign: "right", color: "#fff", fontSize: "14px" }}>Current Price</th>
                                                <th style={{ padding: "12px", textAlign: "right", color: "#fff", fontSize: "14px" }}>Predicted Price</th>
                                                <th style={{ padding: "12px", textAlign: "right", color: "#fff", fontSize: "14px" }}>Change %</th>
                                                <th style={{ padding: "12px", textAlign: "right", color: "#fff", fontSize: "14px" }}>Confidence</th>
                                                <th style={{ padding: "12px", textAlign: "center", color: "#fff", fontSize: "14px" }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(batchResults).map(([symbol, horizons]: [string, any]) =>
                                                Object.entries(horizons || {}).map(([horizon, pred]: [string, any]) => (
                                                    <tr key={`${symbol}_${horizon}`} style={{ borderBottom: "1px solid #2a2a2a" }}>
                                                        <td style={{ padding: "12px", color: "#fff", fontSize: "14px" }}>{symbol}</td>
                                                        <td style={{ padding: "12px", color: "#fff", fontSize: "14px" }}>{horizon}</td>
                                                        {pred ? (
                                                            <>
                                                                <td style={{ padding: "12px", textAlign: "right", color: "#fff", fontSize: "14px" }}>
                                                                    ${pred.current_price?.toFixed(2) || "N/A"}
                                                                </td>
                                                                <td style={{ padding: "12px", textAlign: "right", color: "#fff", fontSize: "14px" }}>
                                                                    ${pred.predicted_price?.toFixed(2) || "N/A"}
                                                                </td>
                                                                <td
                                                                    style={{
                                                                        padding: "12px",
                                                                        textAlign: "right",
                                                                        color: (pred.price_change_percent || 0) >= 0 ? "#00ff00" : "#ff4444",
                                                                        fontSize: "14px",
                                                                    }}
                                                                >
                                                                    {pred.price_change_percent ? `${pred.price_change_percent.toFixed(2)}%` : "N/A"}
                                                                </td>
                                                                <td style={{ padding: "12px", textAlign: "right", color: "#FFAE00", fontSize: "14px" }}>
                                                                    {pred.confidence ? `${(pred.confidence * 100).toFixed(1)}%` : "N/A"}
                                                                </td>
                                                                <td style={{ padding: "12px", textAlign: "center" }}>
                                                                    <span
                                                                        style={{
                                                                            padding: "4px 8px",
                                                                            backgroundColor: "#00ff00/20",
                                                                            color: "#00ff00",
                                                                            borderRadius: "4px",
                                                                            fontSize: "12px",
                                                                        }}
                                                                    >
                                                                        ✅ Success
                                                                    </span>
                                                                </td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td colSpan={4} style={{ padding: "12px", textAlign: "center", color: "#ff4444", fontSize: "14px" }}>
                                                                    Failed
                                                                </td>
                                                                <td style={{ padding: "12px", textAlign: "center" }}>
                                                                    <span
                                                                        style={{
                                                                            padding: "4px 8px",
                                                                            backgroundColor: "#ff4444/20",
                                                                            color: "#ff4444",
                                                                            borderRadius: "4px",
                                                                            fontSize: "12px",
                                                                        }}
                                                                    >
                                                                        ❌ Error
                                                                    </span>
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}


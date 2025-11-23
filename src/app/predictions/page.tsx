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
    const [showFiltersModal, setShowFiltersModal] = useState(false);
    const [getPredictionSymbol, setGetPredictionSymbol] = useState<string>("");
    const [getPredictionAccountId, setGetPredictionAccountId] = useState<number | null>(null);
    const [getPredictionHorizons, setGetPredictionHorizons] = useState<string[]>(["10m", "30m", "1h"]);
    const [getPredictionLoading, setGetPredictionLoading] = useState(false);
    const [getPredictionResult, setGetPredictionResult] = useState<NewPredictionData | null>(null);
    const [getPredictionError, setGetPredictionError] = useState<string | null>(null);
    const [markets, setMarkets] = useState<Array<{ symbol: string; base: string; quote: string }>>([]);

    // Initialize account ID when modal opens
    useEffect(() => {
        if (showGetPredictionModal && selectedAccountId && !getPredictionAccountId) {
            setGetPredictionAccountId(selectedAccountId);
        }
    }, [showGetPredictionModal, selectedAccountId, getPredictionAccountId]);

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
        </div>
    );
}


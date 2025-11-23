"use client";

import { useEffect } from "react";

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

interface PredictionResult {
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

interface GetPredictionModalProps {
    isOpen: boolean;
    onClose: () => void;
    accounts: ExchangeAccount[];
    selectedAccountId: number | null;
    symbol: string;
    setSymbol: (value: string) => void;
    accountId: number | null;
    setAccountId: (value: number | null) => void;
    horizons: string[];
    setHorizons: (value: string[]) => void;
    markets: Market[];
    loading: boolean;
    error: string | null;
    result: PredictionResult | null;
    onGetPrediction: () => void;
    apiUrl: string;
}

export default function GetPredictionModal({
    isOpen,
    onClose,
    accounts,
    selectedAccountId,
    symbol,
    setSymbol,
    accountId,
    setAccountId,
    horizons,
    setHorizons,
    markets,
    loading,
    error,
    result,
    onGetPrediction,
    apiUrl,
}: GetPredictionModalProps) {
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
                    // Markets are passed as prop, so we don't need to set them here
                }
            } catch (err) {
                console.error("Error fetching markets:", err);
            }
        };

        if (isOpen && accountId) {
            fetchMarkets();
        }
    }, [isOpen, accountId, apiUrl]);

    // Initialize account ID when modal opens
    useEffect(() => {
        if (isOpen && selectedAccountId && !accountId) {
            setAccountId(selectedAccountId);
        }
    }, [isOpen, selectedAccountId, accountId, setAccountId]);

    if (!isOpen) return null;

    return (
        <>
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    zIndex: 1000,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
                onClick={onClose}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        backgroundColor: "#1a1a1a",
                        border: "1px solid rgba(255, 174, 0, 0.3)",
                        borderRadius: "12px",
                        padding: "32px",
                        maxWidth: "700px",
                        width: "90%",
                        maxHeight: "90vh",
                        overflowY: "auto",
                        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                        <h2 style={{ color: "#FFAE00", margin: 0, fontSize: "24px", fontWeight: "bold" }}>Get Prediction</h2>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#888",
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

                    {error && (
                        <div
                            style={{
                                padding: "12px",
                                backgroundColor: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                borderRadius: "8px",
                                marginBottom: "20px",
                                color: "#ef4444",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <div style={{ marginBottom: "20px" }}>
                        <label style={{ display: "block", marginBottom: "8px", color: "#ededed", fontSize: "14px", fontWeight: "500" }}>
                            Exchange Account *
                        </label>
                        <select
                            value={accountId || ""}
                            onChange={(e) => {
                                setAccountId(e.target.value ? Number(e.target.value) : null);
                                setSymbol("");
                            }}
                            required
                            style={{
                                width: "100%",
                                padding: "12px",
                                backgroundColor: "#0f0f0f",
                                border: "1px solid #2a2a2a",
                                borderRadius: "8px",
                                color: "#fff",
                                fontSize: "14px",
                                cursor: "pointer",
                            }}
                        >
                            <option value="">Select Account</option>
                            {accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {account.exchange_name.toUpperCase()} {account.is_active ? "(Active)" : "(Inactive)"}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                        <label style={{ display: "block", marginBottom: "8px", color: "#ededed", fontSize: "14px", fontWeight: "500" }}>
                            Symbol *
                        </label>
                        {accountId ? (
                            <select
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value)}
                                required
                                style={{
                                    width: "100%",
                                    padding: "12px",
                                    backgroundColor: "#0f0f0f",
                                    border: "1px solid #2a2a2a",
                                    borderRadius: "8px",
                                    color: "#fff",
                                    fontSize: "14px",
                                    cursor: "pointer",
                                }}
                            >
                                <option value="">Select Symbol</option>
                                {markets.length === 0 ? (
                                    <option value="" disabled>Loading symbols...</option>
                                ) : (
                                    markets.map((market) => (
                                        <option key={market.symbol} value={market.symbol}>
                                            {market.base}/{market.quote} ({market.symbol})
                                        </option>
                                    ))
                                )}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value)}
                                placeholder="e.g., BTC/USDT"
                                required
                                style={{
                                    width: "100%",
                                    padding: "12px",
                                    backgroundColor: "#0f0f0f",
                                    border: "1px solid #2a2a2a",
                                    borderRadius: "8px",
                                    color: "#fff",
                                    fontSize: "14px",
                                }}
                            />
                        )}
                    </div>

                    <div style={{ marginBottom: "24px" }}>
                        <label style={{ display: "block", marginBottom: "8px", color: "#ededed", fontSize: "14px", fontWeight: "500" }}>
                            Horizons *
                        </label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {["10m", "20m", "30m", "1h", "4h", "24h"].map((horizon) => (
                                <label
                                    key={horizon}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "8px 12px",
                                        backgroundColor: horizons.includes(horizon) ? "#FFAE00" : "#0f0f0f",
                                        border: `1px solid ${horizons.includes(horizon) ? "#FFAE00" : "#2a2a2a"}`,
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        color: horizons.includes(horizon) ? "#000" : "#fff",
                                        fontSize: "14px",
                                        fontWeight: horizons.includes(horizon) ? "600" : "400",
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={horizons.includes(horizon)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setHorizons([...horizons, horizon]);
                                            } else {
                                                setHorizons(horizons.filter((h) => h !== horizon));
                                            }
                                        }}
                                        style={{ cursor: "pointer" }}
                                    />
                                    {horizon}
                                </label>
                            ))}
                        </div>
                    </div>

                    {result && (
                        <div
                            style={{
                                backgroundColor: "#0f0f0f",
                                border: "1px solid rgba(255, 174, 0, 0.3)",
                                borderRadius: "8px",
                                padding: "20px",
                                marginBottom: "24px",
                            }}
                        >
                            <h3 style={{ color: "#FFAE00", marginTop: 0, marginBottom: "16px", fontSize: "18px" }}>
                                Prediction Results for {result.symbol}
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {Object.entries(result.predictions).map(([horizon, pred]) => (
                                    <div
                                        key={horizon}
                                        style={{
                                            padding: "12px",
                                            backgroundColor: "#1a1a1a",
                                            borderRadius: "8px",
                                            border: "1px solid #2a2a2a",
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                            <span style={{ color: "#888", fontSize: "12px" }}>Horizon: {horizon}</span>
                                            <span
                                                style={{
                                                    color: pred.price_change_percent >= 0 ? "#10b981" : "#ef4444",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                {pred.price_change_percent >= 0 ? "+" : ""}
                                                {Math.abs(pred.price_change_percent) < 0.01 
                                                    ? pred.price_change_percent.toFixed(4) 
                                                    : pred.price_change_percent.toFixed(2)}%
                                            </span>
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px" }}>
                                            <div>
                                                <span style={{ color: "#888" }}>Current: </span>
                                                <span style={{ color: "#fff" }}>{pred.current_price.toFixed(8)}</span>
                                            </div>
                                            <div>
                                                <span style={{ color: "#888" }}>Predicted: </span>
                                                <span style={{ color: "#FFAE00", fontWeight: "600" }}>{pred.predicted_price.toFixed(8)}</span>
                                            </div>
                                            <div>
                                                <span style={{ color: "#888" }}>Lower: </span>
                                                <span style={{ color: "#ef4444" }}>{pred.lower_bound.toFixed(8)}</span>
                                            </div>
                                            <div>
                                                <span style={{ color: "#888" }}>Upper: </span>
                                                <span style={{ color: "#10b981" }}>{pred.upper_bound.toFixed(8)}</span>
                                            </div>
                                            <div style={{ gridColumn: "1 / -1" }}>
                                                <span style={{ color: "#888" }}>Confidence: </span>
                                                <span style={{ color: "#FFAE00" }}>{(pred.confidence * 100).toFixed(2)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: "12px 24px",
                                backgroundColor: "#2a2a2a",
                                color: "#ededed",
                                border: "1px solid #2a2a2a",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontWeight: "600",
                                fontSize: "14px",
                            }}
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={onGetPrediction}
                            disabled={loading || !symbol || !accountId || horizons.length === 0}
                            style={{
                                padding: "12px 24px",
                                backgroundColor: loading || !symbol || !accountId || horizons.length === 0 ? "#666" : "#FFAE00",
                                color: "#1a1a1a",
                                border: "none",
                                borderRadius: "8px",
                                cursor: loading || !symbol || !accountId || horizons.length === 0 ? "not-allowed" : "pointer",
                                fontWeight: "600",
                                fontSize: "14px",
                            }}
                        >
                            {loading ? "Getting Prediction..." : "Get Prediction"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}


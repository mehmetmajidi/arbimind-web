"use client";

import { useState, useEffect, useCallback } from "react";
import { PriceWidget } from "@/components/market";
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Area } from "recharts";
import { useExchange } from "@/contexts/ExchangeContext";

// Add pulse animation style
if (typeof document !== "undefined") {
    const style = document.createElement("style");
    style.textContent = `
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    `;
    if (!document.head.querySelector('style[data-pulse-animation]')) {
        style.setAttribute('data-pulse-animation', 'true');
        document.head.appendChild(style);
    }
}

interface OHLCVCandle {
    t: number; // timestamp
    o: number; // open
    h: number; // high
    l: number; // low
    c: number; // close
    v: number; // volume
}

interface PredictionData {
    predicted_price: number;
    current_price: number;
    horizon: string;
    confidence: number;
    uncertainty: number;
    price_change_percent: number;
    upper_bound: number;
    lower_bound: number;
}

export default function MarketPage() {
    const { selectedAccountId, accounts } = useExchange();
    const [selectedSymbol, setSelectedSymbol] = useState<string>("");
    const [timeframe, setTimeframe] = useState<string>("1h");
    const [ohlcvData, setOhlcvData] = useState<OHLCVCandle[]>([]);
    const [ohlcvLoading, setOhlcvLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Prediction state
    const [predictions, setPredictions] = useState<Record<string, PredictionData | null>>({});
    const [predictionsLoading, setPredictionsLoading] = useState(false);
    const [showPredictions, setShowPredictions] = useState(true);
    const [selectedHorizons, setSelectedHorizons] = useState<string[]>(["10m", "30m", "1h"]);
    const [accuracyStats, setAccuracyStats] = useState<{
        total_predictions: number;
        avg_error_percent: number;
        accuracy_within_confidence: number;
        avg_confidence: number;
    } | null>(null);
    const [showAccuracyHistory, setShowAccuracyHistory] = useState(false);

    // Fetch OHLCV data
    const fetchOHLCV = useCallback(async () => {
        if (!selectedAccountId || !selectedSymbol) return;

        setOhlcvLoading(true);
        try {
            const token = localStorage.getItem("auth_token") || "";
            if (!token) {
                setError("Please login to view market data");
                setOhlcvLoading(false);
                return;
            }

            const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const encodedSymbol = encodeURIComponent(selectedSymbol);

            const response = await fetch(`${apiUrl}/market/ohlcv/${selectedAccountId}/${encodedSymbol}?timeframe=${timeframe}&limit=100`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setOhlcvData(data.candles || []);
                setError(null);
            } else {
                const errorData = await response.json().catch(() => ({}));
                let errorMsg = errorData.detail || `Failed to fetch OHLCV data (${response.status})`;
                if (response.status === 404) {
                    errorMsg = `OHLCV data not available for ${selectedSymbol}. The symbol may not be supported by this exchange.`;
                }
                if (response.status !== 404) {
                    setError(errorMsg);
                }
            }
        } catch (error) {
            console.error("Error fetching OHLCV:", error);
            setError(`Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setOhlcvLoading(false);
        }
    }, [selectedAccountId, selectedSymbol, timeframe]);

    // Fetch predictions
    const fetchPredictions = useCallback(async () => {
        if (!selectedAccountId || !selectedSymbol || selectedHorizons.length === 0) {
            setPredictions({});
            return;
        }

        setPredictionsLoading(true);
        try {
            const token = localStorage.getItem("auth_token") || "";
            if (!token) return;

            const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const encodedSymbol = encodeURIComponent(selectedSymbol);
            const supportedHorizons = ["10m", "20m", "30m", "1h", "4h", "24h"];
            const validHorizons = selectedHorizons.filter((h) => supportedHorizons.includes(h));
            const horizonsParam = validHorizons.length > 0 ? validHorizons.join(",") : "10m,30m,1h";

            const response = await fetch(`${apiUrl}/predictions/symbol/${encodedSymbol}?horizons=${horizonsParam}&exchange_account_id=${selectedAccountId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                const predictionsData = data.predictions || {};

                const validPredictions: Record<string, PredictionData> = {};
                for (const [horizon, pred] of Object.entries(predictionsData)) {
                    if (pred !== null && pred !== undefined) {
                        validPredictions[horizon] = pred as PredictionData;
                    }
                }

                setPredictions(validPredictions);
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.detail || `Failed to fetch predictions (${response.status})`;
                console.error("Failed to fetch predictions:", response.status, errorMsg);

                if (response.status === 400 || response.status === 503) {
                    setError(`Prediction error: ${errorMsg}`);
                }
            }
        } catch (error) {
            console.error("Error fetching predictions:", error);
        } finally {
            setPredictionsLoading(false);
        }
    }, [selectedAccountId, selectedSymbol, selectedHorizons]);

    // Fetch data when symbol or timeframe changes
    useEffect(() => {
        if (selectedAccountId && selectedSymbol) {
            fetchOHLCV();
        }
    }, [selectedAccountId, selectedSymbol, timeframe, fetchOHLCV]);

    // Fetch predictions when symbol or horizons change
    useEffect(() => {
        if (selectedAccountId && selectedSymbol && showPredictions) {
            fetchPredictions();
        }
    }, [selectedAccountId, selectedSymbol, selectedHorizons, showPredictions, fetchPredictions]);

    // Fetch accuracy stats
    const fetchAccuracyStats = useCallback(async () => {
        try {
            const token = localStorage.getItem("auth_token") || "";
            if (!token) return;

            const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const encodedSymbol = selectedSymbol ? encodeURIComponent(selectedSymbol) : "";
            const response = await fetch(`${apiUrl}/predictions/accuracy/stats?symbol=${encodedSymbol}&days=30`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setAccuracyStats(data);
            }
        } catch (error) {
            console.error("Error fetching accuracy stats:", error);
        }
    }, [selectedSymbol]);

    useEffect(() => {
        if (selectedSymbol) {
            fetchAccuracyStats();
        }
    }, [selectedSymbol, fetchAccuracyStats]);

    if (accounts.length === 0) {
        return (
            <div style={{ padding: "24px", textAlign: "center" }}>
                <h1>Market Data</h1>
                <p style={{ color: "#666", marginTop: "16px" }}>No active exchange accounts found.</p>
                <p style={{ marginTop: "8px" }}>
                    <a href="/settings" style={{ color: "#0070f3", textDecoration: "underline" }}>
                        Add an exchange account
                    </a>{" "}
                    to view market data.
                </p>
            </div>
        );
    }

    return (
        <div style={{ padding: "24px", maxWidth: "1600px", margin: "0 auto", color: "#ededed" }}>
            <h1 style={{ color: "#FFAE00", marginBottom: "24px", fontSize: "32px", fontWeight: "bold" }}>Market Data Dashboard</h1>

            {error && (
                <div
                    style={{
                        padding: "16px",
                        backgroundColor: "rgba(255, 68, 68, 0.15)",
                        border: "2px solid rgba(255, 68, 68, 0.5)",
                        borderRadius: "8px",
                        marginBottom: "24px",
                        color: "#ff4444",
                        fontSize: "14px",
                        fontWeight: "500",
                    }}
                >
                    <strong>⚠️ Error:</strong> {error}
                </div>
            )}

            {/* Price Widget */}
            <div style={{ marginBottom: "32px" }}>
                <PriceWidget
                    onSymbolChange={(symbol) => {
                        setSelectedSymbol(symbol);
                    }}
                    onChartClick={() => {
                        // Scroll to chart or focus on chart
                        const chartElement = document.getElementById("price-chart");
                        if (chartElement) {
                            chartElement.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                    }}
                />
            </div>

            {/* Timeframe Selector */}
            {selectedSymbol && (
                <div style={{ marginBottom: "24px", display: "flex", gap: "12px", alignItems: "center" }}>
                    <label style={{ color: "#FFAE00", fontSize: "14px", fontWeight: "600" }}>Timeframe:</label>
                    <select
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                        style={{
                            padding: "8px 16px",
                            borderRadius: "8px",
                            border: "2px solid rgba(255, 174, 0, 0.3)",
                            backgroundColor: "#1a1a1a",
                            color: "#ededed",
                            fontSize: "14px",
                            cursor: "pointer",
                            outline: "none",
                        }}
                    >
                        <option value="1m">1 Minute</option>
                        <option value="5m">5 Minutes</option>
                        <option value="15m">15 Minutes</option>
                        <option value="1h">1 Hour</option>
                        <option value="4h">4 Hours</option>
                        <option value="1d">1 Day</option>
                    </select>
                </div>
            )}

            {/* OHLCV Chart */}
            {selectedSymbol && (
                <div id="price-chart" style={{ marginBottom: "32px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                        <h2 style={{ margin: 0, color: "#FFAE00", fontSize: "24px", fontWeight: "bold" }}>
                            Price Chart ({timeframe})
                        </h2>
                        <label
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                cursor: "pointer",
                                padding: "8px 16px",
                                backgroundColor: showPredictions ? "rgba(255, 174, 0, 0.15)" : "#2a2a2a",
                                border: `2px solid ${showPredictions ? "#FFAE00" : "rgba(255, 174, 0, 0.2)"}`,
                                borderRadius: "8px",
                                color: showPredictions ? "#FFAE00" : "#888",
                                fontWeight: showPredictions ? "600" : "400",
                                transition: "all 0.2s ease",
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={showPredictions}
                                onChange={(e) => setShowPredictions(e.target.checked)}
                                style={{
                                    width: "18px",
                                    height: "18px",
                                    cursor: "pointer",
                                    accentColor: "#FFAE00",
                                }}
                            />
                            <span>Show Predictions</span>
                        </label>
                    </div>
                    {ohlcvLoading ? (
                        <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
                            <p>Loading chart data...</p>
                        </div>
                    ) : ohlcvData.length > 0 ? (
                        <div style={{ marginTop: "20px" }}>
                            <div style={{ marginBottom: "24px", backgroundColor: "#2a2a2a", padding: "24px", borderRadius: "12px", border: "1px solid rgba(255, 174, 0, 0.2)" }}>
                                <ResponsiveContainer width="100%" height={400}>
                                    <ComposedChart
                                        data={ohlcvData
                                            .slice()
                                            .reverse()
                                            .map((candle) => {
                                                const dataPoint: Record<string, string | number> = {
                                                    time: new Date(candle.t).toLocaleTimeString(),
                                                    timestamp: candle.t,
                                                    open: candle.o,
                                                    high: candle.h,
                                                    low: candle.l,
                                                    close: candle.c,
                                                    volume: candle.v,
                                                };

                                                if (showPredictions && Object.keys(predictions).length > 0) {
                                                    Object.entries(predictions).forEach(([horizon, pred]) => {
                                                        if (pred && pred.predicted_price) {
                                                            dataPoint[`pred_${horizon}`] = pred.predicted_price;
                                                            dataPoint[`pred_${horizon}_upper`] = pred.upper_bound;
                                                            dataPoint[`pred_${horizon}_lower`] = pred.lower_bound;
                                                        }
                                                    });
                                                }

                                                return dataPoint;
                                            })}
                                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="time" angle={-45} textAnchor="end" height={80} interval="preserveStartEnd" />
                                        <YAxis domain={["auto", "auto"]} label={{ value: "Price ($)", angle: -90, position: "insideLeft" }} />
                                        <Tooltip
                                            formatter={(value: number, name: string) => [
                                                `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`,
                                                name.charAt(0).toUpperCase() + name.slice(1).replace("_", " "),
                                            ]}
                                            labelFormatter={(label) => `Time: ${label}`}
                                        />
                                        <Legend />
                                        <Line type="monotone" dataKey="close" stroke="#0070f3" strokeWidth={2} name="Close" dot={false} activeDot={{ r: 6 }} />
                                        <Line type="monotone" dataKey="high" stroke="#22c55e" strokeWidth={1} name="High" dot={false} strokeDasharray="2 2" />
                                        <Line type="monotone" dataKey="low" stroke="#ef4444" strokeWidth={1} name="Low" dot={false} strokeDasharray="2 2" />

                                        {/* Confidence intervals */}
                                        {showPredictions &&
                                            Object.entries(predictions).map(([horizon, pred]) => {
                                                if (!pred || !pred.predicted_price) return null;

                                                const colors: Record<string, string> = {
                                                    "10m": "#f59e0b",
                                                    "20m": "#8b5cf6",
                                                    "30m": "#ec4899",
                                                    "1h": "#06b6d4",
                                                    "4h": "#10b981",
                                                    "24h": "#6366f1",
                                                };

                                                const color = colors[horizon] || "#888";
                                                const opacity = 0.2;

                                                return (
                                                    <Area
                                                        key={`area_${horizon}`}
                                                        type="monotone"
                                                        dataKey={`pred_${horizon}_upper`}
                                                        stroke="none"
                                                        fill={color}
                                                        fillOpacity={opacity}
                                                        name={`${horizon} Upper`}
                                                        hide
                                                    />
                                                );
                                            })}

                                        {/* Prediction lines */}
                                        {showPredictions &&
                                            Object.entries(predictions).map(([horizon, pred]) => {
                                                if (!pred || !pred.predicted_price) return null;

                                                const colors: Record<string, string> = {
                                                    "10m": "#f59e0b",
                                                    "20m": "#8b5cf6",
                                                    "30m": "#ec4899",
                                                    "1h": "#06b6d4",
                                                    "4h": "#10b981",
                                                    "24h": "#6366f1",
                                                };

                                                const color = colors[horizon] || "#888";
                                                const isBuySignal = pred.price_change_percent > 0.005;
                                                const isSellSignal = pred.price_change_percent < -0.005;

                                                return (
                                                    <ReferenceLine
                                                        key={`pred_${horizon}`}
                                                        y={pred.predicted_price}
                                                        stroke={color}
                                                        strokeWidth={2}
                                                        strokeDasharray={isBuySignal || isSellSignal ? "3 3" : "5 5"}
                                                        label={{
                                                            value: `${horizon}: $${pred.predicted_price.toFixed(2)}${isBuySignal ? " 🟢 BUY" : isSellSignal ? " 🔴 SELL" : ""}`,
                                                            position: "right",
                                                        }}
                                                    />
                                                );
                                            })}
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ) : (
                        <p style={{ color: "#666" }}>No chart data available</p>
                    )}
                </div>
            )}

            {/* Prediction Panel */}
            {selectedSymbol && showPredictions && (
                <div style={{ marginBottom: "32px" }}>
                    <h2 style={{ color: "#FFAE00", marginBottom: "20px", fontSize: "24px", fontWeight: "bold" }}>Price Predictions</h2>
                    {predictionsLoading ? (
                        <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
                            <p>Loading predictions...</p>
                        </div>
                    ) : Object.keys(predictions).length > 0 ? (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                                gap: "20px",
                                padding: "20px",
                                backgroundColor: "#2a2a2a",
                                border: "1px solid rgba(255, 174, 0, 0.2)",
                                borderRadius: "12px",
                            }}
                        >
                            {Object.entries(predictions).map(([horizon, pred]) => {
                                if (!pred) return null;

                                const colors: Record<string, string> = {
                                    "10m": "#f59e0b",
                                    "20m": "#8b5cf6",
                                    "30m": "#ec4899",
                                    "1h": "#06b6d4",
                                    "4h": "#10b981",
                                    "24h": "#6366f1",
                                };

                                const color = colors[horizon] || "#888";
                                const changePercent = pred.price_change_percent * 100;
                                const changeColor = changePercent >= 0 ? "green" : "red";

                                return (
                                    <div
                                        key={horizon}
                                        style={{
                                            padding: "16px",
                                            border: `2px solid ${color}`,
                                            borderRadius: "12px",
                                            backgroundColor: "#1a1a1a",
                                            boxShadow: `0 4px 12px rgba(0, 0, 0, 0.3), 0 0 8px ${color}40`,
                                        }}
                                    >
                                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#FFAE00", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>
                                            {horizon}
                                        </div>
                                        <div style={{ fontSize: "24px", fontWeight: "bold", color: color, marginBottom: "8px" }}>
                                            ${pred.predicted_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                                        </div>
                                        <div style={{ fontSize: "14px", fontWeight: "600", color: changeColor === "green" ? "#22c55e" : "#ef4444", marginBottom: "8px" }}>
                                            {changePercent >= 0 ? "↑" : "↓"} {changePercent >= 0 ? "+" : ""}
                                            {changePercent.toFixed(2)}%
                                        </div>
                                        <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>
                                            Confidence: <span style={{ color: "#FFAE00", fontWeight: "600" }}>{(pred.confidence * 100).toFixed(1)}%</span>
                                        </div>
                                        <div style={{ fontSize: "12px", color: "#888", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255, 174, 0, 0.1)" }}>
                                            Range: <span style={{ color: "#ededed" }}>${pred.lower_bound.toFixed(2)}</span> -{" "}
                                            <span style={{ color: "#ededed" }}>${pred.upper_bound.toFixed(2)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ padding: "24px", textAlign: "center", color: "#888", backgroundColor: "#2a2a2a", borderRadius: "12px", border: "1px solid rgba(255, 174, 0, 0.2)" }}>
                            <p>No predictions available</p>
                        </div>
                    )}

                    {/* Horizon selector */}
                    <div style={{ marginTop: "20px", padding: "20px", backgroundColor: "#2a2a2a", borderRadius: "12px", border: "1px solid rgba(255, 174, 0, 0.2)" }}>
                        <div style={{ fontSize: "15px", fontWeight: "600", marginBottom: "12px", color: "#FFAE00" }}>Select Horizons:</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                            {["10m", "20m", "30m", "1h", "4h", "24h"].map((h) => (
                                <label
                                    key={h}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        cursor: "pointer",
                                        padding: "8px 16px",
                                        backgroundColor: selectedHorizons.includes(h) ? "rgba(255, 174, 0, 0.15)" : "#1a1a1a",
                                        border: `2px solid ${selectedHorizons.includes(h) ? "#FFAE00" : "rgba(255, 174, 0, 0.2)"}`,
                                        borderRadius: "8px",
                                        color: selectedHorizons.includes(h) ? "#FFAE00" : "#888",
                                        fontWeight: selectedHorizons.includes(h) ? "600" : "400",
                                        transition: "all 0.2s ease",
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedHorizons.includes(h)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedHorizons([...selectedHorizons, h]);
                                            } else {
                                                setSelectedHorizons(selectedHorizons.filter((hor) => hor !== h));
                                            }
                                        }}
                                        style={{
                                            width: "18px",
                                            height: "18px",
                                            cursor: "pointer",
                                            accentColor: "#FFAE00",
                                        }}
                                    />
                                    <span>{h}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Accuracy Stats */}
                    {accuracyStats && accuracyStats.total_predictions > 0 && (
                        <div style={{ marginTop: "20px", padding: "20px", backgroundColor: "#2a2a2a", border: "1px solid rgba(255, 174, 0, 0.2)", borderRadius: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "bold", color: "#FFAE00" }}>Prediction Accuracy (Last 30 Days)</h3>
                                <button
                                    onClick={() => setShowAccuracyHistory(!showAccuracyHistory)}
                                    style={{
                                        padding: "8px 16px",
                                        backgroundColor: showAccuracyHistory ? "#FFAE00" : "#1a1a1a",
                                        color: showAccuracyHistory ? "#1a1a1a" : "#FFAE00",
                                        border: `2px solid ${showAccuracyHistory ? "#FFAE00" : "rgba(255, 174, 0, 0.3)"}`,
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        transition: "all 0.2s ease",
                                    }}
                                >
                                    {showAccuracyHistory ? "Hide" : "Show"} History
                                </button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" }}>
                                <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px", border: "1px solid rgba(255, 174, 0, 0.1)" }}>
                                    <div style={{ fontSize: "13px", color: "#888", marginBottom: "8px", fontWeight: "500" }}>Total Predictions</div>
                                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#FFAE00" }}>{accuracyStats.total_predictions}</div>
                                </div>
                                <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px", border: "1px solid rgba(255, 174, 0, 0.1)" }}>
                                    <div style={{ fontSize: "13px", color: "#888", marginBottom: "8px", fontWeight: "500" }}>Avg Error</div>
                                    <div
                                        style={{
                                            fontSize: "24px",
                                            fontWeight: "bold",
                                            color: accuracyStats.avg_error_percent < 5 ? "#22c55e" : accuracyStats.avg_error_percent < 10 ? "#f59e0b" : "#ef4444",
                                        }}
                                    >
                                        {accuracyStats.avg_error_percent.toFixed(2)}%
                                    </div>
                                </div>
                                <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px", border: "1px solid rgba(255, 174, 0, 0.1)" }}>
                                    <div style={{ fontSize: "13px", color: "#888", marginBottom: "8px", fontWeight: "500" }}>Within Confidence</div>
                                    <div
                                        style={{
                                            fontSize: "24px",
                                            fontWeight: "bold",
                                            color: accuracyStats.accuracy_within_confidence > 70 ? "#22c55e" : accuracyStats.accuracy_within_confidence > 50 ? "#f59e0b" : "#ef4444",
                                        }}
                                    >
                                        {accuracyStats.accuracy_within_confidence.toFixed(1)}%
                                    </div>
                                </div>
                                <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px", border: "1px solid rgba(255, 174, 0, 0.1)" }}>
                                    <div style={{ fontSize: "13px", color: "#888", marginBottom: "8px", fontWeight: "500" }}>Avg Confidence</div>
                                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#FFAE00" }}>{(accuracyStats.avg_confidence * 100).toFixed(1)}%</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!selectedSymbol && (
                <div style={{ padding: "24px", textAlign: "center", color: "#666" }}>
                    Select a trading pair from the widget above to view market data.
                </div>
            )}
        </div>
    );
}

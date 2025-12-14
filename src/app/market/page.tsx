"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PriceWidget, MainChart, OrderPanel } from "@/components/market";
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
    
    // Load from localStorage on mount
    const [selectedSymbol, setSelectedSymbol] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("market_selectedSymbol") || "";
        }
        return "";
    });
    const [timeframe, setTimeframe] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("market_timeframe") || "1h";
        }
        return "1h";
    });
    const [selectedHorizons, setSelectedHorizons] = useState<string[]>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("market_selectedHorizons");
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch {
                    return ["10m", "30m", "1h"];
                }
            }
        }
        return ["10m", "30m", "1h"];
    });
    
    const [ohlcvData, setOhlcvData] = useState<OHLCVCandle[]>([]);
    const [ohlcvLoading, setOhlcvLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [currentPriceTime, setCurrentPriceTime] = useState<number | null>(null);
    const [oldestTimestamp, setOldestTimestamp] = useState<number | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);

    // Prediction state
    const [predictions, setPredictions] = useState<Record<string, PredictionData | null>>({});
    const [predictionsLoading, setPredictionsLoading] = useState(false);
    const [showPredictions, setShowPredictions] = useState(true);
    const isCheckingRef = useRef(false);
    const [accuracyStats, setAccuracyStats] = useState<{
        total_predictions: number;
        avg_error_percent: number;
        accuracy_within_confidence: number;
        avg_confidence: number;
    } | null>(null);
    const [showAccuracyHistory, setShowAccuracyHistory] = useState(false);
    
    // Save to localStorage when values change
    useEffect(() => {
        if (typeof window !== "undefined") {
            if (selectedSymbol) {
                localStorage.setItem("market_selectedSymbol", selectedSymbol);
            }
        }
    }, [selectedSymbol]);
    
    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("market_timeframe", timeframe);
        }
    }, [timeframe]);
    
    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("market_selectedHorizons", JSON.stringify(selectedHorizons));
        }
    }, [selectedHorizons]);

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

            // Load 100 candles initially - can load more on scroll
            const response = await fetch(`${apiUrl}/market/ohlcv/${selectedAccountId}/${encodedSymbol}?timeframe=${timeframe}&limit=100`, {
                headers: { Authorization: `Bearer ${token}` },
                // Add cache control for faster subsequent loads
                cache: "no-cache",
            });

            if (response.ok) {
                const data = await response.json();
                const candles = data.candles || [];
                console.log("OHLCV data received:", {
                    count: candles.length,
                    firstCandle: candles[0],
                    lastCandle: candles[candles.length - 1],
                });
                
                // Sort candles by timestamp to ensure oldest is first
                const sortedCandles = [...candles].sort((a, b) => {
                    const timeA = a.t > 1000000000000 ? a.t / 1000 : a.t;
                    const timeB = b.t > 1000000000000 ? b.t / 1000 : b.t;
                    return timeA - timeB;
                });
                
                setOhlcvData(sortedCandles);
                // Store oldest timestamp for pagination (first candle after sorting)
                if (sortedCandles.length > 0) {
                    const oldest = sortedCandles[0].t;
                    const oldestTime = oldest > 1000000000000 ? oldest / 1000 : oldest;
                    setOldestTimestamp(oldestTime);
                    console.log("Oldest timestamp set to:", oldestTime);
                }
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

    // Removed auto-check to prevent rate limit issues
    // Users must click "Get Predict" button to fetch predictions

    // Fetch predictions (with loading state - called when "Get Predict" is clicked)
    const fetchPredictions = useCallback(async () => {
        if (!selectedAccountId || !selectedSymbol || selectedHorizons.length === 0) {
            setPredictions({});
            return;
        }

        // Prevent multiple simultaneous requests
        if (isCheckingRef.current) {
            return;
        }

        isCheckingRef.current = true;
        setPredictionsLoading(true);
        setError(null); // Clear any previous errors
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
                setError(null);
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.detail || `Failed to fetch predictions (${response.status})`;
                console.error("Failed to fetch predictions:", response.status, errorMsg);

                if (response.status === 400 || response.status === 503) {
                    setError(`Prediction error: ${errorMsg}`);
                } else if (response.status === 429) {
                    setError("Rate limit exceeded. Please wait a moment and try again.");
                }
            }
        } catch (error) {
            console.error("Error fetching predictions:", error);
            setError(`Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setPredictionsLoading(false);
            isCheckingRef.current = false;
        }
    }, [selectedAccountId, selectedSymbol, selectedHorizons]);

    // Fetch more historical data (pagination)
    const fetchMoreOHLCV = useCallback(async (beforeTimestamp: number) => {
        if (!selectedAccountId || !selectedSymbol || loadingMore) return;

        setLoadingMore(true);
        try {
            const token = localStorage.getItem("auth_token") || "";
            if (!token) {
                setLoadingMore(false);
                return;
            }

            const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const encodedSymbol = encodeURIComponent(selectedSymbol);
            
            // Convert to milliseconds if needed
            // Use 'since' parameter to fetch candles before the oldest timestamp
            // Calculate timeframe duration in milliseconds
            const timeframeMs: Record<string, number> = {
                "1m": 60 * 1000,
                "5m": 5 * 60 * 1000,
                "15m": 15 * 60 * 1000,
                "1h": 60 * 60 * 1000,
                "4h": 4 * 60 * 60 * 1000,
                "1d": 24 * 60 * 60 * 1000,
            };
            
            const timeframeDuration = timeframeMs[timeframe] || 60 * 60 * 1000;
            // Calculate start time: go back 100 candles from oldest timestamp
            // beforeTimestamp is in seconds, convert to milliseconds
            const beforeTimestampMs = beforeTimestamp > 1000000000000 ? beforeTimestamp : beforeTimestamp * 1000;
            // Go back 100 candles worth of time
            const sinceMs = beforeTimestampMs - (100 * timeframeDuration);
            
            console.log("FetchMore params:", {
                beforeTimestamp,
                beforeTimestampMs,
                timeframeDuration,
                sinceMs,
                timeframe,
            });

            const response = await fetch(`${apiUrl}/market/ohlcv/${selectedAccountId}/${encodedSymbol}?timeframe=${timeframe}&limit=100&since=${sinceMs}`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-cache",
            });

            if (response.ok) {
                const data = await response.json();
                const newCandles = data.candles || [];
                console.log("FetchMore response:", {
                    newCandlesCount: newCandles.length,
                    firstCandle: newCandles[0],
                    lastCandle: newCandles[newCandles.length - 1],
                });
                
                if (newCandles.length > 0) {
                    // Sort new candles by timestamp
                    const sortedNewCandles = [...newCandles].sort((a, b) => {
                        const timeA = a.t > 1000000000000 ? a.t / 1000 : a.t;
                        const timeB = b.t > 1000000000000 ? b.t / 1000 : b.t;
                        return timeA - timeB;
                    });
                    
                    // Prepend new candles to existing data (oldest first)
                    setOhlcvData((prevData) => {
                        // Merge and sort by timestamp
                        const merged = [...sortedNewCandles, ...prevData];
                        merged.sort((a, b) => {
                            const timeA = a.t > 1000000000000 ? a.t / 1000 : a.t;
                            const timeB = b.t > 1000000000000 ? b.t / 1000 : b.t;
                            return timeA - timeB;
                        });
                        // Remove duplicates based on timestamp
                        const unique = merged.filter((candle, index, self) => {
                            const time = candle.t > 1000000000000 ? candle.t / 1000 : candle.t;
                            return index === self.findIndex((c) => {
                                const cTime = c.t > 1000000000000 ? c.t / 1000 : c.t;
                                return cTime === time;
                            });
                        });
                        console.log("Merged candles:", {
                            before: prevData.length,
                            new: sortedNewCandles.length,
                            after: unique.length,
                        });
                        return unique;
                    });
                    // Update oldest timestamp to the oldest candle in new data
                    const oldest = sortedNewCandles[0].t;
                    const oldestTime = oldest > 1000000000000 ? oldest / 1000 : oldest;
                    setOldestTimestamp(oldestTime);
                    console.log("✅ Loaded more candles. New oldest timestamp:", oldestTime, "New candles:", sortedNewCandles.length);
                } else {
                    // No more data available
                    console.log("⚠️ No more historical data available");
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error("Failed to fetch more OHLCV:", response.status, errorData);
            }
        } catch (error) {
            console.error("Error fetching more OHLCV:", error);
        } finally {
            setLoadingMore(false);
        }
    }, [selectedAccountId, selectedSymbol, timeframe, loadingMore]);

    // Fetch data when symbol or timeframe changes
    useEffect(() => {
        if (selectedAccountId && selectedSymbol) {
            fetchOHLCV();
            // Reset predictions state when symbol changes - don't auto-check, just show "Get Predict" button
            setPredictions({});
            setError(null);
            setOldestTimestamp(null);
        }
    }, [selectedAccountId, selectedSymbol, timeframe, fetchOHLCV]);

    // When horizons change, clear predictions if we have any
    useEffect(() => {
        if (selectedAccountId && selectedSymbol && Object.keys(predictions).length > 0) {
            setPredictions({});
        }
    }, [selectedHorizons]);

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
        <div style={{ padding: "0 16px", maxWidth: "1600px", margin: "0 auto", color: "#ededed" }}>

            {error && (
                <div
                    style={{
                        padding: "16px",
                        backgroundColor: "rgba(255, 68, 68, 0.15)",
                        border: "2px solid rgba(255, 68, 68, 0.5)",
                        borderRadius: "8px",
                        marginBottom: "8px",
                        color: "#ff4444",
                        fontSize: "14px",
                        fontWeight: "500",
                    }}
                >
                    <strong>⚠️ Error:</strong> {error}
                </div>
            )}

            {/* Price Widget */}
            <div style={{ marginBottom: "8px", marginTop: "16px" }}>
                <PriceWidget
                    onSymbolChange={(symbol) => {
                        setSelectedSymbol(symbol);
                    }}
                    onChartClick={() => {
                        // Scroll to chart or focus on chart
                        const chartElement = document.getElementById("main-chart");
                        if (chartElement) {
                            chartElement.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                    }}
                    onPriceUpdate={(price, timestamp) => {
                        console.log("💰 Price update received:", { price, timestamp, ohlcvDataLength: ohlcvData.length });
                        setCurrentPrice(price);
                        setCurrentPriceTime(timestamp);
                        
                        // Update the last candle with the new live price, or create a new candle if timeframe changed
                        if (price && timestamp && ohlcvData.length > 0) {
                            console.log("📊 Updating candle with price:", price, "timestamp:", timestamp);
                            setOhlcvData((prevData) => {
                                const updated = [...prevData];
                                const lastCandle = updated[updated.length - 1];
                                
                                // Check if this price update is for the current candle timeframe
                                // lastCandle.t is the open time (start) of the candle in milliseconds
                                const candleOpenTime = lastCandle.t > 1000000000000 ? lastCandle.t / 1000 : lastCandle.t;
                                const updateTime = timestamp > 1000000000000 ? timestamp / 1000 : timestamp;
                                
                                // Calculate timeframe duration in seconds
                                const timeframeSeconds: Record<string, number> = {
                                    "1m": 60,
                                    "5m": 300,
                                    "15m": 900,
                                    "1h": 3600,
                                    "4h": 14400,
                                    "1d": 86400,
                                };
                                
                                const timeframeDuration = timeframeSeconds[timeframe] || 3600;
                                // Calculate the start time of the candle that contains candleOpenTime
                                const lastCandleStartTime = Math.floor(candleOpenTime / timeframeDuration) * timeframeDuration;
                                // Calculate the start time of the candle that should contain updateTime
                                const updateCandleStartTime = Math.floor(updateTime / timeframeDuration) * timeframeDuration;
                                
                                // If within the same candle timeframe, update the last candle
                                if (lastCandleStartTime === updateCandleStartTime) {
                                    // Real-time update: update close, high, and low without creating new candle
                                    // IMPORTANT: Create a new object to trigger React state update
                                    const updatedLastCandle: OHLCVCandle = {
                                        ...lastCandle,
                                        c: price, // Update close price (real-time)
                                        h: Math.max(lastCandle.h, price), // Update high if needed (real-time)
                                        l: Math.min(lastCandle.l, price), // Update low if needed (real-time)
                                        // Note: Open (o) remains unchanged - it's the opening price of the candle
                                    };
                                    
                                    // Replace the last candle with the updated one
                                    updated[updated.length - 1] = updatedLastCandle;
                                    console.log("✅ Last candle updated:", {
                                        old: { c: lastCandle.c, h: lastCandle.h, l: lastCandle.l },
                                        new: { c: updatedLastCandle.c, h: updatedLastCandle.h, l: updatedLastCandle.l }
                                    });
                                } else {
                                    console.log("🆕 New candle timeframe started, creating new candle");
                                    // New timeframe started - create missing candles for all timeframes between last and current
                                    // Start from the next timeframe after the last candle
                                    let currentCandleStartTime = lastCandleStartTime + timeframeDuration;
                                    
                                    // Use the last candle's close price as the starting price for intermediate candles
                                    let previousClosePrice = lastCandle.c;
                                    
                                    // Create all missing candles up to (but not including) the current timeframe
                                    while (currentCandleStartTime < updateCandleStartTime) {
                                        const intermediateCandleTimestamp = currentCandleStartTime * 1000; // Convert to milliseconds
                                        
                                        // Create intermediate candle with previous close as open/close (no price movement data)
                                        const intermediateCandle: OHLCVCandle = {
                                            t: intermediateCandleTimestamp,
                                            o: previousClosePrice, // Open = previous close
                                            h: previousClosePrice, // High = previous close (no data)
                                            l: previousClosePrice, // Low = previous close (no data)
                                            c: previousClosePrice, // Close = previous close
                                            v: 0, // Volume = 0
                                        };
                                        
                                        updated.push(intermediateCandle);
                                        previousClosePrice = intermediateCandle.c; // Use this candle's close for next
                                        currentCandleStartTime += timeframeDuration;
                                    }
                                    
                                    // Now create the current timeframe candle with live price
                                    const newCandleTimestamp = updateCandleStartTime * 1000; // Convert to milliseconds
                                    
                                    // Create new candle with current price as open, high, low, and close
                                    const newCandle: OHLCVCandle = {
                                        t: newCandleTimestamp,
                                        o: price, // Open price = current price
                                        h: price, // High = current price (will be updated as price changes)
                                        l: price, // Low = current price (will be updated as price changes)
                                        c: price, // Close = current price
                                        v: 0, // Volume starts at 0 (we don't have real-time volume)
                                    };
                                    
                                    updated.push(newCandle);
                                }
                                
                                return updated;
                            });
                        }
                    }}
                />
            </div>

            {/* Main Chart and Predictions Side by Side */}
            <div id="main-chart" style={{ marginBottom: "8px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                {/* Main Chart - Left Side */}
                <div style={{ flex: "1", minWidth: "0" }}>
                {selectedSymbol ? (
                    <MainChart
                        ohlcvData={ohlcvData}
                        predictions={predictions}
                        timeframe={timeframe}
                        onTimeframeChange={setTimeframe}
                        selectedHorizons={selectedHorizons}
                        onHorizonToggle={(horizon) => {
                            if (selectedHorizons.includes(horizon)) {
                                setSelectedHorizons(selectedHorizons.filter((h) => h !== horizon));
                            } else {
                                setSelectedHorizons([...selectedHorizons, horizon]);
                            }
                        }}
                        loading={ohlcvLoading}
                        currentPrice={currentPrice}
                        currentPriceTime={currentPriceTime}
                        onLoadMore={(beforeTimestamp) => fetchMoreOHLCV(beforeTimestamp)}
                        oldestTimestamp={oldestTimestamp}
                        loadingMore={loadingMore}
                    />
                ) : (
                    <div
                        style={{
                                width: "100%",
                            backgroundColor: "#1a1a1a",
                            borderRadius: "12px",
                            padding: "40px",
                            border: "1px solid rgba(255, 174, 0, 0.2)",
                            textAlign: "center",
                            color: "#888",
                        }}
                    >
                        <p>Select a trading pair from the widget above to view the chart.</p>
                    </div>
                )}
            </div>

                {/* Right Side Panel */}
                {selectedSymbol && (
                    <div style={{ width: "320px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                        {/* Order Panel */}
                        <OrderPanel 
                            selectedSymbol={selectedSymbol}
                            currentPrice={currentPrice}
                        />

                        {/* Predictions Table */}
                        {showPredictions && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {/* Predictions Table */}
                                <div style={{ 
                                    backgroundColor: "#1a1a1a", 
                                    borderRadius: "12px", 
                                    padding: "12px",
                                    border: "1px solid rgba(255, 174, 0, 0.2)",
                                }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                <h3 style={{ color: "#FFAE00", margin: 0, fontSize: "14px", fontWeight: "600" }}>
                                    Price Predictions
                                </h3>
                                <button
                                    onClick={fetchPredictions}
                                    disabled={predictionsLoading}
                                    title="Refresh predictions"
                                    style={{
                                        padding: "4px 8px",
                                        backgroundColor: "transparent",
                                        color: "#FFAE00",
                                        border: "1px solid rgba(255, 174, 0, 0.3)",
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                        cursor: predictionsLoading ? "not-allowed" : "pointer",
                                        opacity: predictionsLoading ? 0.5 : 1,
                                        transition: "all 0.2s ease",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!predictionsLoading) {
                                            e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.1)";
                                            e.currentTarget.style.borderColor = "#FFAE00";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!predictionsLoading) {
                                            e.currentTarget.style.backgroundColor = "transparent";
                                            e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.3)";
                                        }
                                    }}
                                >
                                    <span style={{ fontSize: "14px" }}>↻</span>
                                </button>
                            </div>
                    {predictionsLoading ? (
                                <div style={{ padding: "16px", textAlign: "center", color: "#888", fontSize: "12px" }}>
                                    Loading...
                        </div>
                    ) : Object.keys(predictions).length > 0 ? (
                                <div style={{ overflowX: "auto" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                                        <thead>
                                            <tr style={{ borderBottom: "1px solid rgba(255, 174, 0, 0.2)" }}>
                                                <th style={{ padding: "6px 4px", textAlign: "left", color: "#888", fontWeight: "600", fontSize: "10px" }}>Horizon</th>
                                                <th style={{ padding: "6px 4px", textAlign: "right", color: "#888", fontWeight: "600", fontSize: "10px" }}>Price</th>
                                                <th style={{ padding: "6px 4px", textAlign: "right", color: "#888", fontWeight: "600", fontSize: "10px" }}>Change</th>
                                                <th style={{ padding: "6px 4px", textAlign: "right", color: "#888", fontWeight: "600", fontSize: "10px" }}>Conf</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(predictions)
                                                .sort(([a], [b]) => {
                                                    const order: Record<string, number> = { "10m": 1, "20m": 2, "30m": 3, "1h": 4, "4h": 5, "24h": 6 };
                                                    return (order[a] || 99) - (order[b] || 99);
                                                })
                                                .map(([horizon, pred]) => {
                                if (!pred) return null;
                                const changePercent = pred.price_change_percent * 100;
                                                    const changeColor = changePercent >= 0 ? "#22c55e" : "#ef4444";

                                return (
                                                        <tr 
                                        key={horizon}
                                                            style={{ 
                                                                borderBottom: "1px solid rgba(255, 174, 0, 0.1)",
                                                                transition: "background-color 0.2s",
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.05)";
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = "transparent";
                                                            }}
                                                        >
                                                            <td style={{ padding: "8px 4px", color: "#FFAE00", fontWeight: "600", fontSize: "10px" }}>
                                                                {horizon.toUpperCase()}
                                                            </td>
                                                            <td style={{ padding: "8px 4px", textAlign: "right", color: "#ededed", fontSize: "11px" }}>
                                                                ${pred.predicted_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 10 })}
                                                            </td>
                                                            <td style={{ padding: "8px 4px", textAlign: "right", color: changeColor, fontWeight: "600", fontSize: "11px" }}>
                                                                {changePercent >= 0 ? "↑" : "↓"} {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(2)}%
                                                            </td>
                                                            <td style={{ padding: "8px 4px", textAlign: "right", color: "#888", fontSize: "10px" }}>
                                                                {(pred.confidence * 100).toFixed(0)}%
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={{ padding: "16px", textAlign: "center" }}>
                                    <p style={{ color: "#888", marginBottom: "12px", fontSize: "11px" }}>No predictions</p>
                                    <button
                                        onClick={fetchPredictions}
                                        disabled={predictionsLoading}
                                        style={{
                                            padding: "8px 16px",
                                            backgroundColor: "#FFAE00",
                                            color: "#1a1a1a",
                                            border: "none",
                                            borderRadius: "6px",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            cursor: predictionsLoading ? "not-allowed" : "pointer",
                                            opacity: predictionsLoading ? 0.6 : 1,
                                            transition: "all 0.2s ease",
                                            width: "100%",
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!predictionsLoading) {
                                                e.currentTarget.style.backgroundColor = "#ffb833";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!predictionsLoading) {
                                                e.currentTarget.style.backgroundColor = "#FFAE00";
                                            }
                                        }}
                                    >
                                        {predictionsLoading ? "Generating..." : "Get Predict"}
                                    </button>
                        </div>
                    )}
                                </div>

                                {/* Horizon selector - Compact version */}
                                {/* <div style={{ 
                            padding: "12px",
                            backgroundColor: "#1a1a1a",
                            borderRadius: "12px",
                            border: "1px solid rgba(255, 174, 0, 0.2)",
                        }}>
                            <div style={{ color: "#FFAE00", marginBottom: "8px", fontSize: "12px", fontWeight: "600" }}>
                                AI Horizons:
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {["10m", "20m", "30m", "1h", "4h", "24h"].map((h) => (
                                <label
                                    key={h}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                            gap: "4px",
                                        cursor: "pointer",
                                            padding: "4px 8px",
                                            backgroundColor: selectedHorizons.includes(h) ? "rgba(255, 174, 0, 0.15)" : "#2a2a2a",
                                            border: `1px solid ${selectedHorizons.includes(h) ? "#FFAE00" : "rgba(255, 174, 0, 0.2)"}`,
                                            borderRadius: "4px",
                                        color: selectedHorizons.includes(h) ? "#FFAE00" : "#888",
                                        fontWeight: selectedHorizons.includes(h) ? "600" : "400",
                                            fontSize: "10px",
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
                                                width: "12px",
                                                height: "12px",
                                            cursor: "pointer",
                                            accentColor: "#FFAE00",
                                        }}
                                    />
                                    <span>{h}</span>
                                </label>
                            ))}
                        </div>
                        </div> */}
                                
                                {/* Accuracy Stats - Below Predictions Table */}
                                <div style={{ 
                            marginTop: "12px",
                            padding: "12px",
                            backgroundColor: "#1a1a1a",
                            borderRadius: "12px",
                            border: "1px solid rgba(255, 174, 0, 0.2)",
                        }}>
                            <h4 style={{ color: "#FFAE00", margin: "0 0 12px 0", fontSize: "12px", fontWeight: "600" }}>
                                Accuracy Stats (30d)
                            </h4>
                            {accuracyStats && accuracyStats.total_predictions > 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255, 174, 0, 0.1)" }}>
                                        <span style={{ fontSize: "10px", color: "#888" }}>Total</span>
                                        <span style={{ fontSize: "11px", fontWeight: "600", color: "#FFAE00" }}>{accuracyStats.total_predictions}</span>
                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255, 174, 0, 0.1)" }}>
                                        <span style={{ fontSize: "10px", color: "#888" }}>Avg Error</span>
                                        <span
                                    style={{
                                                fontSize: "11px",
                                        fontWeight: "600",
                                            color: accuracyStats.avg_error_percent < 5 ? "#22c55e" : accuracyStats.avg_error_percent < 10 ? "#f59e0b" : "#ef4444",
                                        }}
                                    >
                                        {accuracyStats.avg_error_percent.toFixed(2)}%
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255, 174, 0, 0.1)" }}>
                                        <span style={{ fontSize: "10px", color: "#888" }}>In Confidence</span>
                                        <span
                                        style={{
                                                fontSize: "11px",
                                                fontWeight: "600",
                                            color: accuracyStats.accuracy_within_confidence > 70 ? "#22c55e" : accuracyStats.accuracy_within_confidence > 50 ? "#f59e0b" : "#ef4444",
                                        }}
                                    >
                                        {accuracyStats.accuracy_within_confidence.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
                                        <span style={{ fontSize: "10px", color: "#888" }}>Avg Conf</span>
                                        <span style={{ fontSize: "11px", fontWeight: "600", color: "#FFAE00" }}>
                                            {(accuracyStats.avg_confidence * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ padding: "8px 0", textAlign: "center" }}>
                                    <span style={{ fontSize: "10px", color: "#888" }}>No data available</span>
                                </div>
                            )}
                                </div>
                            </div>
                        )}
                        </div>
                    )}
                </div>

            {!selectedSymbol && (
                <div style={{ padding: "24px", textAlign: "center", color: "#666" }}>
                    Select a trading pair from the widget above to view market data.
                </div>
            )}
        </div>
    );
}

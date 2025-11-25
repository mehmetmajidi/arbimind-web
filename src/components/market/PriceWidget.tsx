"use client";

import { useState, useEffect, useCallback } from "react";
import { useExchange } from "@/contexts/ExchangeContext";

interface Market {
    symbol: string;
    base: string;
    quote: string;
    active: boolean;
}

interface PriceData {
    symbol: string;
    price: number;
    bid: number;
    ask: number;
    high: number;
    low: number;
    volume: number;
    timestamp: number;
    datetime: string;
}

interface PriceWidgetProps {
    onSymbolChange?: (symbol: string) => void;
    onChartClick?: () => void;
}

export default function PriceWidget({ onSymbolChange, onChartClick }: PriceWidgetProps) {
    const { selectedAccountId, accounts } = useExchange();
    const [markets, setMarkets] = useState<Market[]>([]);
    const [selectedSymbol, setSelectedSymbol] = useState<string>("");
    const [priceData, setPriceData] = useState<PriceData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [priceChange24h, setPriceChange24h] = useState<number>(0);
    const [isRealTime, setIsRealTime] = useState(true);
    const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
    const [wsStatus, setWsStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
    const [currencyFilter, setCurrencyFilter] = useState<string>("");

    // Calculate 24h change from OHLCV data
    const calculate24hChange = useCallback(async () => {
        if (!selectedAccountId || !selectedSymbol || !priceData) return;

        try {
            const token = localStorage.getItem("auth_token") || "";
            if (!token) return;

            const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const encodedSymbol = encodeURIComponent(selectedSymbol);

            // Fetch 24h of 1h candles to get the price 24h ago
            const response = await fetch(`${apiUrl}/market/ohlcv/${selectedAccountId}/${encodedSymbol}?timeframe=1h&limit=24`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                const candles = data.candles || [];
                
                if (candles.length > 0) {
                    // Get the first candle (oldest) and current price
                    const oldestCandle = candles[candles.length - 1]; // Last in array is oldest
                    const price24hAgo = oldestCandle.o; // Open price of oldest candle
                    const currentPrice = priceData.price;
                    
                    if (price24hAgo > 0) {
                        const change = ((currentPrice - price24hAgo) / price24hAgo) * 100;
                        setPriceChange24h(change);
                    }
                }
            }
        } catch (error) {
            console.error("Error calculating 24h change:", error);
        }
    }, [selectedAccountId, selectedSymbol, priceData]);

    // Fetch markets
    useEffect(() => {
        if (!selectedAccountId) {
            setMarkets([]);
            setSelectedSymbol("");
            return;
        }

        const fetchMarkets = async () => {
            try {
                const token = localStorage.getItem("auth_token") || "";
                if (!token) {
                    setError("Please login to view market data");
                    return;
                }

                const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                // Use /db endpoint to get symbols from database instead of exchange API
                const response = await fetch(`${apiUrl}/market/pairs/${selectedAccountId}/db?active_only=true`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (response.ok) {
                    const data = await response.json();
                    const marketsList = data.markets || [];
                    setMarkets(marketsList);
                    setError(null);

                    // Auto-select first symbol if available
                    if (marketsList.length > 0 && selectedSymbol === "") {
                        setSelectedSymbol(marketsList[0].symbol);
                    }
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || `Failed to load trading pairs (${response.status})`);
                }
            } catch (error) {
                console.error("Error fetching markets:", error);
                setError(`Failed to load trading pairs: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        };

        fetchMarkets();
    }, [selectedAccountId, selectedSymbol]);

    // Fetch price data
    const fetchPrice = async () => {
        if (!selectedAccountId || !selectedSymbol) return;

        setLoading(true);
        try {
            const token = localStorage.getItem("auth_token") || "";
            if (!token) {
                setError("Please login to view market data");
                setLoading(false);
                return;
            }

            const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const encodedSymbol = encodeURIComponent(selectedSymbol);

            const response = await fetch(`${apiUrl}/market/price/${selectedAccountId}/${encodedSymbol}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setPriceData(data);
                setError(null);
            } else {
                const errorData = await response.json().catch(() => ({}));
                setError(errorData.detail || `Failed to fetch price (${response.status})`);
            }
        } catch (error) {
            console.error("Error fetching price:", error);
            setError(`Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setLoading(false);
        }
    };

    // Fetch initial price when symbol changes (only if WebSocket is not active)
    useEffect(() => {
        if (selectedAccountId && selectedSymbol) {
            if (!isRealTime) {
                fetchPrice();
                const interval = setInterval(fetchPrice, 5000); // Refresh every 5 seconds
                return () => clearInterval(interval);
            } else {
                // If WebSocket is enabled, fetch initial price once
                fetchPrice();
            }
        }
    }, [selectedAccountId, selectedSymbol, isRealTime]);

    // Calculate 24h change when price data changes
    useEffect(() => {
        if (priceData && selectedAccountId && selectedSymbol) {
            calculate24hChange();
        }
    }, [priceData, selectedAccountId, selectedSymbol, calculate24hChange]);

    // WebSocket for real-time updates
    useEffect(() => {
        if (!isRealTime || !selectedAccountId || !selectedSymbol) {
            if (wsConnection) {
                wsConnection.close();
                setWsConnection(null);
                setWsStatus("disconnected");
            }
            return;
        }

        const token = localStorage.getItem("auth_token");
        if (!token) return;

        const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const encodedSymbol = encodeURIComponent(selectedSymbol);
        const wsUrl = apiUrl.replace("http://", "ws://").replace("https://", "wss://");
        const wsEndpoint = `${wsUrl}/ws/price/${selectedAccountId}/${encodedSymbol}?token=${token}&interval=5`;

        setWsStatus("connecting");
        const ws = new WebSocket(wsEndpoint);

        ws.onopen = () => {
            console.log("WebSocket connected for", selectedSymbol);
            setWsStatus("connected");
            setWsConnection(ws);
            setLoading(false);
            setError(null);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("WebSocket message received:", data);
                if (data.type === "price_update" && data.data) {
                    setPriceData(data.data);
                    setLoading(false);
                    setError(null);
                } else if (data.type === "error") {
                    setError(data.message || "WebSocket error");
                    setWsStatus("disconnected");
                }
            } catch (error) {
                console.error("Error parsing WebSocket message:", error);
                setError("Error parsing WebSocket message");
            }
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            setWsStatus("disconnected");
            setError("WebSocket connection error");
            setLoading(false);
        };

        ws.onclose = (event) => {
            console.log("WebSocket closed:", event.code, event.reason);
            setWsStatus("disconnected");
            setWsConnection(null);
            // If not a normal closure, try to reconnect after a delay
            if (event.code !== 1000 && isRealTime) {
                setTimeout(() => {
                    if (isRealTime && selectedAccountId && selectedSymbol) {
                        // Trigger reconnection by updating dependency
                        setWsStatus("connecting");
                    }
                }, 3000);
            }
        };

        setWsConnection(ws);

        return () => {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
        };
    }, [isRealTime, selectedAccountId, selectedSymbol]);

    const handleSymbolChange = (symbol: string) => {
        setSelectedSymbol(symbol);
        if (onSymbolChange) {
            onSymbolChange(symbol);
        }
    };

    const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId);
    const accountName = selectedAccount ? `${selectedAccount.exchange_name} Account ${selectedAccount.id}` : "No Account";

    const isPositive = priceChange24h >= 0;
    const changeColor = isPositive ? "#22c55e" : "#ef4444";

    // Get unique quote currencies from markets
    const uniqueCurrencies = Array.from(new Set(markets.map((m) => m.quote).filter(Boolean))).sort();

    // Filter markets by currency (quote currency)
    const filteredMarkets = currencyFilter
        ? markets.filter((market) => market.quote.toLowerCase() === currencyFilter.toLowerCase())
        : markets;

    // Reset selected symbol if it's not in filtered list
    useEffect(() => {
        if (selectedSymbol && !filteredMarkets.find((m) => m.symbol === selectedSymbol)) {
            setSelectedSymbol("");
        }
    }, [currencyFilter, filteredMarkets, selectedSymbol]);

    return (
        <div
            style={{
                backgroundColor: "#1a1a1a",
                borderRadius: "12px",
                padding: "20px",
                border: "1px solid rgba(255, 174, 0, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "24px",
                flexWrap: "wrap",
            }}
        >
            {/* Left Side: Trading Pair and Account */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "250px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <select
                        value={selectedSymbol}
                        onChange={(e) => handleSymbolChange(e.target.value)}
                        disabled={!selectedAccountId || filteredMarkets.length === 0}
                        style={{
                            backgroundColor: "transparent",
                            border: "none",
                            color: "#ffffff",
                            fontSize: "20px",
                            fontWeight: "600",
                            cursor: "pointer",
                            outline: "none",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            flex: 1,
                        }}
                        onMouseEnter={(e) => {
                            if (selectedAccountId && filteredMarkets.length > 0) {
                                e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.1)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                        }}
                    >
                        {filteredMarkets.length === 0 ? (
                            <option value="" style={{ backgroundColor: "#1a1a1a", color: "#888" }}>
                                No symbols found
                            </option>
                        ) : (
                            filteredMarkets.map((market) => (
                                <option key={market.symbol} value={market.symbol} style={{ backgroundColor: "#1a1a1a", color: "#ffffff" }}>
                                    {market.symbol}
                                </option>
                            ))
                        )}
                    </select>
                    <span style={{ color: "#888", fontSize: "14px" }}>▼</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <select
                        value={currencyFilter}
                        onChange={(e) => {
                            setCurrencyFilter(e.target.value);
                        }}
                        style={{
                            backgroundColor: "#2a2a2a",
                            border: "1px solid rgba(255, 174, 0, 0.3)",
                            color: "#ffffff",
                            fontSize: "14px",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            outline: "none",
                            cursor: "pointer",
                            flex: 1,
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = "#FFAE00";
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.3)";
                        }}
                    >
                        <option value="" style={{ backgroundColor: "#1a1a1a", color: "#ffffff" }}>
                            All Currencies
                        </option>
                        {uniqueCurrencies.map((currency) => (
                            <option key={currency} value={currency} style={{ backgroundColor: "#1a1a1a", color: "#ffffff" }}>
                                {currency}
                            </option>
                        ))}
                    </select>
                </div>
                <div style={{ color: "#888", fontSize: "12px" }}>{accountName}</div>
            </div>

            {/* Center-Left: Current Price and Change */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: "200px" }}>
                {loading ? (
                    <div style={{ color: "#888", fontSize: "14px" }}>Loading...</div>
                ) : priceData ? (
                    <>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
                            <div style={{ fontSize: "32px", fontWeight: "bold", color: changeColor }}>
                                ${priceData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                            </div>
                            <div
                                style={{
                                    fontSize: "14px",
                                    color: changeColor,
                                    fontWeight: "500",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                }}
                            >
                                <span>{isPositive ? "+" : ""}{priceChange24h.toFixed(2)}%</span>
                                <span style={{ fontSize: "12px", color: "#888" }}>24H</span>
                            </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                            {onChartClick && (
                                <button
                                    onClick={onChartClick}
                                    style={{
                                        backgroundColor: "rgba(255, 174, 0, 0.1)",
                                        border: "1px solid rgba(255, 174, 0, 0.3)",
                                        borderRadius: "6px",
                                        padding: "4px 8px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.2)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.1)";
                                    }}
                                >
                                    <span style={{ fontSize: "12px", color: "#FFAE00" }}>📊</span>
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <div style={{ color: "#888", fontSize: "14px" }}>No price data</div>
                )}
            </div>

            {/* Center-Right: 24h Market Data */}
            <div style={{ display: "flex", gap: "24px", minWidth: "250px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ color: "#888", fontSize: "12px" }}>24h High</div>
                    {priceData ? (
                        <div style={{ color: "#ffffff", fontSize: "16px", fontWeight: "500" }}>
                            {priceData.high.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </div>
                    ) : (
                        <div style={{ color: "#888", fontSize: "14px" }}>-</div>
                    )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ color: "#888", fontSize: "12px" }}>24h Low</div>
                    {priceData ? (
                        <div style={{ color: "#ffffff", fontSize: "16px", fontWeight: "500" }}>
                            {priceData.low.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </div>
                    ) : (
                        <div style={{ color: "#888", fontSize: "14px" }}>-</div>
                    )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ color: "#888", fontSize: "12px" }}>Bid</div>
                    {priceData ? (
                        <div style={{ color: "#ffffff", fontSize: "16px", fontWeight: "500" }}>
                            {priceData.bid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                        </div>
                    ) : (
                        <div style={{ color: "#888", fontSize: "14px" }}>-</div>
                    )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ color: "#888", fontSize: "12px" }}>Ask</div>
                    {priceData ? (
                        <div style={{ color: "#ffffff", fontSize: "16px", fontWeight: "500" }}>
                            {priceData.ask.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                        </div>
                    ) : (
                        <div style={{ color: "#888", fontSize: "14px" }}>-</div>
                    )}
                </div>
            </div>

            {/* Right Side: Real-time Connection Status */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "150px" }}>
                <div
                    style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: wsStatus === "connected" ? "#22c55e" : wsStatus === "connecting" ? "#FFAE00" : "#888",
                        animation: wsStatus === "connecting" ? "pulse 2s infinite" : "none",
                    }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <div style={{ color: "#ffffff", fontSize: "12px", fontWeight: "500" }}>Real-time</div>
                    <div
                        style={{
                            color: wsStatus === "connected" ? "#22c55e" : wsStatus === "connecting" ? "#FFAE00" : "#888",
                            fontSize: "12px",
                            fontWeight: "500",
                        }}
                    >
                        {wsStatus === "connected" ? "Connected" : wsStatus === "connecting" ? "Connecting..." : "Disconnected"}
                    </div>
                </div>
            </div>

            {error && (
                <div style={{ width: "100%", color: "#ef4444", fontSize: "12px", marginTop: "8px" }}>
                    {error}
                </div>
            )}
        </div>
    );
}


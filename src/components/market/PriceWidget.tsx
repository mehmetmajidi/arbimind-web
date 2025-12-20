"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useExchange } from "@/contexts/ExchangeContext";
import SymbolSelector from "./SymbolSelector";

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
    onPriceUpdate?: (price: number | null, timestamp: number | null) => void;
    onConnectionStatusChange?: (status: "disconnected" | "connecting" | "connected") => void;
}

export default function PriceWidget({ onSymbolChange, onChartClick, onPriceUpdate, onConnectionStatusChange }: PriceWidgetProps) {
    const { selectedAccountId, accounts } = useExchange();
    const [selectedSymbol, setSelectedSymbol] = useState<string>("");
    const [priceData, setPriceData] = useState<PriceData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [priceChange24h, setPriceChange24h] = useState<number>(0);
    const [isRealTime, setIsRealTime] = useState(true);
    const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
    const [wsStatus, setWsStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
    const [reconnectTrigger, setReconnectTrigger] = useState(0);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    
    // Use refs to avoid stale closures
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const shouldReconnectRef = useRef(true);
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    
    // Notify parent of connection status changes
    useEffect(() => {
        if (onConnectionStatusChange) {
            onConnectionStatusChange(wsStatus);
        }
    }, [wsStatus, onConnectionStatusChange]);

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

    // Reset selected symbol when account changes
    useEffect(() => {
        if (!selectedAccountId) {
            setSelectedSymbol("");
            if (onSymbolChange) {
                onSymbolChange("");
            }
        }
    }, [selectedAccountId, onSymbolChange]);

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
                // Notify parent component of price update
                if (onPriceUpdate) {
                    onPriceUpdate(data.price, data.timestamp || Date.now());
                }
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

    // WebSocket for real-time updates with improved connection handling
    useEffect(() => {
        if (!isRealTime || !selectedAccountId || !selectedSymbol) {
            // Clean up existing connection
            if (wsRef.current) {
                shouldReconnectRef.current = false;
                if (pingIntervalRef.current) {
                    clearInterval(pingIntervalRef.current);
                    pingIntervalRef.current = null;
                }
                wsRef.current.close();
                wsRef.current = null;
                setWsConnection(null);
                setWsStatus("disconnected");
            }
            return;
        }

        const token = localStorage.getItem("auth_token");
        if (!token) return;

        // Close existing connection if symbol changed
        if (wsRef.current) {
            shouldReconnectRef.current = false;
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = null;
            }
            wsRef.current.close();
            wsRef.current = null;
        }

        // Reset reconnection attempts when starting a new connection
        reconnectAttemptsRef.current = 0;
        setReconnectAttempts(0);
        shouldReconnectRef.current = true;

        const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const encodedSymbol = encodeURIComponent(selectedSymbol);
        const wsUrl = apiUrl.replace("http://", "ws://").replace("https://", "wss://");
        // Reduce interval to 3 seconds for faster updates
        const wsEndpoint = `${wsUrl}/ws/price/${selectedAccountId}/${encodedSymbol}?token=${token}&interval=3`;

        setWsStatus("connecting");
        console.log("🔌 Connecting to WebSocket:", wsEndpoint);
        const ws = new WebSocket(wsEndpoint);
        wsRef.current = ws;
        
        let connectionTimeout: NodeJS.Timeout | null = null;
        let reconnectTimeout: NodeJS.Timeout | null = null;
        
        // Set connection timeout
        connectionTimeout = setTimeout(() => {
            if (ws.readyState === WebSocket.CONNECTING) {
                console.warn("⚠️ WebSocket connection timeout after 5 seconds");
                ws.close();
                setWsStatus("disconnected");
                setError("Connection timeout - retrying...");
                
                // Trigger reconnection after timeout (max 10 attempts)
                if (shouldReconnectRef.current && isRealTime && selectedAccountId && selectedSymbol && reconnectAttemptsRef.current < 10) {
                    reconnectAttemptsRef.current += 1;
                    reconnectTimeout = setTimeout(() => {
                        if (shouldReconnectRef.current && isRealTime && selectedAccountId && selectedSymbol) {
                            console.log(`🔄 Attempting to reconnect after timeout... (attempt ${reconnectAttemptsRef.current}/10)`);
                            setReconnectAttempts(reconnectAttemptsRef.current);
                            setReconnectTrigger(prev => prev + 1);
                        }
                    }, 2000);
                } else if (reconnectAttemptsRef.current >= 10) {
                    setError("Failed to connect after 10 attempts. Please refresh the page.");
                }
            }
        }, 5000); // 5 second timeout

        ws.onopen = () => {
            console.log("✅ WebSocket connected for", selectedSymbol, "Endpoint:", wsEndpoint);
            if (connectionTimeout) {
                clearTimeout(connectionTimeout);
            }
            setWsStatus("connected");
            setWsConnection(ws);
            setLoading(false);
            // Clear any error messages on successful connection
            setError(null);
            reconnectAttemptsRef.current = 0; // Reset reconnection attempts on successful connection
            setReconnectAttempts(0);
            
            // Start ping/pong to keep connection alive
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
            }
            pingIntervalRef.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    try {
                        ws.send("ping");
                    } catch (error) {
                        console.error("Error sending ping:", error);
                        // If ping fails, connection might be dead - clear interval
                        if (pingIntervalRef.current) {
                            clearInterval(pingIntervalRef.current);
                            pingIntervalRef.current = null;
                        }
                    }
                } else {
                    // Connection is not open, clear interval
                    if (pingIntervalRef.current) {
                        clearInterval(pingIntervalRef.current);
                        pingIntervalRef.current = null;
                    }
                }
            }, 30000); // Send ping every 30 seconds
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("WebSocket message received:", data);
                if (data.type === "price_update" && data.data) {
                    console.log("Price update received:", {
                        symbol: data.symbol,
                        price: data.data.price,
                        timestamp: data.timestamp
                    });
                    setPriceData(data.data);
                    setLoading(false);
                    setError(null);
                    // Notify parent component of price update
                    if (onPriceUpdate) {
                        onPriceUpdate(data.data.price, data.data.timestamp || Date.now());
                    }
                } else if (data.type === "connected") {
                    console.log("✅ WebSocket connection confirmed:", data.message);
                    // Connection is confirmed, make sure status is set to connected
                    setWsStatus("connected");
                    setError(null);
                } else if (data.type === "pong") {
                    // Ping/pong response - connection is alive
                    console.debug("WebSocket pong received");
                } else if (data.type === "error") {
                    console.error("WebSocket error message:", data.message);
                    // Don't disconnect on error - just show the error message
                    // Connection will remain active and worker will retry
                    const errorMsg = data.message || "WebSocket error";
                    // Only show error if it's not a "not found" error (those are expected)
                    if (!errorMsg.toLowerCase().includes("not found") && !errorMsg.toLowerCase().includes("ticker data not found")) {
                        setError(errorMsg);
                    } else {
                        // For "not found" errors, just log and clear any previous errors
                        console.warn("Symbol not found on exchange, but connection remains active");
                        setError(null);
                    }
                    // Don't change status to disconnected - keep connection alive
                } else {
                    console.log("Unknown WebSocket message type:", data.type);
                }
            } catch (error) {
                console.error("Error parsing WebSocket message:", error, "Raw data:", event.data);
                setError("Error parsing WebSocket message");
            }
        };

        ws.onerror = (error) => {
            console.error("❌ WebSocket error:", error);
            if (connectionTimeout) {
                clearTimeout(connectionTimeout);
            }
            // Don't set error message here - onclose will handle it
            // The error event doesn't provide much info, wait for onclose
        };

        ws.onclose = (event) => {
            if (connectionTimeout) {
                clearTimeout(connectionTimeout);
            }
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = null;
            }
            console.log("🔌 WebSocket closed:", event.code, event.reason || "No reason provided");
            setWsStatus("disconnected");
            setWsConnection(null);
            wsRef.current = null;
            
            // Auto-reconnect if not a normal closure and still should be connected
            // Code 1000 = normal closure (intentional disconnect)
            // Code 1008 = policy violation (auth error, etc.)
            // Code 1006 = abnormal closure (connection lost, no close frame)
            if (shouldReconnectRef.current && event.code !== 1000 && isRealTime && selectedAccountId && selectedSymbol) {
                // Don't reconnect on auth errors (1008) - user needs to fix auth
                if (event.code === 1008) {
                    setError(`Authentication failed: ${event.reason || "Invalid token"}`);
                    reconnectAttemptsRef.current = 0;
                    setReconnectAttempts(0);
                    shouldReconnectRef.current = false; // Stop reconnecting
                    return;
                }
                
                // Wait a bit before reconnecting (max 10 attempts)
                if (reconnectAttemptsRef.current < 10) {
                    reconnectAttemptsRef.current += 1;
                    // Only show error message if this is not the first reconnect attempt
                    if (reconnectAttemptsRef.current > 1) {
                        setError(`Connection lost. Reconnecting... (attempt ${reconnectAttemptsRef.current}/10)`);
                    }
                    // Exponential backoff: 2s, 4s, 8s, etc. (max 10s)
                    const delay = Math.min(2000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000);
                    reconnectTimeout = setTimeout(() => {
                        // Check if we should still reconnect (conditions might have changed)
                        if (shouldReconnectRef.current && isRealTime && selectedAccountId && selectedSymbol) {
                            console.log(`🔄 Attempting to reconnect WebSocket... (attempt ${reconnectAttemptsRef.current}/10, delay: ${delay}ms)`);
                            setReconnectAttempts(reconnectAttemptsRef.current);
                            // Trigger reconnection by incrementing reconnectTrigger - this will cause useEffect to run again
                            setReconnectTrigger(prev => prev + 1);
                        }
                    }, delay);
                } else {
                    setError("Failed to connect after 10 attempts. Please refresh the page or check your connection.");
                    shouldReconnectRef.current = false; // Stop reconnecting after max attempts
                }
            } else if (event.code === 1000) {
                // Normal closure - clear any errors and reset attempts
                setError(null);
                reconnectAttemptsRef.current = 0;
                setReconnectAttempts(0);
            } else if (!shouldReconnectRef.current) {
                // Manual disconnect - clear errors
                setError(null);
                reconnectAttemptsRef.current = 0;
                setReconnectAttempts(0);
            }
        };

        return () => {
            shouldReconnectRef.current = false; // Prevent reconnection on cleanup
            if (connectionTimeout) {
                clearTimeout(connectionTimeout);
            }
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = null;
            }
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
            wsRef.current = null;
            setWsConnection(null);
        };
    }, [isRealTime, selectedAccountId, selectedSymbol, reconnectTrigger]);

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
                <SymbolSelector
                    accountId={selectedAccountId}
                    selectedSymbol={selectedSymbol}
                    onSymbolChange={handleSymbolChange}
                    disabled={!selectedAccountId}
                />
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
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "150px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                {reconnectAttempts > 0 && wsStatus !== "connected" && (
                    <div style={{ marginTop: "4px", fontSize: "11px", opacity: 0.8, color: "#888" }}>
                        Reconnecting... (attempt {reconnectAttempts}/10)
                    </div>
                )}
            </div>

            {error && (
                <div style={{ width: "100%", color: "#ef4444", fontSize: "12px", marginTop: "8px" }}>
                    {error}
                </div>
            )}
        </div>
    );
}


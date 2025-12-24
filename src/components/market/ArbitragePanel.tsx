"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MdRefresh, MdTrendingUp, MdTrendingDown } from "react-icons/md";
import { useExchange } from "@/contexts/ExchangeContext";

interface ArbitrageData {
    symbol: string;
    exchanges: {
        exchange_account_id: number;
        exchange_name: string;
        price: number | null;
        price_change_24h: number | null;
        high_24h: number | null;
        low_24h: number | null;
        volume_24h: number | null;
        available: boolean;
        error?: string;
    }[];
}

interface ArbitragePanelProps {
    selectedSymbol: string;
}

export default function ArbitragePanel({ selectedSymbol }: ArbitragePanelProps) {
    const { selectedAccountId, accounts } = useExchange();
    const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
    const selectedExchangeName = selectedAccount?.exchange_name?.toLowerCase() || "";
    const [arbitrageData, setArbitrageData] = useState<ArbitrageData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [wsStatus, setWsStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const shouldReconnectRef = useRef(true);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const fetchArbitrageData = useCallback(async () => {
        if (!selectedSymbol) {
            setArbitrageData(null);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("auth_token") || "";
            if (!token) {
                setError("Please login to view arbitrage data");
                setLoading(false);
                return;
            }

            const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const encodedSymbol = encodeURIComponent(selectedSymbol);
            
            const response = await fetch(`${apiUrl}/market/arbitrage/${encodedSymbol}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Failed to fetch arbitrage data:", response.status, errorText);
                setError(`Failed to fetch arbitrage data: ${response.status}`);
                setLoading(false);
                return;
            }

            const data: ArbitrageData = await response.json();
            setArbitrageData(data);
        } catch (err) {
            console.error("Error fetching arbitrage data:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch arbitrage data");
        } finally {
            setLoading(false);
        }
    }, [selectedSymbol]);

    // Helper function to setup WebSocket with all event handlers
    const setupWebSocket = (symbol: string, token: string) => {
        const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const encodedSymbol = encodeURIComponent(symbol);
        const wsUrl = apiUrl.replace("http://", "ws://").replace("https://", "wss://");
        const wsEndpoint = `${wsUrl}/ws/arbitrage/${encodedSymbol}?token=${encodeURIComponent(token)}`;

        setWsStatus("connecting");
        console.log("🔌 Connecting to Arbitrage WebSocket:", wsEndpoint);
        const ws = new WebSocket(wsEndpoint);
        wsRef.current = ws;
        
        // Clear any existing timeout
        if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
        }

        ws.onopen = () => {
            if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
                connectionTimeoutRef.current = null;
            }
            console.log("✅ Arbitrage WebSocket connected for", symbol);
            setWsStatus("connected");
            reconnectAttemptsRef.current = 0;
            
            // Send ping every 60 seconds to keep connection alive
            const pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send("ping");
                } else {
                    clearInterval(pingInterval);
                }
            }, 60000);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === "connected") {
                    console.log("✅ Arbitrage WebSocket connection confirmed:", data.message);
                } else if (data.type === "arbitrage_update") {
                    setArbitrageData(data.data);
                } else if (data.type === "pong") {
                    console.debug("Arbitrage WebSocket pong received");
                } else if (data.type === "error") {
                    console.error("Arbitrage WebSocket error message:", data.message);
                    setError(data.message || "WebSocket error");
                } else {
                    console.log("Unknown Arbitrage WebSocket message type:", data.type);
                }
            } catch (error) {
                console.error("Error parsing Arbitrage WebSocket message:", error, "Raw data:", event.data);
                setError("Error parsing WebSocket message");
            }
        };

        ws.onerror = (error) => {
            const ws = error.target as WebSocket;
            if (ws.readyState === WebSocket.CLOSED) {
                console.debug("Arbitrage WebSocket connection failed (this may be expected for invalid symbols)");
            } else {
                console.error("❌ Arbitrage WebSocket error:", error);
            }
            setWsStatus("disconnected");
        };

        ws.onclose = (event) => {
            if (event.code !== 1000 && event.code !== 1001) {
                console.log("🔌 Arbitrage WebSocket closed:", event.code, event.reason || "No reason provided");
            }
            setWsStatus("disconnected");
            
            if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
                connectionTimeoutRef.current = null;
            }
            
            if (!isValidSymbol(symbol)) {
                console.warn(`⚠️ Not reconnecting WebSocket for invalid symbol: ${symbol}`);
                shouldReconnectRef.current = false;
                return;
            }
            
            if (shouldReconnectRef.current && 
                event.code !== 1008 && 
                event.code !== 1002 &&
                event.code !== 1003 &&
                event.code !== 1007 &&
                reconnectAttemptsRef.current < 5) {
                reconnectAttemptsRef.current += 1;
                const delay = Math.min(2000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
                
                reconnectTimeoutRef.current = setTimeout(() => {
                    if (!shouldReconnectRef.current || !symbol) return;
                    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) return;
                    
                    console.log(`🔄 Attempting to reconnect Arbitrage WebSocket... (attempt ${reconnectAttemptsRef.current}/5, delay: ${delay}ms)`);
                    const currentToken = localStorage.getItem("auth_token");
                    if (currentToken) {
                        setupWebSocket(symbol, currentToken);
                    }
                }, delay);
            } else if (reconnectAttemptsRef.current >= 5) {
                console.warn("⚠️ Max reconnection attempts (5) reached. Stopping reconnection attempts.");
                setError("Failed to connect after 5 attempts. Please refresh the page.");
                shouldReconnectRef.current = false;
            }
        };

        connectionTimeoutRef.current = setTimeout(() => {
            if (ws.readyState === WebSocket.CONNECTING) {
                console.warn("⚠️ Arbitrage WebSocket connection timeout after 5 seconds");
                ws.close();
            }
        }, 5000);
    };

    // Helper function to validate symbol
    const isValidSymbol = (symbol: string): boolean => {
        if (!symbol || symbol.trim().length === 0) return false;
        // Check if symbol contains invalid patterns
        if (symbol.includes(':')) {
            const parts = symbol.split(':');
            if (parts.length > 1) {
                // Check if it's a malformed symbol like "00/USD:USD"
                const lastPart = parts[parts.length - 1];
                const symbolPart = parts[0];
                if (symbolPart.includes('/')) {
                    const [base, quote] = symbolPart.split('/');
                    if (lastPart === quote) {
                        return false; // Invalid pattern like "BASE/QUOTE:QUOTE"
                    }
                }
            }
        }
        // Check if symbol is too short or contains only numbers
        if (symbol.length < 3) return false;
        // Check if it's a valid format (should contain /)
        if (!symbol.includes('/')) return false;
        // Check if base and quote are different
        const [base, quote] = symbol.split('/');
        if (!base || !quote || base === quote) return false;
        return true;
    };

    // WebSocket for real-time updates
    useEffect(() => {
        if (!selectedSymbol) {
            // Clean up existing connection
            if (wsRef.current) {
                shouldReconnectRef.current = false;
                wsRef.current.close();
                wsRef.current = null;
                setWsStatus("disconnected");
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            return;
        }

        // Validate symbol before attempting WebSocket connection
        if (!isValidSymbol(selectedSymbol)) {
            console.warn(`⚠️ Skipping WebSocket connection for invalid symbol: ${selectedSymbol}`);
            if (wsRef.current) {
                shouldReconnectRef.current = false;
                wsRef.current.close();
                wsRef.current = null;
            }
            setWsStatus("disconnected");
            return;
        }

        const token = localStorage.getItem("auth_token");
        if (!token) return;

        // Don't reconnect if already connected or connecting
        if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
            return;
        }

        // Close existing connection if symbol changed
        if (wsRef.current) {
            shouldReconnectRef.current = false;
            wsRef.current.close();
            wsRef.current = null;
        }

        // Reset reconnection attempts when starting a new connection
        reconnectAttemptsRef.current = 0;
        shouldReconnectRef.current = true;

        // Use helper function to setup WebSocket
        setupWebSocket(selectedSymbol, token);

        return () => {
            shouldReconnectRef.current = false;
            if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
                connectionTimeoutRef.current = null;
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
                wsRef.current.close();
            }
            wsRef.current = null;
        };
    }, [selectedSymbol]); // Removed reconnectKey to prevent re-renders that close connections

    // Fetch initial data when symbol changes (before WebSocket connects)
    useEffect(() => {
        fetchArbitrageData();
    }, [fetchArbitrageData]);

    const formatPrice = (price: number | null): string => {
        if (price === null || price === undefined) return "N/A";
        if (price === 0) return "0.00";
        if (price >= 1) {
            return price.toFixed(2);
        }
        // For small numbers, show more decimals
        return price.toFixed(8).replace(/\.?0+$/, '');
    };

    const formatPercentage = (percentage: number | null): string => {
        if (percentage === null || percentage === undefined) return "N/A";
        const sign = percentage >= 0 ? "+" : "";
        return `${sign}${percentage.toFixed(2)}%`;
    };

    if (!selectedSymbol) {
        return null;
    }

    // Filter and sort exchanges - only show available ones, sorted by price (highest first)
    const sortedExchanges = arbitrageData?.exchanges
        ? arbitrageData.exchanges
            .filter(exchange => exchange.available && exchange.price !== null && exchange.price > 0)
            .sort((a, b) => {
                if (a.price === null && b.price === null) return 0;
                if (a.price === null) return 1;
                if (b.price === null) return -1;
                return b.price - a.price; // Sort descending (highest first)
            })
        : [];

    // Find the highest price
    const highestPrice = sortedExchanges.length > 0 && sortedExchanges[0].price !== null
        ? sortedExchanges[0].price
        : null;

    // Check if coin exists only in selected exchange
    const isOnlyInSelectedExchange = sortedExchanges.length === 1 && 
        selectedExchangeName && 
        sortedExchanges[0].exchange_name.toLowerCase() === selectedExchangeName;

    return (
        <div style={{
            backgroundColor: "#1a1a1a",
            borderRadius: "12px",
            padding: "13px",
            border: "1px solid rgba(255, 174, 0, 0.2)",
        }}>
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "13px",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 style={{
                        color: "#FFAE00",
                        fontSize: "16px",
                        fontWeight: "600",
                        margin: 0,
                    }}>
                        Arbitrage Opportunities
                    </h3>
                    {wsStatus === "connected" && (
                        <span style={{
                            fontSize: "10px",
                            color: "#22c55e",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                        }}>
                            <span style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                backgroundColor: "#22c55e",
                                display: "inline-block",
                            }}></span>
                            Live
                        </span>
                    )}
                </div>
                <button
                    onClick={fetchArbitrageData}
                    disabled={loading}
                    style={{
                        backgroundColor: "transparent",
                        border: "1px solid rgba(255, 174, 0, 0.3)",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        color: "#FFAE00",
                        cursor: loading ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        opacity: loading ? 0.5 : 1,
                    }}
                    title="Refresh"
                >
                    <MdRefresh size={14} />
                </button>
            </div>

            {error && (
                <div style={{
                    padding: "13px",
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "4px",
                    color: "#ef4444",
                    fontSize: "12px",
                    marginBottom: "12px",
                }}>
                    {error}
                </div>
            )}

            {loading && !arbitrageData ? (
                <div style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "#888",
                    fontSize: "12px",
                }}>
                    Loading arbitrage data...
                </div>
            ) : sortedExchanges.length === 0 ? (
                <div style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "#888",
                    fontSize: "12px",
                }}>
                    No exchange data available
                </div>
            ) : isOnlyInSelectedExchange ? (
                <div style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "#888",
                    fontSize: "12px",
                }}>
                    The coin just exist in this exchange and no arbitrage data exist
                </div>
            ) : (
                <div style={{
                    display: "flex",
                    flexDirection: "row",
                    gap: "10px",
                    overflowX: "auto",
                    paddingBottom: "4px",
                    scrollbarWidth: "thin",
                    scrollbarColor: "rgba(255, 174, 0, 0.3) transparent",
                }}>
                    {sortedExchanges.map((exchange) => {
                        const isSelected = selectedExchangeName && exchange.exchange_name.toLowerCase() === selectedExchangeName;
                        const isBestPrice = highestPrice !== null && exchange.price !== null && exchange.price === highestPrice;
                        return (
                        <div
                            key={exchange.exchange_account_id}
                            style={{
                                backgroundColor: isSelected 
                                    ? "rgba(255, 174, 0, 0.15)" 
                                    : exchange.available 
                                        ? "rgba(42, 42, 42, 0.6)" 
                                        : "rgba(239, 68, 68, 0.08)",
                                border: isSelected
                                    ? "1px solid rgba(255, 174, 0, 0.5)"
                                    : `1px solid ${exchange.available ? "rgba(255, 174, 0, 0.15)" : "rgba(239, 68, 68, 0.2)"}`,
                                borderRadius: "10px",
                                padding: "11px 13px",
                                minWidth: "200px",
                                flex: "0 0 auto",
                                opacity: exchange.available ? 1 : 0.5,
                                transition: "all 0.2s ease",
                                backdropFilter: "blur(4px)",
                            }}
                            onMouseEnter={(e) => {
                                if (exchange.available) {
                                    if (isSelected) {
                                        e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.7)";
                                        e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.18)";
                                    } else {
                                        e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.4)";
                                        e.currentTarget.style.backgroundColor = "rgba(42, 42, 42, 0.8)";
                                    }
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (exchange.available) {
                                    if (isSelected) {
                                        e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.5)";
                                        e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.15)";
                                    } else {
                                        e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.15)";
                                        e.currentTarget.style.backgroundColor = "rgba(42, 42, 42, 0.6)";
                                    }
                                }
                            }}
                        >
                            <div style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                            }}>
                                {/* Exchange Name and Price */}
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}>
                                    <div style={{
                                        fontSize: "13px",
                                        fontWeight: isSelected ? "700" : "500",
                                        color: isSelected ? "#FFAE00" : "#ffffff",
                                        textTransform: "capitalize",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        flexWrap: "wrap",
                                    }}>
                                        {isSelected && (
                                            <span style={{
                                                width: "6px",
                                                height: "6px",
                                                borderRadius: "50%",
                                                backgroundColor: "#FFAE00",
                                                display: "inline-block",
                                            }}></span>
                                        )}
                                        {exchange.exchange_name}
                                        {isBestPrice && (
                                            <span style={{
                                                fontSize: "9px",
                                                fontWeight: "600",
                                                color: "#22c55e",
                                                backgroundColor: "rgba(34, 197, 94, 0.15)",
                                                padding: "2px 6px",
                                                borderRadius: "4px",
                                                border: "1px solid rgba(34, 197, 94, 0.3)",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.5px",
                                            }}>
                                                Best Price
                                            </span>
                                        )}
                                    </div>
                                    {exchange.available && exchange.price !== null && (
                                        <div style={{
                                            fontSize: "15px",
                                            fontWeight: "700",
                                            color: "#FFAE00",
                                            letterSpacing: "-0.3px",
                                        }}>
                                            ${formatPrice(exchange.price)}
                                        </div>
                                    )}
                                    {!exchange.available && (
                                        <div style={{
                                            fontSize: "10px",
                                            color: "#ef4444",
                                            padding: "2px 6px",
                                            backgroundColor: "rgba(239, 68, 68, 0.15)",
                                            borderRadius: "4px",
                                        }}>
                                            N/A
                                        </div>
                                    )}
                                </div>

                                {exchange.available && exchange.price !== null && (
                                    <div style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "5px",
                                        fontSize: "11px",
                                    }}>
                                        {exchange.price_change_24h !== null && (
                                            <div style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "5px",
                                                color: exchange.price_change_24h >= 0 ? "#22c55e" : "#ef4444",
                                                fontWeight: "500",
                                            }}>
                                                {exchange.price_change_24h >= 0 ? (
                                                    <MdTrendingUp size={13} />
                                                ) : (
                                                    <MdTrendingDown size={13} />
                                                )}
                                                <span>24h: {formatPercentage(exchange.price_change_24h)}</span>
                                            </div>
                                        )}
                                        <div style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "2px",
                                            color: "#999",
                                            fontSize: "10px",
                                        }}>
                                            {exchange.high_24h !== null && (
                                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                    <span style={{ color: "#666" }}>High:</span>
                                                    <span style={{ color: "#999", fontWeight: "500" }}>${formatPrice(exchange.high_24h)}</span>
                                                </div>
                                            )}
                                            {exchange.low_24h !== null && (
                                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                    <span style={{ color: "#666" }}>Low:</span>
                                                    <span style={{ color: "#999", fontWeight: "500" }}>${formatPrice(exchange.low_24h)}</span>
                                                </div>
                                            )}
                                        </div>
                                        {exchange.volume_24h !== null && exchange.volume_24h > 0 && (
                                            <div style={{
                                                color: "#777",
                                                fontSize: "10px",
                                                marginTop: "2px",
                                                paddingTop: "5px",
                                                borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                                            }}>
                                                Vol: {exchange.volume_24h.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!exchange.available && exchange.error && (
                                    <div style={{
                                        fontSize: "10px",
                                        color: "#ef4444",
                                        marginTop: "4px",
                                    }}>
                                        {exchange.error}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                    })}
                </div>
            )}
        </div>
    );
}

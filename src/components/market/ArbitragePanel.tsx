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

        const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const encodedSymbol = encodeURIComponent(selectedSymbol);
        const wsUrl = apiUrl.replace("http://", "ws://").replace("https://", "wss://");
        // Use token in Authorization header via query param (backend expects this format)
        const wsEndpoint = `${wsUrl}/ws/arbitrage/${encodedSymbol}?token=${encodeURIComponent(token)}`;

        setWsStatus("connecting");
        console.log("🔌 Connecting to Arbitrage WebSocket:", wsEndpoint);
        const ws = new WebSocket(wsEndpoint);
        wsRef.current = ws;
        
        let connectionTimeout: NodeJS.Timeout | null = null;

        ws.onopen = () => {
            if (connectionTimeout) {
                clearTimeout(connectionTimeout);
                connectionTimeout = null;
            }
            console.log("✅ Arbitrage WebSocket connected for", selectedSymbol);
            setWsStatus("connected");
            reconnectAttemptsRef.current = 0;
            
            // Send ping every 60 seconds to keep connection alive (reduced frequency)
            const pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send("ping");
                } else {
                    clearInterval(pingInterval);
                }
            }, 60000); // Reduced from 30s to 60s to save resources
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === "connected") {
                    console.log("✅ Arbitrage WebSocket connection confirmed:", data.message);
                } else if (data.type === "arbitrage_update") {
                    // Update arbitrage data with real-time updates
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
            console.error("❌ Arbitrage WebSocket error:", error);
            setWsStatus("disconnected");
        };

        ws.onclose = (event) => {
            console.log("🔌 Arbitrage WebSocket closed:", event.code, event.reason || "No reason provided");
            setWsStatus("disconnected");
            
            if (connectionTimeout) {
                clearTimeout(connectionTimeout);
                connectionTimeout = null;
            }
            
            // Attempt to reconnect if not manually closed
            if (shouldReconnectRef.current && event.code !== 1008 && reconnectAttemptsRef.current < 10) {
                reconnectAttemptsRef.current += 1;
                const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000); // Exponential backoff, max 30s
                
                setTimeout(() => {
                    if (shouldReconnectRef.current && selectedSymbol && (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED)) {
                        console.log(`🔄 Attempting to reconnect Arbitrage WebSocket... (attempt ${reconnectAttemptsRef.current}/10, delay: ${delay}ms)`);
                        // Trigger reconnection by updating status - useEffect will handle it
                        setWsStatus("connecting");
                    }
                }, delay);
            }
        };

        // Set connection timeout
        connectionTimeout = setTimeout(() => {
            if (ws.readyState === WebSocket.CONNECTING) {
                console.warn("⚠️ Arbitrage WebSocket connection timeout after 5 seconds");
                ws.close();
            }
        }, 5000);

        return () => {
            shouldReconnectRef.current = false;
            if (connectionTimeout) {
                clearTimeout(connectionTimeout);
            }
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
            wsRef.current = null;
        };
    }, [selectedSymbol, wsStatus]); // Add wsStatus to dependencies to trigger reconnection

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

    // Filter and sort exchanges - only show available ones, sorted by price
    const sortedExchanges = arbitrageData?.exchanges
        ? arbitrageData.exchanges
            .filter(exchange => exchange.available && exchange.price !== null && exchange.price > 0)
            .sort((a, b) => {
                if (a.price === null && b.price === null) return 0;
                if (a.price === null) return 1;
                if (b.price === null) return -1;
                return a.price - b.price;
            })
        : [];

    return (
        <div style={{
            backgroundColor: "#1a1a1a",
            borderRadius: "12px",
            padding: "16px",
            border: "1px solid rgba(255, 174, 0, 0.2)",
        }}>
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
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
                    padding: "8px",
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
            ) : (
                <div style={{
                    display: "flex",
                    flexDirection: "row",
                    gap: "12px",
                    overflowX: "auto",
                    paddingBottom: "4px",
                    scrollbarWidth: "thin",
                    scrollbarColor: "rgba(255, 174, 0, 0.3) transparent",
                }}>
                    {sortedExchanges.map((exchange) => {
                        const isSelected = selectedExchangeName && exchange.exchange_name.toLowerCase() === selectedExchangeName;
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
                                padding: "14px 16px",
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
                                gap: "10px",
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
                                        gap: "6px",
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
                                    </div>
                                    {exchange.available && exchange.price !== null && (
                                        <div style={{
                                            fontSize: "18px",
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
                                        gap: "6px",
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
                                            gap: "3px",
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
                                                paddingTop: "6px",
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

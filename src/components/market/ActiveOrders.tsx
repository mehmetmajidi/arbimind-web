"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useExchange } from "@/contexts/ExchangeContext";
import { MdClose, MdRefresh } from "react-icons/md";

interface ActiveOrder {
    id: number;
    exchange_account_id: number;
    symbol: string;
    side: "buy" | "sell";
    order_type: "market" | "limit" | "stop";
    status: string;
    quantity: string;
    price: string | null;
    filled_quantity: string;
    average_price: string | null;
    exchange_order_id: string | null;
    fee: string;
    fee_currency: string | null;
    created_at: string;
    updated_at: string;
    executed_at: string | null;
    cancelled_at: string | null;
    error_message: string | null;
}

interface ActiveOrdersProps {
    selectedSymbol?: string;
    onOrderCancelled?: () => void;
}

export default function ActiveOrders({ selectedSymbol, onOrderCancelled }: ActiveOrdersProps) {
    const { selectedAccountId } = useExchange();
    const [orders, setOrders] = useState<ActiveOrder[]>([]);
    const [allOrdersDebug, setAllOrdersDebug] = useState<ActiveOrder[]>([]); // For debugging
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const currentAccountIdRef = useRef<number | null>(null);

    const fetchActiveOrders = useCallback(async () => {
        if (!selectedAccountId) {
            setOrders([]);
            setAllOrdersDebug([]);
            currentAccountIdRef.current = null;
            return;
        }

        // Store current account ID to check if it changed during fetch
        const accountIdAtStart = selectedAccountId;
        currentAccountIdRef.current = accountIdAtStart;

        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("auth_token") || "";
            if (!token) {
                setError("Please login to view orders");
                setLoading(false);
                return;
            }

            const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            
            // Fetch orders directly from exchange API
            const params = new URLSearchParams({
                exchange_account_id: String(selectedAccountId),
            });

            if (selectedSymbol) {
                params.append("symbol", selectedSymbol);
                console.log("🔍 Filtering orders by symbol:", selectedSymbol);
            } else {
                console.log("⚠️ No symbol selected - will fetch all orders");
            }

            console.log("🔍 Fetching orders from exchange API with params:", params.toString());
            const response = await fetch(`${apiUrl}/trading/orders/exchange?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("❌ Failed to fetch orders from exchange:", response.status, errorText);
                setError(`Failed to fetch orders: ${response.status}`);
                setLoading(false);
                return;
            }

            const activeOrders: ActiveOrder[] = await response.json();
            console.log("✅ Active orders from exchange:", activeOrders.length, "orders");
            if (selectedSymbol) {
                const filteredOrders = activeOrders.filter(o => {
                    const orderSymbol = (o.symbol || "").toUpperCase().replace("-", "").replace("/", "");
                    const requestedSymbol = selectedSymbol.toUpperCase().replace("-", "").replace("/", "");
                    return orderSymbol === requestedSymbol;
                });
                console.log(`📊 Filtered orders for ${selectedSymbol}:`, filteredOrders.length, "orders match");
                if (activeOrders.length > filteredOrders.length) {
                    console.warn(`⚠️ Found ${activeOrders.length - filteredOrders.length} orders that don't match ${selectedSymbol}`);
                    activeOrders.forEach(o => {
                        if (!filteredOrders.includes(o)) {
                            console.warn(`  - Order ${o.id}: ${o.symbol} (doesn't match ${selectedSymbol})`);
                        }
                    });
                }
            }

            // Check if account changed during fetch
            if (currentAccountIdRef.current !== accountIdAtStart) {
                console.log("⚠️ Account changed during fetch, ignoring results");
                return;
            }

            // Store for debugging (all orders before filtering)
            setAllOrdersDebug(activeOrders);

            // IMPORTANT: Filter by symbol in frontend as well (in case backend doesn't filter properly)
            let filteredOrders = activeOrders;
            if (selectedSymbol) {
                const normalizeSymbol = (s: string) => {
                    if (!s) return "";
                    return s.toUpperCase().replace(/-/g, "").replace(/\//g, "").replace(/_/g, "").trim();
                };
                const requestedSymbol = normalizeSymbol(selectedSymbol);
                console.log(`🔍 Frontend filtering: Requested symbol '${selectedSymbol}' (normalized: '${requestedSymbol}')`);
                
                filteredOrders = activeOrders.filter(order => {
                    const orderSymbol = normalizeSymbol(order.symbol || "");
                    const matches = orderSymbol === requestedSymbol;
                    if (!matches) {
                        console.warn(`❌ Frontend filter: Skipping order ${order.id} - symbol '${order.symbol}' (normalized: '${orderSymbol}') doesn't match '${selectedSymbol}' (normalized: '${requestedSymbol}')`);
                    } else {
                        console.log(`✅ Frontend filter: Order ${order.id} matches - symbol '${order.symbol}' (normalized: '${orderSymbol}') == '${selectedSymbol}' (normalized: '${requestedSymbol}')`);
                    }
                    return matches;
                });
                console.log(`📊 Frontend filtered ${activeOrders.length} orders to ${filteredOrders.length} for symbol ${selectedSymbol}`);
                
                if (filteredOrders.length === 0 && activeOrders.length > 0) {
                    console.error(`⚠️ No orders match symbol ${selectedSymbol}! All orders:`, activeOrders.map(o => ({ id: o.id, symbol: o.symbol })));
                }
            } else {
                console.log("⚠️ No symbol selected - showing all orders");
            }

            // Sort by created_at (newest first)
            filteredOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setOrders(filteredOrders);
        } catch (err) {
            console.error("Error fetching active orders:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch orders");
        } finally {
            setLoading(false);
        }
    }, [selectedAccountId, selectedSymbol]);

    const cancelOrder = useCallback(async (order: ActiveOrder) => {
        if (!selectedAccountId || !order.exchange_order_id) return;

        try {
            const token = localStorage.getItem("auth_token") || "";
            if (!token) return;

            const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            
            // Cancel order from exchange API
            const params = new URLSearchParams({
                exchange_account_id: String(selectedAccountId),
                symbol: order.symbol,
            });
            
            const response = await fetch(`${apiUrl}/trading/orders/exchange/${encodeURIComponent(order.exchange_order_id)}?${params.toString()}`, {
                method: "DELETE",
                headers: { 
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                // Refresh orders after cancellation
                await fetchActiveOrders();
                if (onOrderCancelled) {
                    onOrderCancelled();
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                setError(errorData.detail || "Failed to cancel order");
            }
        } catch (err) {
            console.error("Error cancelling order:", err);
            setError(err instanceof Error ? err.message : "Failed to cancel order");
        }
    }, [selectedAccountId, fetchActiveOrders, onOrderCancelled]);

    // Clear orders immediately when account changes
    useEffect(() => {
        setOrders([]);
        setAllOrdersDebug([]);
        setError(null);
    }, [selectedAccountId]);

    // Fetch orders on mount and when account/symbol changes (only once, no auto-refresh)
    useEffect(() => {
        if (!selectedAccountId) {
            setOrders([]);
            return;
        }
        
        console.log(`🔄 Fetching orders for account ${selectedAccountId}, symbol: ${selectedSymbol || 'ALL'}`);
        fetchActiveOrders();
        // No auto-refresh - user must manually refresh using the refresh button
    }, [fetchActiveOrders, selectedAccountId, selectedSymbol]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "pending":
                return "#f59e0b"; // Orange
            case "open":
                return "#3b82f6"; // Blue
            case "partially_filled":
                return "#8b5cf6"; // Purple
            case "filled":
                return "#22c55e"; // Green
            case "cancelled":
                return "#ef4444"; // Red
            default:
                return "#888";
        }
    };

    return (
        <div style={{
            padding: "12px",
            backgroundColor: "#1a1a1a",
            borderRadius: "10px",
            border: "1px solid rgba(255, 174, 0, 0.2)",
        }}>
            {/* Header */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
            }}>
                <h4 style={{
                    color: "#FFAE00",
                    margin: "0",
                    fontSize: "12px",
                    fontWeight: "600",
                }}>
                    Active Orders
                </h4>
                <button
                    onClick={fetchActiveOrders}
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
                    fontSize: "11px",
                    marginBottom: "12px",
                }}>
                    {error}
                </div>
            )}

            {!selectedAccountId ? (
                <div style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "#888",
                    fontSize: "12px",
                }}>
                    Please select an exchange account
                </div>
            ) : loading && orders.length === 0 ? (
                <div style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "#888",
                    fontSize: "12px",
                }}>
                    Loading orders...
                </div>
            ) : orders.length === 0 ? (
                <div style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "#888",
                    fontSize: "12px",
                }}>
                    {allOrdersDebug.length > 0 ? (
                        <div>
                            <div>No active orders</div>
                            <div style={{ marginTop: "8px", fontSize: "10px", color: "#666" }}>
                                Found {allOrdersDebug.length} total order(s) with status: {[...new Set(allOrdersDebug.map(o => o.status))].join(", ")}
                            </div>
                        </div>
                    ) : (
                        "No active orders"
                    )}
                </div>
            ) : (
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    maxHeight: "400px",
                    overflowY: "auto",
                }}>
                    {orders.map((order) => {
                        const isBuy = order.side === "buy";
                        const filledPercent = order.quantity && parseFloat(order.quantity) > 0
                            ? (parseFloat(order.filled_quantity) / parseFloat(order.quantity)) * 100
                            : 0;

                        return (
                            <div
                                key={order.id}
                                style={{
                                    padding: "10px",
                                    backgroundColor: "#2a2a2a",
                                    borderRadius: "6px",
                                    border: `1px solid ${isBuy ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                                }}
                            >
                                {/* Order Header */}
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    marginBottom: "8px",
                                }}>
                                    <div style={{ flex: "1" }}>
                                        <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            marginBottom: "4px",
                                        }}>
                                            <span style={{
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                color: isBuy ? "#22c55e" : "#ef4444",
                                                textTransform: "uppercase",
                                            }}>
                                                {order.side}
                                            </span>
                                            <span style={{
                                                fontSize: "11px",
                                                color: "#888",
                                                textTransform: "uppercase",
                                            }}>
                                                {order.order_type}
                                            </span>
                                            <span style={{
                                                fontSize: "11px",
                                                color: getStatusColor(order.status),
                                                padding: "2px 6px",
                                                backgroundColor: `${getStatusColor(order.status)}20`,
                                                borderRadius: "4px",
                                            }}>
                                                {order.status.replace("_", " ")}
                                            </span>
                                        </div>
                                        <div style={{
                                            fontSize: "13px",
                                            fontWeight: "600",
                                            color: "#ffffff",
                                        }}>
                                            {order.symbol}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => cancelOrder(order)}
                                        style={{
                                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                                            border: "1px solid rgba(239, 68, 68, 0.3)",
                                            borderRadius: "4px",
                                            padding: "4px 6px",
                                            color: "#ef4444",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            fontSize: "12px",
                                        }}
                                        title="Cancel Order"
                                    >
                                        <MdClose size={14} />
                                    </button>
                                </div>

                                {/* Order Details */}
                                <div style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "4px",
                                    fontSize: "11px",
                                }}>
                                    <div style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                    }}>
                                        <span style={{ color: "#888" }}>Quantity:</span>
                                        <span style={{ color: "#ffffff" }}>
                                            {parseFloat(order.quantity).toFixed(6)}
                                        </span>
                                    </div>
                                    {order.price && (
                                        <div style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                        }}>
                                            <span style={{ color: "#888" }}>Price:</span>
                                            <span style={{ color: "#ffffff" }}>
                                                ${parseFloat(order.price).toFixed(4)}
                                            </span>
                                        </div>
                                    )}
                                    {order.filled_quantity && parseFloat(order.filled_quantity) > 0 && (
                                        <>
                                            <div style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                            }}>
                                                <span style={{ color: "#888" }}>Filled:</span>
                                                <span style={{ color: "#ffffff" }}>
                                                    {parseFloat(order.filled_quantity).toFixed(6)} ({filledPercent.toFixed(1)}%)
                                                </span>
                                            </div>
                                            {order.average_price && (
                                                <div style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                }}>
                                                    <span style={{ color: "#888" }}>Avg Price:</span>
                                                    <span style={{ color: "#ffffff" }}>
                                                        ${parseFloat(order.average_price).toFixed(4)}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <div style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        marginTop: "4px",
                                        paddingTop: "4px",
                                        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                                    }}>
                                        <span style={{ color: "#888" }}>Created:</span>
                                        <span style={{ color: "#888", fontSize: "10px" }}>
                                            {formatDate(order.created_at)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

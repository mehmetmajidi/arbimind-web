"use client";

import { useState, useEffect, useCallback } from "react";
import { useExchange } from "@/contexts/ExchangeContext";

interface Order {
     id: number;
     exchange_account_id: number;
     symbol: string;
     side: string;
     order_type: string;
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

interface Position {
     id: number;
     exchange_account_id: number;
     symbol: string;
     side: string;
     quantity: string;
     entry_price: string;
     current_price: string | null;
     unrealized_pnl: string;
     realized_pnl: string;
     opened_at: string;
     updated_at: string;
     closed_at: string | null;
}

interface Balance {
     exchange: string;
     balances: Record<string, { free: number; used: number; total: number }>;
}

interface Trade {
     id: number;
     order_id: number;
     symbol: string;
     side: string;
     quantity: string;
     price: string;
     fee: string;
     fee_currency: string | null;
     exchange_trade_id: string | null;
     timestamp: string;
}

export default function TradingPage() {
     const { selectedAccountId, accounts } = useExchange();
     const [orders, setOrders] = useState<Order[]>([]);
     const [positions, setPositions] = useState<Position[]>([]);
     const [closedPositions, setClosedPositions] = useState<Position[]>([]);
     const [closedPositionsLoading, setClosedPositionsLoading] = useState(false);
     const [showClosedPositions, setShowClosedPositions] = useState(false);
     const [balance, setBalance] = useState<Balance | null>(null);
     const [trades, setTrades] = useState<Trade[]>([]);

     const [loading, setLoading] = useState(true);
     const [ordersLoading, setOrdersLoading] = useState(false);
     const [positionsLoading, setPositionsLoading] = useState(false);
     const [balanceLoading, setBalanceLoading] = useState(false);
     const [tradesLoading, setTradesLoading] = useState(false);
     const [error, setError] = useState<string | null>(null);

     // Order form state
     const [showOrderForm, setShowOrderForm] = useState(false);
     const [orderForm, setOrderForm] = useState({
          symbol: "",
          side: "buy",
          order_type: "market",
          quantity: "",
          price: "",
     });
     const [placingOrder, setPlacingOrder] = useState(false);

     // Auto-refresh
     const [autoRefresh, setAutoRefresh] = useState(true);
     const [refreshInterval, setRefreshInterval] = useState(10); // seconds
     
     // WebSocket for real-time order updates
     const [useWebSocket, setUseWebSocket] = useState(true);
     const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
     const [wsConnectionStatus, setWsConnectionStatus] = useState<"disconnected" | "connecting" | "connected" | "error">("disconnected");
     const [wsError, setWsError] = useState<string | null>(null);
     const [wsReconnectAttempts, setWsReconnectAttempts] = useState(0);
     
     // WebSocket for real-time position updates
     const [wsPositionConnection, setWsPositionConnection] = useState<WebSocket | null>(null);
     const [wsPositionConnectionStatus, setWsPositionConnectionStatus] = useState<"disconnected" | "connecting" | "connected" | "error">("disconnected");
     const [wsPositionError, setWsPositionError] = useState<string | null>(null);
     const [wsPositionReconnectAttempts, setWsPositionReconnectAttempts] = useState(0);
     
     // Order details modal
     const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
     const [showOrderDetails, setShowOrderDetails] = useState(false);
     const [refreshingOrderId, setRefreshingOrderId] = useState<number | null>(null);
     const [pendingOrdersRefreshInterval, setPendingOrdersRefreshInterval] = useState<NodeJS.Timeout | null>(null);
     
     // Position details modal
     const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
     const [showPositionDetails, setShowPositionDetails] = useState(false);
     const [positionTrades, setPositionTrades] = useState<Trade[]>([]);
     const [positionTradesLoading, setPositionTradesLoading] = useState(false);

     // Initialize loading state
     useEffect(() => {
          setLoading(false);
     }, []);

     // Fetch orders
     const fetchOrders = useCallback(async () => {
          if (!selectedAccountId) return;

          setOrdersLoading(true);
          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) return;

               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

               const response = await fetch(`${apiUrl}/trading/orders?exchange_account_id=${selectedAccountId}&limit=50`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setOrders(Array.isArray(data) ? data : []);
                    setError(null);
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to load orders");
               }
          } catch (error) {
               console.error("Error fetching orders:", error);
               setError("Failed to load orders");
          } finally {
               setOrdersLoading(false);
          }
     }, [selectedAccountId]);

     // Fetch positions
     const fetchPositions = useCallback(async () => {
          if (!selectedAccountId) return;

          setPositionsLoading(true);
          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) return;

               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

               const response = await fetch(`${apiUrl}/trading/positions?exchange_account_id=${selectedAccountId}`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setPositions(Array.isArray(data) ? data : []);
                    setError(null);
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to load positions");
               }
          } catch (error) {
               console.error("Error fetching positions:", error);
               setError("Failed to load positions");
          } finally {
               setPositionsLoading(false);
          }
     }, [selectedAccountId]);

     // Fetch closed positions
     const fetchClosedPositions = useCallback(async () => {
          if (!selectedAccountId) return;

          setClosedPositionsLoading(true);
          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) return;

               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

               const response = await fetch(`${apiUrl}/trading/positions/closed?exchange_account_id=${selectedAccountId}&limit=100`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setClosedPositions(Array.isArray(data) ? data : []);
                    setError(null);
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    console.error("Error fetching closed positions:", errorData.detail || "Failed to load closed positions");
                    setClosedPositions([]);
               }
          } catch (error) {
               console.error("Error fetching closed positions:", error);
               setClosedPositions([]);
          } finally {
               setClosedPositionsLoading(false);
          }
     }, [selectedAccountId]);

     // Fetch balance
     const fetchBalance = useCallback(async () => {
          if (!selectedAccountId) return;

          setBalanceLoading(true);
          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) return;

               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

               const response = await fetch(`${apiUrl}/trading/balance/${selectedAccountId}`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setBalance(data);
                    setError(null);
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    console.error("Error loading balance:", errorData.detail || "Failed to load balance");
               }
          } catch (error) {
               console.error("Error fetching balance:", error);
          } finally {
               setBalanceLoading(false);
          }
     }, [selectedAccountId]);

     // Fetch trades
     const fetchTrades = useCallback(async () => {
          if (!selectedAccountId) return;

          setTradesLoading(true);
          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) return;

               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

               const response = await fetch(`${apiUrl}/trading/trades?limit=50`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setTrades(Array.isArray(data) ? data : []);
                    setError(null);
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to load trades");
               }
          } catch (error) {
               console.error("Error fetching trades:", error);
               setError("Failed to load trades");
          } finally {
               setTradesLoading(false);
          }
     }, [selectedAccountId]);

     // Refresh single order status
     const refreshOrderStatus = useCallback(async (orderId: number) => {
          setRefreshingOrderId(orderId);
          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) return;

               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

               const response = await fetch(`${apiUrl}/trading/orders/${orderId}`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const updatedOrder = await response.json();
                    // Update order in the list
                    setOrders((prevOrders) =>
                         prevOrders.map((order) => (order.id === orderId ? updatedOrder : order))
                    );
                    // Update selected order if it's the same
                    if (selectedOrder && selectedOrder.id === orderId) {
                         setSelectedOrder(updatedOrder);
                    }
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    console.error("Error refreshing order:", errorData.detail || "Failed to refresh order");
               }
          } catch (error) {
               console.error("Error refreshing order:", error);
          } finally {
               setRefreshingOrderId(null);
          }
     }, [selectedOrder]);

     // Fetch position trades (entry/exit history)
     const fetchPositionTrades = useCallback(async (symbol: string) => {
          setPositionTradesLoading(true);
          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) return;

               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

               const response = await fetch(`${apiUrl}/trading/trades?symbol=${encodeURIComponent(symbol)}&limit=100`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setPositionTrades(Array.isArray(data) ? data : []);
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    console.error("Error fetching position trades:", errorData.detail || "Failed to fetch trades");
                    setPositionTrades([]);
               }
          } catch (error) {
               console.error("Error fetching position trades:", error);
               setPositionTrades([]);
          } finally {
               setPositionTradesLoading(false);
          }
     }, []);

     // Fetch data when account changes
     useEffect(() => {
          if (selectedAccountId) {
               fetchOrders();
               fetchPositions();
               fetchBalance();
               fetchTrades();
               if (showClosedPositions) {
                    fetchClosedPositions();
               }
          }
     }, [selectedAccountId, fetchOrders, fetchPositions, fetchBalance, fetchTrades, showClosedPositions, fetchClosedPositions]);

     // WebSocket connection for real-time order updates
     useEffect(() => {
          if (!useWebSocket || !autoRefresh || !selectedAccountId) {
               // Close WebSocket if disabled
               if (wsConnection) {
                    if (wsConnection.readyState === WebSocket.OPEN || wsConnection.readyState === WebSocket.CONNECTING) {
                         wsConnection.close();
                    }
                    setWsConnection(null);
               }
               setWsConnectionStatus("disconnected");
               setWsReconnectAttempts(0);
               setWsError(null);
               return;
          }

          const token = localStorage.getItem("auth_token");
          if (!token) {
               setWsError("Please login to use WebSocket");
               setWsConnectionStatus("error");
               return;
          }

          const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

          // Convert http to ws
          const wsUrl = apiUrl.replace("http://", "ws://").replace("https://", "wss://");
          const wsEndpoint = `${wsUrl}/ws/orders/${selectedAccountId}?token=${token}&interval=${refreshInterval}`;

          console.log("Connecting to WebSocket for orders:", wsEndpoint);

          let ws: WebSocket | null = null;
          let reconnectTimeout: NodeJS.Timeout | null = null;
          let isManualClose = false;
          let reconnectAttempts = 0;
          const maxReconnectAttempts = 10;
          const baseReconnectDelay = 3000; // 3 seconds
          const maxReconnectDelay = 30000; // 30 seconds

          const connect = () => {
               if (isManualClose) return;

               setWsConnectionStatus("connecting");
               setWsError(null);

               try {
                    ws = new WebSocket(wsEndpoint);

                    ws.onopen = () => {
                         console.log("WebSocket connected for orders");
                         setWsConnection(ws);
                         setWsConnectionStatus("connected");
                         setWsReconnectAttempts(0);
                         reconnectAttempts = 0;
                    };

                    ws.onmessage = (event) => {
                         try {
                              const data = JSON.parse(event.data);
                              console.log("WebSocket message received for orders:", data);

                              if (data.type === "order_updates" && data.orders) {
                                   // Update orders in the list
                                   setOrders((prevOrders) => {
                                        const updatedOrders = [...prevOrders];
                                        
                                        data.orders.forEach((updatedOrder: Order) => {
                                             const index = updatedOrders.findIndex((o) => o.id === updatedOrder.id);
                                             if (index >= 0) {
                                                  // Update existing order
                                                  updatedOrders[index] = updatedOrder;
                                             } else {
                                                  // New order, add to list
                                                  updatedOrders.unshift(updatedOrder);
                                             }
                                        });
                                        
                                        // Sort by created_at (newest first)
                                        return updatedOrders.sort((a, b) => {
                                             const dateA = new Date(a.created_at).getTime();
                                             const dateB = new Date(b.created_at).getTime();
                                             return dateB - dateA;
                                        });
                                   });
                              } else if (data.type === "error") {
                                   const errorMsg = data.message || "WebSocket error";
                                   console.error("WebSocket error message:", errorMsg);
                                   setWsError(errorMsg);
                                   setWsConnectionStatus("error");
                              } else if (data.type === "connected") {
                                   console.log("WebSocket connected:", data.message);
                              }
                         } catch (error) {
                              console.error("Error parsing WebSocket message:", error);
                         }
                    };

                    ws.onerror = (error) => {
                         console.error("WebSocket error:", error);
                         setWsError("WebSocket connection error");
                         setWsConnectionStatus("error");
                    };

                    ws.onclose = (event) => {
                         console.log("WebSocket disconnected:", event.code, event.reason);
                         setWsConnection(null);
                         setWsConnectionStatus("disconnected");

                         // Auto-reconnect if not manual close and within max attempts
                         if (event.code !== 1008 && useWebSocket && autoRefresh && !isManualClose && reconnectAttempts < maxReconnectAttempts) {
                              reconnectAttempts++;
                              setWsReconnectAttempts(reconnectAttempts);
                              
                              const delay = Math.min(baseReconnectDelay * Math.pow(2, reconnectAttempts - 1), maxReconnectDelay);
                              console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
                              
                              reconnectTimeout = setTimeout(() => {
                                   if (useWebSocket && autoRefresh && selectedAccountId) {
                                        connect();
                                   }
                              }, delay);
                         } else if (reconnectAttempts >= maxReconnectAttempts) {
                              setWsError("Max reconnection attempts reached");
                              setWsConnectionStatus("error");
                         }
                    };
               } catch (error) {
                    console.error("Error creating WebSocket:", error);
                    setWsError("Failed to create WebSocket connection");
                    setWsConnectionStatus("error");
               }
          };

          connect();

          return () => {
               isManualClose = true;
               if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout);
               }
               if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
                    ws.close();
               }
          };
     }, [useWebSocket, autoRefresh, selectedAccountId, refreshInterval]);

     // WebSocket connection for real-time position updates
     useEffect(() => {
          if (!useWebSocket || !autoRefresh || !selectedAccountId) {
               // Close WebSocket if disabled
               if (wsPositionConnection) {
                    if (wsPositionConnection.readyState === WebSocket.OPEN || wsPositionConnection.readyState === WebSocket.CONNECTING) {
                         wsPositionConnection.close();
                    }
                    setWsPositionConnection(null);
               }
               setWsPositionConnectionStatus("disconnected");
               setWsPositionReconnectAttempts(0);
               setWsPositionError(null);
               return;
          }

          const token = localStorage.getItem("auth_token");
          if (!token) {
               setWsPositionError("Please login to use WebSocket");
               setWsPositionConnectionStatus("error");
               return;
          }

          const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

          // Convert http to ws
          const wsUrl = apiUrl.replace("http://", "ws://").replace("https://", "wss://");
          const wsEndpoint = `${wsUrl}/ws/positions/${selectedAccountId}?token=${token}&interval=${refreshInterval}`;

          console.log("Connecting to WebSocket for positions:", wsEndpoint);

          let ws: WebSocket | null = null;
          let reconnectTimeout: NodeJS.Timeout | null = null;
          let isManualClose = false;
          let reconnectAttempts = 0;
          const maxReconnectAttempts = 10;
          const baseReconnectDelay = 3000; // 3 seconds
          const maxReconnectDelay = 30000; // 30 seconds

          const connect = () => {
               if (isManualClose) return;

               setWsPositionConnectionStatus("connecting");
               setWsPositionError(null);

               try {
                    ws = new WebSocket(wsEndpoint);

                    ws.onopen = () => {
                         console.log("WebSocket connected for positions");
                         setWsPositionConnection(ws);
                         setWsPositionConnectionStatus("connected");
                         setWsPositionReconnectAttempts(0);
                         reconnectAttempts = 0;
                    };

                    ws.onmessage = (event) => {
                         try {
                              const data = JSON.parse(event.data);
                              console.log("WebSocket message received for positions:", data);

                              if (data.type === "position_updates" && data.positions) {
                                   // Update positions in the list
                                   setPositions((prevPositions) => {
                                        const updatedPositions = [...prevPositions];
                                        
                                        data.positions.forEach((updatedPosition: Position) => {
                                             const index = updatedPositions.findIndex((p) => p.id === updatedPosition.id);
                                             if (index >= 0) {
                                                  // Update existing position
                                                  updatedPositions[index] = updatedPosition;
                                             } else {
                                                  // New position, add to list
                                                  updatedPositions.push(updatedPosition);
                                             }
                                        });
                                        
                                        // Remove closed positions
                                        return updatedPositions.filter((p) => !p.closed_at);
                                   });
                              } else if (data.type === "error") {
                                   const errorMsg = data.message || "WebSocket error";
                                   console.error("WebSocket error message:", errorMsg);
                                   setWsPositionError(errorMsg);
                                   setWsPositionConnectionStatus("error");
                              } else if (data.type === "connected") {
                                   console.log("WebSocket connected:", data.message);
                              }
                         } catch (error) {
                              console.error("Error parsing WebSocket message:", error);
                         }
                    };

                    ws.onerror = (error) => {
                         console.error("WebSocket error:", error);
                         setWsPositionError("WebSocket connection error");
                         setWsPositionConnectionStatus("error");
                    };

                    ws.onclose = (event) => {
                         console.log("WebSocket disconnected:", event.code, event.reason);
                         setWsPositionConnection(null);
                         setWsPositionConnectionStatus("disconnected");

                         // Auto-reconnect if not manual close and within max attempts
                         if (event.code !== 1008 && useWebSocket && autoRefresh && !isManualClose && reconnectAttempts < maxReconnectAttempts) {
                              reconnectAttempts++;
                              setWsPositionReconnectAttempts(reconnectAttempts);
                              
                              const delay = Math.min(baseReconnectDelay * Math.pow(2, reconnectAttempts - 1), maxReconnectDelay);
                              console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
                              
                              reconnectTimeout = setTimeout(() => {
                                   if (useWebSocket && autoRefresh && selectedAccountId) {
                                        connect();
                                   }
                              }, delay);
                         } else if (reconnectAttempts >= maxReconnectAttempts) {
                              setWsPositionError("Max reconnection attempts reached");
                              setWsPositionConnectionStatus("error");
                         }
                    };
               } catch (error) {
                    console.error("Error creating WebSocket:", error);
                    setWsPositionError("Failed to create WebSocket connection");
                    setWsPositionConnectionStatus("error");
               }
          };

          connect();

          return () => {
               isManualClose = true;
               if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout);
               }
               if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
                    ws.close();
               }
          };
     }, [useWebSocket, autoRefresh, selectedAccountId, refreshInterval]);

     // Auto-refresh (fallback when WebSocket is disabled)
     useEffect(() => {
          if (!autoRefresh || useWebSocket || !selectedAccountId) return; // Skip if WebSocket is enabled

          const interval = setInterval(() => {
               fetchOrders();
               fetchPositions();
               fetchBalance();
               fetchTrades();
          }, refreshInterval * 1000);

          return () => clearInterval(interval);
     }, [autoRefresh, useWebSocket, refreshInterval, selectedAccountId, fetchOrders, fetchPositions, fetchBalance, fetchTrades]);

     // Place order
     const handlePlaceOrder = async () => {
          if (!selectedAccountId || !orderForm.symbol || !orderForm.quantity) {
               setError("Please fill in all required fields");
               return;
          }

          if (orderForm.order_type === "limit" && !orderForm.price) {
               setError("Limit orders require a price");
               return;
          }

          setPlacingOrder(true);
          setError(null);

          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) {
                    setError("Please login");
                    setPlacingOrder(false);
                    return;
               }

               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

               const response = await fetch(`${apiUrl}/trading/orders/place`, {
                    method: "POST",
                    headers: {
                         Authorization: `Bearer ${token}`,
                         "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                         exchange_account_id: selectedAccountId,
                         symbol: orderForm.symbol,
                         side: orderForm.side,
                         order_type: orderForm.order_type,
                         quantity: parseFloat(orderForm.quantity),
                         price: orderForm.price ? parseFloat(orderForm.price) : null,
                    }),
               });

               if (response.ok) {
                    const data = await response.json();
                    console.log("Order placed:", data);
                    setShowOrderForm(false);
                    setOrderForm({ symbol: "", side: "buy", order_type: "market", quantity: "", price: "" });

                    // Refresh orders
                    await fetchOrders();
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to place order");
               }
          } catch (error) {
               console.error("Error placing order:", error);
               setError("Network error. Please check your connection.");
          } finally {
               setPlacingOrder(false);
          }
     };

     // Cancel order
     const handleCancelOrder = async (orderId: number) => {
          if (!confirm("Are you sure you want to cancel this order?")) {
               return;
          }

          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) return;

               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

               const response = await fetch(`${apiUrl}/trading/orders/${orderId}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    await fetchOrders();
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to cancel order");
               }
          } catch (error) {
               console.error("Error cancelling order:", error);
               setError("Network error. Please check your connection.");
          }
     };

     // Close position
     const handleClosePosition = async (positionId: number) => {
          if (!confirm("Are you sure you want to close this position? This will place a market order.")) {
               return;
          }

          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) {
                    setError("Please login");
                    return;
               }

               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

               const response = await fetch(`${apiUrl}/trading/positions/${positionId}/close`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    console.log("Position closed:", data);
                    // Refresh positions, orders, and trades
                    await fetchPositions();
                    await fetchOrders();
                    await fetchTrades();
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to close position");
               }
          } catch (error) {
               console.error("Error closing position:", error);
               setError("Network error. Please check your connection.");
          }
     };

     // Calculate summary statistics
     const totalUnrealizedPnl = positions.reduce((sum, pos) => sum + parseFloat(pos.unrealized_pnl), 0);
     const totalRealizedPnl = positions.reduce((sum, pos) => sum + parseFloat(pos.realized_pnl), 0);
     const openPositionsCount = positions.length;
     const activeOrdersCount = orders.filter((o) => o.status === "open" || o.status === "pending" || o.status === "partially_filled").length;
     const totalBalance = balance ? Object.values(balance.balances).reduce((sum, amounts) => sum + amounts.total, 0) : 0;

     if (loading) {
          return (
               <div style={{ padding: "24px", textAlign: "center", color: "#ededed" }}>
                    <p>Loading...</p>
               </div>
          );
     }

     if (accounts.length === 0) {
          return (
               <div style={{ padding: "24px", textAlign: "center", color: "#ededed" }}>
                    <h1 style={{ color: "#FFAE00", marginBottom: "16px" }}>Trading Dashboard</h1>
                    <p style={{ color: "#888", marginTop: "16px" }}>No active exchange accounts found.</p>
                    <p style={{ marginTop: "8px" }}>
                         <a href="/settings" style={{ color: "#FFAE00", textDecoration: "underline" }}>
                              Add an exchange account
                         </a>{" "}
                         to start trading.
                    </p>
               </div>
          );
     }

     return (
          <div style={{ padding: "24px", maxWidth: "1600px", margin: "0 auto", color: "#ededed" }}>
               <h1 style={{ color: "#FFAE00", marginBottom: "24px", fontSize: "32px", fontWeight: "bold" }}>Trading Dashboard</h1>

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
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                         }}
                    >
                         <span>
                              <strong>⚠️ Error:</strong> {error}
                         </span>
                         <button
                              onClick={() => setError(null)}
                              style={{
                                   background: "none",
                                   border: "none",
                                   color: "#ff4444",
                                   cursor: "pointer",
                                   fontSize: "20px",
                                   padding: "0 8px",
                                   fontWeight: "bold",
                              }}
                         >
                              ×
                         </button>
                    </div>
               )}

               {/* Summary Statistics */}
               {selectedAccountId && (
                    <div
                         style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                              gap: "20px",
                              marginBottom: "32px",
                         }}
                    >
                         <div
                              style={{
                                   padding: "20px",
                                   backgroundColor: "#2a2a2a",
                                   borderRadius: "12px",
                                   border: "1px solid rgba(255, 174, 0, 0.2)",
                                   boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                              }}
                         >
                              <div style={{ fontSize: "13px", color: "#888", marginBottom: "8px", fontWeight: "500" }}>Total Balance</div>
                              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#FFAE00" }}>{totalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                         </div>
                         <div
                              style={{
                                   padding: "20px",
                                   backgroundColor: "#2a2a2a",
                                   borderRadius: "12px",
                                   border: "1px solid rgba(255, 174, 0, 0.2)",
                                   boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                              }}
                         >
                              <div style={{ fontSize: "13px", color: "#888", marginBottom: "8px", fontWeight: "500" }}>Unrealized P&L</div>
                              <div
                                   style={{
                                        fontSize: "24px",
                                        fontWeight: "bold",
                                        color: totalUnrealizedPnl >= 0 ? "#22c55e" : "#ef4444",
                                   }}
                              >
                                   {totalUnrealizedPnl >= 0 ? "+" : ""}
                                   {totalUnrealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                         </div>
                         <div
                              style={{
                                   padding: "20px",
                                   backgroundColor: "#2a2a2a",
                                   borderRadius: "12px",
                                   border: "1px solid rgba(255, 174, 0, 0.2)",
                                   boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                              }}
                         >
                              <div style={{ fontSize: "13px", color: "#888", marginBottom: "8px", fontWeight: "500" }}>Realized P&L</div>
                              <div
                                   style={{
                                        fontSize: "24px",
                                        fontWeight: "bold",
                                        color: totalRealizedPnl >= 0 ? "#22c55e" : "#ef4444",
                                   }}
                              >
                                   {totalRealizedPnl >= 0 ? "+" : ""}
                                   {totalRealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                         </div>
                         <div
                              style={{
                                   padding: "20px",
                                   backgroundColor: "#2a2a2a",
                                   borderRadius: "12px",
                                   border: "1px solid rgba(255, 174, 0, 0.2)",
                                   boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                              }}
                         >
                              <div style={{ fontSize: "13px", color: "#888", marginBottom: "8px", fontWeight: "500" }}>Open Positions</div>
                              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#FFAE00" }}>{openPositionsCount}</div>
                         </div>
                         <div
                              style={{
                                   padding: "20px",
                                   backgroundColor: "#2a2a2a",
                                   borderRadius: "12px",
                                   border: "1px solid rgba(255, 174, 0, 0.2)",
                                   boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                              }}
                         >
                              <div style={{ fontSize: "13px", color: "#888", marginBottom: "8px", fontWeight: "500" }}>Active Orders</div>
                              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#FFAE00" }}>{activeOrdersCount}</div>
                         </div>
                    </div>
               )}

               {/* Controls */}
               <div
                    style={{
                         display: "grid",
                         gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                         gap: "20px",
                         marginBottom: "32px",
                         padding: "24px",
                         backgroundColor: "#2a2a2a",
                         borderRadius: "12px",
                         border: "1px solid rgba(255, 174, 0, 0.2)",
                    }}
               >
                    <div>
                         <label
                              style={{
                                   display: "flex",
                                   alignItems: "center",
                                   gap: "8px",
                                   cursor: "pointer",
                                   color: "#ededed",
                                   fontSize: "14px",
                                   marginBottom: "12px",
                              }}
                         >
                              <input
                                   type="checkbox"
                                   checked={autoRefresh}
                                   onChange={(e) => setAutoRefresh(e.target.checked)}
                                   style={{
                                        width: "18px",
                                        height: "18px",
                                        cursor: "pointer",
                                        accentColor: "#FFAE00",
                                   }}
                              />
                              <span>Auto Refresh</span>
                         </label>
                         {autoRefresh && (
                              <select
                                   value={refreshInterval}
                                   onChange={(e) => setRefreshInterval(Number(e.target.value))}
                                   style={{
                                        width: "100%",
                                        padding: "10px",
                                        borderRadius: "8px",
                                        border: "2px solid rgba(255, 174, 0, 0.3)",
                                        backgroundColor: "#1a1a1a",
                                        color: "#ededed",
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        outline: "none",
                                        marginBottom: "12px",
                                   }}
                                   onFocus={(e) => (e.target.style.borderColor = "#FFAE00")}
                                   onBlur={(e) => (e.target.style.borderColor = "rgba(255, 174, 0, 0.3)")}
                              >
                                   <option value={5} style={{ backgroundColor: "#1a1a1a", color: "#ededed" }}>
                                        Every 5 seconds
                                   </option>
                                   <option value={10} style={{ backgroundColor: "#1a1a1a", color: "#ededed" }}>
                                        Every 10 seconds
                                   </option>
                                   <option value={30} style={{ backgroundColor: "#1a1a1a", color: "#ededed" }}>
                                        Every 30 seconds
                                   </option>
                                   <option value={60} style={{ backgroundColor: "#1a1a1a", color: "#ededed" }}>
                                        Every 1 minute
                                   </option>
                              </select>
                         )}
                         
                         {/* WebSocket Toggle */}
                         <label
                              style={{
                                   display: "flex",
                                   alignItems: "center",
                                   gap: "8px",
                                   cursor: "pointer",
                                   color: "#ededed",
                                   fontSize: "14px",
                                   marginBottom: "12px",
                              }}
                         >
                              <input
                                   type="checkbox"
                                   checked={useWebSocket}
                                   onChange={(e) => setUseWebSocket(e.target.checked)}
                                   style={{
                                        width: "18px",
                                        height: "18px",
                                        cursor: "pointer",
                                        accentColor: "#FFAE00",
                                   }}
                              />
                              <span>Use WebSocket (Real-time)</span>
                         </label>
                         
                         {/* WebSocket Status */}
                         {useWebSocket && autoRefresh && (
                              <div
                                   style={{
                                        padding: "8px 12px",
                                        borderRadius: "8px",
                                        backgroundColor: wsConnectionStatus === "connected" ? "rgba(34, 197, 94, 0.1)" : wsConnectionStatus === "error" ? "rgba(239, 68, 68, 0.1)" : "rgba(107, 114, 128, 0.1)",
                                        border: `1px solid ${wsConnectionStatus === "connected" ? "rgba(34, 197, 94, 0.3)" : wsConnectionStatus === "error" ? "rgba(239, 68, 68, 0.3)" : "rgba(107, 114, 128, 0.3)"}`,
                                        color: wsConnectionStatus === "connected" ? "#22c55e" : wsConnectionStatus === "error" ? "#ef4444" : "#9ca3af",
                                        fontSize: "12px",
                                        marginBottom: "12px",
                                   }}
                              >
                                   <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span>
                                             {wsConnectionStatus === "connected" ? "🟢" : wsConnectionStatus === "connecting" ? "🟡" : wsConnectionStatus === "error" ? "🔴" : "⚪"}
                                        </span>
                                        <span>
                                             {wsConnectionStatus === "connected"
                                                  ? "Connected (Real-time)"
                                                  : wsConnectionStatus === "connecting"
                                                  ? "Connecting..."
                                                  : wsConnectionStatus === "error"
                                                  ? `Error: ${wsError || "Connection failed"}`
                                                  : "Disconnected"}
                                        </span>
                                   </div>
                                   {wsReconnectAttempts > 0 && wsConnectionStatus !== "connected" && (
                                        <div style={{ marginTop: "4px", fontSize: "11px", opacity: 0.8 }}>
                                             Reconnecting... (attempt {wsReconnectAttempts}/10)
                                        </div>
                                   )}
                              </div>
                         )}
                         
                         {!useWebSocket && autoRefresh && (
                              <div
                                   style={{
                                        padding: "8px 12px",
                                        borderRadius: "8px",
                                        backgroundColor: "rgba(107, 114, 128, 0.1)",
                                        border: "1px solid rgba(107, 114, 128, 0.3)",
                                        color: "#9ca3af",
                                        fontSize: "12px",
                                        marginBottom: "12px",
                                   }}
                              >
                                   Using polling (every {refreshInterval}s)
                              </div>
                         )}
                         
                         {/* WebSocket Position Status */}
                         {useWebSocket && autoRefresh && (
                              <div
                                   style={{
                                        padding: "8px 12px",
                                        borderRadius: "8px",
                                        backgroundColor: wsPositionConnectionStatus === "connected" ? "rgba(34, 197, 94, 0.1)" : wsPositionConnectionStatus === "error" ? "rgba(239, 68, 68, 0.1)" : "rgba(107, 114, 128, 0.1)",
                                        border: `1px solid ${wsPositionConnectionStatus === "connected" ? "rgba(34, 197, 94, 0.3)" : wsPositionConnectionStatus === "error" ? "rgba(239, 68, 68, 0.3)" : "rgba(107, 114, 128, 0.3)"}`,
                                        color: wsPositionConnectionStatus === "connected" ? "#22c55e" : wsPositionConnectionStatus === "error" ? "#ef4444" : "#9ca3af",
                                        fontSize: "12px",
                                        marginBottom: "12px",
                                   }}
                              >
                                   <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span>
                                             {wsPositionConnectionStatus === "connected" ? "🟢" : wsPositionConnectionStatus === "connecting" ? "🟡" : wsPositionConnectionStatus === "error" ? "🔴" : "⚪"}
                                        </span>
                                        <span>
                                             Positions: {wsPositionConnectionStatus === "connected"
                                                  ? "Real-time P&L"
                                                  : wsPositionConnectionStatus === "connecting"
                                                  ? "Connecting..."
                                                  : wsPositionConnectionStatus === "error"
                                                  ? `Error: ${wsPositionError || "Connection failed"}`
                                                  : "Disconnected"}
                                        </span>
                                   </div>
                                   {wsPositionReconnectAttempts > 0 && wsPositionConnectionStatus !== "connected" && (
                                        <div style={{ marginTop: "4px", fontSize: "11px", opacity: 0.8 }}>
                                             Reconnecting... (attempt {wsPositionReconnectAttempts}/10)
                                        </div>
                                   )}
                              </div>
                         )}
                    </div>

                    <div>
                         <button
                              onClick={() => setShowOrderForm(!showOrderForm)}
                              style={{
                                   width: "100%",
                                   padding: "14px",
                                   backgroundColor: showOrderForm ? "#ef4444" : "#22c55e",
                                   color: "white",
                                   border: "none",
                                   borderRadius: "8px",
                                   cursor: "pointer",
                                   fontWeight: "bold",
                                   fontSize: "16px",
                                   transition: "all 0.2s ease",
                                   boxShadow: showOrderForm ? "0 4px 12px rgba(239, 68, 68, 0.3)" : "0 4px 12px rgba(34, 197, 94, 0.3)",
                              }}
                              onMouseEnter={(e) => {
                                   if (!showOrderForm) {
                                        e.currentTarget.style.backgroundColor = "#16a34a";
                                        e.currentTarget.style.transform = "translateY(-2px)";
                                   }
                              }}
                              onMouseLeave={(e) => {
                                   if (!showOrderForm) {
                                        e.currentTarget.style.backgroundColor = "#22c55e";
                                        e.currentTarget.style.transform = "translateY(0)";
                                   }
                              }}
                         >
                              {showOrderForm ? "✕ Cancel" : "+ Place Order"}
                         </button>
                    </div>
               </div>

               {/* Order Form */}
               {showOrderForm && selectedAccountId && (
                    <div
                         style={{
                              padding: "24px",
                              backgroundColor: "#2a2a2a",
                              border: "1px solid rgba(255, 174, 0, 0.2)",
                              borderRadius: "12px",
                              marginBottom: "32px",
                         }}
                    >
                         <h2 style={{ color: "#FFAE00", marginBottom: "20px", fontSize: "24px", fontWeight: "bold" }}>Place Order</h2>
                         <div
                              style={{
                                   display: "grid",
                                   gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                   gap: "20px",
                              }}
                         >
                              <div>
                                   <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#FFAE00", fontSize: "14px" }}>Symbol (e.g., BTC/USDT)</label>
                                   <input
                                        type="text"
                                        value={orderForm.symbol}
                                        onChange={(e) => setOrderForm({ ...orderForm, symbol: e.target.value.toUpperCase() })}
                                        placeholder="BTC/USDT"
                                        style={{
                                             width: "100%",
                                             padding: "12px",
                                             borderRadius: "8px",
                                             border: "2px solid rgba(255, 174, 0, 0.3)",
                                             backgroundColor: "#1a1a1a",
                                             color: "#ededed",
                                             fontSize: "14px",
                                             outline: "none",
                                        }}
                                        onFocus={(e) => (e.target.style.borderColor = "#FFAE00")}
                                        onBlur={(e) => (e.target.style.borderColor = "rgba(255, 174, 0, 0.3)")}
                                   />
                              </div>

                              <div>
                                   <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#FFAE00", fontSize: "14px" }}>Side</label>
                                   <select
                                        value={orderForm.side}
                                        onChange={(e) => setOrderForm({ ...orderForm, side: e.target.value })}
                                        style={{
                                             width: "100%",
                                             padding: "12px",
                                             borderRadius: "8px",
                                             border: "2px solid rgba(255, 174, 0, 0.3)",
                                             backgroundColor: "#1a1a1a",
                                             color: "#ededed",
                                             fontSize: "14px",
                                             cursor: "pointer",
                                             outline: "none",
                                        }}
                                        onFocus={(e) => (e.target.style.borderColor = "#FFAE00")}
                                        onBlur={(e) => (e.target.style.borderColor = "rgba(255, 174, 0, 0.3)")}
                                   >
                                        <option value="buy" style={{ backgroundColor: "#1a1a1a", color: "#ededed" }}>
                                             Buy
                                        </option>
                                        <option value="sell" style={{ backgroundColor: "#1a1a1a", color: "#ededed" }}>
                                             Sell
                                        </option>
                                   </select>
                              </div>

                              <div>
                                   <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#FFAE00", fontSize: "14px" }}>Order Type</label>
                                   <select
                                        value={orderForm.order_type}
                                        onChange={(e) => setOrderForm({ ...orderForm, order_type: e.target.value })}
                                        style={{
                                             width: "100%",
                                             padding: "12px",
                                             borderRadius: "8px",
                                             border: "2px solid rgba(255, 174, 0, 0.3)",
                                             backgroundColor: "#1a1a1a",
                                             color: "#ededed",
                                             fontSize: "14px",
                                             cursor: "pointer",
                                             outline: "none",
                                        }}
                                        onFocus={(e) => (e.target.style.borderColor = "#FFAE00")}
                                        onBlur={(e) => (e.target.style.borderColor = "rgba(255, 174, 0, 0.3)")}
                                   >
                                        <option value="market" style={{ backgroundColor: "#1a1a1a", color: "#ededed" }}>
                                             Market
                                        </option>
                                        <option value="limit" style={{ backgroundColor: "#1a1a1a", color: "#ededed" }}>
                                             Limit
                                        </option>
                                   </select>
                              </div>

                              <div>
                                   <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#FFAE00", fontSize: "14px" }}>Quantity</label>
                                   <input
                                        type="number"
                                        step="any"
                                        value={orderForm.quantity}
                                        onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                                        placeholder="0.001"
                                        style={{
                                             width: "100%",
                                             padding: "12px",
                                             borderRadius: "8px",
                                             border: "2px solid rgba(255, 174, 0, 0.3)",
                                             backgroundColor: "#1a1a1a",
                                             color: "#ededed",
                                             fontSize: "14px",
                                             outline: "none",
                                        }}
                                        onFocus={(e) => (e.target.style.borderColor = "#FFAE00")}
                                        onBlur={(e) => (e.target.style.borderColor = "rgba(255, 174, 0, 0.3)")}
                                   />
                              </div>

                              {orderForm.order_type === "limit" && (
                                   <div>
                                        <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#FFAE00", fontSize: "14px" }}>Price</label>
                                        <input
                                             type="number"
                                             step="any"
                                             value={orderForm.price}
                                             onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })}
                                             placeholder="50000"
                                             style={{
                                                  width: "100%",
                                                  padding: "12px",
                                                  borderRadius: "8px",
                                                  border: "2px solid rgba(255, 174, 0, 0.3)",
                                                  backgroundColor: "#1a1a1a",
                                                  color: "#ededed",
                                                  fontSize: "14px",
                                                  outline: "none",
                                             }}
                                             onFocus={(e) => (e.target.style.borderColor = "#FFAE00")}
                                             onBlur={(e) => (e.target.style.borderColor = "rgba(255, 174, 0, 0.3)")}
                                        />
                                   </div>
                              )}
                         </div>

                         <button
                              onClick={handlePlaceOrder}
                              disabled={placingOrder}
                              style={{
                                   marginTop: "20px",
                                   padding: "14px 28px",
                                   backgroundColor: placingOrder ? "#666" : orderForm.side === "buy" ? "#22c55e" : "#ef4444",
                                   color: "white",
                                   border: "none",
                                   borderRadius: "8px",
                                   cursor: placingOrder ? "not-allowed" : "pointer",
                                   fontWeight: "bold",
                                   fontSize: "16px",
                                   transition: "all 0.2s ease",
                                   boxShadow: placingOrder ? "none" : orderForm.side === "buy" ? "0 4px 12px rgba(34, 197, 94, 0.3)" : "0 4px 12px rgba(239, 68, 68, 0.3)",
                              }}
                              onMouseEnter={(e) => {
                                   if (!placingOrder) {
                                        e.currentTarget.style.transform = "translateY(-2px)";
                                   }
                              }}
                              onMouseLeave={(e) => {
                                   if (!placingOrder) {
                                        e.currentTarget.style.transform = "translateY(0)";
                                   }
                              }}
                         >
                              {placingOrder ? "⏳ Placing Order..." : `📈 Place ${orderForm.side === "buy" ? "Buy" : "Sell"} Order`}
                         </button>
                    </div>
               )}

               {/* Balance */}
               {selectedAccountId && (
                    <div style={{ marginBottom: "32px" }}>
                         <h2 style={{ color: "#FFAE00", marginBottom: "20px", fontSize: "24px", fontWeight: "bold" }}>Account Balance</h2>
                         {balanceLoading ? (
                              <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
                                   <p>Loading balance...</p>
                              </div>
                         ) : balance ? (
                              <div
                                   style={{
                                        padding: "24px",
                                        backgroundColor: "#2a2a2a",
                                        border: "1px solid rgba(255, 174, 0, 0.2)",
                                        borderRadius: "12px",
                                   }}
                              >
                                   <p style={{ fontWeight: "bold", marginBottom: "20px", color: "#FFAE00", fontSize: "16px" }}>Exchange: {balance.exchange.toUpperCase()}</p>
                                   <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
                                        {Object.entries(balance.balances)
                                             .filter(([, amounts]) => amounts.total > 0)
                                             .map(([currency, amounts]) => (
                                                  <div
                                                       key={currency}
                                                       style={{
                                                            padding: "16px",
                                                            backgroundColor: "#1a1a1a",
                                                            borderRadius: "8px",
                                                            border: "1px solid rgba(255, 174, 0, 0.1)",
                                                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                                                       }}
                                                  >
                                                       <div style={{ fontWeight: "bold", marginBottom: "8px", color: "#FFAE00", fontSize: "16px" }}>{currency}</div>
                                                       <div style={{ fontSize: "13px", color: "#888", marginBottom: "4px" }}>
                                                            Free: <span style={{ color: "#ededed" }}>{amounts.free.toLocaleString(undefined, { maximumFractionDigits: 8 })}</span>
                                                       </div>
                                                       <div style={{ fontSize: "13px", color: "#888", marginBottom: "8px" }}>
                                                            Used: <span style={{ color: "#ededed" }}>{amounts.used.toLocaleString(undefined, { maximumFractionDigits: 8 })}</span>
                                                       </div>
                                                       <div
                                                            style={{
                                                                 fontSize: "18px",
                                                                 fontWeight: "bold",
                                                                 marginTop: "8px",
                                                                 paddingTop: "8px",
                                                                 borderTop: "1px solid rgba(255, 174, 0, 0.1)",
                                                                 color: "#FFAE00",
                                                            }}
                                                       >
                                                            Total: {amounts.total.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                                       </div>
                                                  </div>
                                             ))}
                                   </div>
                                   {Object.keys(balance.balances).filter((c) => balance.balances[c].total > 0).length === 0 && (
                                        <p style={{ color: "#888", marginTop: "12px", textAlign: "center" }}>No balances found</p>
                                   )}
                              </div>
                         ) : (
                              <div style={{ padding: "24px", textAlign: "center", color: "#888", backgroundColor: "#2a2a2a", borderRadius: "12px", border: "1px solid rgba(255, 174, 0, 0.2)" }}>
                                   <p>No balance data available</p>
                              </div>
                         )}
                    </div>
               )}

               {/* Positions */}
               {selectedAccountId && (
                    <div style={{ marginBottom: "32px" }}>
                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                              <h2 style={{ color: "#FFAE00", margin: 0, fontSize: "24px", fontWeight: "bold" }}>Open Positions</h2>
                              <button
                                   onClick={() => {
                                        setShowClosedPositions(!showClosedPositions);
                                        if (!showClosedPositions) {
                                             fetchClosedPositions();
                                        }
                                   }}
                                   style={{
                                        padding: "10px 20px",
                                        backgroundColor: showClosedPositions ? "#6b7280" : "#FFAE00",
                                        color: showClosedPositions ? "#ededed" : "#1a1a1a",
                                        border: "none",
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        transition: "all 0.2s",
                                   }}
                              >
                                   {showClosedPositions ? "Hide" : "Show"} Position History
                              </button>
                         </div>
                         {positionsLoading ? (
                              <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
                                   <p>Loading positions...</p>
                              </div>
                         ) : positions.length > 0 ? (
                              <div style={{ overflowX: "auto" }}>
                                   <table
                                        style={{
                                             width: "100%",
                                             borderCollapse: "collapse",
                                             backgroundColor: "#2a2a2a",
                                             border: "1px solid rgba(255, 174, 0, 0.2)",
                                             borderRadius: "12px",
                                             overflow: "hidden",
                                        }}
                                   >
                                        <thead>
                                             <tr style={{ backgroundColor: "#1a1a1a" }}>
                                                  <th style={{ padding: "14px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Symbol</th>
                                                  <th style={{ padding: "14px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Side</th>
                                                  <th style={{ padding: "14px", textAlign: "right", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Quantity</th>
                                                  <th style={{ padding: "14px", textAlign: "right", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Entry Price</th>
                                                  <th style={{ padding: "14px", textAlign: "right", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Current Price</th>
                                                  <th style={{ padding: "14px", textAlign: "right", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Unrealized P&L</th>
                                                  <th style={{ padding: "14px", textAlign: "right", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Realized P&L</th>
                                                  <th style={{ padding: "14px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Actions</th>
                                             </tr>
                                        </thead>
                                        <tbody>
                                             {positions.map((pos, idx) => {
                                                  const pnl = parseFloat(pos.unrealized_pnl);
                                                  const pnlColor = pnl >= 0 ? "#22c55e" : "#ef4444";
                                                  return (
                                                       <tr
                                                            key={pos.id}
                                                            style={{
                                                                 borderBottom: idx < positions.length - 1 ? "1px solid rgba(255, 174, 0, 0.1)" : "none",
                                                                 backgroundColor: idx % 2 === 0 ? "#2a2a2a" : "#252525",
                                                            }}
                                                       >
                                                            <td style={{ padding: "12px", fontWeight: "bold", color: "#ededed" }}>{pos.symbol}</td>
                                                            <td style={{ padding: "12px" }}>
                                                                 <span
                                                                      style={{
                                                                           padding: "6px 12px",
                                                                           borderRadius: "6px",
                                                                           backgroundColor: pos.side === "buy" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                                                           color: pos.side === "buy" ? "#22c55e" : "#ef4444",
                                                                           fontSize: "12px",
                                                                           fontWeight: "600",
                                                                           border: `1px solid ${pos.side === "buy" ? "#22c55e" : "#ef4444"}`,
                                                                      }}
                                                                 >
                                                                      {pos.side.toUpperCase()}
                                                                 </span>
                                                            </td>
                                                            <td style={{ padding: "12px", textAlign: "right", fontFamily: "monospace", color: "#ededed" }}>
                                                                 {parseFloat(pos.quantity).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                                            </td>
                                                            <td style={{ padding: "12px", textAlign: "right", fontFamily: "monospace", color: "#ededed" }}>
                                                                 ${parseFloat(pos.entry_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                                                            </td>
                                                            <td style={{ padding: "12px", textAlign: "right", fontFamily: "monospace", color: "#ededed" }}>
                                                                 {pos.current_price
                                                                      ? `$${parseFloat(pos.current_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`
                                                                      : "N/A"}
                                                            </td>
                                                            <td style={{ padding: "12px", textAlign: "right", fontFamily: "monospace", color: pnlColor, fontWeight: "bold", fontSize: "15px" }}>
                                                                 {pnl >= 0 ? "+" : ""}${pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </td>
                                                            <td style={{ padding: "12px", textAlign: "right", fontFamily: "monospace", color: "#ededed" }}>
                                                                 ${parseFloat(pos.realized_pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </td>
                                                            <td style={{ padding: "12px" }}>
                                                                 <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                                                                      <button
                                                                           onClick={() => {
                                                                                setSelectedPosition(pos);
                                                                                setShowPositionDetails(true);
                                                                                fetchPositionTrades(pos.symbol);
                                                                           }}
                                                                           style={{
                                                                                padding: "6px 12px",
                                                                                backgroundColor: "#3b82f6",
                                                                                color: "white",
                                                                                border: "none",
                                                                                borderRadius: "6px",
                                                                                cursor: "pointer",
                                                                                fontSize: "12px",
                                                                                fontWeight: "600",
                                                                                transition: "all 0.2s ease",
                                                                           }}
                                                                           onMouseEnter={(e) => {
                                                                                e.currentTarget.style.backgroundColor = "#2563eb";
                                                                                e.currentTarget.style.transform = "translateY(-1px)";
                                                                           }}
                                                                           onMouseLeave={(e) => {
                                                                                e.currentTarget.style.backgroundColor = "#3b82f6";
                                                                                e.currentTarget.style.transform = "translateY(0)";
                                                                           }}
                                                                      >
                                                                           Details
                                                                      </button>
                                                                      <button
                                                                           onClick={() => handleClosePosition(pos.id)}
                                                                           style={{
                                                                                padding: "6px 12px",
                                                                                backgroundColor: "#ef4444",
                                                                                color: "white",
                                                                                border: "none",
                                                                                borderRadius: "6px",
                                                                                cursor: "pointer",
                                                                                fontSize: "12px",
                                                                                fontWeight: "600",
                                                                                transition: "all 0.2s ease",
                                                                           }}
                                                                           onMouseEnter={(e) => {
                                                                                e.currentTarget.style.backgroundColor = "#dc2626";
                                                                                e.currentTarget.style.transform = "translateY(-1px)";
                                                                           }}
                                                                           onMouseLeave={(e) => {
                                                                                e.currentTarget.style.backgroundColor = "#ef4444";
                                                                                e.currentTarget.style.transform = "translateY(0)";
                                                                           }}
                                                                      >
                                                                           Close
                                                                      </button>
                                                                 </div>
                                                            </td>
                                                       </tr>
                                                  );
                                             })}
                                        </tbody>
                                   </table>
                              </div>
                         ) : (
                              <div style={{ padding: "24px", textAlign: "center", color: "#888", backgroundColor: "#2a2a2a", borderRadius: "12px", border: "1px solid rgba(255, 174, 0, 0.2)" }}>
                                   <p>No open positions</p>
                              </div>
                         )}
                    </div>
               )}

               {/* Trade History */}
               {selectedAccountId && (
                    <div style={{ marginBottom: "32px" }}>
                         <h2 style={{ color: "#FFAE00", marginBottom: "20px", fontSize: "24px", fontWeight: "bold" }}>Trade History</h2>
                         {tradesLoading ? (
                              <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
                                   <p>Loading trades...</p>
                              </div>
                         ) : trades.length > 0 ? (
                              <div style={{ overflowX: "auto" }}>
                                   <table
                                        style={{
                                             width: "100%",
                                             borderCollapse: "collapse",
                                             backgroundColor: "#2a2a2a",
                                             border: "1px solid rgba(255, 174, 0, 0.2)",
                                             borderRadius: "12px",
                                             overflow: "hidden",
                                        }}
                                   >
                                        <thead>
                                             <tr style={{ backgroundColor: "#1a1a1a" }}>
                                                  <th style={{ padding: "14px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Symbol</th>
                                                  <th style={{ padding: "14px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Side</th>
                                                  <th style={{ padding: "14px", textAlign: "right", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Quantity</th>
                                                  <th style={{ padding: "14px", textAlign: "right", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Price</th>
                                                  <th style={{ padding: "14px", textAlign: "right", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Fee</th>
                                                  <th style={{ padding: "14px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Order ID</th>
                                                  <th style={{ padding: "14px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Timestamp</th>
                                             </tr>
                                        </thead>
                                        <tbody>
                                             {trades.map((trade, idx) => (
                                                  <tr
                                                       key={trade.id}
                                                       style={{
                                                            borderBottom: idx < trades.length - 1 ? "1px solid rgba(255, 174, 0, 0.1)" : "none",
                                                            backgroundColor: idx % 2 === 0 ? "#2a2a2a" : "#252525",
                                                       }}
                                                  >
                                                       <td style={{ padding: "12px", fontWeight: "bold", color: "#ededed" }}>{trade.symbol}</td>
                                                       <td style={{ padding: "12px" }}>
                                                            <span
                                                                 style={{
                                                                      padding: "6px 12px",
                                                                      borderRadius: "6px",
                                                                      backgroundColor: trade.side === "buy" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                                                      color: trade.side === "buy" ? "#22c55e" : "#ef4444",
                                                                      fontSize: "12px",
                                                                      fontWeight: "600",
                                                                      border: `1px solid ${trade.side === "buy" ? "#22c55e" : "#ef4444"}`,
                                                                 }}
                                                            >
                                                                 {trade.side.toUpperCase()}
                                                            </span>
                                                       </td>
                                                       <td style={{ padding: "12px", textAlign: "right", fontFamily: "monospace", color: "#ededed" }}>
                                                            {parseFloat(trade.quantity).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                                       </td>
                                                       <td style={{ padding: "12px", textAlign: "right", fontFamily: "monospace", color: "#ededed" }}>
                                                            ${parseFloat(trade.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                                                       </td>
                                                       <td style={{ padding: "12px", textAlign: "right", fontFamily: "monospace", color: "#ededed" }}>
                                                            {parseFloat(trade.fee).toLocaleString(undefined, { maximumFractionDigits: 8 })} {trade.fee_currency || ""}
                                                       </td>
                                                       <td style={{ padding: "12px", fontSize: "12px", color: "#888" }}>#{trade.order_id}</td>
                                                       <td style={{ padding: "12px", fontSize: "12px", color: "#888" }}>{new Date(trade.timestamp).toLocaleString()}</td>
                                                  </tr>
                                             ))}
                                        </tbody>
                                   </table>
                              </div>
                         ) : (
                              <div style={{ padding: "24px", textAlign: "center", color: "#888", backgroundColor: "#2a2a2a", borderRadius: "12px", border: "1px solid rgba(255, 174, 0, 0.2)" }}>
                                   <p>No trades found</p>
                              </div>
                         )}
                    </div>
               )}

               {/* Orders */}
               {selectedAccountId && (
                    <div>
                         <h2 style={{ color: "#FFAE00", marginBottom: "20px", fontSize: "24px", fontWeight: "bold" }}>Orders</h2>
                         {ordersLoading ? (
                              <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
                                   <p>Loading orders...</p>
                              </div>
                         ) : orders.length > 0 ? (
                              <div style={{ overflowX: "auto" }}>
                                   <table
                                        style={{
                                             width: "100%",
                                             borderCollapse: "collapse",
                                             backgroundColor: "#2a2a2a",
                                             border: "1px solid rgba(255, 174, 0, 0.2)",
                                             borderRadius: "12px",
                                             overflow: "hidden",
                                        }}
                                   >
                                        <thead>
                                             <tr style={{ backgroundColor: "#1a1a1a" }}>
                                                  <th style={{ padding: "14px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Symbol</th>
                                                  <th style={{ padding: "14px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Side</th>
                                                  <th style={{ padding: "14px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Type</th>
                                                  <th style={{ padding: "14px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Status</th>
                                                  <th style={{ padding: "14px", textAlign: "right", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Quantity</th>
                                                  <th style={{ padding: "14px", textAlign: "right", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Price</th>
                                                  <th style={{ padding: "14px", textAlign: "right", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Filled</th>
                                                  <th style={{ padding: "14px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Created</th>
                                                  <th style={{ padding: "14px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Actions</th>
                                             </tr>
                                        </thead>
                                        <tbody>
                                             {orders.map((order, idx) => {
                                                  const statusColors: Record<string, { bg: string; text: string }> = {
                                                       pending: { bg: "rgba(251, 191, 36, 0.2)", text: "#fbbf24" },
                                                       open: { bg: "rgba(59, 130, 246, 0.2)", text: "#3b82f6" },
                                                       partially_filled: { bg: "rgba(139, 92, 246, 0.2)", text: "#8b5cf6" },
                                                       filled: { bg: "rgba(34, 197, 94, 0.2)", text: "#22c55e" },
                                                       cancelled: { bg: "rgba(107, 114, 128, 0.2)", text: "#6b7280" },
                                                       rejected: { bg: "rgba(239, 68, 68, 0.2)", text: "#ef4444" },
                                                       expired: { bg: "rgba(107, 114, 128, 0.2)", text: "#6b7280" },
                                                  };
                                                  const statusStyle = statusColors[order.status.toLowerCase()] || { bg: "rgba(107, 114, 128, 0.2)", text: "#666" };

                                                  const canCancel = order.status === "pending" || order.status === "open" || order.status === "partially_filled";

                                                  return (
                                                       <tr
                                                            key={order.id}
                                                            style={{
                                                                 borderBottom: idx < orders.length - 1 ? "1px solid rgba(255, 174, 0, 0.1)" : "none",
                                                                 backgroundColor: idx % 2 === 0 ? "#2a2a2a" : "#252525",
                                                            }}
                                                       >
                                                            <td style={{ padding: "12px", fontWeight: "bold", color: "#ededed" }}>{order.symbol}</td>
                                                            <td style={{ padding: "12px" }}>
                                                                 <span
                                                                      style={{
                                                                           padding: "6px 12px",
                                                                           borderRadius: "6px",
                                                                           backgroundColor: order.side === "buy" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                                                           color: order.side === "buy" ? "#22c55e" : "#ef4444",
                                                                           fontSize: "12px",
                                                                           fontWeight: "600",
                                                                           border: `1px solid ${order.side === "buy" ? "#22c55e" : "#ef4444"}`,
                                                                      }}
                                                                 >
                                                                      {order.side.toUpperCase()}
                                                                 </span>
                                                            </td>
                                                            <td style={{ padding: "12px" }}>
                                                                 <span
                                                                      style={{
                                                                           padding: "6px 12px",
                                                                           borderRadius: "6px",
                                                                           backgroundColor: "rgba(107, 114, 128, 0.2)",
                                                                           color: "#9ca3af",
                                                                           fontSize: "12px",
                                                                           fontWeight: "600",
                                                                           border: "1px solid #6b7280",
                                                                      }}
                                                                 >
                                                                      {order.order_type.toUpperCase()}
                                                                 </span>
                                                            </td>
                                                            <td style={{ padding: "12px" }}>
                                                                 <span
                                                                      style={{
                                                                           padding: "6px 12px",
                                                                           borderRadius: "6px",
                                                                           backgroundColor: statusStyle.bg,
                                                                           color: statusStyle.text,
                                                                           fontSize: "12px",
                                                                           fontWeight: "600",
                                                                           border: `1px solid ${statusStyle.text}`,
                                                                      }}
                                                                 >
                                                                      {order.status.toUpperCase().replace("_", " ")}
                                                                 </span>
                                                            </td>
                                                            <td style={{ padding: "12px", textAlign: "right", fontFamily: "monospace", color: "#ededed" }}>
                                                                 {parseFloat(order.quantity).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                                            </td>
                                                            <td style={{ padding: "12px", textAlign: "right", fontFamily: "monospace", color: "#ededed" }}>
                                                                 {order.price
                                                                      ? `$${parseFloat(order.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`
                                                                      : "MARKET"}
                                                            </td>
                                                            <td style={{ padding: "12px", textAlign: "right", fontFamily: "monospace", color: "#ededed" }}>
                                                                 {parseFloat(order.filled_quantity).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                                            </td>
                                                            <td style={{ padding: "12px", fontSize: "12px", color: "#888" }}>{new Date(order.created_at).toLocaleString()}</td>
                                                            <td style={{ padding: "12px" }}>
                                                                 <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                                                                      <button
                                                                           onClick={() => {
                                                                                setSelectedOrder(order);
                                                                                setShowOrderDetails(true);
                                                                           }}
                                                                           style={{
                                                                                padding: "6px 12px",
                                                                                backgroundColor: "#3b82f6",
                                                                                color: "white",
                                                                                border: "none",
                                                                                borderRadius: "6px",
                                                                                cursor: "pointer",
                                                                                fontSize: "12px",
                                                                                fontWeight: "600",
                                                                                transition: "all 0.2s ease",
                                                                           }}
                                                                           onMouseEnter={(e) => {
                                                                                e.currentTarget.style.backgroundColor = "#2563eb";
                                                                                e.currentTarget.style.transform = "translateY(-1px)";
                                                                           }}
                                                                           onMouseLeave={(e) => {
                                                                                e.currentTarget.style.backgroundColor = "#3b82f6";
                                                                                e.currentTarget.style.transform = "translateY(0)";
                                                                           }}
                                                                      >
                                                                           Details
                                                                      </button>
                                                                      <button
                                                                           onClick={() => refreshOrderStatus(order.id)}
                                                                           disabled={refreshingOrderId === order.id}
                                                                           style={{
                                                                                padding: "6px 12px",
                                                                                backgroundColor: refreshingOrderId === order.id ? "#6b7280" : "#FFAE00",
                                                                                color: "white",
                                                                                border: "none",
                                                                                borderRadius: "6px",
                                                                                cursor: refreshingOrderId === order.id ? "not-allowed" : "pointer",
                                                                                fontSize: "12px",
                                                                                fontWeight: "600",
                                                                                transition: "all 0.2s ease",
                                                                           }}
                                                                           onMouseEnter={(e) => {
                                                                                if (refreshingOrderId !== order.id) {
                                                                                     e.currentTarget.style.backgroundColor = "#e6a000";
                                                                                     e.currentTarget.style.transform = "translateY(-1px)";
                                                                                }
                                                                           }}
                                                                           onMouseLeave={(e) => {
                                                                                if (refreshingOrderId !== order.id) {
                                                                                     e.currentTarget.style.backgroundColor = "#FFAE00";
                                                                                     e.currentTarget.style.transform = "translateY(0)";
                                                                                }
                                                                           }}
                                                                      >
                                                                           {refreshingOrderId === order.id ? "..." : "🔄"}
                                                                      </button>
                                                                      {canCancel && (
                                                                           <button
                                                                                onClick={() => handleCancelOrder(order.id)}
                                                                                style={{
                                                                                     padding: "6px 12px",
                                                                                     backgroundColor: "#ef4444",
                                                                                     color: "white",
                                                                                     border: "none",
                                                                                     borderRadius: "6px",
                                                                                     cursor: "pointer",
                                                                                     fontSize: "12px",
                                                                                     fontWeight: "600",
                                                                                     transition: "all 0.2s ease",
                                                                                }}
                                                                                onMouseEnter={(e) => {
                                                                                     e.currentTarget.style.backgroundColor = "#dc2626";
                                                                                     e.currentTarget.style.transform = "translateY(-1px)";
                                                                                }}
                                                                                onMouseLeave={(e) => {
                                                                                     e.currentTarget.style.backgroundColor = "#ef4444";
                                                                                     e.currentTarget.style.transform = "translateY(0)";
                                                                                }}
                                                                           >
                                                                                Cancel
                                                                           </button>
                                                                      )}
                                                                 </div>
                                                                 {order.error_message && (
                                                                      <div
                                                                           style={{
                                                                                fontSize: "11px",
                                                                                color: "#ef4444",
                                                                                marginTop: "4px",
                                                                                padding: "4px",
                                                                                backgroundColor: "rgba(239, 68, 68, 0.1)",
                                                                                borderRadius: "4px",
                                                                           }}
                                                                      >
                                                                           {order.error_message}
                                                                      </div>
                                                                 )}
                                                            </td>
                                                       </tr>
                                                  );
                                             })}
                                        </tbody>
                                   </table>
                              </div>
                         ) : (
                              <div style={{ padding: "24px", textAlign: "center", color: "#888", backgroundColor: "#2a2a2a", borderRadius: "12px", border: "1px solid rgba(255, 174, 0, 0.2)" }}>
                                   <p>No orders found</p>
                              </div>
                         )}
                    </div>
               )}

               {/* Order Details Modal */}
               {showOrderDetails && selectedOrder && (
                    <div
                         style={{
                              position: "fixed",
                              inset: 0,
                              backgroundColor: "rgba(0, 0, 0, 0.7)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              zIndex: 1000,
                              padding: "20px",
                         }}
                         onClick={() => setShowOrderDetails(false)}
                    >
                         <div
                              style={{
                                   backgroundColor: "#2a2a2a",
                                   borderRadius: "12px",
                                   border: "1px solid rgba(255, 174, 0, 0.3)",
                                   padding: "24px",
                                   maxWidth: "800px",
                                   width: "100%",
                                   maxHeight: "90vh",
                                   overflowY: "auto",
                              }}
                              onClick={(e) => e.stopPropagation()}
                         >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                                   <h2 style={{ color: "#FFAE00", margin: 0, fontSize: "24px", fontWeight: "bold" }}>Order Details</h2>
                                   <button
                                        onClick={() => setShowOrderDetails(false)}
                                        style={{
                                             padding: "8px 16px",
                                             backgroundColor: "#6b7280",
                                             color: "white",
                                             border: "none",
                                             borderRadius: "8px",
                                             cursor: "pointer",
                                             fontSize: "14px",
                                             fontWeight: "600",
                                        }}
                                   >
                                        Close
                                   </button>
                              </div>

                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
                                   <div>
                                        <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Order ID</label>
                                        <div style={{ color: "#ededed", fontSize: "14px", fontFamily: "monospace" }}>{selectedOrder.id}</div>
                                   </div>
                                   <div>
                                        <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Symbol</label>
                                        <div style={{ color: "#ededed", fontSize: "14px", fontWeight: "600" }}>{selectedOrder.symbol}</div>
                                   </div>
                                   <div>
                                        <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Side</label>
                                        <div style={{ color: selectedOrder.side === "buy" ? "#22c55e" : "#ef4444", fontSize: "14px", fontWeight: "600" }}>
                                             {selectedOrder.side.toUpperCase()}
                                        </div>
                                   </div>
                                   <div>
                                        <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Order Type</label>
                                        <div style={{ color: "#ededed", fontSize: "14px" }}>{selectedOrder.order_type.toUpperCase()}</div>
                                   </div>
                                   <div>
                                        <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Status</label>
                                        <div style={{ color: "#ededed", fontSize: "14px", fontWeight: "600" }}>
                                             {selectedOrder.status.toUpperCase().replace("_", " ")}
                                        </div>
                                   </div>
                                   <div>
                                        <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Quantity</label>
                                        <div style={{ color: "#ededed", fontSize: "14px", fontFamily: "monospace" }}>
                                             {parseFloat(selectedOrder.quantity).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                        </div>
                                   </div>
                                   <div>
                                        <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Price</label>
                                        <div style={{ color: "#ededed", fontSize: "14px", fontFamily: "monospace" }}>
                                             {selectedOrder.price
                                                  ? `$${parseFloat(selectedOrder.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`
                                                  : "MARKET"}
                                        </div>
                                   </div>
                                   <div>
                                        <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Filled Quantity</label>
                                        <div style={{ color: "#ededed", fontSize: "14px", fontFamily: "monospace" }}>
                                             {parseFloat(selectedOrder.filled_quantity).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                        </div>
                                   </div>
                                   <div>
                                        <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Average Price</label>
                                        <div style={{ color: "#ededed", fontSize: "14px", fontFamily: "monospace" }}>
                                             {selectedOrder.average_price
                                                  ? `$${parseFloat(selectedOrder.average_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`
                                                  : "N/A"}
                                        </div>
                                   </div>
                                   <div>
                                        <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Fee</label>
                                        <div style={{ color: "#ededed", fontSize: "14px", fontFamily: "monospace" }}>
                                             {parseFloat(selectedOrder.fee).toLocaleString(undefined, { maximumFractionDigits: 8 })}{" "}
                                             {selectedOrder.fee_currency || ""}
                                        </div>
                                   </div>
                                   <div>
                                        <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Exchange Order ID</label>
                                        <div style={{ color: "#ededed", fontSize: "14px", fontFamily: "monospace" }}>
                                             {selectedOrder.exchange_order_id || "N/A"}
                                        </div>
                                   </div>
                                   <div>
                                        <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Created At</label>
                                        <div style={{ color: "#ededed", fontSize: "14px" }}>{new Date(selectedOrder.created_at).toLocaleString()}</div>
                                   </div>
                                   <div>
                                        <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Updated At</label>
                                        <div style={{ color: "#ededed", fontSize: "14px" }}>{new Date(selectedOrder.updated_at).toLocaleString()}</div>
                                   </div>
                                   {selectedOrder.executed_at && (
                                        <div>
                                             <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Executed At</label>
                                             <div style={{ color: "#ededed", fontSize: "14px" }}>{new Date(selectedOrder.executed_at).toLocaleString()}</div>
                                        </div>
                                   )}
                                   {selectedOrder.cancelled_at && (
                                        <div>
                                             <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Cancelled At</label>
                                             <div style={{ color: "#ededed", fontSize: "14px" }}>{new Date(selectedOrder.cancelled_at).toLocaleString()}</div>
                                        </div>
                                   )}
                                   {selectedOrder.error_message && (
                                        <div style={{ gridColumn: "1 / -1" }}>
                                             <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Error Message</label>
                                             <div
                                                  style={{
                                                       color: "#ef4444",
                                                       fontSize: "14px",
                                                       padding: "12px",
                                                       backgroundColor: "rgba(239, 68, 68, 0.1)",
                                                       borderRadius: "8px",
                                                       border: "1px solid rgba(239, 68, 68, 0.3)",
                                                  }}
                                             >
                                                  {selectedOrder.error_message}
                                             </div>
                                        </div>
                                   )}
                              </div>

                              <div style={{ marginTop: "24px", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                                   <button
                                        onClick={() => {
                                             refreshOrderStatus(selectedOrder.id);
                                        }}
                                        disabled={refreshingOrderId === selectedOrder.id}
                                        style={{
                                             padding: "10px 20px",
                                             backgroundColor: refreshingOrderId === selectedOrder.id ? "#6b7280" : "#FFAE00",
                                             color: "#1a1a1a",
                                             border: "none",
                                             borderRadius: "8px",
                                             cursor: refreshingOrderId === selectedOrder.id ? "not-allowed" : "pointer",
                                             fontSize: "14px",
                                             fontWeight: "600",
                                        }}
                                   >
                                        {refreshingOrderId === selectedOrder.id ? "Refreshing..." : "🔄 Refresh Status"}
                                   </button>
                              </div>
                         </div>
                    </div>
               )}

               {/* Position Details Modal */}
               {showPositionDetails && selectedPosition && (
                    <div
                         style={{
                              position: "fixed",
                              inset: 0,
                              backgroundColor: "rgba(0, 0, 0, 0.7)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              zIndex: 1000,
                              padding: "20px",
                         }}
                         onClick={() => setShowPositionDetails(false)}
                    >
                         <div
                              style={{
                                   backgroundColor: "#2a2a2a",
                                   borderRadius: "12px",
                                   border: "1px solid rgba(255, 174, 0, 0.3)",
                                   padding: "24px",
                                   maxWidth: "1000px",
                                   width: "100%",
                                   maxHeight: "90vh",
                                   overflowY: "auto",
                              }}
                              onClick={(e) => e.stopPropagation()}
                         >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                                   <h2 style={{ color: "#FFAE00", margin: 0, fontSize: "24px", fontWeight: "bold" }}>Position Details</h2>
                                   <button
                                        onClick={() => setShowPositionDetails(false)}
                                        style={{
                                             padding: "8px 16px",
                                             backgroundColor: "#6b7280",
                                             color: "white",
                                             border: "none",
                                             borderRadius: "8px",
                                             cursor: "pointer",
                                             fontSize: "14px",
                                             fontWeight: "600",
                                        }}
                                   >
                                        Close
                                   </button>
                              </div>

                              {/* Position Info */}
                              <div style={{ marginBottom: "32px" }}>
                                   <h3 style={{ color: "#FFAE00", marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>Position Information</h3>
                                   <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
                                        <div>
                                             <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Position ID</label>
                                             <div style={{ color: "#ededed", fontSize: "14px", fontFamily: "monospace" }}>{selectedPosition.id}</div>
                                        </div>
                                        <div>
                                             <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Symbol</label>
                                             <div style={{ color: "#ededed", fontSize: "14px", fontWeight: "600" }}>{selectedPosition.symbol}</div>
                                        </div>
                                        <div>
                                             <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Side</label>
                                             <div style={{ color: selectedPosition.side === "buy" ? "#22c55e" : "#ef4444", fontSize: "14px", fontWeight: "600" }}>
                                                  {selectedPosition.side.toUpperCase()}
                                             </div>
                                        </div>
                                        <div>
                                             <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Quantity</label>
                                             <div style={{ color: "#ededed", fontSize: "14px", fontFamily: "monospace" }}>
                                                  {parseFloat(selectedPosition.quantity).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                             </div>
                                        </div>
                                        <div>
                                             <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Entry Price</label>
                                             <div style={{ color: "#ededed", fontSize: "14px", fontFamily: "monospace" }}>
                                                  ${parseFloat(selectedPosition.entry_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                                             </div>
                                        </div>
                                        <div>
                                             <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Current Price</label>
                                             <div style={{ color: "#ededed", fontSize: "14px", fontFamily: "monospace" }}>
                                                  {selectedPosition.current_price
                                                       ? `$${parseFloat(selectedPosition.current_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`
                                                       : "N/A"}
                                             </div>
                                        </div>
                                        <div>
                                             <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Unrealized P&L</label>
                                             <div
                                                  style={{
                                                       color: parseFloat(selectedPosition.unrealized_pnl) >= 0 ? "#22c55e" : "#ef4444",
                                                       fontSize: "14px",
                                                       fontFamily: "monospace",
                                                       fontWeight: "600",
                                                  }}
                                             >
                                                  {parseFloat(selectedPosition.unrealized_pnl) >= 0 ? "+" : ""}$
                                                  {parseFloat(selectedPosition.unrealized_pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                             </div>
                                        </div>
                                        <div>
                                             <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Realized P&L</label>
                                             <div
                                                  style={{
                                                       color: parseFloat(selectedPosition.realized_pnl) >= 0 ? "#22c55e" : "#ef4444",
                                                       fontSize: "14px",
                                                       fontFamily: "monospace",
                                                       fontWeight: "600",
                                                  }}
                                             >
                                                  {parseFloat(selectedPosition.realized_pnl) >= 0 ? "+" : ""}$
                                                  {parseFloat(selectedPosition.realized_pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                             </div>
                                        </div>
                                        <div>
                                             <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Opened At</label>
                                             <div style={{ color: "#ededed", fontSize: "14px" }}>{new Date(selectedPosition.opened_at).toLocaleString()}</div>
                                        </div>
                                        <div>
                                             <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Updated At</label>
                                             <div style={{ color: "#ededed", fontSize: "14px" }}>{new Date(selectedPosition.updated_at).toLocaleString()}</div>
                                        </div>
                                        {selectedPosition.closed_at && (
                                             <div>
                                                  <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "4px" }}>Closed At</label>
                                                  <div style={{ color: "#ededed", fontSize: "14px" }}>{new Date(selectedPosition.closed_at).toLocaleString()}</div>
                                             </div>
                                        )}
                                   </div>
                              </div>

                              {/* Entry/Exit History */}
                              <div>
                                   <h3 style={{ color: "#FFAE00", marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>Entry/Exit History</h3>
                                   {positionTradesLoading ? (
                                        <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
                                             <p>Loading trade history...</p>
                                        </div>
                                   ) : positionTrades.length > 0 ? (
                                        <div style={{ overflowX: "auto" }}>
                                             <table
                                                  style={{
                                                       width: "100%",
                                                       borderCollapse: "collapse",
                                                       backgroundColor: "#1a1a1a",
                                                       borderRadius: "8px",
                                                       border: "1px solid rgba(255, 174, 0, 0.2)",
                                                  }}
                                             >
                                                  <thead>
                                                       <tr style={{ backgroundColor: "#2a2a2a", borderBottom: "1px solid rgba(255, 174, 0, 0.2)" }}>
                                                            <th style={{ padding: "12px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Side</th>
                                                            <th style={{ padding: "12px", textAlign: "right", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Quantity</th>
                                                            <th style={{ padding: "12px", textAlign: "right", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Price</th>
                                                            <th style={{ padding: "12px", textAlign: "right", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Fee</th>
                                                            <th style={{ padding: "12px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Order ID</th>
                                                            <th style={{ padding: "12px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "14px" }}>Timestamp</th>
                                                       </tr>
                                                  </thead>
                                                  <tbody>
                                                       {positionTrades.map((trade, idx) => (
                                                            <tr
                                                                 key={trade.id}
                                                                 style={{
                                                                      borderBottom: idx < positionTrades.length - 1 ? "1px solid rgba(255, 174, 0, 0.1)" : "none",
                                                                      backgroundColor: idx % 2 === 0 ? "#2a2a2a" : "#252525",
                                                                 }}
                                                            >
                                                                 <td style={{ padding: "12px" }}>
                                                                      <span
                                                                           style={{
                                                                                padding: "4px 10px",
                                                                                borderRadius: "6px",
                                                                                backgroundColor: trade.side === "buy" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                                                                color: trade.side === "buy" ? "#22c55e" : "#ef4444",
                                                                                fontSize: "12px",
                                                                                fontWeight: "600",
                                                                                border: `1px solid ${trade.side === "buy" ? "#22c55e" : "#ef4444"}`,
                                                                           }}
                                                                      >
                                                                           {trade.side.toUpperCase()}
                                                                      </span>
                                                                 </td>
                                                                 <td style={{ padding: "12px", textAlign: "right", fontFamily: "monospace", color: "#ededed", fontSize: "14px" }}>
                                                                      {parseFloat(trade.quantity).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                                                 </td>
                                                                 <td style={{ padding: "12px", textAlign: "right", fontFamily: "monospace", color: "#ededed", fontSize: "14px" }}>
                                                                      ${parseFloat(trade.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                                                                 </td>
                                                                 <td style={{ padding: "12px", textAlign: "right", fontFamily: "monospace", color: "#888", fontSize: "14px" }}>
                                                                      {parseFloat(trade.fee).toLocaleString(undefined, { maximumFractionDigits: 8 })}{" "}
                                                                      {trade.fee_currency || ""}
                                                                 </td>
                                                                 <td style={{ padding: "12px", fontFamily: "monospace", color: "#888", fontSize: "12px" }}>{trade.order_id}</td>
                                                                 <td style={{ padding: "12px", color: "#888", fontSize: "12px" }}>{new Date(trade.timestamp).toLocaleString()}</td>
                                                            </tr>
                                                       ))}
                                                  </tbody>
                                             </table>
                                        </div>
                                   ) : (
                                        <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
                                             <p>No trade history found for this position.</p>
                                        </div>
                                   )}
                              </div>
                         </div>
                    </div>
               )}
          </div>
     );
}

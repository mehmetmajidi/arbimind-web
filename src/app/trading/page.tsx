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
     const { selectedAccountId, setSelectedAccountId, accounts } = useExchange();
     const [orders, setOrders] = useState<Order[]>([]);
     const [positions, setPositions] = useState<Position[]>([]);
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

     // Fetch data when account changes
     useEffect(() => {
          if (selectedAccountId) {
               fetchOrders();
               fetchPositions();
               fetchBalance();
               fetchTrades();
          }
     }, [selectedAccountId, fetchOrders, fetchPositions, fetchBalance, fetchTrades]);

     // Auto-refresh
     useEffect(() => {
          if (!autoRefresh || !selectedAccountId) return;

          const interval = setInterval(() => {
               fetchOrders();
               fetchPositions();
               fetchBalance();
               fetchTrades();
          }, refreshInterval * 1000);

          return () => clearInterval(interval);
     }, [autoRefresh, refreshInterval, selectedAccountId, fetchOrders, fetchPositions, fetchBalance, fetchTrades]);

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

     if (loading) {
          return (
               <div style={{ padding: "24px", textAlign: "center" }}>
                    <p>Loading...</p>
               </div>
          );
     }

     if (accounts.length === 0) {
          return (
               <div style={{ padding: "24px", textAlign: "center" }}>
                    <h1>Trading</h1>
                    <p style={{ color: "#666", marginTop: "16px" }}>No active exchange accounts found.</p>
                    <p style={{ marginTop: "8px" }}>
                         <a href="/settings" style={{ color: "#0070f3", textDecoration: "underline" }}>
                              Add an exchange account
                         </a>{" "}
                         to start trading.
                    </p>
               </div>
          );
     }

     return (
          <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
               <h1>Trading Dashboard</h1>

               {error && (
                    <div
                         style={{
                              padding: "12px",
                              backgroundColor: "#fee",
                              border: "1px solid #fcc",
                              borderRadius: "4px",
                              marginBottom: "16px",
                              color: "#c00",
                         }}
                    >
                         {error}
                         <button
                              onClick={() => setError(null)}
                              style={{
                                   float: "right",
                                   background: "none",
                                   border: "none",
                                   color: "#c00",
                                   cursor: "pointer",
                                   fontSize: "18px",
                              }}
                         >
                              ×
                         </button>
                    </div>
               )}

               {/* Controls */}
               <div
                    style={{
                         display: "grid",
                         gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                         gap: "16px",
                         marginBottom: "24px",
                         padding: "16px",
                         backgroundColor: "#f5f5f5",
                         borderRadius: "8px",
                    }}
               >
                    <div>
                         <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} style={{ marginRight: "8px" }} />
                              Auto Refresh
                         </label>
                         {autoRefresh && (
                              <select
                                   value={refreshInterval}
                                   onChange={(e) => setRefreshInterval(Number(e.target.value))}
                                   style={{
                                        width: "100%",
                                        padding: "8px",
                                        marginTop: "4px",
                                        borderRadius: "4px",
                                        border: "1px solid #ddd",
                                   }}
                              >
                                   <option value={5}>Every 5 seconds</option>
                                   <option value={10}>Every 10 seconds</option>
                                   <option value={30}>Every 30 seconds</option>
                                   <option value={60}>Every 1 minute</option>
                              </select>
                         )}
                    </div>

                    <div>
                         <button
                              onClick={() => setShowOrderForm(!showOrderForm)}
                              style={{
                                   width: "100%",
                                   padding: "12px",
                                   backgroundColor: showOrderForm ? "#0070f3" : "#22c55e",
                                   color: "white",
                                   border: "none",
                                   borderRadius: "4px",
                                   cursor: "pointer",
                                   fontWeight: "bold",
                                   fontSize: "16px",
                              }}
                         >
                              {showOrderForm ? "Cancel" : "+ Place Order"}
                         </button>
                    </div>
               </div>

               {/* Order Form */}
               {showOrderForm && selectedAccountId && (
                    <div
                         style={{
                              padding: "24px",
                              backgroundColor: "#fff",
                              border: "1px solid #eaeaea",
                              borderRadius: "8px",
                              marginBottom: "24px",
                         }}
                    >
                         <h2>Place Order</h2>
                         <div
                              style={{
                                   display: "grid",
                                   gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                   gap: "16px",
                              }}
                         >
                              <div>
                                   <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Symbol (e.g., BTC/USDT):</label>
                                   <input
                                        type="text"
                                        value={orderForm.symbol}
                                        onChange={(e) => setOrderForm({ ...orderForm, symbol: e.target.value.toUpperCase() })}
                                        placeholder="BTC/USDT"
                                        style={{
                                             width: "100%",
                                             padding: "8px",
                                             borderRadius: "4px",
                                             border: "1px solid #ddd",
                                        }}
                                   />
                              </div>

                              <div>
                                   <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Side:</label>
                                   <select
                                        value={orderForm.side}
                                        onChange={(e) => setOrderForm({ ...orderForm, side: e.target.value })}
                                        style={{
                                             width: "100%",
                                             padding: "8px",
                                             borderRadius: "4px",
                                             border: "1px solid #ddd",
                                        }}
                                   >
                                        <option value="buy">Buy</option>
                                        <option value="sell">Sell</option>
                                   </select>
                              </div>

                              <div>
                                   <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Order Type:</label>
                                   <select
                                        value={orderForm.order_type}
                                        onChange={(e) => setOrderForm({ ...orderForm, order_type: e.target.value })}
                                        style={{
                                             width: "100%",
                                             padding: "8px",
                                             borderRadius: "4px",
                                             border: "1px solid #ddd",
                                        }}
                                   >
                                        <option value="market">Market</option>
                                        <option value="limit">Limit</option>
                                   </select>
                              </div>

                              <div>
                                   <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Quantity:</label>
                                   <input
                                        type="number"
                                        step="any"
                                        value={orderForm.quantity}
                                        onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                                        placeholder="0.001"
                                        style={{
                                             width: "100%",
                                             padding: "8px",
                                             borderRadius: "4px",
                                             border: "1px solid #ddd",
                                        }}
                                   />
                              </div>

                              {orderForm.order_type === "limit" && (
                                   <div>
                                        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Price:</label>
                                        <input
                                             type="number"
                                             step="any"
                                             value={orderForm.price}
                                             onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })}
                                             placeholder="50000"
                                             style={{
                                                  width: "100%",
                                                  padding: "8px",
                                                  borderRadius: "4px",
                                                  border: "1px solid #ddd",
                                             }}
                                        />
                                   </div>
                              )}
                         </div>

                         <button
                              onClick={handlePlaceOrder}
                              disabled={placingOrder}
                              style={{
                                   marginTop: "16px",
                                   padding: "12px 24px",
                                   backgroundColor: placingOrder ? "#ccc" : "#0070f3",
                                   color: "white",
                                   border: "none",
                                   borderRadius: "4px",
                                   cursor: placingOrder ? "not-allowed" : "pointer",
                                   fontWeight: "bold",
                                   fontSize: "16px",
                              }}
                         >
                              {placingOrder ? "Placing Order..." : "Place Order"}
                         </button>
                    </div>
               )}

               {/* Balance */}
               {selectedAccountId && (
                    <div style={{ marginBottom: "24px" }}>
                         <h2>Balance</h2>
                         {balanceLoading ? (
                              <p>Loading balance...</p>
                         ) : balance ? (
                              <div
                                   style={{
                                        padding: "16px",
                                        backgroundColor: "#fff",
                                        border: "1px solid #eaeaea",
                                        borderRadius: "8px",
                                   }}
                              >
                                   <p style={{ fontWeight: "bold", marginBottom: "12px" }}>Exchange: {balance.exchange.toUpperCase()}</p>
                                   <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
                                        {Object.entries(balance.balances)
                                             .filter(([, amounts]) => amounts.total > 0)
                                             .map(([currency, amounts]) => (
                                                  <div
                                                       key={currency}
                                                       style={{
                                                            padding: "12px",
                                                            backgroundColor: "#f5f5f5",
                                                            borderRadius: "4px",
                                                       }}
                                                  >
                                                       <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{currency}</div>
                                                       <div style={{ fontSize: "14px", color: "#666" }}>Free: {amounts.free.toLocaleString(undefined, { maximumFractionDigits: 8 })}</div>
                                                       <div style={{ fontSize: "14px", color: "#666" }}>Used: {amounts.used.toLocaleString(undefined, { maximumFractionDigits: 8 })}</div>
                                                       <div style={{ fontSize: "16px", fontWeight: "bold", marginTop: "4px" }}>
                                                            Total: {amounts.total.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                                       </div>
                                                  </div>
                                             ))}
                                   </div>
                                   {Object.keys(balance.balances).filter((c) => balance.balances[c].total > 0).length === 0 && <p style={{ color: "#666", marginTop: "12px" }}>No balances found</p>}
                              </div>
                         ) : (
                              <p style={{ color: "#666" }}>No balance data available</p>
                         )}
                    </div>
               )}

               {/* Positions */}
               {selectedAccountId && (
                    <div style={{ marginBottom: "24px" }}>
                         <h2>Open Positions</h2>
                         {positionsLoading ? (
                              <p>Loading positions...</p>
                         ) : positions.length > 0 ? (
                              <div style={{ overflowX: "auto" }}>
                                   <table
                                        style={{
                                             width: "100%",
                                             borderCollapse: "collapse",
                                             backgroundColor: "#fff",
                                             border: "1px solid #eaeaea",
                                             borderRadius: "8px",
                                        }}
                                   >
                                        <thead>
                                             <tr style={{ backgroundColor: "#f5f5f5" }}>
                                                  <th style={{ padding: "12px", textAlign: "left" }}>Symbol</th>
                                                  <th style={{ padding: "12px", textAlign: "left" }}>Side</th>
                                                  <th style={{ padding: "12px", textAlign: "right" }}>Quantity</th>
                                                  <th style={{ padding: "12px", textAlign: "right" }}>Entry Price</th>
                                                  <th style={{ padding: "12px", textAlign: "right" }}>Current Price</th>
                                                  <th style={{ padding: "12px", textAlign: "right" }}>Unrealized P&L</th>
                                                  <th style={{ padding: "12px", textAlign: "right" }}>Realized P&L</th>
                                                  <th style={{ padding: "12px", textAlign: "left" }}>Actions</th>
                                             </tr>
                                        </thead>
                                        <tbody>
                                             {positions.map((pos) => {
                                                  const pnl = parseFloat(pos.unrealized_pnl);
                                                  const pnlColor = pnl >= 0 ? "green" : "red";
                                                  return (
                                                       <tr key={pos.id} style={{ borderBottom: "1px solid #eaeaea" }}>
                                                            <td style={{ padding: "8px", fontWeight: "bold" }}>{pos.symbol}</td>
                                                            <td style={{ padding: "8px" }}>
                                                                 <span
                                                                      style={{
                                                                           padding: "4px 8px",
                                                                           borderRadius: "4px",
                                                                           backgroundColor: pos.side === "buy" ? "#22c55e" : "#ef4444",
                                                                           color: "white",
                                                                           fontSize: "12px",
                                                                      }}
                                                                 >
                                                                      {pos.side.toUpperCase()}
                                                                 </span>
                                                            </td>
                                                            <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace" }}>
                                                                 {parseFloat(pos.quantity).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                                            </td>
                                                            <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace" }}>
                                                                 ${parseFloat(pos.entry_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                                                            </td>
                                                            <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace" }}>
                                                                 {pos.current_price
                                                                      ? `$${parseFloat(pos.current_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`
                                                                      : "N/A"}
                                                            </td>
                                                            <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace", color: pnlColor, fontWeight: "bold" }}>
                                                                 ${pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </td>
                                                            <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace" }}>
                                                                 ${parseFloat(pos.realized_pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </td>
                                                            <td style={{ padding: "8px" }}>
                                                                 <button
                                                                      onClick={() => handleClosePosition(pos.id)}
                                                                      style={{
                                                                           padding: "4px 8px",
                                                                           backgroundColor: "#ef4444",
                                                                           color: "white",
                                                                           border: "none",
                                                                           borderRadius: "4px",
                                                                           cursor: "pointer",
                                                                           fontSize: "12px",
                                                                      }}
                                                                 >
                                                                      Close
                                                                 </button>
                                                            </td>
                                                       </tr>
                                                  );
                                             })}
                                        </tbody>
                                   </table>
                              </div>
                         ) : (
                              <p style={{ color: "#666" }}>No open positions</p>
                         )}
                    </div>
               )}

               {/* Trade History */}
               {selectedAccountId && (
                    <div style={{ marginBottom: "24px" }}>
                         <h2>Trade History</h2>
                         {tradesLoading ? (
                              <p>Loading trades...</p>
                         ) : trades.length > 0 ? (
                              <div style={{ overflowX: "auto" }}>
                                   <table
                                        style={{
                                             width: "100%",
                                             borderCollapse: "collapse",
                                             backgroundColor: "#fff",
                                             border: "1px solid #eaeaea",
                                             borderRadius: "8px",
                                        }}
                                   >
                                        <thead>
                                             <tr style={{ backgroundColor: "#f5f5f5" }}>
                                                  <th style={{ padding: "12px", textAlign: "left" }}>Symbol</th>
                                                  <th style={{ padding: "12px", textAlign: "left" }}>Side</th>
                                                  <th style={{ padding: "12px", textAlign: "right" }}>Quantity</th>
                                                  <th style={{ padding: "12px", textAlign: "right" }}>Price</th>
                                                  <th style={{ padding: "12px", textAlign: "right" }}>Fee</th>
                                                  <th style={{ padding: "12px", textAlign: "left" }}>Order ID</th>
                                                  <th style={{ padding: "12px", textAlign: "left" }}>Timestamp</th>
                                             </tr>
                                        </thead>
                                        <tbody>
                                             {trades.map((trade) => (
                                                  <tr key={trade.id} style={{ borderBottom: "1px solid #eaeaea" }}>
                                                       <td style={{ padding: "8px", fontWeight: "bold" }}>{trade.symbol}</td>
                                                       <td style={{ padding: "8px" }}>
                                                            <span
                                                                 style={{
                                                                      padding: "4px 8px",
                                                                      borderRadius: "4px",
                                                                      backgroundColor: trade.side === "buy" ? "#22c55e" : "#ef4444",
                                                                      color: "white",
                                                                      fontSize: "12px",
                                                                 }}
                                                            >
                                                                 {trade.side.toUpperCase()}
                                                            </span>
                                                       </td>
                                                       <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace" }}>
                                                            {parseFloat(trade.quantity).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                                       </td>
                                                       <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace" }}>
                                                            ${parseFloat(trade.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                                                       </td>
                                                       <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace" }}>
                                                            {parseFloat(trade.fee).toLocaleString(undefined, { maximumFractionDigits: 8 })} {trade.fee_currency || ""}
                                                       </td>
                                                       <td style={{ padding: "8px", fontSize: "12px", color: "#666" }}>#{trade.order_id}</td>
                                                       <td style={{ padding: "8px", fontSize: "12px" }}>{new Date(trade.timestamp).toLocaleString()}</td>
                                                  </tr>
                                             ))}
                                        </tbody>
                                   </table>
                              </div>
                         ) : (
                              <p style={{ color: "#666" }}>No trades found</p>
                         )}
                    </div>
               )}

               {/* Orders */}
               {selectedAccountId && (
                    <div>
                         <h2>Orders</h2>
                         {ordersLoading ? (
                              <p>Loading orders...</p>
                         ) : orders.length > 0 ? (
                              <div style={{ overflowX: "auto" }}>
                                   <table
                                        style={{
                                             width: "100%",
                                             borderCollapse: "collapse",
                                             backgroundColor: "#fff",
                                             border: "1px solid #eaeaea",
                                             borderRadius: "8px",
                                        }}
                                   >
                                        <thead>
                                             <tr style={{ backgroundColor: "#f5f5f5" }}>
                                                  <th style={{ padding: "12px", textAlign: "left" }}>Symbol</th>
                                                  <th style={{ padding: "12px", textAlign: "left" }}>Side</th>
                                                  <th style={{ padding: "12px", textAlign: "left" }}>Type</th>
                                                  <th style={{ padding: "12px", textAlign: "left" }}>Status</th>
                                                  <th style={{ padding: "12px", textAlign: "right" }}>Quantity</th>
                                                  <th style={{ padding: "12px", textAlign: "right" }}>Price</th>
                                                  <th style={{ padding: "12px", textAlign: "right" }}>Filled</th>
                                                  <th style={{ padding: "12px", textAlign: "left" }}>Created</th>
                                                  <th style={{ padding: "12px", textAlign: "left" }}>Actions</th>
                                             </tr>
                                        </thead>
                                        <tbody>
                                             {orders.map((order) => {
                                                  const statusColors: Record<string, string> = {
                                                       pending: "#fbbf24",
                                                       open: "#3b82f6",
                                                       partially_filled: "#8b5cf6",
                                                       filled: "#22c55e",
                                                       cancelled: "#6b7280",
                                                       rejected: "#ef4444",
                                                       expired: "#6b7280",
                                                  };
                                                  const statusColor = statusColors[order.status.toLowerCase()] || "#666";

                                                  const canCancel = order.status === "pending" || order.status === "open" || order.status === "partially_filled";

                                                  return (
                                                       <tr key={order.id} style={{ borderBottom: "1px solid #eaeaea" }}>
                                                            <td style={{ padding: "8px", fontWeight: "bold" }}>{order.symbol}</td>
                                                            <td style={{ padding: "8px" }}>
                                                                 <span
                                                                      style={{
                                                                           padding: "4px 8px",
                                                                           borderRadius: "4px",
                                                                           backgroundColor: order.side === "buy" ? "#22c55e" : "#ef4444",
                                                                           color: "white",
                                                                           fontSize: "12px",
                                                                      }}
                                                                 >
                                                                      {order.side.toUpperCase()}
                                                                 </span>
                                                            </td>
                                                            <td style={{ padding: "8px" }}>
                                                                 <span
                                                                      style={{
                                                                           padding: "4px 8px",
                                                                           borderRadius: "4px",
                                                                           backgroundColor: "#e5e7eb",
                                                                           fontSize: "12px",
                                                                      }}
                                                                 >
                                                                      {order.order_type.toUpperCase()}
                                                                 </span>
                                                            </td>
                                                            <td style={{ padding: "8px" }}>
                                                                 <span
                                                                      style={{
                                                                           padding: "4px 8px",
                                                                           borderRadius: "4px",
                                                                           backgroundColor: statusColor,
                                                                           color: "white",
                                                                           fontSize: "12px",
                                                                      }}
                                                                 >
                                                                      {order.status.toUpperCase().replace("_", " ")}
                                                                 </span>
                                                            </td>
                                                            <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace" }}>
                                                                 {parseFloat(order.quantity).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                                            </td>
                                                            <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace" }}>
                                                                 {order.price
                                                                      ? `$${parseFloat(order.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`
                                                                      : "MARKET"}
                                                            </td>
                                                            <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace" }}>
                                                                 {parseFloat(order.filled_quantity).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                                            </td>
                                                            <td style={{ padding: "8px", fontSize: "12px" }}>{new Date(order.created_at).toLocaleString()}</td>
                                                            <td style={{ padding: "8px" }}>
                                                                 {canCancel && (
                                                                      <button
                                                                           onClick={() => handleCancelOrder(order.id)}
                                                                           style={{
                                                                                padding: "4px 8px",
                                                                                backgroundColor: "#ef4444",
                                                                                color: "white",
                                                                                border: "none",
                                                                                borderRadius: "4px",
                                                                                cursor: "pointer",
                                                                                fontSize: "12px",
                                                                           }}
                                                                      >
                                                                           Cancel
                                                                      </button>
                                                                 )}
                                                                 {order.error_message && <div style={{ fontSize: "11px", color: "#ef4444", marginTop: "4px" }}>{order.error_message}</div>}
                                                            </td>
                                                       </tr>
                                                  );
                                             })}
                                        </tbody>
                                   </table>
                              </div>
                         ) : (
                              <p style={{ color: "#666" }}>No orders found</p>
                         )}
                    </div>
               )}
          </div>
     );
}

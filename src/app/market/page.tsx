"use client";

import { useState, useEffect, useCallback } from "react";
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Area } from "recharts";

interface ExchangeAccount {
     id: number;
     exchange_name: string;
     is_active: boolean;
}

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
     const [accounts, setAccounts] = useState<ExchangeAccount[]>([]);
     const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
     const [markets, setMarkets] = useState<Market[]>([]);
     const [selectedSymbol, setSelectedSymbol] = useState<string>("");
     const [timeframe, setTimeframe] = useState<string>("1h");
     const [priceData, setPriceData] = useState<PriceData | null>(null);
     const [ohlcvData, setOhlcvData] = useState<OHLCVCandle[]>([]);
     const [loading, setLoading] = useState(true);
     const [priceLoading, setPriceLoading] = useState(false);
     const [ohlcvLoading, setOhlcvLoading] = useState(false);
     const [error, setError] = useState<string | null>(null);
     const [autoRefresh, setAutoRefresh] = useState(true);
     const [refreshInterval, setRefreshInterval] = useState(5); // seconds
     const [useWebSocket, setUseWebSocket] = useState(false);
     const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

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

     // Fetch user's exchange accounts
     useEffect(() => {
          const fetchAccounts = async () => {
               try {
                    const token = localStorage.getItem("auth_token") || "";
                    if (!token) {
                         setError("Please login to view market data");
                         setLoading(false);
                         return;
                    }

                    const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

                    console.log("Fetching accounts from:", `${apiUrl}/exchange/accounts`);
                    const response = await fetch(`${apiUrl}/exchange/accounts`, {
                         headers: { Authorization: `Bearer ${token}` },
                    });

                    console.log("Accounts response status:", response.status);

                    if (response.ok) {
                         const data = await response.json();
                         console.log("Accounts data received:", data);

                         // Response is a list of ExchangeAccountResponse
                         const accountsList = Array.isArray(data) ? data : [];
                         const activeAccounts = accountsList.filter((acc: ExchangeAccount) => acc.is_active);
                         setAccounts(activeAccounts);
                         setError(null);

                         // Auto-select first account if available
                         if (activeAccounts.length > 0 && selectedAccountId === null) {
                              setSelectedAccountId(activeAccounts[0].id);
                         }
                    } else if (response.status === 401) {
                         setError("Please login to view market data. Token expired or invalid.");
                         localStorage.removeItem("auth_token");
                    } else {
                         const errorData = await response.json().catch(() => ({}));
                         setError(errorData.detail || `Failed to load exchange accounts (${response.status})`);
                    }
               } catch (error) {
                    console.error("Error fetching accounts:", error);
                    setError(`Failed to load exchange accounts: ${error instanceof Error ? error.message : "Unknown error"}`);
               } finally {
                    setLoading(false);
               }
          };

          fetchAccounts();
     }, [selectedAccountId]);

     // Fetch markets when account changes
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

                    console.log("Fetching markets for account:", selectedAccountId);
                    const response = await fetch(`${apiUrl}/market/pairs/${selectedAccountId}`, {
                         headers: { Authorization: `Bearer ${token}` },
                    });

                    console.log("Markets response status:", response.status);

                    if (response.ok) {
                         const data = await response.json();
                         console.log("Markets data received:", data);
                         const marketsList = data.markets || [];
                         setMarkets(marketsList);
                         setError(null);

                         // Auto-select first symbol if available
                         if (marketsList.length > 0 && selectedSymbol === "") {
                              setSelectedSymbol(marketsList[0].symbol);
                         }
                    } else {
                         const errorData = await response.json().catch(() => ({}));
                         const errorMsg = errorData.detail || `Failed to load trading pairs (${response.status})`;
                         setError(errorMsg);
                         console.error("Error loading markets:", errorMsg);
                    }
               } catch (error) {
                    console.error("Error fetching markets:", error);
                    setError(`Failed to load trading pairs: ${error instanceof Error ? error.message : "Unknown error"}`);
               }
          };

          fetchMarkets();
     }, [selectedAccountId, selectedSymbol]);

     // Fetch price data
     const fetchPrice = useCallback(async () => {
          if (!selectedAccountId || !selectedSymbol) return;

          setPriceLoading(true);
          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) {
                    setError("Please login to view market data");
                    setPriceLoading(false);
                    return;
               }

               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

               // URL encode symbol to handle special characters like /
               const encodedSymbol = encodeURIComponent(selectedSymbol);
               console.log("Fetching price for:", selectedSymbol, "encoded:", encodedSymbol);

               const response = await fetch(`${apiUrl}/market/price/${selectedAccountId}/${encodedSymbol}`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               console.log("Price response status:", response.status);

               if (response.ok) {
                    const data = await response.json();
                    console.log("Price data received:", data);
                    setPriceData(data);
                    setError(null);
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMsg = errorData.detail || `Failed to fetch price (${response.status})`;
                    setError(errorMsg);
                    console.error("Error fetching price:", errorMsg);
               }
          } catch (error) {
               console.error("Error fetching price:", error);
               setError(`Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
          } finally {
               setPriceLoading(false);
          }
     }, [selectedAccountId, selectedSymbol]);

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

               // URL encode symbol to handle special characters like /
               const encodedSymbol = encodeURIComponent(selectedSymbol);
               console.log("Fetching OHLCV for:", selectedSymbol, "timeframe:", timeframe);

               const response = await fetch(`${apiUrl}/market/ohlcv/${selectedAccountId}/${encodedSymbol}?timeframe=${timeframe}&limit=100`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               console.log("OHLCV response status:", response.status);

               if (response.ok) {
                    const data = await response.json();
                    console.log("OHLCV data received, candles count:", data.candles?.length || 0);
                    setOhlcvData(data.candles || []);
                    setError(null);
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMsg = errorData.detail || `Failed to fetch OHLCV data (${response.status})`;
                    setError(errorMsg);
                    console.error("Error fetching OHLCV:", errorMsg);
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
               const horizonsParam = selectedHorizons.join(",");

               const response = await fetch(`${apiUrl}/predictions/${encodedSymbol}?horizons=${horizonsParam}&exchange_account_id=${selectedAccountId}`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setPredictions(data.predictions || {});
               } else {
                    console.error("Failed to fetch predictions:", response.status);
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
               fetchPrice();
               fetchOHLCV();
          }
     }, [selectedAccountId, selectedSymbol, timeframe, fetchPrice, fetchOHLCV]);

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
               const response = await fetch(`${apiUrl}/predictions/accuracy/stats?symbol=${selectedSymbol || ""}&days=30`, {
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

     // WebSocket connection for real-time updates
     useEffect(() => {
          if (!useWebSocket || !autoRefresh || !selectedAccountId || !selectedSymbol) {
               // Close WebSocket if disabled
               if (wsConnection && (wsConnection.readyState === WebSocket.OPEN || wsConnection.readyState === WebSocket.CONNECTING)) {
                    wsConnection.close();
                    setWsConnection(null);
               }
               return;
          }

          const token = localStorage.getItem("auth_token");
          if (!token) {
               setError("Please login to use WebSocket");
               return;
          }

          const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const encodedSymbol = encodeURIComponent(selectedSymbol);

          // Convert http to ws
          const wsUrl = apiUrl.replace("http://", "ws://").replace("https://", "wss://");
          const wsEndpoint = `${wsUrl}/ws/price/${selectedAccountId}/${encodedSymbol}?token=${token}&interval=${refreshInterval}`;

          console.log("Connecting to WebSocket:", wsEndpoint);

          const ws = new WebSocket(wsEndpoint);

          ws.onopen = () => {
               console.log("WebSocket connected");
               setError(null);
               setWsConnection(ws);
          };

          ws.onmessage = (event) => {
               try {
                    const data = JSON.parse(event.data);
                    console.log("WebSocket message received:", data);

                    if (data.type === "price_update" && data.data) {
                         setPriceData(data.data);
                         setError(null);
                    } else if (data.type === "error") {
                         setError(data.message || "WebSocket error");
                    } else if (data.type === "connected") {
                         console.log("WebSocket connected:", data.message);
                    }
               } catch (error) {
                    console.error("Error parsing WebSocket message:", error);
               }
          };

          ws.onerror = (error) => {
               console.error("WebSocket error:", error);
               setError("WebSocket connection error");
          };

          ws.onclose = () => {
               console.log("WebSocket disconnected");
               setWsConnection(null);
          };

          return () => {
               if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                    ws.close();
               }
          };
     }, [useWebSocket, autoRefresh, selectedAccountId, selectedSymbol, refreshInterval, wsConnection]);

     // Auto-refresh price (fallback when WebSocket is disabled)
     useEffect(() => {
          if (useWebSocket || !autoRefresh || !selectedAccountId || !selectedSymbol) return;

          const interval = setInterval(() => {
               fetchPrice();
          }, refreshInterval * 1000);

          return () => clearInterval(interval);
     }, [useWebSocket, autoRefresh, refreshInterval, selectedAccountId, selectedSymbol, fetchPrice]);

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
          <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
               <h1>Market Data Dashboard</h1>

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
                         <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Exchange Account:</label>
                         <select
                              value={selectedAccountId || ""}
                              onChange={(e) => {
                                   setSelectedAccountId(Number(e.target.value));
                                   setSelectedSymbol(""); // Reset symbol when account changes
                              }}
                              style={{
                                   width: "100%",
                                   padding: "8px",
                                   borderRadius: "4px",
                                   border: "1px solid #ddd",
                              }}
                         >
                              <option value="">Select Exchange</option>
                              {accounts.map((acc) => (
                                   <option key={acc.id} value={acc.id}>
                                        {(acc.exchange_name || acc.exchange_name || "Unknown").toUpperCase()}
                                   </option>
                              ))}
                         </select>
                    </div>

                    <div>
                         <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Trading Pair:</label>
                         <select
                              value={selectedSymbol}
                              onChange={(e) => setSelectedSymbol(e.target.value)}
                              disabled={!selectedAccountId || markets.length === 0}
                              style={{
                                   width: "100%",
                                   padding: "8px",
                                   borderRadius: "4px",
                                   border: "1px solid #ddd",
                              }}
                         >
                              <option value="">Select Symbol</option>
                              {markets.map((market) => (
                                   <option key={market.symbol} value={market.symbol}>
                                        {market.symbol}
                                   </option>
                              ))}
                         </select>
                    </div>

                    <div>
                         <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Timeframe:</label>
                         <select
                              value={timeframe}
                              onChange={(e) => setTimeframe(e.target.value)}
                              disabled={!selectedSymbol}
                              style={{
                                   width: "100%",
                                   padding: "8px",
                                   borderRadius: "4px",
                                   border: "1px solid #ddd",
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

                    <div>
                         <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} style={{ marginRight: "8px" }} />
                              Auto Refresh
                         </label>
                         {autoRefresh && (
                              <>
                                   <label style={{ display: "block", marginTop: "8px", marginBottom: "4px" }}>
                                        <input type="checkbox" checked={useWebSocket} onChange={(e) => setUseWebSocket(e.target.checked)} style={{ marginRight: "8px" }} />
                                        Use WebSocket (Real-time)
                                   </label>
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
                              </>
                         )}
                    </div>
               </div>

               {/* Prediction Panel */}
               {selectedSymbol && showPredictions && (
                    <div style={{ marginBottom: "24px" }}>
                         <h2>Price Predictions</h2>
                         {predictionsLoading ? (
                              <p>Loading predictions...</p>
                         ) : Object.keys(predictions).length > 0 ? (
                              <div
                                   style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                        gap: "16px",
                                        padding: "16px",
                                        backgroundColor: "#fff",
                                        border: "1px solid #eaeaea",
                                        borderRadius: "8px",
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
                                                       padding: "12px",
                                                       border: `2px solid ${color}`,
                                                       borderRadius: "8px",
                                                       backgroundColor: "#fafafa",
                                                  }}
                                             >
                                                  <div style={{ fontSize: "14px", fontWeight: "bold", color: "#666", marginBottom: "8px" }}>{horizon.toUpperCase()}</div>
                                                  <div style={{ fontSize: "20px", fontWeight: "bold", color: color, marginBottom: "4px" }}>
                                                       ${pred.predicted_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                                                  </div>
                                                  <div style={{ fontSize: "12px", color: changeColor, marginBottom: "4px" }}>
                                                       {changePercent >= 0 ? "+" : ""}
                                                       {changePercent.toFixed(2)}%
                                                  </div>
                                                  <div style={{ fontSize: "11px", color: "#666" }}>Confidence: {(pred.confidence * 100).toFixed(1)}%</div>
                                                  <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
                                                       Range: ${pred.lower_bound.toFixed(2)} - ${pred.upper_bound.toFixed(2)}
                                                  </div>
                                                  {/* Quick Trade buttons */}
                                                  {changePercent > 0.5 && (
                                                       <button
                                                            onClick={async () => {
                                                                 if (!selectedAccountId || !selectedSymbol) return;
                                                                 if (!confirm(`Buy ${selectedSymbol} based on ${horizon} prediction?`)) return;

                                                                 try {
                                                                      const token = localStorage.getItem("auth_token");
                                                                      if (!token) return;

                                                                      const apiUrl =
                                                                           typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

                                                                      // Get current price for quantity calculation (simplified - use 1% of available balance)
                                                                      const response = await fetch(`${apiUrl}/trading/orders/place`, {
                                                                           method: "POST",
                                                                           headers: {
                                                                                Authorization: `Bearer ${token}`,
                                                                                "Content-Type": "application/json",
                                                                           },
                                                                           body: JSON.stringify({
                                                                                exchange_account_id: selectedAccountId,
                                                                                symbol: selectedSymbol,
                                                                                side: "buy",
                                                                                order_type: "market",
                                                                                quantity: 0.001, // Small test amount
                                                                           }),
                                                                      });

                                                                      if (response.ok) {
                                                                           alert("Order placed successfully!");
                                                                      } else {
                                                                           const errorData = await response.json().catch(() => ({}));
                                                                           alert(`Failed to place order: ${errorData.detail || "Unknown error"}`);
                                                                      }
                                                                 } catch (error) {
                                                                      console.error("Error placing order:", error);
                                                                      alert("Network error. Please try again.");
                                                                 }
                                                            }}
                                                            style={{
                                                                 marginTop: "8px",
                                                                 padding: "6px 12px",
                                                                 backgroundColor: "#22c55e",
                                                                 color: "white",
                                                                 border: "none",
                                                                 borderRadius: "4px",
                                                                 cursor: "pointer",
                                                                 fontSize: "12px",
                                                                 fontWeight: "bold",
                                                                 width: "100%",
                                                            }}
                                                       >
                                                            Quick Buy
                                                       </button>
                                                  )}
                                                  {changePercent < -0.5 && (
                                                       <button
                                                            onClick={async () => {
                                                                 if (!selectedAccountId || !selectedSymbol) return;
                                                                 if (!confirm(`Sell ${selectedSymbol} based on ${horizon} prediction?`)) return;

                                                                 try {
                                                                      const token = localStorage.getItem("auth_token");
                                                                      if (!token) return;

                                                                      const apiUrl =
                                                                           typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

                                                                      const response = await fetch(`${apiUrl}/trading/orders/place`, {
                                                                           method: "POST",
                                                                           headers: {
                                                                                Authorization: `Bearer ${token}`,
                                                                                "Content-Type": "application/json",
                                                                           },
                                                                           body: JSON.stringify({
                                                                                exchange_account_id: selectedAccountId,
                                                                                symbol: selectedSymbol,
                                                                                side: "sell",
                                                                                order_type: "market",
                                                                                quantity: 0.001, // Small test amount
                                                                           }),
                                                                      });

                                                                      if (response.ok) {
                                                                           alert("Order placed successfully!");
                                                                      } else {
                                                                           const errorData = await response.json().catch(() => ({}));
                                                                           alert(`Failed to place order: ${errorData.detail || "Unknown error"}`);
                                                                      }
                                                                 } catch (error) {
                                                                      console.error("Error placing order:", error);
                                                                      alert("Network error. Please try again.");
                                                                 }
                                                            }}
                                                            style={{
                                                                 marginTop: "8px",
                                                                 padding: "6px 12px",
                                                                 backgroundColor: "#ef4444",
                                                                 color: "white",
                                                                 border: "none",
                                                                 borderRadius: "4px",
                                                                 cursor: "pointer",
                                                                 fontSize: "12px",
                                                                 fontWeight: "bold",
                                                                 width: "100%",
                                                            }}
                                                       >
                                                            Quick Sell
                                                       </button>
                                                  )}
                                             </div>
                                        );
                                   })}
                              </div>
                         ) : (
                              <p style={{ color: "#666" }}>No predictions available</p>
                         )}

                         {/* Horizon selector */}
                         <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
                              <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>Select Horizons:</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                   {["10m", "20m", "30m", "1h", "4h", "24h"].map((h) => (
                                        <label key={h} style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
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
                                             />
                                             <span>{h}</span>
                                        </label>
                                   ))}
                              </div>
                         </div>

                         {/* Accuracy Stats */}
                         {accuracyStats && accuracyStats.total_predictions > 0 && (
                              <div style={{ marginTop: "16px", padding: "16px", backgroundColor: "#fff", border: "1px solid #eaeaea", borderRadius: "8px" }}>
                                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                        <h3 style={{ margin: 0, fontSize: "16px" }}>Prediction Accuracy (Last 30 Days)</h3>
                                        <button
                                             onClick={() => setShowAccuracyHistory(!showAccuracyHistory)}
                                             style={{
                                                  padding: "6px 12px",
                                                  backgroundColor: showAccuracyHistory ? "#0070f3" : "#f5f5f5",
                                                  color: showAccuracyHistory ? "white" : "#333",
                                                  border: "none",
                                                  borderRadius: "4px",
                                                  cursor: "pointer",
                                                  fontSize: "12px",
                                             }}
                                        >
                                             {showAccuracyHistory ? "Hide" : "Show"} History
                                        </button>
                                   </div>
                                   <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                                        <div>
                                             <div style={{ fontSize: "12px", color: "#666" }}>Total Predictions</div>
                                             <div style={{ fontSize: "20px", fontWeight: "bold" }}>{accuracyStats.total_predictions}</div>
                                        </div>
                                        <div>
                                             <div style={{ fontSize: "12px", color: "#666" }}>Avg Error</div>
                                             <div
                                                  style={{
                                                       fontSize: "20px",
                                                       fontWeight: "bold",
                                                       color: accuracyStats.avg_error_percent < 5 ? "green" : accuracyStats.avg_error_percent < 10 ? "orange" : "red",
                                                  }}
                                             >
                                                  {accuracyStats.avg_error_percent.toFixed(2)}%
                                             </div>
                                        </div>
                                        <div>
                                             <div style={{ fontSize: "12px", color: "#666" }}>Within Confidence</div>
                                             <div
                                                  style={{
                                                       fontSize: "20px",
                                                       fontWeight: "bold",
                                                       color: accuracyStats.accuracy_within_confidence > 70 ? "green" : accuracyStats.accuracy_within_confidence > 50 ? "orange" : "red",
                                                  }}
                                             >
                                                  {accuracyStats.accuracy_within_confidence.toFixed(1)}%
                                             </div>
                                        </div>
                                        <div>
                                             <div style={{ fontSize: "12px", color: "#666" }}>Avg Confidence</div>
                                             <div style={{ fontSize: "20px", fontWeight: "bold" }}>{(accuracyStats.avg_confidence * 100).toFixed(1)}%</div>
                                        </div>
                                   </div>
                              </div>
                         )}
                    </div>
               )}

               {/* Price Display */}
               {selectedSymbol && (
                    <div style={{ marginBottom: "24px" }}>
                         <h2>Current Price</h2>
                         {priceLoading ? (
                              <p>Loading price...</p>
                         ) : priceData ? (
                              <div
                                   style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                                        gap: "16px",
                                        padding: "16px",
                                        backgroundColor: "#fff",
                                        border: "1px solid #eaeaea",
                                        borderRadius: "8px",
                                   }}
                              >
                                   <div>
                                        <div style={{ color: "#666", fontSize: "14px" }}>Price</div>
                                        <div style={{ fontSize: "24px", fontWeight: "bold", color: "#0070f3" }}>
                                             ${priceData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                                        </div>
                                   </div>
                                   <div>
                                        <div style={{ color: "#666", fontSize: "14px" }}>Bid</div>
                                        <div style={{ fontSize: "18px", fontWeight: "bold" }}>${priceData.bid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</div>
                                   </div>
                                   <div>
                                        <div style={{ color: "#666", fontSize: "14px" }}>Ask</div>
                                        <div style={{ fontSize: "18px", fontWeight: "bold" }}>${priceData.ask.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</div>
                                   </div>
                                   <div>
                                        <div style={{ color: "#666", fontSize: "14px" }}>24h High</div>
                                        <div style={{ fontSize: "18px", fontWeight: "bold", color: "green" }}>
                                             ${priceData.high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                                        </div>
                                   </div>
                                   <div>
                                        <div style={{ color: "#666", fontSize: "14px" }}>24h Low</div>
                                        <div style={{ fontSize: "18px", fontWeight: "bold", color: "red" }}>
                                             ${priceData.low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                                        </div>
                                   </div>
                                   <div>
                                        <div style={{ color: "#666", fontSize: "14px" }}>Volume</div>
                                        <div style={{ fontSize: "18px", fontWeight: "bold" }}>{priceData.volume.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                                   </div>
                              </div>
                         ) : (
                              <p style={{ color: "#666" }}>No price data available</p>
                         )}
                    </div>
               )}

               {/* OHLCV Chart */}
               {selectedSymbol && (
                    <div>
                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                              <h2 style={{ margin: 0 }}>Price Chart ({timeframe})</h2>
                              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                   <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                                        <input type="checkbox" checked={showPredictions} onChange={(e) => setShowPredictions(e.target.checked)} />
                                        Show Predictions
                                   </label>
                              </div>
                         </div>
                         {ohlcvLoading ? (
                              <p>Loading chart data...</p>
                         ) : ohlcvData.length > 0 ? (
                              <div style={{ marginTop: "16px" }}>
                                   {/* Chart Visualization */}
                                   <div style={{ marginBottom: "24px", backgroundColor: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid #eaeaea" }}>
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

                                                            // Add prediction data for confidence intervals
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

                                                  {/* Confidence intervals (shaded areas) */}
                                                  {showPredictions &&
                                                       Object.entries(predictions).map(([horizon, pred]) => {
                                                            if (!pred || !pred.predicted_price) return null;

                                                            const colors: Record<string, string> = {
                                                                 "10m": "#f59e0b", // orange
                                                                 "20m": "#8b5cf6", // purple
                                                                 "30m": "#ec4899", // pink
                                                                 "1h": "#06b6d4", // cyan
                                                                 "4h": "#10b981", // green
                                                                 "24h": "#6366f1", // indigo
                                                            };

                                                            const color = colors[horizon] || "#888";
                                                            const opacity = 0.2; // 20% opacity for confidence areas

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

                                                            return (
                                                                 <Area
                                                                      key={`area_lower_${horizon}`}
                                                                      type="monotone"
                                                                      dataKey={`pred_${horizon}_lower`}
                                                                      stroke="none"
                                                                      fill={color}
                                                                      fillOpacity={0.1}
                                                                      name={`${horizon} Lower`}
                                                                      hide
                                                                      stackId={`stack_${horizon}`}
                                                                 />
                                                            );
                                                       })}

                                                  {/* Prediction lines */}
                                                  {showPredictions &&
                                                       Object.entries(predictions).map(([horizon, pred]) => {
                                                            if (!pred || !pred.predicted_price) return null;

                                                            const colors: Record<string, string> = {
                                                                 "10m": "#f59e0b", // orange
                                                                 "20m": "#8b5cf6", // purple
                                                                 "30m": "#ec4899", // pink
                                                                 "1h": "#06b6d4", // cyan
                                                                 "4h": "#10b981", // green
                                                                 "24h": "#6366f1", // indigo
                                                            };

                                                            const color = colors[horizon] || "#888";

                                                            // Determine entry/exit signal
                                                            const isBuySignal = pred.price_change_percent > 0.005; // >0.5% increase
                                                            const isSellSignal = pred.price_change_percent < -0.005; // >0.5% decrease

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

                                   {/* Data Table */}
                                   <details style={{ marginTop: "16px" }}>
                                        <summary style={{ cursor: "pointer", padding: "8px", backgroundColor: "#f5f5f5", borderRadius: "4px", fontWeight: "bold" }}>
                                             View Raw Data ({ohlcvData.length} candles)
                                        </summary>
                                        <div style={{ overflowX: "auto", marginTop: "8px" }}>
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
                                                            <th style={{ padding: "12px", textAlign: "left" }}>Time</th>
                                                            <th style={{ padding: "12px", textAlign: "right" }}>Open</th>
                                                            <th style={{ padding: "12px", textAlign: "right" }}>High</th>
                                                            <th style={{ padding: "12px", textAlign: "right" }}>Low</th>
                                                            <th style={{ padding: "12px", textAlign: "right" }}>Close</th>
                                                            <th style={{ padding: "12px", textAlign: "right" }}>Volume</th>
                                                       </tr>
                                                  </thead>
                                                  <tbody>
                                                       {ohlcvData
                                                            .slice()
                                                            .reverse()
                                                            .map((candle, idx) => (
                                                                 <tr key={idx} style={{ borderBottom: "1px solid #eaeaea" }}>
                                                                      <td style={{ padding: "8px" }}>{new Date(candle.t).toLocaleString()}</td>
                                                                      <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace" }}>${candle.o.toFixed(2)}</td>
                                                                      <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace", color: "green" }}>${candle.h.toFixed(2)}</td>
                                                                      <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace", color: "red" }}>${candle.l.toFixed(2)}</td>
                                                                      <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace", fontWeight: "bold" }}>${candle.c.toFixed(2)}</td>
                                                                      <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace" }}>
                                                                           {candle.v.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                                      </td>
                                                                 </tr>
                                                            ))}
                                                  </tbody>
                                             </table>
                                        </div>
                                   </details>
                              </div>
                         ) : (
                              <p style={{ color: "#666" }}>No chart data available</p>
                         )}
                    </div>
               )}

               {!selectedSymbol && <div style={{ padding: "24px", textAlign: "center", color: "#666" }}>Select an exchange account and trading pair to view market data.</div>}
          </div>
     );
}

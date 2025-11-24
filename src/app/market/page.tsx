"use client";

import { useState, useEffect, useCallback } from "react";

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
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Area } from "recharts";
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
     const { selectedAccountId, setSelectedAccountId, accounts } = useExchange();
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
     const [wsConnectionStatus, setWsConnectionStatus] = useState<"disconnected" | "connecting" | "connected" | "error">("disconnected");
     const [wsLastUpdate, setWsLastUpdate] = useState<Date | null>(null);
     const [wsReconnectAttempts, setWsReconnectAttempts] = useState(0);
     const [wsError, setWsError] = useState<string | null>(null);

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

     // Initialize loading state
     useEffect(() => {
          setLoading(false);
     }, []);

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
                    let errorMsg = errorData.detail || `Failed to fetch price (${response.status})`;
                    if (response.status === 404) {
                         errorMsg = `Symbol ${selectedSymbol} not found or account ${selectedAccountId} not available. Please check your exchange account settings.`;
                    }
                    // Don't show error for 404 if it's expected (e.g., symbol not available on exchange)
                    if (response.status !== 404) {
                         setError(errorMsg);
                    }
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
                    let errorMsg = errorData.detail || `Failed to fetch OHLCV data (${response.status})`;
                    if (response.status === 404) {
                         errorMsg = `OHLCV data not available for ${selectedSymbol}. The symbol may not be supported by this exchange.`;
                    }
                    // Don't show error for 404 if it's expected
                    if (response.status !== 404) {
                         setError(errorMsg);
                    }
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
               // Filter to only supported horizons
               const supportedHorizons = ["10m", "20m", "30m", "1h", "4h", "24h"];
               const validHorizons = selectedHorizons.filter((h) => supportedHorizons.includes(h));
               const horizonsParam = validHorizons.length > 0 ? validHorizons.join(",") : "10m,30m,1h";

               const response = await fetch(`${apiUrl}/predictions/symbol/${encodedSymbol}?horizons=${horizonsParam}&exchange_account_id=${selectedAccountId}`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    const predictionsData = data.predictions || {};

                    // Filter out None values
                    const validPredictions: Record<string, PredictionData> = {};
                    for (const [horizon, pred] of Object.entries(predictionsData)) {
                         if (pred !== null && pred !== undefined) {
                              validPredictions[horizon] = pred as PredictionData;
                         }
                    }

                    setPredictions(validPredictions);

                    if (Object.keys(validPredictions).length === 0) {
                         console.warn("No valid predictions returned from API");
                    }
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMsg = errorData.detail || `Failed to fetch predictions (${response.status})`;
                    console.error("Failed to fetch predictions:", response.status, errorMsg);

                    // Set error message for user visibility
                    if (response.status === 400 || response.status === 503) {
                         setError(`Prediction error: ${errorMsg}`);
                    }
                    // Don't set error state for other failures (non-critical)
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

     // WebSocket connection for real-time updates
     useEffect(() => {
          if (!useWebSocket || !autoRefresh || !selectedAccountId || !selectedSymbol) {
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
          const encodedSymbol = encodeURIComponent(selectedSymbol);

          // Convert http to ws
          const wsUrl = apiUrl.replace("http://", "ws://").replace("https://", "wss://");
          const wsEndpoint = `${wsUrl}/ws/price/${selectedAccountId}/${encodedSymbol}?token=${token}&interval=${refreshInterval}`;

          console.log("Connecting to WebSocket:", wsEndpoint);

          let ws: WebSocket | null = null;
          let reconnectTimeout: NodeJS.Timeout | null = null;
          let isManualClose = false;
          let reconnectAttempts = 0;
          const maxReconnectAttempts = 10;
          const baseReconnectDelay = 3000; // 3 seconds
          const maxReconnectDelay = 30000; // 30 seconds

          const connect = () => {
               if (isManualClose) return;

               try {
                    setWsConnectionStatus("connecting");
                    setWsError(null);
                    ws = new WebSocket(wsEndpoint);

                    ws.onopen = () => {
                         console.log("WebSocket connected for", selectedSymbol);
                         setWsConnectionStatus("connected");
                         setWsConnection(ws);
                         setWsReconnectAttempts(0);
                         reconnectAttempts = 0;
                         setWsError(null);
                         isManualClose = false;
                    };

                    ws.onmessage = (event) => {
                         try {
                              const data = JSON.parse(event.data);
                              console.log("WebSocket message received:", data);

                              if (data.type === "price_update" && data.data) {
                                   setPriceData(data.data);
                                   setWsLastUpdate(new Date());
                                   setWsError(null);
                                   setWsConnectionStatus("connected");
                              } else if (data.type === "error") {
                                   const errorMsg = data.message || "WebSocket error";
                                   console.error("WebSocket error message:", errorMsg);
                                   setWsError(`WebSocket error: ${errorMsg}`);
                                   setWsConnectionStatus("error");
                                   // Don't close on error, let worker retry
                              } else if (data.type === "connected") {
                                   console.log("WebSocket connected:", data.message);
                                   setWsConnectionStatus("connected");
                                   setWsError(null);
                              }
                         } catch (error) {
                              console.error("Error parsing WebSocket message:", error);
                              setWsError(`Error parsing message: ${error instanceof Error ? error.message : "Unknown error"}`);
                         }
                    };

                    ws.onerror = (error) => {
                         console.error("WebSocket error event:", error);
                         setWsConnectionStatus("error");
                         setWsError("WebSocket connection error");
                         // Error details are usually in onclose
                    };

                    ws.onclose = (event) => {
                         console.log("WebSocket disconnected:", event.code, event.reason);
                         setWsConnection(null);
                         setWsConnectionStatus("disconnected");

                         // Auto-reconnect if not manual close and not a policy violation
                         if (!isManualClose && event.code !== 1008 && reconnectAttempts < maxReconnectAttempts) {
                              reconnectAttempts++;
                              setWsReconnectAttempts(reconnectAttempts);
                              
                              // Exponential backoff with max delay
                              const delay = Math.min(baseReconnectDelay * Math.pow(2, reconnectAttempts - 1), maxReconnectDelay);
                              
                              console.log(`Attempting to reconnect WebSocket (attempt ${reconnectAttempts}/${maxReconnectAttempts}) in ${delay / 1000} seconds...`);
                              setWsConnectionStatus("connecting");
                              setWsError(`Reconnecting... (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
                              
                              reconnectTimeout = setTimeout(() => {
                                   if (!isManualClose) {
                                        connect();
                                   }
                              }, delay);
                         } else if (reconnectAttempts >= maxReconnectAttempts) {
                              setWsError(`Max reconnection attempts (${maxReconnectAttempts}) reached. Please refresh the page.`);
                              setWsConnectionStatus("error");
                         } else if (event.code === 1008) {
                              setWsError("Connection closed due to policy violation. Please check your authentication.");
                              setWsConnectionStatus("error");
                         }
                    };
               } catch (error) {
                    console.error("Error creating WebSocket:", error);
                    setWsError(`Failed to create WebSocket connection: ${error instanceof Error ? error.message : "Unknown error"}`);
                    setWsConnectionStatus("error");
                    
                    // Retry connection after delay
                    if (!isManualClose && reconnectAttempts < maxReconnectAttempts) {
                         reconnectAttempts++;
                         setWsReconnectAttempts(reconnectAttempts);
                         const delay = Math.min(baseReconnectDelay * Math.pow(2, reconnectAttempts - 1), maxReconnectDelay);
                         reconnectTimeout = setTimeout(() => {
                              if (!isManualClose) {
                                   connect();
                              }
                         }, delay);
                    }
               }
          };

          connect();

          return () => {
               isManualClose = true;
               if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout);
               }
               if (ws) {
                    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                         ws.close();
                    }
               }
               setWsConnection(null);
               setWsConnectionStatus("disconnected");
          };
     }, [useWebSocket, autoRefresh, selectedAccountId, selectedSymbol, refreshInterval]);

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
                         <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#FFAE00", fontSize: "14px" }}>Trading Pair</label>
                         <select
                              value={selectedSymbol}
                              onChange={(e) => setSelectedSymbol(e.target.value)}
                              disabled={!selectedAccountId || markets.length === 0}
                              style={{
                                   width: "100%",
                                   padding: "12px",
                                   borderRadius: "8px",
                                   border: "2px solid rgba(255, 174, 0, 0.3)",
                                   backgroundColor: !selectedAccountId || markets.length === 0 ? "#151515" : "#1a1a1a",
                                   color: !selectedAccountId || markets.length === 0 ? "#666" : "#ededed",
                                   fontSize: "14px",
                                   cursor: !selectedAccountId || markets.length === 0 ? "not-allowed" : "pointer",
                                   outline: "none",
                              }}
                              onFocus={(e) => {
                                   if (selectedAccountId && markets.length > 0) e.target.style.borderColor = "#FFAE00";
                              }}
                              onBlur={(e) => (e.target.style.borderColor = "rgba(255, 174, 0, 0.3)")}
                         >
                              <option value="" style={{ backgroundColor: "#1a1a1a", color: "#888" }}>
                                   Select Symbol
                              </option>
                              {markets.map((market) => (
                                   <option key={market.symbol} value={market.symbol} style={{ backgroundColor: "#1a1a1a", color: "#ededed" }}>
                                        {market.symbol}
                                   </option>
                              ))}
                         </select>
                    </div>

                    <div>
                         <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#FFAE00", fontSize: "14px" }}>Timeframe</label>
                         <select
                              value={timeframe}
                              onChange={(e) => setTimeframe(e.target.value)}
                              disabled={!selectedSymbol}
                              style={{
                                   width: "100%",
                                   padding: "12px",
                                   borderRadius: "8px",
                                   border: "2px solid rgba(255, 174, 0, 0.3)",
                                   backgroundColor: !selectedSymbol ? "#151515" : "#1a1a1a",
                                   color: !selectedSymbol ? "#666" : "#ededed",
                                   fontSize: "14px",
                                   cursor: !selectedSymbol ? "not-allowed" : "pointer",
                                   outline: "none",
                              }}
                              onFocus={(e) => {
                                   if (selectedSymbol) e.target.style.borderColor = "#FFAE00";
                              }}
                              onBlur={(e) => (e.target.style.borderColor = "rgba(255, 174, 0, 0.3)")}
                         >
                              <option value="1m" style={{ backgroundColor: "#1a1a1a", color: "#ededed" }}>
                                   1 Minute
                              </option>
                              <option value="5m" style={{ backgroundColor: "#1a1a1a", color: "#ededed" }}>
                                   5 Minutes
                              </option>
                              <option value="15m" style={{ backgroundColor: "#1a1a1a", color: "#ededed" }}>
                                   15 Minutes
                              </option>
                              <option value="1h" style={{ backgroundColor: "#1a1a1a", color: "#ededed" }}>
                                   1 Hour
                              </option>
                              <option value="4h" style={{ backgroundColor: "#1a1a1a", color: "#ededed" }}>
                                   4 Hours
                              </option>
                              <option value="1d" style={{ backgroundColor: "#1a1a1a", color: "#ededed" }}>
                                   1 Day
                              </option>
                         </select>
                    </div>

                    <div>
                         <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#FFAE00", fontSize: "14px" }}>Refresh Settings</label>
                         <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "#ededed", fontSize: "14px" }}>
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
                                   <>
                                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "#ededed", fontSize: "14px" }}>
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
                                   </>
                              )}
                         </div>
                    </div>

                    {/* WebSocket Connection Status */}
                    {useWebSocket && autoRefresh && selectedSymbol && (
                         <div>
                              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#FFAE00", fontSize: "14px" }}>
                                   WebSocket Status
                              </label>
                              <div
                                   style={{
                                        padding: "12px",
                                        backgroundColor: "#1a1a1a",
                                        borderRadius: "8px",
                                        border: "1px solid rgba(255, 174, 0, 0.3)",
                                   }}
                              >
                                   <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                        <div
                                             style={{
                                                  width: "10px",
                                                  height: "10px",
                                                  borderRadius: "50%",
                                                  backgroundColor:
                                                       wsConnectionStatus === "connected"
                                                            ? "#00ff00"
                                                            : wsConnectionStatus === "connecting"
                                                            ? "#FFAE00"
                                                            : wsConnectionStatus === "error"
                                                            ? "#ff4444"
                                                            : "#888",
                                                  animation: wsConnectionStatus === "connecting" ? "pulse 2s infinite" : "none",
                                             }}
                                        />
                                        <span
                                             style={{
                                                  fontSize: "13px",
                                                  fontWeight: "600",
                                                  color:
                                                       wsConnectionStatus === "connected"
                                                            ? "#00ff00"
                                                            : wsConnectionStatus === "connecting"
                                                            ? "#FFAE00"
                                                            : wsConnectionStatus === "error"
                                                            ? "#ff4444"
                                                            : "#888",
                                                  textTransform: "capitalize",
                                             }}
                                        >
                                             {wsConnectionStatus === "connected"
                                                  ? "Connected"
                                                  : wsConnectionStatus === "connecting"
                                                  ? "Connecting..."
                                                  : wsConnectionStatus === "error"
                                                  ? "Error"
                                                  : "Disconnected"}
                                        </span>
                                        {wsReconnectAttempts > 0 && wsConnectionStatus !== "connected" && (
                                             <span style={{ fontSize: "11px", color: "#888", marginLeft: "auto" }}>
                                                  (Attempt {wsReconnectAttempts}/10)
                                             </span>
                                        )}
                                   </div>
                                   {wsLastUpdate && wsConnectionStatus === "connected" && (
                                        <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
                                             Last update: {wsLastUpdate.toLocaleTimeString()}
                                        </div>
                                   )}
                                   {wsError && (
                                        <div
                                             style={{
                                                  fontSize: "11px",
                                                  color: "#ff4444",
                                                  marginTop: "8px",
                                                  padding: "6px",
                                                  backgroundColor: "rgba(255, 68, 68, 0.1)",
                                                  borderRadius: "4px",
                                             }}
                                        >
                                             {wsError}
                                        </div>
                                   )}
                                   {wsConnectionStatus === "error" && (
                                        <button
                                             onClick={() => {
                                                  setWsReconnectAttempts(0);
                                                  setWsError(null);
                                                  // Force reconnection by toggling WebSocket
                                                  setUseWebSocket(false);
                                                  setTimeout(() => setUseWebSocket(true), 100);
                                             }}
                                             style={{
                                                  marginTop: "8px",
                                                  padding: "6px 12px",
                                                  backgroundColor: "#FFAE00",
                                                  color: "#000",
                                                  border: "none",
                                                  borderRadius: "4px",
                                                  fontSize: "12px",
                                                  fontWeight: "600",
                                                  cursor: "pointer",
                                             }}
                                        >
                                             🔄 Reconnect
                                        </button>
                                   )}
                              </div>
                         </div>
                    )}
               </div>

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
                                             onMouseEnter={(e) => {
                                                  if (!showAccuracyHistory) {
                                                       e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.1)";
                                                  }
                                             }}
                                             onMouseLeave={(e) => {
                                                  if (!showAccuracyHistory) {
                                                       e.currentTarget.style.backgroundColor = "#1a1a1a";
                                                  }
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

               {/* Price Display */}
               {selectedSymbol && (
                    <div style={{ marginBottom: "32px" }}>
                         <h2 style={{ color: "#FFAE00", marginBottom: "20px", fontSize: "24px", fontWeight: "bold" }}>Current Price</h2>
                         {priceLoading ? (
                              <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
                                   <p>Loading price...</p>
                              </div>
                         ) : priceData ? (
                              <div
                                   style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                                        gap: "20px",
                                        padding: "24px",
                                        backgroundColor: "#2a2a2a",
                                        border: "1px solid rgba(255, 174, 0, 0.2)",
                                        borderRadius: "12px",
                                   }}
                              >
                                   <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px", border: "1px solid rgba(255, 174, 0, 0.1)" }}>
                                        <div style={{ color: "#888", fontSize: "13px", marginBottom: "8px", fontWeight: "500" }}>Price</div>
                                        <div style={{ fontSize: "28px", fontWeight: "bold", color: "#FFAE00" }}>
                                             ${priceData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                                        </div>
                                   </div>
                                   <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px", border: "1px solid rgba(255, 174, 0, 0.1)" }}>
                                        <div style={{ color: "#888", fontSize: "13px", marginBottom: "8px", fontWeight: "500" }}>Bid</div>
                                        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#ededed" }}>
                                             ${priceData.bid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                                        </div>
                                   </div>
                                   <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px", border: "1px solid rgba(255, 174, 0, 0.1)" }}>
                                        <div style={{ color: "#888", fontSize: "13px", marginBottom: "8px", fontWeight: "500" }}>Ask</div>
                                        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#ededed" }}>
                                             ${priceData.ask.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                                        </div>
                                   </div>
                                   <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px", border: "1px solid rgba(255, 174, 0, 0.1)" }}>
                                        <div style={{ color: "#888", fontSize: "13px", marginBottom: "8px", fontWeight: "500" }}>24h High</div>
                                        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#22c55e" }}>
                                             ${priceData.high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                                        </div>
                                   </div>
                                   <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px", border: "1px solid rgba(255, 174, 0, 0.1)" }}>
                                        <div style={{ color: "#888", fontSize: "13px", marginBottom: "8px", fontWeight: "500" }}>24h Low</div>
                                        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#ef4444" }}>
                                             ${priceData.low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                                        </div>
                                   </div>
                                   <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px", border: "1px solid rgba(255, 174, 0, 0.1)" }}>
                                        <div style={{ color: "#888", fontSize: "13px", marginBottom: "8px", fontWeight: "500" }}>Volume</div>
                                        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#ededed" }}>{priceData.volume.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                                   </div>
                              </div>
                         ) : (
                              <div style={{ padding: "24px", textAlign: "center", color: "#888", backgroundColor: "#2a2a2a", borderRadius: "12px", border: "1px solid rgba(255, 174, 0, 0.2)" }}>
                                   <p>No price data available</p>
                              </div>
                         )}
                    </div>
               )}

               {/* OHLCV Chart */}
               {selectedSymbol && (
                    <div>
                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                              <h2 style={{ margin: 0, color: "#FFAE00", fontSize: "24px", fontWeight: "bold" }}>Price Chart ({timeframe})</h2>
                              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
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
                         </div>
                         {ohlcvLoading ? (
                              <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
                                   <p>Loading chart data...</p>
                              </div>
                         ) : ohlcvData.length > 0 ? (
                              <div style={{ marginTop: "20px" }}>
                                   {/* Chart Visualization */}
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

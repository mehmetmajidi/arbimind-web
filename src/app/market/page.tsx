"use client";

import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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

     // Fetch data when symbol or timeframe changes
     useEffect(() => {
          if (selectedAccountId && selectedSymbol) {
               fetchPrice();
               fetchOHLCV();
          }
     }, [selectedAccountId, selectedSymbol, timeframe, fetchPrice, fetchOHLCV]);

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
                         <h2>Price Chart ({timeframe})</h2>
                         {ohlcvLoading ? (
                              <p>Loading chart data...</p>
                         ) : ohlcvData.length > 0 ? (
                              <div style={{ marginTop: "16px" }}>
                                   {/* Chart Visualization */}
                                   <div style={{ marginBottom: "24px", backgroundColor: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid #eaeaea" }}>
                                        <ResponsiveContainer width="100%" height={400}>
                                             <LineChart
                                                  data={ohlcvData
                                                       .slice()
                                                       .reverse()
                                                       .map((candle) => ({
                                                            time: new Date(candle.t).toLocaleTimeString(),
                                                            timestamp: candle.t,
                                                            open: candle.o,
                                                            high: candle.h,
                                                            low: candle.l,
                                                            close: candle.c,
                                                            volume: candle.v,
                                                       }))}
                                                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                             >
                                                  <CartesianGrid strokeDasharray="3 3" />
                                                  <XAxis dataKey="time" angle={-45} textAnchor="end" height={80} interval="preserveStartEnd" />
                                                  <YAxis domain={["auto", "auto"]} label={{ value: "Price ($)", angle: -90, position: "insideLeft" }} />
                                                  <Tooltip
                                                       formatter={(value: number, name: string) => [
                                                            `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`,
                                                            name.charAt(0).toUpperCase() + name.slice(1),
                                                       ]}
                                                       labelFormatter={(label) => `Time: ${label}`}
                                                  />
                                                  <Legend />
                                                  <Line type="monotone" dataKey="close" stroke="#0070f3" strokeWidth={2} name="Close" dot={false} activeDot={{ r: 6 }} />
                                                  <Line type="monotone" dataKey="high" stroke="#22c55e" strokeWidth={1} name="High" dot={false} strokeDasharray="2 2" />
                                                  <Line type="monotone" dataKey="low" stroke="#ef4444" strokeWidth={1} name="Low" dot={false} strokeDasharray="2 2" />
                                             </LineChart>
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

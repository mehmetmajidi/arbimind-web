"use client";

import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface TradeResult {
     id: number;
     symbol: string;
     side: string;
     entry_price: string;
     exit_price: string;
     quantity: string;
     pnl: string;
     pnl_percent: string;
     win_loss: boolean;
     prediction_accuracy: string | null;
     entry_time: string;
     exit_time: string;
     duration_minutes: number;
}

interface PerformanceStats {
     total_trades: number;
     winning_trades: number;
     losing_trades: number;
     win_rate: number;
     total_pnl: number;
     avg_pnl_per_trade: number;
     avg_return_percent: number;
     prediction_accuracy: number;
     best_symbol: string | null;
     worst_symbol: string | null;
}

const COLORS = ["#10b981", "#ef4444", "#6366f1", "#f59e0b", "#8b5cf6", "#ec4899"];

export default function PerformancePage() {
     const [stats, setStats] = useState<PerformanceStats | null>(null);
     const [tradeResults, setTradeResults] = useState<TradeResult[]>([]);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState<string | null>(null);
     const [exporting, setExporting] = useState<{ type: string; format: string } | null>(null);

     // Filters
     const [symbolFilter, setSymbolFilter] = useState<string>("");
     const [startDate, setStartDate] = useState<string>("");
     const [endDate, setEndDate] = useState<string>("");
     const [winLossFilter, setWinLossFilter] = useState<string | null>(null);
     const [days, setDays] = useState<number>(30);
     const [autoRefresh, setAutoRefresh] = useState(true);
     const [refreshInterval, setRefreshInterval] = useState(30); // seconds

     const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

     const fetchStats = useCallback(async () => {
          try {
               const token = localStorage.getItem("auth_token");
               if (!token) {
                    setError("Not authenticated");
                    return;
               }

               const params = new URLSearchParams();
               if (symbolFilter) params.append("symbol", symbolFilter);
               params.append("days", days.toString());

               const response = await fetch(`${apiUrl}/performance/stats?${params.toString()}`, {
                    headers: {
                         Authorization: `Bearer ${token}`,
                    },
               });

               if (!response.ok) {
                    throw new Error(`Failed to fetch stats: ${response.statusText}`);
               }

               const data = await response.json();
               setStats(data);
          } catch (err) {
               console.error("Error fetching stats:", err);
               setError(err instanceof Error ? err.message : "Failed to fetch stats");
          }
     }, [symbolFilter, days, apiUrl]);

     const fetchTradeResults = useCallback(async () => {
          try {
               const token = localStorage.getItem("auth_token");
               if (!token) {
                    return;
               }

               const params = new URLSearchParams();
               if (symbolFilter) params.append("symbol", symbolFilter);
               if (startDate) params.append("start_date", startDate);
               if (endDate) params.append("end_date", endDate);
               if (winLossFilter !== null) params.append("win_loss", winLossFilter);
               params.append("limit", "1000");

               const response = await fetch(`${apiUrl}/performance/trades?${params.toString()}`, {
                    headers: {
                         Authorization: `Bearer ${token}`,
                    },
               });

               if (!response.ok) {
                    throw new Error(`Failed to fetch trades: ${response.statusText}`);
               }

               const data = await response.json();
               setTradeResults(data);
          } catch (err) {
               console.error("Error fetching trade results:", err);
               setError(err instanceof Error ? err.message : "Failed to fetch trade results");
          }
     }, [symbolFilter, startDate, endDate, winLossFilter, apiUrl]);

     const exportTradeResults = async (format: "csv" | "json") => {
          try {
               setExporting({ type: "trades", format });
               setError(null);
               
               const token = localStorage.getItem("auth_token");
               if (!token) {
                    setError("Not authenticated");
                    setExporting(null);
                    return;
               }

               const params = new URLSearchParams();
               params.append("format", format);
               if (symbolFilter) params.append("symbol", symbolFilter);
               if (startDate) params.append("start_date", startDate);
               if (endDate) params.append("end_date", endDate);
               if (winLossFilter !== null) params.append("win_loss", winLossFilter);

               const response = await fetch(`${apiUrl}/performance/trades/export?${params.toString()}`, {
                    headers: {
                         Authorization: `Bearer ${token}`,
                    },
               });

               if (!response.ok) {
                    throw new Error(`Failed to export trade results: ${response.statusText}`);
               }

               const blob = await response.blob();
               const url = window.URL.createObjectURL(blob);
               const a = document.createElement("a");
               a.href = url;
               a.download = `trade_results_${new Date().toISOString().split("T")[0]}.${format}`;
               document.body.appendChild(a);
               a.click();
               document.body.removeChild(a);
               window.URL.revokeObjectURL(url);
          } catch (err) {
               console.error("Error exporting trade results:", err);
               setError(err instanceof Error ? err.message : "Failed to export trade results");
          } finally {
               setExporting(null);
          }
     };

     const exportPerformanceStats = async (format: "csv" | "json") => {
          try {
               setExporting({ type: "stats", format });
               setError(null);
               
               const token = localStorage.getItem("auth_token");
               if (!token) {
                    setError("Not authenticated");
                    setExporting(null);
                    return;
               }

               const params = new URLSearchParams();
               params.append("format", format);
               params.append("days", days.toString());
               if (symbolFilter) params.append("symbol", symbolFilter);

               const response = await fetch(`${apiUrl}/performance/stats/export?${params.toString()}`, {
                    headers: {
                         Authorization: `Bearer ${token}`,
                    },
               });

               if (!response.ok) {
                    throw new Error(`Failed to export performance stats: ${response.statusText}`);
               }

               const blob = await response.blob();
               const url = window.URL.createObjectURL(blob);
               const a = document.createElement("a");
               a.href = url;
               a.download = `performance_stats_${new Date().toISOString().split("T")[0]}.${format}`;
               document.body.appendChild(a);
               a.click();
               document.body.removeChild(a);
               window.URL.revokeObjectURL(url);
          } catch (err) {
               console.error("Error exporting performance stats:", err);
               setError(err instanceof Error ? err.message : "Failed to export performance stats");
          } finally {
               setExporting(null);
          }
     };

     useEffect(() => {
          const loadData = async () => {
               setLoading(true);
               setError(null);
               await Promise.all([fetchStats(), fetchTradeResults()]);
               setLoading(false);
          };
          loadData();

          // Auto-refresh
          if (autoRefresh) {
               const interval = setInterval(() => {
                    fetchStats();
                    fetchTradeResults();
               }, refreshInterval * 1000);

               return () => clearInterval(interval);
          }
     }, [fetchStats, fetchTradeResults, autoRefresh, refreshInterval]);

     // Prepare chart data
     const winRateData = stats
          ? [
                 { name: "Wins", value: stats.winning_trades, color: "#10b981" },
                 { name: "Losses", value: stats.losing_trades, color: "#ef4444" },
            ]
          : [];

     const pnlDistribution = tradeResults
          .slice(0, 20)
          .map((tr, idx) => ({
               name: `${tr.symbol} #${tr.id}`,
               pnl: parseFloat(tr.pnl),
          }))
          .sort((a, b) => b.pnl - a.pnl);

     const symbolDistribution = tradeResults.reduce((acc, tr) => {
          acc[tr.symbol] = (acc[tr.symbol] || 0) + 1;
          return acc;
     }, {} as Record<string, number>);

     const symbolPieData = Object.entries(symbolDistribution).map(([symbol, count], idx) => ({
          name: symbol,
          value: count,
          color: COLORS[idx % COLORS.length],
     }));

     const exportToCSV = () => {
          if (tradeResults.length === 0) {
               alert("No data to export");
               return;
          }

          const headers = ["ID", "Symbol", "Side", "Entry Price", "Exit Price", "Quantity", "P&L", "P&L %", "Win/Loss", "Prediction Accuracy", "Entry Time", "Exit Time", "Duration (minutes)"];

          const rows = tradeResults.map((tr) => [
               tr.id,
               tr.symbol,
               tr.side,
               tr.entry_price,
               tr.exit_price,
               tr.quantity,
               tr.pnl,
               tr.pnl_percent,
               tr.win_loss ? "Win" : "Loss",
               tr.prediction_accuracy || "N/A",
               tr.entry_time,
               tr.exit_time,
               tr.duration_minutes,
          ]);

          const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
          const blob = new Blob([csvContent], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `trades_${new Date().toISOString().split("T")[0]}.csv`;
          a.click();
          URL.revokeObjectURL(url);
     };

     if (loading) {
          return (
               <div style={{ padding: "24px", textAlign: "center" }}>
                    <p>Loading performance data...</p>
               </div>
          );
     }

     if (error) {
          return (
               <div style={{ padding: "24px", textAlign: "center", color: "red" }}>
                    <p>Error: {error}</p>
               </div>
          );
     }

     return (
          <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
               <h1 style={{ marginBottom: "24px", fontSize: "28px", fontWeight: "bold" }}>Performance Dashboard</h1>

               {/* Filters */}
               <div
                    style={{
                         padding: "16px",
                         backgroundColor: "#f5f5f5",
                         borderRadius: "8px",
                         marginBottom: "24px",
                         display: "flex",
                         flexWrap: "wrap",
                         gap: "12px",
                         alignItems: "center",
                    }}
               >
                    <div>
                         <label style={{ marginRight: "8px", fontSize: "14px" }}>Symbol:</label>
                         <input
                              type="text"
                              value={symbolFilter}
                              onChange={(e) => setSymbolFilter(e.target.value)}
                              placeholder="BTC/USDT"
                              style={{
                                   padding: "6px 12px",
                                   border: "1px solid #ddd",
                                   borderRadius: "4px",
                                   fontSize: "14px",
                              }}
                         />
                    </div>
                    <div>
                         <label style={{ marginRight: "8px", fontSize: "14px" }}>Start Date:</label>
                         <input
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              style={{
                                   padding: "6px 12px",
                                   border: "1px solid #ddd",
                                   borderRadius: "4px",
                                   fontSize: "14px",
                              }}
                         />
                    </div>
                    <div>
                         <label style={{ marginRight: "8px", fontSize: "14px" }}>End Date:</label>
                         <input
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              style={{
                                   padding: "6px 12px",
                                   border: "1px solid #ddd",
                                   borderRadius: "4px",
                                   fontSize: "14px",
                              }}
                         />
                    </div>
                    <div>
                         <label style={{ marginRight: "8px", fontSize: "14px" }}>Win/Loss:</label>
                         <select
                              value={winLossFilter || ""}
                              onChange={(e) => setWinLossFilter(e.target.value === "" ? null : e.target.value)}
                              style={{
                                   padding: "6px 12px",
                                   border: "1px solid #ddd",
                                   borderRadius: "4px",
                                   fontSize: "14px",
                              }}
                         >
                              <option value="">All</option>
                              <option value="true">Win</option>
                              <option value="false">Loss</option>
                         </select>
                    </div>
                    <div>
                         <label style={{ marginRight: "8px", fontSize: "14px" }}>Days:</label>
                         <select
                              value={days}
                              onChange={(e) => setDays(Number(e.target.value))}
                              style={{
                                   padding: "6px 12px",
                                   border: "1px solid #ddd",
                                   borderRadius: "4px",
                                   fontSize: "14px",
                              }}
                         >
                              <option value="7">7 days</option>
                              <option value="30">30 days</option>
                              <option value="90">90 days</option>
                              <option value="180">180 days</option>
                              <option value="365">365 days</option>
                         </select>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                         <label style={{ fontSize: "14px", display: "flex", alignItems: "center", gap: "4px" }}>
                              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
                              Auto-refresh
                         </label>
                         {autoRefresh && (
                              <select
                                   value={refreshInterval}
                                   onChange={(e) => setRefreshInterval(Number(e.target.value))}
                                   style={{
                                        padding: "6px 12px",
                                        border: "1px solid #ddd",
                                        borderRadius: "4px",
                                        fontSize: "14px",
                                   }}
                              >
                                   <option value="10">10s</option>
                                   <option value="30">30s</option>
                                   <option value="60">1m</option>
                                   <option value="300">5m</option>
                              </select>
                         )}
                         <button
                              onClick={() => exportTradeResults("csv")}
                              disabled={exporting?.type === "trades"}
                              style={{
                                   padding: "8px 16px",
                                   backgroundColor: exporting?.type === "trades" && exporting?.format === "csv" ? "#6b7280" : "#0070f3",
                                   color: "white",
                                   border: "none",
                                   borderRadius: "4px",
                                   cursor: exporting?.type === "trades" ? "not-allowed" : "pointer",
                                   fontSize: "14px",
                                   fontWeight: "bold",
                                   opacity: exporting?.type === "trades" && exporting?.format === "csv" ? 0.7 : 1,
                              }}
                         >
                              {exporting?.type === "trades" && exporting?.format === "csv" ? "Exporting..." : "Export Trades (CSV)"}
                         </button>
                         <button
                              onClick={() => exportTradeResults("json")}
                              disabled={exporting?.type === "trades"}
                              style={{
                                   padding: "8px 16px",
                                   backgroundColor: exporting?.type === "trades" && exporting?.format === "json" ? "#6b7280" : "#10b981",
                                   color: "white",
                                   border: "none",
                                   borderRadius: "4px",
                                   cursor: exporting?.type === "trades" ? "not-allowed" : "pointer",
                                   fontSize: "14px",
                                   fontWeight: "bold",
                                   opacity: exporting?.type === "trades" && exporting?.format === "json" ? 0.7 : 1,
                              }}
                         >
                              {exporting?.type === "trades" && exporting?.format === "json" ? "Exporting..." : "Export Trades (JSON)"}
                         </button>
                    </div>
               </div>

               {/* Summary Cards */}
               {stats && (
                    <div>
                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>Performance Summary</h2>
                              <div style={{ display: "flex", gap: "8px" }}>
                                   <button
                                        onClick={() => exportPerformanceStats("csv")}
                                        disabled={exporting?.type === "stats"}
                                        style={{
                                             padding: "6px 12px",
                                             backgroundColor: exporting?.type === "stats" && exporting?.format === "csv" ? "#6b7280" : "#0070f3",
                                             color: "white",
                                             border: "none",
                                             borderRadius: "4px",
                                             cursor: exporting?.type === "stats" ? "not-allowed" : "pointer",
                                             fontSize: "13px",
                                             fontWeight: "500",
                                             opacity: exporting?.type === "stats" && exporting?.format === "csv" ? 0.7 : 1,
                                        }}
                                   >
                                        {exporting?.type === "stats" && exporting?.format === "csv" ? "Exporting..." : "Export Stats (CSV)"}
                                   </button>
                                   <button
                                        onClick={() => exportPerformanceStats("json")}
                                        disabled={exporting?.type === "stats"}
                                        style={{
                                             padding: "6px 12px",
                                             backgroundColor: exporting?.type === "stats" && exporting?.format === "json" ? "#6b7280" : "#10b981",
                                             color: "white",
                                             border: "none",
                                             borderRadius: "4px",
                                             cursor: exporting?.type === "stats" ? "not-allowed" : "pointer",
                                             fontSize: "13px",
                                             fontWeight: "500",
                                             opacity: exporting?.type === "stats" && exporting?.format === "json" ? 0.7 : 1,
                                        }}
                                   >
                                        {exporting?.type === "stats" && exporting?.format === "json" ? "Exporting..." : "Export Stats (JSON)"}
                                   </button>
                              </div>
                         </div>
                         <div
                              style={{
                                   display: "grid",
                                   gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                   gap: "16px",
                                   marginBottom: "24px",
                              }}
                         >
                         <div
                              style={{
                                   padding: "16px",
                                   backgroundColor: "#fff",
                                   border: "1px solid #eaeaea",
                                   borderRadius: "8px",
                              }}
                         >
                              <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Total Trades</div>
                              <div style={{ fontSize: "24px", fontWeight: "bold" }}>{stats.total_trades}</div>
                         </div>
                         <div
                              style={{
                                   padding: "16px",
                                   backgroundColor: "#fff",
                                   border: "1px solid #eaeaea",
                                   borderRadius: "8px",
                              }}
                         >
                              <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Win Rate</div>
                              <div
                                   style={{
                                        fontSize: "24px",
                                        fontWeight: "bold",
                                        color: stats.win_rate >= 50 ? "#10b981" : "#ef4444",
                                   }}
                              >
                                   {stats.win_rate.toFixed(1)}%
                              </div>
                         </div>
                         <div
                              style={{
                                   padding: "16px",
                                   backgroundColor: "#fff",
                                   border: "1px solid #eaeaea",
                                   borderRadius: "8px",
                              }}
                         >
                              <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Total P&L</div>
                              <div
                                   style={{
                                        fontSize: "24px",
                                        fontWeight: "bold",
                                        color: stats.total_pnl >= 0 ? "#10b981" : "#ef4444",
                                   }}
                              >
                                   ${stats.total_pnl.toFixed(2)}
                              </div>
                         </div>
                         <div
                              style={{
                                   padding: "16px",
                                   backgroundColor: "#fff",
                                   border: "1px solid #eaeaea",
                                   borderRadius: "8px",
                              }}
                         >
                              <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Avg P&L per Trade</div>
                              <div
                                   style={{
                                        fontSize: "24px",
                                        fontWeight: "bold",
                                        color: stats.avg_pnl_per_trade >= 0 ? "#10b981" : "#ef4444",
                                   }}
                              >
                                   ${stats.avg_pnl_per_trade.toFixed(2)}
                              </div>
                         </div>
                         <div
                              style={{
                                   padding: "16px",
                                   backgroundColor: "#fff",
                                   border: "1px solid #eaeaea",
                                   borderRadius: "8px",
                              }}
                         >
                              <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Prediction Accuracy</div>
                              <div style={{ fontSize: "24px", fontWeight: "bold" }}>{(stats.prediction_accuracy * 100).toFixed(1)}%</div>
                         </div>
                         {stats.best_symbol && (
                              <div
                                   style={{
                                        padding: "16px",
                                        backgroundColor: "#fff",
                                        border: "1px solid #eaeaea",
                                        borderRadius: "8px",
                                   }}
                              >
                                   <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Best Symbol</div>
                                   <div style={{ fontSize: "24px", fontWeight: "bold", color: "#10b981" }}>{stats.best_symbol}</div>
                              </div>
                         )}
                         </div>
                    </div>
               )}

               {/* Charts */}
               <div
                    style={{
                         display: "grid",
                         gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
                         gap: "24px",
                         marginBottom: "24px",
                    }}
               >
                    {/* Win/Loss Distribution */}
                    {winRateData.length > 0 && (
                         <div
                              style={{
                                   padding: "16px",
                                   backgroundColor: "#fff",
                                   border: "1px solid #eaeaea",
                                   borderRadius: "8px",
                              }}
                         >
                              <h3 style={{ marginBottom: "16px", fontSize: "18px" }}>Win/Loss Distribution</h3>
                              <ResponsiveContainer width="100%" height={300}>
                                   <PieChart>
                                        <Pie
                                             data={winRateData}
                                             cx="50%"
                                             cy="50%"
                                             labelLine={false}
                                             label={(props) => {
                                                  const name = (props as { name?: string }).name || "";
                                                  const percent = (props as { percent?: number }).percent || 0;
                                                  return `${name}: ${(percent * 100).toFixed(0)}%`;
                                             }}
                                             outerRadius={80}
                                             fill="#8884d8"
                                             dataKey="value"
                                        >
                                             {winRateData.map((entry, index) => (
                                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                             ))}
                                        </Pie>
                                        <Tooltip />
                                   </PieChart>
                              </ResponsiveContainer>
                         </div>
                    )}

                    {/* P&L Distribution */}
                    {pnlDistribution.length > 0 && (
                         <div
                              style={{
                                   padding: "16px",
                                   backgroundColor: "#fff",
                                   border: "1px solid #eaeaea",
                                   borderRadius: "8px",
                              }}
                         >
                              <h3 style={{ marginBottom: "16px", fontSize: "18px" }}>P&L Distribution (Top 20)</h3>
                              <ResponsiveContainer width="100%" height={300}>
                                   <BarChart data={pnlDistribution}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="pnl" fill="#6366f1" />
                                   </BarChart>
                              </ResponsiveContainer>
                         </div>
                    )}

                    {/* Symbol Distribution */}
                    {symbolPieData.length > 0 && (
                         <div
                              style={{
                                   padding: "16px",
                                   backgroundColor: "#fff",
                                   border: "1px solid #eaeaea",
                                   borderRadius: "8px",
                              }}
                         >
                              <h3 style={{ marginBottom: "16px", fontSize: "18px" }}>Trade Distribution by Symbol</h3>
                              <ResponsiveContainer width="100%" height={300}>
                                   <PieChart>
                                        <Pie
                                             data={symbolPieData}
                                             cx="50%"
                                             cy="50%"
                                             labelLine={false}
                                             label={(props) => {
                                                  const name = (props as { name?: string }).name || "";
                                                  const percent = (props as { percent?: number }).percent || 0;
                                                  return `${name}: ${(percent * 100).toFixed(0)}%`;
                                             }}
                                             outerRadius={80}
                                             fill="#8884d8"
                                             dataKey="value"
                                        >
                                             {symbolPieData.map((entry, index) => (
                                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                             ))}
                                        </Pie>
                                        <Tooltip />
                                   </PieChart>
                              </ResponsiveContainer>
                         </div>
                    )}
               </div>

               {/* Trade Results Table */}
               <div style={{ backgroundColor: "#fff", border: "1px solid #eaeaea", borderRadius: "8px", overflow: "auto", marginTop: "24px" }}>
                    <div style={{ padding: "16px", borderBottom: "1px solid #eaeaea", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                         <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>Trade Results</h2>
                         <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                   onClick={() => exportTradeResults("csv")}
                                   disabled={exporting?.type === "trades"}
                                   style={{
                                        padding: "6px 12px",
                                        backgroundColor: exporting?.type === "trades" && exporting?.format === "csv" ? "#6b7280" : "#0070f3",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: exporting?.type === "trades" ? "not-allowed" : "pointer",
                                        fontSize: "13px",
                                        fontWeight: "500",
                                        opacity: exporting?.type === "trades" && exporting?.format === "csv" ? 0.7 : 1,
                                   }}
                              >
                                   {exporting?.type === "trades" && exporting?.format === "csv" ? "Exporting..." : "Export (CSV)"}
                              </button>
                              <button
                                   onClick={() => exportTradeResults("json")}
                                   disabled={exporting?.type === "trades"}
                                   style={{
                                        padding: "6px 12px",
                                        backgroundColor: exporting?.type === "trades" && exporting?.format === "json" ? "#6b7280" : "#10b981",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: exporting?.type === "trades" ? "not-allowed" : "pointer",
                                        fontSize: "13px",
                                        fontWeight: "500",
                                        opacity: exporting?.type === "trades" && exporting?.format === "json" ? 0.7 : 1,
                                   }}
                              >
                                   {exporting?.type === "trades" && exporting?.format === "json" ? "Exporting..." : "Export (JSON)"}
                              </button>
                         </div>
                    </div>
                    {tradeResults.length === 0 ? (
                         <p style={{ padding: "24px", textAlign: "center", color: "#666" }}>No trade results found</p>
                    ) : (
                         <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                   <tr style={{ backgroundColor: "#f5f5f5" }}>
                                        <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #eaeaea" }}>Symbol</th>
                                        <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #eaeaea" }}>Side</th>
                                        <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #eaeaea" }}>Entry Price</th>
                                        <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #eaeaea" }}>Exit Price</th>
                                        <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #eaeaea" }}>P&L</th>
                                        <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #eaeaea" }}>P&L %</th>
                                        <th style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #eaeaea" }}>Win/Loss</th>
                                        <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #eaeaea" }}>Duration</th>
                                        <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #eaeaea" }}>Exit Time</th>
                                   </tr>
                              </thead>
                              <tbody>
                                   {tradeResults.map((tr) => (
                                        <tr key={tr.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                                             <td style={{ padding: "12px" }}>{tr.symbol}</td>
                                             <td style={{ padding: "12px" }}>{tr.side.toUpperCase()}</td>
                                             <td style={{ padding: "12px", textAlign: "right" }}>${parseFloat(tr.entry_price).toFixed(2)}</td>
                                             <td style={{ padding: "12px", textAlign: "right" }}>${parseFloat(tr.exit_price).toFixed(2)}</td>
                                             <td
                                                  style={{
                                                       padding: "12px",
                                                       textAlign: "right",
                                                       color: parseFloat(tr.pnl) >= 0 ? "#10b981" : "#ef4444",
                                                       fontWeight: "bold",
                                                  }}
                                             >
                                                  ${parseFloat(tr.pnl).toFixed(2)}
                                             </td>
                                             <td
                                                  style={{
                                                       padding: "12px",
                                                       textAlign: "right",
                                                       color: parseFloat(tr.pnl_percent) >= 0 ? "#10b981" : "#ef4444",
                                                  }}
                                             >
                                                  {parseFloat(tr.pnl_percent).toFixed(2)}%
                                             </td>
                                             <td style={{ padding: "12px", textAlign: "center" }}>
                                                  <span
                                                       style={{
                                                            padding: "4px 8px",
                                                            borderRadius: "4px",
                                                            backgroundColor: tr.win_loss ? "#10b981" : "#ef4444",
                                                            color: "white",
                                                            fontSize: "12px",
                                                            fontWeight: "bold",
                                                       }}
                                                  >
                                                       {tr.win_loss ? "WIN" : "LOSS"}
                                                  </span>
                                             </td>
                                             <td style={{ padding: "12px", textAlign: "right" }}>{tr.duration_minutes} min</td>
                                             <td style={{ padding: "12px" }}>{new Date(tr.exit_time).toLocaleString()}</td>
                                        </tr>
                                   ))}
                              </tbody>
                         </table>
                    )}
               </div>
          </div>
     );
}

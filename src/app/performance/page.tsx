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

interface Model {
    model_version: string;
    model_type: string;
    symbol: string;
    horizon_minutes: number;
    created_at: string;
    file_path: string;
}

interface ModelPerformance {
    id: number;
    model_version: string;
    symbol: string | null;
    horizon: string | null;
    accuracy: string;
    precision: string | null;
    recall: string | null;
    f1_score: string | null;
    win_rate: string;
    avg_pnl_per_trade: string;
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    period_start: string;
    period_end: string;
    calculated_at: string;
}

interface WinRateData {
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    win_rate: number;
}

interface PredictionAccuracyData {
    total_predictions: number;
    avg_accuracy: number;
    accuracy_within_5pct: number;
}

interface ShouldRetrainData {
    should_retrain: boolean;
    reason: string;
    current_win_rate: number | null;
    current_accuracy: number | null;
    win_rate_threshold: number;
    accuracy_threshold: number;
}

export default function PerformancePage() {
     const [activeTab, setActiveTab] = useState<"trades" | "model">("trades");
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

     // Model Performance State
     const [models, setModels] = useState<Model[]>([]);
     const [modelPerformance, setModelPerformance] = useState<ModelPerformance | null>(null);
     const [modelPerformanceHistory, setModelPerformanceHistory] = useState<ModelPerformance[]>([]);
     const [comparedModels, setComparedModels] = useState<ModelPerformance[]>([]);
     const [selectedModelVersionsForComparison, setSelectedModelVersionsForComparison] = useState<string[]>([]);
     const [winRateData, setWinRateData] = useState<WinRateData | null>(null);
     const [predictionAccuracy, setPredictionAccuracy] = useState<PredictionAccuracyData | null>(null);
     const [shouldRetrain, setShouldRetrain] = useState<ShouldRetrainData | null>(null);
     const [modelLoading, setModelLoading] = useState(false);
     const [historyLoading, setHistoryLoading] = useState(false);
     
     // Model Performance Filters
     const [selectedModelVersion, setSelectedModelVersion] = useState<string>("");
     const [modelSymbolFilter, setModelSymbolFilter] = useState<string>("");
     const [modelHorizonFilter, setModelHorizonFilter] = useState<string>("");
     const [winRateDays, setWinRateDays] = useState<number>(30);
     const [predictionDays, setPredictionDays] = useState<number>(30);
     const [winRateThreshold, setWinRateThreshold] = useState<number>(0.5);
     const [accuracyThreshold, setAccuracyThreshold] = useState<number>(0.6);

     const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

     // Fetch available models
     const fetchModels = useCallback(async () => {
          try {
               const token = localStorage.getItem("auth_token");
               if (!token) return;

               const response = await fetch(`${apiUrl}/train/models`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setModels(data.models || []);
               }
          } catch (err) {
               console.error("Error fetching models:", err);
          }
     }, [apiUrl]);

     // Fetch model performance
     const fetchModelPerformance = useCallback(async () => {
          if (!selectedModelVersion) {
               setModelPerformance(null);
               return;
          }

          setModelLoading(true);
          try {
               const token = localStorage.getItem("auth_token");
               if (!token) return;

               const params = new URLSearchParams();
               params.append("model_version", selectedModelVersion);
               if (modelSymbolFilter) params.append("symbol", modelSymbolFilter);
               if (modelHorizonFilter) params.append("horizon", modelHorizonFilter);

               const response = await fetch(`${apiUrl}/performance/model?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setModelPerformance(data);
               } else if (response.status === 404) {
                    setModelPerformance(null);
               }
          } catch (err) {
               console.error("Error fetching model performance:", err);
          } finally {
               setModelLoading(false);
          }
     }, [selectedModelVersion, modelSymbolFilter, modelHorizonFilter, apiUrl]);

     // Fetch win rate
     const fetchWinRate = useCallback(async () => {
          try {
               const token = localStorage.getItem("auth_token");
               if (!token) return;

               const params = new URLSearchParams();
               params.append("days", winRateDays.toString());
               if (modelSymbolFilter) params.append("symbol", modelSymbolFilter);

               const response = await fetch(`${apiUrl}/performance/win-rate?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setWinRateData(data);
               }
          } catch (err) {
               console.error("Error fetching win rate:", err);
          }
     }, [winRateDays, modelSymbolFilter, apiUrl]);

     // Fetch prediction accuracy
     const fetchPredictionAccuracy = useCallback(async () => {
          try {
               const token = localStorage.getItem("auth_token");
               if (!token) return;

               const params = new URLSearchParams();
               params.append("days", predictionDays.toString());
               if (modelSymbolFilter) params.append("symbol", modelSymbolFilter);
               if (modelHorizonFilter) params.append("horizon", modelHorizonFilter);

               const response = await fetch(`${apiUrl}/performance/prediction-accuracy?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setPredictionAccuracy(data);
               }
          } catch (err) {
               console.error("Error fetching prediction accuracy:", err);
          }
     }, [predictionDays, modelSymbolFilter, modelHorizonFilter, apiUrl]);

     // Fetch should retrain
     const fetchShouldRetrain = useCallback(async () => {
          if (!selectedModelVersion) {
               setShouldRetrain(null);
               return;
          }

          try {
               const token = localStorage.getItem("auth_token");
               if (!token) return;

               const params = new URLSearchParams();
               params.append("model_version", selectedModelVersion);
               params.append("win_rate_threshold", winRateThreshold.toString());
               params.append("accuracy_threshold", accuracyThreshold.toString());

               const response = await fetch(`${apiUrl}/performance/should-retrain?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setShouldRetrain(data);
               }
          } catch (err) {
               console.error("Error fetching should retrain:", err);
          }
     }, [selectedModelVersion, winRateThreshold, accuracyThreshold, apiUrl]);

     // Fetch model performance history
     const fetchModelPerformanceHistory = useCallback(async () => {
          if (!selectedModelVersion) {
               setModelPerformanceHistory([]);
               return;
          }

          setHistoryLoading(true);
          try {
               const token = localStorage.getItem("auth_token");
               if (!token) return;

               const params = new URLSearchParams();
               params.append("model_version", selectedModelVersion);
               if (modelSymbolFilter) params.append("symbol", modelSymbolFilter);
               if (modelHorizonFilter) params.append("horizon", modelHorizonFilter);
               params.append("limit", "100");

               const response = await fetch(`${apiUrl}/performance/model/history?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setModelPerformanceHistory(data);
               }
          } catch (err) {
               console.error("Error fetching model performance history:", err);
          } finally {
               setHistoryLoading(false);
          }
     }, [selectedModelVersion, modelSymbolFilter, modelHorizonFilter, apiUrl]);

     // Fetch compared models
     const fetchComparedModels = useCallback(async () => {
          if (selectedModelVersionsForComparison.length === 0) {
               setComparedModels([]);
               return;
          }

          try {
               const token = localStorage.getItem("auth_token");
               if (!token) return;

               const promises = selectedModelVersionsForComparison.map(async (version) => {
                    const params = new URLSearchParams();
                    params.append("model_version", version);
                    if (modelSymbolFilter) params.append("symbol", modelSymbolFilter);
                    if (modelHorizonFilter) params.append("horizon", modelHorizonFilter);

                    const response = await fetch(`${apiUrl}/performance/model?${params.toString()}`, {
                         headers: { Authorization: `Bearer ${token}` },
                    });

                    if (response.ok) {
                         const data = await response.json();
                         return data;
                    }
                    return null;
               });

               const results = await Promise.all(promises);
               setComparedModels(results.filter((r) => r !== null));
          } catch (err) {
               console.error("Error fetching compared models:", err);
          }
     }, [selectedModelVersionsForComparison, modelSymbolFilter, modelHorizonFilter, apiUrl]);

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
          fetchModels();
     }, [fetchModels]);

     useEffect(() => {
          if (activeTab === "model") {
               fetchModelPerformance();
               fetchModelPerformanceHistory();
               fetchWinRate();
               fetchPredictionAccuracy();
               fetchShouldRetrain();
               fetchComparedModels();
          }
     }, [activeTab, fetchModelPerformance, fetchModelPerformanceHistory, fetchWinRate, fetchPredictionAccuracy, fetchShouldRetrain, fetchComparedModels]);

     useEffect(() => {
          const loadData = async () => {
               setLoading(true);
               setError(null);
               await Promise.all([fetchStats(), fetchTradeResults()]);
               setLoading(false);
          };
          loadData();

          // Auto-refresh
          if (autoRefresh && activeTab === "trades") {
               const interval = setInterval(() => {
                    fetchStats();
                    fetchTradeResults();
               }, refreshInterval * 1000);

               return () => clearInterval(interval);
          }
     }, [fetchStats, fetchTradeResults, autoRefresh, refreshInterval, activeTab]);

     // Prepare chart data
     const winLossChartData = stats
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
          <div style={{ marginLeft: "250px", padding: "24px", minHeight: "100vh", backgroundColor: "#1a1a1a", color: "#ffffff" }}>
               <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
                    <h1 style={{ marginBottom: "24px", fontSize: "32px", fontWeight: "700", color: "#FFAE00" }}>
                         📈 Performance Dashboard
                    </h1>

                    {/* Tabs */}
                    <div style={{ display: "flex", gap: "8px", marginBottom: "24px", borderBottom: "1px solid #2a2a2a" }}>
                         <button
                              onClick={() => setActiveTab("trades")}
                              style={{
                                   padding: "12px 24px",
                                   backgroundColor: activeTab === "trades" ? "#FFAE00" : "transparent",
                                   color: activeTab === "trades" ? "#1a1a1a" : "#888888",
                                   border: "none",
                                   borderBottom: activeTab === "trades" ? "2px solid #FFAE00" : "2px solid transparent",
                                   borderRadius: "8px 8px 0 0",
                                   cursor: "pointer",
                                   fontSize: "15px",
                                   fontWeight: activeTab === "trades" ? "600" : "400",
                                   transition: "all 0.2s ease",
                              }}
                         >
                              Trade Performance
                         </button>
                         <button
                              onClick={() => setActiveTab("model")}
                              style={{
                                   padding: "12px 24px",
                                   backgroundColor: activeTab === "model" ? "#FFAE00" : "transparent",
                                   color: activeTab === "model" ? "#1a1a1a" : "#888888",
                                   border: "none",
                                   borderBottom: activeTab === "model" ? "2px solid #FFAE00" : "2px solid transparent",
                                   borderRadius: "8px 8px 0 0",
                                   cursor: "pointer",
                                   fontSize: "15px",
                                   fontWeight: activeTab === "model" ? "600" : "400",
                                   transition: "all 0.2s ease",
                              }}
                         >
                              Model Performance
                         </button>
                    </div>

                    {activeTab === "trades" && (
                         <>
                              {/* Filters */}
               <div
                    style={{
                         padding: "16px",
                         backgroundColor: "#202020",
                         border: "1px solid #2a2a2a",
                         borderRadius: "8px",
                         marginBottom: "24px",
                         display: "flex",
                         flexWrap: "wrap",
                         gap: "12px",
                         alignItems: "center",
                    }}
               >
                    <div>
                         <label style={{ marginRight: "8px", fontSize: "14px", color: "#ffffff" }}>Symbol:</label>
                         <input
                              type="text"
                              value={symbolFilter}
                              onChange={(e) => setSymbolFilter(e.target.value)}
                              placeholder="BTC/USDT"
                              style={{
                                   padding: "6px 12px",
                                   backgroundColor: "#1a1a1a",
                                   border: "1px solid #2a2a2a",
                                   borderRadius: "4px",
                                   fontSize: "14px",
                                   color: "#ffffff",
                              }}
                         />
                    </div>
                    <div>
                         <label style={{ marginRight: "8px", fontSize: "14px", color: "#ffffff" }}>Start Date:</label>
                         <input
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              style={{
                                   padding: "6px 12px",
                                   backgroundColor: "#1a1a1a",
                                   border: "1px solid #2a2a2a",
                                   borderRadius: "4px",
                                   fontSize: "14px",
                                   color: "#ffffff",
                              }}
                         />
                    </div>
                    <div>
                         <label style={{ marginRight: "8px", fontSize: "14px", color: "#ffffff" }}>End Date:</label>
                         <input
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              style={{
                                   padding: "6px 12px",
                                   backgroundColor: "#1a1a1a",
                                   border: "1px solid #2a2a2a",
                                   borderRadius: "4px",
                                   fontSize: "14px",
                                   color: "#ffffff",
                              }}
                         />
                    </div>
                    <div>
                         <label style={{ marginRight: "8px", fontSize: "14px", color: "#ffffff" }}>Win/Loss:</label>
                         <select
                              value={winLossFilter || ""}
                              onChange={(e) => setWinLossFilter(e.target.value === "" ? null : e.target.value)}
                              style={{
                                   padding: "6px 12px",
                                   backgroundColor: "#1a1a1a",
                                   border: "1px solid #2a2a2a",
                                   borderRadius: "4px",
                                   fontSize: "14px",
                                   color: "#ffffff",
                              }}
                         >
                              <option value="">All</option>
                              <option value="true">Win</option>
                              <option value="false">Loss</option>
                         </select>
                    </div>
                    <div>
                         <label style={{ marginRight: "8px", fontSize: "14px", color: "#ffffff" }}>Days:</label>
                         <select
                              value={days}
                              onChange={(e) => setDays(Number(e.target.value))}
                              style={{
                                   padding: "6px 12px",
                                   backgroundColor: "#1a1a1a",
                                   border: "1px solid #2a2a2a",
                                   borderRadius: "4px",
                                   fontSize: "14px",
                                   color: "#ffffff",
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
                         <label style={{ fontSize: "14px", display: "flex", alignItems: "center", gap: "4px", color: "#ffffff" }}>
                              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
                              Auto-refresh
                         </label>
                         {autoRefresh && (
                              <select
                                   value={refreshInterval}
                                   onChange={(e) => setRefreshInterval(Number(e.target.value))}
                                   style={{
                                        padding: "6px 12px",
                                        backgroundColor: "#1a1a1a",
                                        border: "1px solid #2a2a2a",
                                        borderRadius: "4px",
                                        fontSize: "14px",
                                        color: "#ffffff",
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
                                   backgroundColor: "#202020",
                                   border: "1px solid #2a2a2a",
                                   borderRadius: "8px",
                              }}
                         >
                              <div style={{ fontSize: "12px", color: "#888888", marginBottom: "4px" }}>Total Trades</div>
                              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ffffff" }}>{stats.total_trades}</div>
                         </div>
                         <div
                              style={{
                                   padding: "16px",
                                   backgroundColor: "#202020",
                                   border: "1px solid #2a2a2a",
                                   borderRadius: "8px",
                              }}
                         >
                              <div style={{ fontSize: "12px", color: "#888888", marginBottom: "4px" }}>Win Rate</div>
                              <div
                                   style={{
                                        fontSize: "24px",
                                        fontWeight: "bold",
                                        color: stats.win_rate >= 50 ? "#00ff00" : "#ff4444",
                                   }}
                              >
                                   {stats.win_rate.toFixed(1)}%
                              </div>
                         </div>
                         <div
                              style={{
                                   padding: "16px",
                                   backgroundColor: "#202020",
                                   border: "1px solid #2a2a2a",
                                   borderRadius: "8px",
                              }}
                         >
                              <div style={{ fontSize: "12px", color: "#888888", marginBottom: "4px" }}>Total P&L</div>
                              <div
                                   style={{
                                        fontSize: "24px",
                                        fontWeight: "bold",
                                        color: stats.total_pnl >= 0 ? "#00ff00" : "#ff4444",
                                   }}
                              >
                                   ${stats.total_pnl.toFixed(2)}
                              </div>
                         </div>
                         <div
                              style={{
                                   padding: "16px",
                                   backgroundColor: "#202020",
                                   border: "1px solid #2a2a2a",
                                   borderRadius: "8px",
                              }}
                         >
                              <div style={{ fontSize: "12px", color: "#888888", marginBottom: "4px" }}>Avg P&L per Trade</div>
                              <div
                                   style={{
                                        fontSize: "24px",
                                        fontWeight: "bold",
                                        color: stats.avg_pnl_per_trade >= 0 ? "#00ff00" : "#ff4444",
                                   }}
                              >
                                   ${stats.avg_pnl_per_trade.toFixed(2)}
                              </div>
                         </div>
                         <div
                              style={{
                                   padding: "16px",
                                   backgroundColor: "#202020",
                                   border: "1px solid #2a2a2a",
                                   borderRadius: "8px",
                              }}
                         >
                              <div style={{ fontSize: "12px", color: "#888888", marginBottom: "4px" }}>Prediction Accuracy</div>
                              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ffffff" }}>{(stats.prediction_accuracy * 100).toFixed(1)}%</div>
                         </div>
                         {stats.best_symbol && (
                              <div
                                   style={{
                                        padding: "16px",
                                        backgroundColor: "#202020",
                                        border: "1px solid #2a2a2a",
                                        borderRadius: "8px",
                                   }}
                              >
                                   <div style={{ fontSize: "12px", color: "#888888", marginBottom: "4px" }}>Best Symbol</div>
                                   <div style={{ fontSize: "24px", fontWeight: "bold", color: "#00ff00" }}>{stats.best_symbol}</div>
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
                    {winLossChartData.length > 0 && (
                         <div
                              style={{
                                   padding: "16px",
                                   backgroundColor: "#202020",
                                   border: "1px solid #2a2a2a",
                                   borderRadius: "8px",
                              }}
                         >
                              <h3 style={{ marginBottom: "16px", fontSize: "18px", color: "#ffffff" }}>Win/Loss Distribution</h3>
                              <ResponsiveContainer width="100%" height={300}>
                                   <PieChart>
                                        <Pie
                                             data={winLossChartData}
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
                                             {winLossChartData.map((entry, index) => (
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
                                   backgroundColor: "#202020",
                                   border: "1px solid #2a2a2a",
                                   borderRadius: "8px",
                              }}
                         >
                              <h3 style={{ marginBottom: "16px", fontSize: "18px", color: "#ffffff" }}>P&L Distribution (Top 20)</h3>
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
                                   backgroundColor: "#202020",
                                   border: "1px solid #2a2a2a",
                                   borderRadius: "8px",
                              }}
                         >
                              <h3 style={{ marginBottom: "16px", fontSize: "18px", color: "#ffffff" }}>Trade Distribution by Symbol</h3>
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
               <div style={{ backgroundColor: "#202020", border: "1px solid #2a2a2a", borderRadius: "8px", overflow: "auto", marginTop: "24px" }}>
                    <div style={{ padding: "16px", borderBottom: "1px solid #2a2a2a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                         <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: "#ffffff" }}>Trade Results</h2>
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
                                   <tr style={{ backgroundColor: "#1a1a1a" }}>
                                        <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #2a2a2a", color: "#ffffff" }}>Symbol</th>
                                        <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #2a2a2a", color: "#ffffff" }}>Side</th>
                                        <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #2a2a2a", color: "#ffffff" }}>Entry Price</th>
                                        <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #2a2a2a", color: "#ffffff" }}>Exit Price</th>
                                        <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #2a2a2a", color: "#ffffff" }}>P&L</th>
                                        <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #2a2a2a", color: "#ffffff" }}>P&L %</th>
                                        <th style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #2a2a2a", color: "#ffffff" }}>Win/Loss</th>
                                        <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #2a2a2a", color: "#ffffff" }}>Duration</th>
                                        <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #2a2a2a", color: "#ffffff" }}>Exit Time</th>
                                   </tr>
                              </thead>
                              <tbody>
                                   {tradeResults.map((tr) => (
                                        <tr key={tr.id} style={{ borderBottom: "1px solid #2a2a2a" }}>
                                             <td style={{ padding: "12px", color: "#ffffff" }}>{tr.symbol}</td>
                                             <td style={{ padding: "12px", color: "#ffffff" }}>{tr.side.toUpperCase()}</td>
                                             <td style={{ padding: "12px", textAlign: "right", color: "#ffffff" }}>${parseFloat(tr.entry_price).toFixed(2)}</td>
                                             <td style={{ padding: "12px", textAlign: "right", color: "#ffffff" }}>${parseFloat(tr.exit_price).toFixed(2)}</td>
                                             <td
                                                  style={{
                                                       padding: "12px",
                                                       textAlign: "right",
                                                       color: parseFloat(tr.pnl) >= 0 ? "#00ff00" : "#ff4444",
                                                       fontWeight: "bold",
                                                  }}
                                             >
                                                  ${parseFloat(tr.pnl).toFixed(2)}
                                             </td>
                                             <td
                                                  style={{
                                                       padding: "12px",
                                                       textAlign: "right",
                                                       color: parseFloat(tr.pnl_percent) >= 0 ? "#00ff00" : "#ff4444",
                                                  }}
                                             >
                                                  {parseFloat(tr.pnl_percent).toFixed(2)}%
                                             </td>
                                             <td style={{ padding: "12px", textAlign: "center" }}>
                                                  <span
                                                       style={{
                                                            padding: "4px 8px",
                                                            borderRadius: "4px",
                                                            backgroundColor: tr.win_loss ? "#00ff00" : "#ff4444",
                                                            color: "#1a1a1a",
                                                            fontSize: "12px",
                                                            fontWeight: "bold",
                                                       }}
                                                  >
                                                       {tr.win_loss ? "WIN" : "LOSS"}
                                                  </span>
                                             </td>
                                             <td style={{ padding: "12px", textAlign: "right", color: "#ffffff" }}>{tr.duration_minutes} min</td>
                                             <td style={{ padding: "12px", color: "#ffffff" }}>{new Date(tr.exit_time).toLocaleString()}</td>
                                        </tr>
                                   ))}
                              </tbody>
                         </table>
                    )}
               </div>
                         </>
                    )}

                    {activeTab === "model" && (
                         <div>
                              {/* Model Performance Filters */}
                              <div
                                   style={{
                                        padding: "20px",
                                        backgroundColor: "#202020",
                                        border: "1px solid #2a2a2a",
                                        borderRadius: "12px",
                                        marginBottom: "24px",
                                   }}
                              >
                                   <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px", color: "#FFAE00" }}>
                                        Model Performance Metrics
                                   </h2>
                                   <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                                        <div>
                                             <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888888" }}>
                                                  Model Version *
                                             </label>
                                             <select
                                                  value={selectedModelVersion}
                                                  onChange={(e) => setSelectedModelVersion(e.target.value)}
                                                  style={{
                                                       width: "100%",
                                                       padding: "10px",
                                                       backgroundColor: "#1a1a1a",
                                                       border: "1px solid #2a2a2a",
                                                       borderRadius: "6px",
                                                       color: "#ffffff",
                                                       fontSize: "14px",
                                                  }}
                                             >
                                                  <option value="">Select model version...</option>
                                                  {models.map((model) => (
                                                       <option key={model.model_version} value={model.model_version}>
                                                            {model.model_version} ({model.model_type} - {model.symbol} - {model.horizon_minutes}m)
                                                       </option>
                                                  ))}
                                             </select>
                                        </div>
                                        <div>
                                             <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888888" }}>
                                                  Symbol (optional)
                                             </label>
                                             <input
                                                  type="text"
                                                  value={modelSymbolFilter}
                                                  onChange={(e) => setModelSymbolFilter(e.target.value.toUpperCase())}
                                                  placeholder="e.g., BTCUSDT"
                                                  style={{
                                                       width: "100%",
                                                       padding: "10px",
                                                       backgroundColor: "#1a1a1a",
                                                       border: "1px solid #2a2a2a",
                                                       borderRadius: "6px",
                                                       color: "#ffffff",
                                                       fontSize: "14px",
                                                  }}
                                             />
                                        </div>
                                        <div>
                                             <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888888" }}>
                                                  Horizon (optional)
                                             </label>
                                             <input
                                                  type="text"
                                                  value={modelHorizonFilter}
                                                  onChange={(e) => setModelHorizonFilter(e.target.value)}
                                                  placeholder="e.g., 60m, 1h"
                                                  style={{
                                                       width: "100%",
                                                       padding: "10px",
                                                       backgroundColor: "#1a1a1a",
                                                       border: "1px solid #2a2a2a",
                                                       borderRadius: "6px",
                                                       color: "#ffffff",
                                                       fontSize: "14px",
                                                  }}
                                             />
                                        </div>
                                   </div>
                              </div>

                              {/* Model Performance Card */}
                              {selectedModelVersion && (
                                   <div style={{ marginBottom: "24px" }}>
                                        <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "20px", color: "#FFAE00" }}>
                                             Model Performance: {selectedModelVersion}
                                        </h2>
                                        {modelLoading ? (
                                             <div style={{ padding: "40px", textAlign: "center", color: "#888888" }}>Loading...</div>
                                        ) : modelPerformance ? (
                                             <div
                                                  style={{
                                                       padding: "24px",
                                                       backgroundColor: "#202020",
                                                       border: "1px solid #2a2a2a",
                                                       borderRadius: "12px",
                                                       marginBottom: "24px",
                                                  }}
                                             >
                                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                                                       <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                                            <div style={{ fontSize: "12px", color: "#888888", marginBottom: "4px" }}>Accuracy</div>
                                                            <div style={{ fontSize: "24px", fontWeight: "700", color: "#ffffff" }}>
                                                                 {(parseFloat(modelPerformance.accuracy) * 100).toFixed(2)}%
                                                            </div>
                                                       </div>
                                                       {modelPerformance.precision && (
                                                            <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                                                 <div style={{ fontSize: "12px", color: "#888888", marginBottom: "4px" }}>Precision</div>
                                                                 <div style={{ fontSize: "24px", fontWeight: "700", color: "#ffffff" }}>
                                                                      {(parseFloat(modelPerformance.precision) * 100).toFixed(2)}%
                                                                 </div>
                                                            </div>
                                                       )}
                                                       {modelPerformance.recall && (
                                                            <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                                                 <div style={{ fontSize: "12px", color: "#888888", marginBottom: "4px" }}>Recall</div>
                                                                 <div style={{ fontSize: "24px", fontWeight: "700", color: "#ffffff" }}>
                                                                      {(parseFloat(modelPerformance.recall) * 100).toFixed(2)}%
                                                                 </div>
                                                            </div>
                                                       )}
                                                       {modelPerformance.f1_score && (
                                                            <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                                                 <div style={{ fontSize: "12px", color: "#888888", marginBottom: "4px" }}>F1 Score</div>
                                                                 <div style={{ fontSize: "24px", fontWeight: "700", color: "#ffffff" }}>
                                                                      {(parseFloat(modelPerformance.f1_score) * 100).toFixed(2)}%
                                                                 </div>
                                                            </div>
                                                       )}
                                                       <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                                            <div style={{ fontSize: "12px", color: "#888888", marginBottom: "4px" }}>Win Rate</div>
                                                            <div
                                                                 style={{
                                                                      fontSize: "24px",
                                                                      fontWeight: "700",
                                                                      color: parseFloat(modelPerformance.win_rate) >= 0.5 ? "#00ff00" : "#ff4444",
                                                                 }}
                                                            >
                                                                 {(parseFloat(modelPerformance.win_rate) * 100).toFixed(2)}%
                                                            </div>
                                                       </div>
                                                       <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                                            <div style={{ fontSize: "12px", color: "#888888", marginBottom: "4px" }}>Avg P&L per Trade</div>
                                                            <div
                                                                 style={{
                                                                      fontSize: "24px",
                                                                      fontWeight: "700",
                                                                      color: parseFloat(modelPerformance.avg_pnl_per_trade) >= 0 ? "#00ff00" : "#ff4444",
                                                                 }}
                                                            >
                                                                 ${parseFloat(modelPerformance.avg_pnl_per_trade).toFixed(2)}
                                                            </div>
                                                       </div>
                                                       <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                                            <div style={{ fontSize: "12px", color: "#888888", marginBottom: "4px" }}>Total Trades</div>
                                                            <div style={{ fontSize: "24px", fontWeight: "700", color: "#ffffff" }}>
                                                                 {modelPerformance.total_trades}
                                                            </div>
                                                       </div>
                                                       <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                                            <div style={{ fontSize: "12px", color: "#888888", marginBottom: "4px" }}>Winning Trades</div>
                                                            <div style={{ fontSize: "24px", fontWeight: "700", color: "#00ff00" }}>
                                                                 {modelPerformance.winning_trades}
                                                            </div>
                                                       </div>
                                                       <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                                            <div style={{ fontSize: "12px", color: "#888888", marginBottom: "4px" }}>Losing Trades</div>
                                                            <div style={{ fontSize: "24px", fontWeight: "700", color: "#ff4444" }}>
                                                                 {modelPerformance.losing_trades}
                                                            </div>
                                                       </div>
                                                  </div>
                                                  <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#1a1a1a", borderRadius: "6px", fontSize: "12px", color: "#888888" }}>
                                                       Period: {new Date(modelPerformance.period_start).toLocaleDateString()} - {new Date(modelPerformance.period_end).toLocaleDateString()}
                                                       <br />
                                                       Calculated at: {new Date(modelPerformance.calculated_at).toLocaleString()}
                                                  </div>
                                             </div>
                                        ) : (
                                             <div style={{ padding: "40px", textAlign: "center", color: "#888888" }}>
                                                  No performance data found for this model version
                                             </div>
                                        )}
                                   </div>
                              )}

                              {/* Win Rate Section */}
                              <div
                                   style={{
                                        padding: "24px",
                                        backgroundColor: "#202020",
                                        border: "1px solid #2a2a2a",
                                        borderRadius: "12px",
                                        marginBottom: "24px",
                                   }}
                              >
                                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                        <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#FFAE00" }}>Win Rate Statistics</h2>
                                        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                             <label style={{ fontSize: "14px", color: "#888888" }}>Days:</label>
                                             <select
                                                  value={winRateDays}
                                                  onChange={(e) => setWinRateDays(Number(e.target.value))}
                                                  style={{
                                                       padding: "6px 12px",
                                                       backgroundColor: "#1a1a1a",
                                                       border: "1px solid #2a2a2a",
                                                       borderRadius: "6px",
                                                       color: "#ffffff",
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
                                   </div>
                                   {winRateData ? (
                                        <div>
                                             <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                                                  <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                                       <div style={{ fontSize: "12px", color: "#888888", marginBottom: "4px" }}>Total Trades</div>
                                                       <div style={{ fontSize: "24px", fontWeight: "700", color: "#ffffff" }}>
                                                            {winRateData.total_trades}
                                                       </div>
                                                  </div>
                                                  <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                                       <div style={{ fontSize: "12px", color: "#888888", marginBottom: "4px" }}>Winning Trades</div>
                                                       <div style={{ fontSize: "24px", fontWeight: "700", color: "#00ff00" }}>
                                                            {winRateData.winning_trades}
                                                       </div>
                                                  </div>
                                                  <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                                       <div style={{ fontSize: "12px", color: "#888888", marginBottom: "4px" }}>Losing Trades</div>
                                                       <div style={{ fontSize: "24px", fontWeight: "700", color: "#ff4444" }}>
                                                            {winRateData.losing_trades}
                                                       </div>
                                                  </div>
                                                  <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                                       <div style={{ fontSize: "12px", color: "#888888", marginBottom: "4px" }}>Win Rate</div>
                                                       <div
                                                            style={{
                                                                 fontSize: "24px",
                                                                 fontWeight: "700",
                                                                 color: winRateData.win_rate >= 0.5 ? "#00ff00" : "#ff4444",
                                                            }}
                                                       >
                                                            {(winRateData.win_rate * 100).toFixed(2)}%
                                                       </div>
                                                  </div>
                                             </div>
                                             {/* Win Rate Chart */}
                                             <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                                  <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "#ffffff" }}>
                                                       Win Rate Over Time
                                                  </h3>
                                                  <ResponsiveContainer width="100%" height={300}>
                                                       <BarChart
                                                            data={[
                                                                 { name: "Wins", value: winRateData.winning_trades, color: "#00ff00" },
                                                                 { name: "Losses", value: winRateData.losing_trades, color: "#ff4444" },
                                                            ]}
                                                       >
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                                                            <XAxis dataKey="name" stroke="#888888" />
                                                            <YAxis stroke="#888888" />
                                                            <Tooltip
                                                                 contentStyle={{
                                                                      backgroundColor: "#202020",
                                                                      border: "1px solid #2a2a2a",
                                                                      borderRadius: "6px",
                                                                      color: "#ffffff",
                                                                 }}
                                                            />
                                                            <Bar dataKey="value" fill="#8884d8">
                                                                 {[
                                                                      { name: "Wins", value: winRateData.winning_trades, color: "#00ff00" },
                                                                      { name: "Losses", value: winRateData.losing_trades, color: "#ff4444" },
                                                                 ].map((entry, index) => (
                                                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                                                 ))}
                                                            </Bar>
                                                       </BarChart>
                                                  </ResponsiveContainer>
                                             </div>
                                        </div>
                                   ) : (
                                        <div style={{ padding: "40px", textAlign: "center", color: "#888888" }}>No win rate data available</div>
                                   )}
                              </div>

                              {/* Prediction Accuracy Section */}
                              <div
                                   style={{
                                        padding: "24px",
                                        backgroundColor: "#202020",
                                        border: "1px solid #2a2a2a",
                                        borderRadius: "12px",
                                        marginBottom: "24px",
                                   }}
                              >
                                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                        <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#FFAE00" }}>Prediction Accuracy Statistics</h2>
                                        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                             <label style={{ fontSize: "14px", color: "#888888" }}>Days:</label>
                                             <select
                                                  value={predictionDays}
                                                  onChange={(e) => setPredictionDays(Number(e.target.value))}
                                                  style={{
                                                       padding: "6px 12px",
                                                       backgroundColor: "#1a1a1a",
                                                       border: "1px solid #2a2a2a",
                                                       borderRadius: "6px",
                                                       color: "#ffffff",
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
                                   </div>
                                   {predictionAccuracy ? (
                                        <div>
                                             <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                                                  <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                                       <div style={{ fontSize: "12px", color: "#888888", marginBottom: "4px" }}>Total Predictions</div>
                                                       <div style={{ fontSize: "24px", fontWeight: "700", color: "#ffffff" }}>
                                                            {predictionAccuracy.total_predictions}
                                                       </div>
                                                  </div>
                                                  <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                                       <div style={{ fontSize: "12px", color: "#888888", marginBottom: "4px" }}>Average Accuracy</div>
                                                       <div style={{ fontSize: "24px", fontWeight: "700", color: "#FFAE00" }}>
                                                            {(predictionAccuracy.avg_accuracy * 100).toFixed(2)}%
                                                       </div>
                                                  </div>
                                                  <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                                       <div style={{ fontSize: "12px", color: "#888888", marginBottom: "4px" }}>Accuracy Within 5%</div>
                                                       <div style={{ fontSize: "24px", fontWeight: "700", color: "#00ff00" }}>
                                                            {(predictionAccuracy.accuracy_within_5pct * 100).toFixed(2)}%
                                                       </div>
                                                  </div>
                                             </div>
                                        </div>
                                   ) : (
                                        <div style={{ padding: "40px", textAlign: "center", color: "#888888" }}>No prediction accuracy data available</div>
                                   )}
                              </div>

                              {/* Should Retrain Section */}
                              {selectedModelVersion && (
                                   <div
                                        style={{
                                             padding: "24px",
                                             backgroundColor: "#202020",
                                             border: "1px solid #2a2a2a",
                                             borderRadius: "12px",
                                        }}
                                   >
                                        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px", color: "#FFAE00" }}>
                                             Retrain Recommendation
                                        </h2>
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                                             <div>
                                                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888888" }}>
                                                       Win Rate Threshold
                                                  </label>
                                                  <input
                                                       type="number"
                                                       min="0"
                                                       max="1"
                                                       step="0.1"
                                                       value={winRateThreshold}
                                                       onChange={(e) => setWinRateThreshold(parseFloat(e.target.value))}
                                                       style={{
                                                            width: "100%",
                                                            padding: "10px",
                                                            backgroundColor: "#1a1a1a",
                                                            border: "1px solid #2a2a2a",
                                                            borderRadius: "6px",
                                                            color: "#ffffff",
                                                            fontSize: "14px",
                                                       }}
                                                  />
                                             </div>
                                             <div>
                                                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888888" }}>
                                                       Accuracy Threshold
                                                  </label>
                                                  <input
                                                       type="number"
                                                       min="0"
                                                       max="1"
                                                       step="0.1"
                                                       value={accuracyThreshold}
                                                       onChange={(e) => setAccuracyThreshold(parseFloat(e.target.value))}
                                                       style={{
                                                            width: "100%",
                                                            padding: "10px",
                                                            backgroundColor: "#1a1a1a",
                                                            border: "1px solid #2a2a2a",
                                                            borderRadius: "6px",
                                                            color: "#ffffff",
                                                            fontSize: "14px",
                                                       }}
                                                  />
                                             </div>
                                        </div>
                                        {shouldRetrain ? (
                                             <div
                                                  style={{
                                                       padding: "20px",
                                                       backgroundColor: shouldRetrain.should_retrain ? "rgba(255, 68, 68, 0.1)" : "rgba(0, 255, 0, 0.1)",
                                                       border: `1px solid ${shouldRetrain.should_retrain ? "rgba(255, 68, 68, 0.3)" : "rgba(0, 255, 0, 0.3)"}`,
                                                       borderRadius: "8px",
                                                  }}
                                             >
                                                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                                                       <span style={{ fontSize: "24px" }}>{shouldRetrain.should_retrain ? "⚠️" : "✅"}</span>
                                                       <div>
                                                            <div
                                                                 style={{
                                                                      fontSize: "18px",
                                                                      fontWeight: "600",
                                                                      color: shouldRetrain.should_retrain ? "#ff4444" : "#00ff00",
                                                                 }}
                                                            >
                                                                 {shouldRetrain.should_retrain ? "Model Should Be Retrained" : "Model Performance is Good"}
                                                            </div>
                                                       </div>
                                                  </div>
                                                  <div style={{ fontSize: "14px", color: "#888888", marginBottom: "12px" }}>
                                                       <strong>Reason:</strong> {shouldRetrain.reason}
                                                  </div>
                                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", fontSize: "12px", color: "#888888" }}>
                                                       {shouldRetrain.current_win_rate !== null && (
                                                            <div>
                                                                 Current Win Rate: <strong style={{ color: "#ffffff" }}>{(shouldRetrain.current_win_rate * 100).toFixed(2)}%</strong>
                                                                 <br />
                                                                 Threshold: <strong style={{ color: "#ffffff" }}>{(shouldRetrain.win_rate_threshold * 100).toFixed(0)}%</strong>
                                                            </div>
                                                       )}
                                                       {shouldRetrain.current_accuracy !== null && (
                                                            <div>
                                                                 Current Accuracy: <strong style={{ color: "#ffffff" }}>{(shouldRetrain.current_accuracy * 100).toFixed(2)}%</strong>
                                                                 <br />
                                                                 Threshold: <strong style={{ color: "#ffffff" }}>{(shouldRetrain.accuracy_threshold * 100).toFixed(0)}%</strong>
                                                            </div>
                                                       )}
                                                  </div>
                                             </div>
                                        ) : (
                                             <div style={{ padding: "40px", textAlign: "center", color: "#888888" }}>
                                                  Select a model version to check retrain recommendation
                                             </div>
                                        )}
                                   </div>
                              )}
                         </div>
                    )}

                    {/* Model Comparison Section */}
                    <div
                         style={{
                              padding: "24px",
                              backgroundColor: "#202020",
                              border: "1px solid #2a2a2a",
                              borderRadius: "12px",
                              marginBottom: "24px",
                         }}
                    >
                         <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px", color: "#FFAE00" }}>
                              Model Comparison
                         </h2>
                         <div style={{ marginBottom: "20px" }}>
                              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#888888" }}>
                                   Select Model Versions to Compare (multiple selection)
                              </label>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                   {models.map((model) => (
                                        <label
                                             key={model.model_version}
                                             style={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: "6px",
                                                  padding: "8px 12px",
                                                  backgroundColor: selectedModelVersionsForComparison.includes(model.model_version) ? "#FFAE00" : "#1a1a1a",
                                                  border: "1px solid #2a2a2a",
                                                  borderRadius: "6px",
                                                  cursor: "pointer",
                                                  fontSize: "13px",
                                                  color: selectedModelVersionsForComparison.includes(model.model_version) ? "#1a1a1a" : "#ffffff",
                                             }}
                                        >
                                             <input
                                                  type="checkbox"
                                                  checked={selectedModelVersionsForComparison.includes(model.model_version)}
                                                  onChange={(e) => {
                                                       if (e.target.checked) {
                                                            setSelectedModelVersionsForComparison([...selectedModelVersionsForComparison, model.model_version]);
                                                       } else {
                                                            setSelectedModelVersionsForComparison(selectedModelVersionsForComparison.filter((v) => v !== model.model_version));
                                                       }
                                                  }}
                                                  style={{ cursor: "pointer" }}
                                             />
                                             {model.model_version}
                                        </label>
                                   ))}
                              </div>
                         </div>
                         {comparedModels.length > 0 && (
                              <div style={{ overflowX: "auto" }}>
                                   <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                        <thead>
                                             <tr style={{ backgroundColor: "#1a1a1a" }}>
                                                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #2a2a2a", color: "#ffffff" }}>Model Version</th>
                                                  <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #2a2a2a", color: "#ffffff" }}>Accuracy</th>
                                                  <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #2a2a2a", color: "#ffffff" }}>Win Rate</th>
                                                  <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #2a2a2a", color: "#ffffff" }}>Avg P&L</th>
                                                  <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #2a2a2a", color: "#ffffff" }}>Total Trades</th>
                                                  <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #2a2a2a", color: "#ffffff" }}>Winning Trades</th>
                                                  <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #2a2a2a", color: "#ffffff" }}>Losing Trades</th>
                                             </tr>
                                        </thead>
                                        <tbody>
                                             {comparedModels.map((mp) => (
                                                  <tr key={mp.model_version} style={{ borderBottom: "1px solid #2a2a2a" }}>
                                                       <td style={{ padding: "12px", color: "#ffffff", fontWeight: "600" }}>{mp.model_version}</td>
                                                       <td style={{ padding: "12px", textAlign: "right", color: "#FFAE00" }}>
                                                            {(parseFloat(mp.accuracy) * 100).toFixed(2)}%
                                                       </td>
                                                       <td
                                                            style={{
                                                                 padding: "12px",
                                                                 textAlign: "right",
                                                                 color: parseFloat(mp.win_rate) >= 0.5 ? "#00ff00" : "#ff4444",
                                                            }}
                                                       >
                                                            {(parseFloat(mp.win_rate) * 100).toFixed(2)}%
                                                       </td>
                                                       <td
                                                            style={{
                                                                 padding: "12px",
                                                                 textAlign: "right",
                                                                 color: parseFloat(mp.avg_pnl_per_trade) >= 0 ? "#00ff00" : "#ff4444",
                                                            }}
                                                       >
                                                            ${parseFloat(mp.avg_pnl_per_trade).toFixed(2)}
                                                       </td>
                                                       <td style={{ padding: "12px", textAlign: "right", color: "#ffffff" }}>{mp.total_trades}</td>
                                                       <td style={{ padding: "12px", textAlign: "right", color: "#00ff00" }}>{mp.winning_trades}</td>
                                                       <td style={{ padding: "12px", textAlign: "right", color: "#ff4444" }}>{mp.losing_trades}</td>
                                                  </tr>
                                             ))}
                                        </tbody>
                                   </table>
                              </div>
                         )}
                    </div>

                    {/* Performance Over Time Chart */}
                    {selectedModelVersion && (
                         <div
                              style={{
                                   padding: "24px",
                                   backgroundColor: "#202020",
                                   border: "1px solid #2a2a2a",
                                   borderRadius: "12px",
                                   marginBottom: "24px",
                              }}
                         >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                   <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#FFAE00" }}>Performance Over Time</h2>
                                   {modelPerformance && (
                                        <button
                                             onClick={() => {
                                                  // Export model metrics
                                                  const exportData = {
                                                       model_version: modelPerformance.model_version,
                                                       symbol: modelPerformance.symbol,
                                                       horizon: modelPerformance.horizon,
                                                       export_date: new Date().toISOString(),
                                                       current_performance: modelPerformance,
                                                       history: modelPerformanceHistory,
                                                       compared_models: comparedModels,
                                                  };

                                                  // Export as JSON
                                                  const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                                                  const jsonUrl = URL.createObjectURL(jsonBlob);
                                                  const jsonLink = document.createElement("a");
                                                  jsonLink.href = jsonUrl;
                                                  jsonLink.download = `model_performance_${modelPerformance.model_version}_${new Date().toISOString().split("T")[0]}.json`;
                                                  jsonLink.click();
                                                  URL.revokeObjectURL(jsonUrl);

                                                  // Export as CSV
                                                  const csvHeaders = [
                                                       "calculated_at",
                                                       "accuracy",
                                                       "win_rate",
                                                       "avg_pnl_per_trade",
                                                       "total_trades",
                                                       "winning_trades",
                                                       "losing_trades",
                                                  ];
                                                  const csvRows = [
                                                       csvHeaders.join(","),
                                                       ...modelPerformanceHistory.map((mp) =>
                                                            [
                                                                 new Date(mp.calculated_at).toISOString(),
                                                                 (parseFloat(mp.accuracy) * 100).toFixed(2),
                                                                 (parseFloat(mp.win_rate) * 100).toFixed(2),
                                                                 parseFloat(mp.avg_pnl_per_trade).toFixed(2),
                                                                 mp.total_trades,
                                                                 mp.winning_trades,
                                                                 mp.losing_trades,
                                                            ].join(",")
                                                       ),
                                                  ];
                                                  const csvBlob = new Blob([csvRows.join("\n")], { type: "text/csv" });
                                                  const csvUrl = URL.createObjectURL(csvBlob);
                                                  const csvLink = document.createElement("a");
                                                  csvLink.href = csvUrl;
                                                  csvLink.download = `model_performance_${modelPerformance.model_version}_${new Date().toISOString().split("T")[0]}.csv`;
                                                  csvLink.click();
                                                  URL.revokeObjectURL(csvUrl);
                                             }}
                                             style={{
                                                  padding: "8px 16px",
                                                  backgroundColor: "#FFAE00",
                                                  color: "#1a1a1a",
                                                  border: "none",
                                                  borderRadius: "6px",
                                                  cursor: "pointer",
                                                  fontSize: "14px",
                                                  fontWeight: "600",
                                             }}
                                        >
                                             📥 Export Metrics
                                        </button>
                                   )}
                              </div>
                              {historyLoading ? (
                                   <div style={{ padding: "40px", textAlign: "center", color: "#888888" }}>Loading history...</div>
                              ) : modelPerformanceHistory.length > 0 ? (
                                   <div>
                                        <ResponsiveContainer width="100%" height={400}>
                                             <LineChart data={modelPerformanceHistory.map((mp) => ({
                                                  date: new Date(mp.calculated_at).toLocaleDateString(),
                                                  accuracy: parseFloat(mp.accuracy) * 100,
                                                  win_rate: parseFloat(mp.win_rate) * 100,
                                                  avg_pnl: parseFloat(mp.avg_pnl_per_trade),
                                             }))}>
                                                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                                                  <XAxis dataKey="date" stroke="#888888" angle={-45} textAnchor="end" height={80} />
                                                  <YAxis yAxisId="left" stroke="#888888" />
                                                  <YAxis yAxisId="right" orientation="right" stroke="#888888" />
                                                  <Tooltip
                                                       contentStyle={{
                                                            backgroundColor: "#202020",
                                                            border: "1px solid #2a2a2a",
                                                            borderRadius: "6px",
                                                            color: "#ffffff",
                                                       }}
                                                  />
                                                  <Legend />
                                                  <Line
                                                       yAxisId="left"
                                                       type="monotone"
                                                       dataKey="accuracy"
                                                       stroke="#FFAE00"
                                                       strokeWidth={2}
                                                       name="Accuracy (%)"
                                                       dot={{ fill: "#FFAE00", r: 4 }}
                                                  />
                                                  <Line
                                                       yAxisId="left"
                                                       type="monotone"
                                                       dataKey="win_rate"
                                                       stroke="#00ff00"
                                                       strokeWidth={2}
                                                       name="Win Rate (%)"
                                                       dot={{ fill: "#00ff00", r: 4 }}
                                                  />
                                                  <Line
                                                       yAxisId="right"
                                                       type="monotone"
                                                       dataKey="avg_pnl"
                                                       stroke="#6366f1"
                                                       strokeWidth={2}
                                                       name="Avg P&L ($)"
                                                       dot={{ fill: "#6366f1", r: 4 }}
                                                  />
                                             </LineChart>
                                        </ResponsiveContainer>
                                   </div>
                              ) : (
                                   <div style={{ padding: "40px", textAlign: "center", color: "#888888" }}>No performance history available</div>
                              )}
                         </div>
                    )}
               </div>
          </div>
     );
}

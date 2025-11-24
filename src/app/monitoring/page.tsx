"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useExchange } from "@/contexts/ExchangeContext";
import Alert from "@/components/Alert";
import Link from "next/link";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Market {
     symbol: string;
     base: string;
     quote: string;
     active: boolean;
}

interface AnomalyScore {
     symbol: string;
     interval: string;
     anomaly_score: {
          z_score?: number;
          iqr_score?: number;
          combined_score?: number;
          is_anomaly?: boolean;
          price_change_percent?: number;
     };
}

interface JumpDetection {
     symbol: string;
     interval: string;
     jump_detection: {
          threshold_based?: {
               detected: boolean;
               jump_percent: number;
          };
          ml_based?: {
               detected: boolean;
               probability: number;
          };
          combined_result?: {
               detected: boolean;
               confidence: number;
          };
     };
}

interface Alert {
     symbol: string;
     alert_type: string;
     severity: string;
     message: string;
     timestamp: string;
     data: Record<string, unknown>;
}

interface MonitoringResponse {
     monitoring_results: Record<string, unknown>;
     alerts: Alert[];
     alert_count: number;
}

interface ThresholdTrigger {
     threshold_name: string;
     triggered: boolean;
     value: number;
     threshold: number;
     message: string;
}

export default function MonitoringPage() {
     const { selectedAccountId, setSelectedAccountId, accounts } = useExchange();
     const [markets, setMarkets] = useState<Market[]>([]);
     const [selectedSymbol, setSelectedSymbol] = useState<string>("");
     const [interval, setInterval] = useState<string>("5m");
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState<string | null>(null);
     const [success, setSuccess] = useState<string | null>(null);
     const [info, setInfo] = useState<string | null>(null);

     // Monitoring data states
     const [anomalyScore, setAnomalyScore] = useState<AnomalyScore | null>(null);
     const [jumpDetection, setJumpDetection] = useState<JumpDetection | null>(null);
     const [alerts, setAlerts] = useState<Alert[]>([]);
     const [thresholdTriggers, setThresholdTriggers] = useState<ThresholdTrigger[]>([]);
     const [monitoringResults, setMonitoringResults] = useState<MonitoringResponse | null>(null);

     // Loading states
     const [anomalyLoading, setAnomalyLoading] = useState(false);
     const [jumpLoading, setJumpLoading] = useState(false);
     const [alertsLoading, setAlertsLoading] = useState(false);
     const [thresholdsLoading, setThresholdsLoading] = useState(false);
     const [monitoringLoading, setMonitoringLoading] = useState(false);

     // Auto-refresh
     const [autoRefresh, setAutoRefresh] = useState(false);
     const [refreshInterval, setRefreshInterval] = useState(30); // seconds
     const [anomalyHistory, setAnomalyHistory] = useState<Array<{ time: string; score: number }>>([]);

     // Alert Management states
     const [showThresholdSettings, setShowThresholdSettings] = useState(false);
     const [thresholds, setThresholds] = useState({
          price_change_high: 0.05,
          price_change_critical: 0.10,
          volatility_high: 0.03,
          volume_spike: 2.0,
          anomaly_score_high: 0.7,
          anomaly_score_critical: 0.9,
     });
     const [alertsEnabled, setAlertsEnabled] = useState(true);
     const [alertHistory, setAlertHistory] = useState<Alert[]>([]);
     const [showAlertHistory, setShowAlertHistory] = useState(false);
     const [alertFilters, setAlertFilters] = useState({
          severity: "all",
          symbol: "",
          type: "all",
     });

     const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

     // Normalize symbol (remove / and - to match database format)
     const normalizeSymbol = useCallback((symbol: string) => {
          return symbol.replace(/\//g, "").replace(/-/g, "").toUpperCase();
     }, []);

     // Available intervals
     const availableIntervals = useMemo(() => ["1m", "5m", "15m", "30m", "1h", "4h", "1d"], []);

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

                    const response = await fetch(`${apiUrl}/market/pairs/${selectedAccountId}`, {
                         headers: { Authorization: `Bearer ${token}` },
                    });

                    if (response.ok) {
                         const data = await response.json();
                         const marketsList = data.markets || [];
                         // Normalize all symbols to BTCUSDT format (remove / and -)
                         const normalizedMarkets = marketsList
                              .filter((m: Market) => m.active !== false)
                              .map((m: Market) => ({
                                   ...m,
                                   symbol: normalizeSymbol(m.symbol),
                              }));
                         setMarkets(normalizedMarkets);
                         setError(null);

                         // Auto-select first symbol if available (already normalized)
                         if (normalizedMarkets.length > 0 && selectedSymbol === "") {
                              setSelectedSymbol(normalizedMarkets[0].symbol);
                         }
                    } else {
                         const errorData = await response.json().catch(() => ({}));
                         setError(errorData.detail || `Failed to load trading pairs (${response.status})`);
                    }
               } catch (error) {
                    console.error("Error fetching markets:", error);
                    setError("Failed to fetch markets");
               }
          };

          fetchMarkets();
     }, [selectedAccountId, apiUrl]);

     // Fetch anomaly score
     const fetchAnomalyScore = useCallback(async () => {
          if (!selectedSymbol) return;

          setAnomalyLoading(true);
          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) return;

               // Symbol is already normalized (BTCUSDT format)
               const normalizedSymbol = selectedSymbol;
               const response = await fetch(`${apiUrl}/monitoring/anomaly-score/${normalizedSymbol}?interval=${interval}`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setAnomalyScore(data);
                    
                    // Add to history
                    if (data.anomaly_score?.combined_score !== undefined) {
                         setAnomalyHistory((prev) => {
                              const newHistory = [...prev, {
                                   time: new Date().toLocaleTimeString(),
                                   score: data.anomaly_score.combined_score || 0,
                              }];
                              // Keep last 20 points
                              return newHistory.slice(-20);
                         });
                    }
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    if (response.status === 404) {
                         setError(errorData.detail || `No data available for ${selectedSymbol} with interval ${interval}. Please ensure data exists in the database.`);
                    } else {
                         setError(errorData.detail || "Failed to fetch anomaly score");
                    }
               }
          } catch (error) {
               console.error("Error fetching anomaly score:", error);
               setError("Failed to fetch anomaly score");
          } finally {
               setAnomalyLoading(false);
          }
     }, [selectedSymbol, interval, apiUrl, normalizeSymbol]);

     // Fetch jump detection
     const fetchJumpDetection = useCallback(async () => {
          if (!selectedSymbol) return;

          setJumpLoading(true);
          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) return;

               // Symbol is already normalized (BTCUSDT format)
               const normalizedSymbol = selectedSymbol;
               const response = await fetch(`${apiUrl}/monitoring/jump-detection/${normalizedSymbol}?interval=${interval}`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setJumpDetection(data);
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    if (response.status === 404) {
                         setError(errorData.detail || `No data available for ${selectedSymbol} with interval ${interval}. Please ensure data exists in the database.`);
                    } else {
                         setError(errorData.detail || "Failed to fetch jump detection");
                    }
               }
          } catch (error) {
               console.error("Error fetching jump detection:", error);
               setError("Failed to fetch jump detection");
          } finally {
               setJumpLoading(false);
          }
     }, [selectedSymbol, interval, apiUrl, normalizeSymbol]);

     // Fetch alerts
     const fetchAlerts = useCallback(async () => {
          setAlertsLoading(true);
          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) return;

               const params = new URLSearchParams();
               if (selectedSymbol) params.append("symbol", selectedSymbol);
               params.append("limit", "50");

               const response = await fetch(`${apiUrl}/monitoring/alerts?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    const newAlerts = Array.isArray(data) ? data : [];
                    setAlerts(newAlerts);
                    
                    // Save to alert history in localStorage
                    if (alertsEnabled && newAlerts.length > 0) {
                         const existingHistory = JSON.parse(localStorage.getItem("alertHistory") || "[]");
                         const updatedHistory = [...newAlerts, ...existingHistory]
                              .filter((alert, index, self) => 
                                   index === self.findIndex((a) => a.timestamp === alert.timestamp && a.symbol === alert.symbol)
                              )
                              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                              .slice(0, 1000); // Keep last 1000 alerts
                         localStorage.setItem("alertHistory", JSON.stringify(updatedHistory));
                         setAlertHistory(updatedHistory);
                    }
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to fetch alerts");
               }
          } catch (error) {
               console.error("Error fetching alerts:", error);
               setError("Failed to fetch alerts");
          } finally {
               setAlertsLoading(false);
          }
     }, [selectedSymbol, apiUrl, normalizeSymbol]);

     // Fetch threshold triggers
     const fetchThresholdTriggers = useCallback(async () => {
          if (!selectedSymbol) return;

          setThresholdsLoading(true);
          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) return;

               // Symbol is already normalized (BTCUSDT format)
               const normalizedSymbol = selectedSymbol;
               
               // Build query params with thresholds
               const params = new URLSearchParams();
               params.append("interval", interval);
               // Note: Backend expects thresholds as a dict in the request body or query params
               // For now, we'll pass them as query params (backend may need to parse them)
               // If backend doesn't support query params, we might need to use POST instead

               const response = await fetch(`${apiUrl}/monitoring/threshold-triggers/${normalizedSymbol}?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    // Convert to array format
                    if (data.triggers && Array.isArray(data.triggers)) {
                         setThresholdTriggers(data.triggers);
                    } else {
                         setThresholdTriggers([]);
                    }
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    if (response.status === 404) {
                         setError(errorData.detail || `No data available for ${selectedSymbol} with interval ${interval}. Please ensure data exists in the database.`);
                    } else {
                         setError(errorData.detail || "Failed to fetch threshold triggers");
                    }
               }
          } catch (error) {
               console.error("Error fetching threshold triggers:", error);
               setError("Failed to fetch threshold triggers");
          } finally {
               setThresholdsLoading(false);
          }
     }, [selectedSymbol, interval, apiUrl, normalizeSymbol]);

     // Monitor symbol (comprehensive monitoring)
     const monitorSymbol = useCallback(async () => {
          if (!selectedSymbol) {
               setError("Please select a symbol");
               return;
          }

          setMonitoringLoading(true);
          setInfo("Monitoring symbol...");
          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) {
                    setError("Please login");
                    return;
               }

               const response = await fetch(`${apiUrl}/monitoring/monitor`, {
                    method: "POST",
                    headers: {
                         Authorization: `Bearer ${token}`,
                         "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                         symbol: selectedSymbol,
                         interval: interval,
                         thresholds: alertsEnabled ? thresholds : undefined,
                    }),
               });

               if (response.ok) {
                    const data = await response.json();
                    setMonitoringResults(data);
                    setAlerts(data.alerts || []);
                    setSuccess(`Monitoring completed. Found ${data.alert_count || 0} alerts.`);
                    setInfo(null);
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to monitor symbol");
                    setInfo(null);
               }
          } catch (error) {
               console.error("Error monitoring symbol:", error);
               setError("Failed to monitor symbol");
               setInfo(null);
          } finally {
               setMonitoringLoading(false);
          }
     }, [selectedSymbol, interval, apiUrl, normalizeSymbol]);

     // Auto-refresh
     useEffect(() => {
          if (!autoRefresh || !selectedSymbol) return;

          const intervalId = window.setInterval(() => {
               fetchAnomalyScore();
               fetchJumpDetection();
               fetchAlerts();
               fetchThresholdTriggers();
          }, refreshInterval * 1000);

          return () => window.clearInterval(intervalId);
     }, [autoRefresh, refreshInterval, selectedSymbol, fetchAnomalyScore, fetchJumpDetection, fetchAlerts, fetchThresholdTriggers]);

     // Fetch all data when symbol or interval changes
     useEffect(() => {
          if (selectedSymbol) {
               fetchAnomalyScore();
               fetchJumpDetection();
               fetchAlerts();
               fetchThresholdTriggers();
          }
     }, [selectedSymbol, interval, fetchAnomalyScore, fetchJumpDetection, fetchAlerts, fetchThresholdTriggers]);

     // Load alert history from localStorage on mount
     useEffect(() => {
          const savedHistory = localStorage.getItem("alertHistory");
          if (savedHistory) {
               try {
                    const history = JSON.parse(savedHistory);
                    setAlertHistory(Array.isArray(history) ? history : []);
               } catch (error) {
                    console.error("Error loading alert history:", error);
               }
          }
     }, []);

     const getSeverityColor = (severity: string) => {
          switch (severity.toLowerCase()) {
               case "critical":
                    return "#ef4444";
               case "high":
                    return "#f97316";
               case "medium":
                    return "#fbbf24";
               case "low":
                    return "#22c55e";
               default:
                    return "#888";
          }
     };

     return (
          <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
               <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#ffffff", marginBottom: "24px" }}>Market Monitoring & Alerts</h1>

               {/* Alerts */}
               {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
               {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}
               {info && <Alert type="info" message={info} onClose={() => setInfo(null)} />}

               {/* Controls */}
               <div style={{ marginBottom: "24px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                    {/* Exchange Account Selector */}
                    <div>
                         <label style={{ display: "block", fontSize: "12px", color: "#888", marginBottom: "6px" }}>Exchange Account</label>
                         <select
                              value={selectedAccountId || ""}
                              onChange={(e) => setSelectedAccountId(Number(e.target.value))}
                              style={{
                                   padding: "10px 16px",
                                   backgroundColor: "#2a2a2a",
                                   border: "1px solid rgba(255, 174, 0, 0.3)",
                                   borderRadius: "10px",
                                   color: "#ffffff",
                                   fontSize: "14px",
                                   cursor: "pointer",
                                   outline: "none",
                                   minWidth: "200px",
                              }}
                         >
                              <option value="">Select Account</option>
                              {accounts.map((account) => (
                                   <option key={account.id} value={account.id}>
                                        {account.exchange_name} {account.is_active ? "" : "(Inactive)"}
                                   </option>
                              ))}
                         </select>
                    </div>

                    {/* Symbol Selector */}
                    <div>
                         <label style={{ display: "block", fontSize: "12px", color: "#888", marginBottom: "6px" }}>Symbol</label>
                         <select
                              value={selectedSymbol}
                              onChange={(e) => {
                                   // Normalize symbol when user selects
                                   const normalized = normalizeSymbol(e.target.value);
                                   setSelectedSymbol(normalized);
                              }}
                              disabled={!selectedAccountId || markets.length === 0}
                              style={{
                                   padding: "10px 16px",
                                   backgroundColor: "#2a2a2a",
                                   border: "1px solid rgba(255, 174, 0, 0.3)",
                                   borderRadius: "10px",
                                   color: "#ffffff",
                                   fontSize: "14px",
                                   cursor: "pointer",
                                   outline: "none",
                                   minWidth: "200px",
                                   opacity: !selectedAccountId || markets.length === 0 ? 0.5 : 1,
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

                    {/* Interval Selector */}
                    <div>
                         <label style={{ display: "block", fontSize: "12px", color: "#888", marginBottom: "6px" }}>Interval</label>
                         <select
                              value={interval}
                              onChange={(e) => setInterval(e.target.value)}
                              style={{
                                   padding: "10px 16px",
                                   backgroundColor: "#2a2a2a",
                                   border: "1px solid rgba(255, 174, 0, 0.3)",
                                   borderRadius: "10px",
                                   color: "#ffffff",
                                   fontSize: "14px",
                                   cursor: "pointer",
                                   outline: "none",
                              }}
                         >
                              {availableIntervals.map((iv) => (
                                   <option key={iv} value={iv}>
                                        {iv}
                                   </option>
                              ))}
                         </select>
                    </div>

                    {/* Monitor Button */}
                    <div style={{ marginTop: "24px" }}>
                         <button
                              onClick={monitorSymbol}
                              disabled={!selectedSymbol || monitoringLoading}
                              style={{
                                   padding: "10px 24px",
                                   backgroundColor: monitoringLoading ? "#4b5563" : "#FFAE00",
                                   color: "white",
                                   border: "none",
                                   borderRadius: "10px",
                                   cursor: monitoringLoading ? "not-allowed" : "pointer",
                                   fontWeight: "600",
                                   fontSize: "14px",
                                   transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                   if (!monitoringLoading) {
                                        e.currentTarget.style.backgroundColor = "#e6a000";
                                   }
                              }}
                              onMouseLeave={(e) => {
                                   if (!monitoringLoading) {
                                        e.currentTarget.style.backgroundColor = "#FFAE00";
                                   }
                              }}
                         >
                              {monitoringLoading ? "Monitoring..." : "🔍 Monitor Symbol"}
                         </button>
                    </div>

                    {/* Auto-refresh */}
                    <div style={{ marginTop: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
                         <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                              <input
                                   type="checkbox"
                                   checked={autoRefresh}
                                   onChange={(e) => setAutoRefresh(e.target.checked)}
                                   style={{ cursor: "pointer" }}
                              />
                              <span style={{ fontSize: "13px", color: "#888" }}>Auto-refresh</span>
                         </label>
                         {autoRefresh && (
                              <select
                                   value={refreshInterval}
                                   onChange={(e) => setRefreshInterval(Number(e.target.value))}
                                   style={{
                                        padding: "6px 12px",
                                        backgroundColor: "#2a2a2a",
                                        border: "1px solid rgba(255, 174, 0, 0.3)",
                                        borderRadius: "8px",
                                        color: "#ffffff",
                                        fontSize: "12px",
                                        cursor: "pointer",
                                        outline: "none",
                                   }}
                              >
                                   <option value={10}>10s</option>
                                   <option value={30}>30s</option>
                                   <option value={60}>1m</option>
                                   <option value={300}>5m</option>
                              </select>
                         )}
                    </div>

                    {/* Alert Management Buttons */}
                    <div style={{ marginTop: "24px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                         <button
                              onClick={() => setShowThresholdSettings(!showThresholdSettings)}
                              style={{
                                   padding: "8px 16px",
                                   backgroundColor: showThresholdSettings ? "#FFAE00" : "#2a2a2a",
                                   border: "1px solid rgba(255, 174, 0, 0.3)",
                                   borderRadius: "8px",
                                   color: "#ffffff",
                                   fontSize: "13px",
                                   cursor: "pointer",
                                   fontWeight: "600",
                              }}
                         >
                              ⚙️ Threshold Settings
                         </button>
                         <button
                              onClick={() => setShowAlertHistory(!showAlertHistory)}
                              style={{
                                   padding: "8px 16px",
                                   backgroundColor: showAlertHistory ? "#FFAE00" : "#2a2a2a",
                                   border: "1px solid rgba(255, 174, 0, 0.3)",
                                   borderRadius: "8px",
                                   color: "#ffffff",
                                   fontSize: "13px",
                                   cursor: "pointer",
                                   fontWeight: "600",
                              }}
                         >
                              📜 Alert History ({alertHistory.length})
                         </button>
                         <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", padding: "8px 16px", backgroundColor: "#2a2a2a", border: "1px solid rgba(255, 174, 0, 0.3)", borderRadius: "8px" }}>
                              <input
                                   type="checkbox"
                                   checked={alertsEnabled}
                                   onChange={(e) => setAlertsEnabled(e.target.checked)}
                                   style={{ cursor: "pointer" }}
                              />
                              <span style={{ fontSize: "13px", color: alertsEnabled ? "#22c55e" : "#888" }}>
                                   {alertsEnabled ? "🔔 Alerts Enabled" : "🔕 Alerts Disabled"}
                              </span>
                         </label>
                    </div>
               </div>

               {/* Threshold Settings Modal */}
               {showThresholdSettings && (
                    <div style={{ marginBottom: "24px", padding: "24px", backgroundColor: "#2a2a2a", border: "1px solid rgba(255, 174, 0, 0.2)", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)" }}>
                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#FFAE00", margin: 0 }}>Threshold Settings</h3>
                              <button
                                   onClick={() => setShowThresholdSettings(false)}
                                   style={{
                                        padding: "6px 12px",
                                        backgroundColor: "#6b7280",
                                        border: "none",
                                        borderRadius: "6px",
                                        color: "#ffffff",
                                        fontSize: "12px",
                                        cursor: "pointer",
                                   }}
                              >
                                   Close
                              </button>
                         </div>
                         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
                              {Object.entries(thresholds).map(([key, value]) => (
                                   <div key={key}>
                                        <label style={{ display: "block", fontSize: "12px", color: "#888", marginBottom: "6px" }}>
                                             {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                        </label>
                                        <input
                                             type="number"
                                             step="0.01"
                                             value={value}
                                             onChange={(e) => setThresholds({ ...thresholds, [key]: parseFloat(e.target.value) || 0 })}
                                             style={{
                                                  width: "100%",
                                                  padding: "8px 12px",
                                                  backgroundColor: "#1a1a1a",
                                                  border: "1px solid rgba(255, 174, 0, 0.3)",
                                                  borderRadius: "8px",
                                                  color: "#ffffff",
                                                  fontSize: "14px",
                                                  outline: "none",
                                             }}
                                        />
                                   </div>
                              ))}
                         </div>
                         <button
                              onClick={() => {
                                   setSuccess("Thresholds updated successfully!");
                                   setShowThresholdSettings(false);
                              }}
                              style={{
                                   marginTop: "16px",
                                   padding: "10px 20px",
                                   backgroundColor: "#22c55e",
                                   border: "none",
                                   borderRadius: "8px",
                                   color: "#ffffff",
                                   fontSize: "14px",
                                   cursor: "pointer",
                                   fontWeight: "600",
                              }}
                         >
                              Save Thresholds
                         </button>
                    </div>
               )}

               {/* Alert History Modal */}
               {showAlertHistory && (
                    <div style={{ marginBottom: "24px", padding: "24px", backgroundColor: "#2a2a2a", border: "1px solid rgba(255, 174, 0, 0.2)", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)" }}>
                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#FFAE00", margin: 0 }}>Alert History ({alertHistory.length})</h3>
                              <div style={{ display: "flex", gap: "8px" }}>
                                   <button
                                        onClick={() => {
                                             // Export to CSV
                                             const headers = ["Symbol", "Alert Type", "Severity", "Message", "Timestamp", "Data"];
                                             const rows = alertHistory.map((alert) => [
                                                  alert.symbol,
                                                  alert.alert_type,
                                                  alert.severity,
                                                  alert.message,
                                                  alert.timestamp,
                                                  JSON.stringify(alert.data),
                                             ]);
                                             const csvContent = [headers, ...rows].map((row) => 
                                                  row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
                                             ).join("\n");
                                             const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                                             const url = URL.createObjectURL(blob);
                                             const a = document.createElement("a");
                                             a.href = url;
                                             a.download = `alerts_history_${new Date().toISOString().split("T")[0]}.csv`;
                                             a.click();
                                             URL.revokeObjectURL(url);
                                             setSuccess("Alerts exported to CSV successfully!");
                                        }}
                                        style={{
                                             padding: "8px 16px",
                                             backgroundColor: "#22c55e",
                                             border: "none",
                                             borderRadius: "8px",
                                             color: "#ffffff",
                                             fontSize: "12px",
                                             cursor: "pointer",
                                             fontWeight: "600",
                                        }}
                                   >
                                        📥 Export CSV
                                   </button>
                                   <button
                                        onClick={() => {
                                             // Export to JSON
                                             const jsonData = JSON.stringify(alertHistory, null, 2);
                                             const blob = new Blob([jsonData], { type: "application/json" });
                                             const url = URL.createObjectURL(blob);
                                             const a = document.createElement("a");
                                             a.href = url;
                                             a.download = `alerts_history_${new Date().toISOString().split("T")[0]}.json`;
                                             a.click();
                                             URL.revokeObjectURL(url);
                                             setSuccess("Alerts exported to JSON successfully!");
                                        }}
                                        style={{
                                             padding: "8px 16px",
                                             backgroundColor: "#6366f1",
                                             border: "none",
                                             borderRadius: "8px",
                                             color: "#ffffff",
                                             fontSize: "12px",
                                             cursor: "pointer",
                                             fontWeight: "600",
                                        }}
                                   >
                                        📥 Export JSON
                                   </button>
                                   <button
                                        onClick={() => {
                                             localStorage.removeItem("alertHistory");
                                             setAlertHistory([]);
                                             setSuccess("Alert history cleared!");
                                        }}
                                        style={{
                                             padding: "8px 16px",
                                             backgroundColor: "#ef4444",
                                             border: "none",
                                             borderRadius: "8px",
                                             color: "#ffffff",
                                             fontSize: "12px",
                                             cursor: "pointer",
                                             fontWeight: "600",
                                        }}
                                   >
                                        🗑️ Clear
                                   </button>
                                   <button
                                        onClick={() => setShowAlertHistory(false)}
                                        style={{
                                             padding: "8px 16px",
                                             backgroundColor: "#6b7280",
                                             border: "none",
                                             borderRadius: "8px",
                                             color: "#ffffff",
                                             fontSize: "12px",
                                             cursor: "pointer",
                                        }}
                                   >
                                        Close
                                   </button>
                              </div>
                         </div>

                         {/* Filters */}
                         <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
                              <select
                                   value={alertFilters.severity}
                                   onChange={(e) => setAlertFilters({ ...alertFilters, severity: e.target.value })}
                                   style={{
                                        padding: "8px 12px",
                                        backgroundColor: "#1a1a1a",
                                        border: "1px solid rgba(255, 174, 0, 0.3)",
                                        borderRadius: "8px",
                                        color: "#ffffff",
                                        fontSize: "13px",
                                        cursor: "pointer",
                                        outline: "none",
                                   }}
                              >
                                   <option value="all">All Severities</option>
                                   <option value="critical">Critical</option>
                                   <option value="high">High</option>
                                   <option value="medium">Medium</option>
                                   <option value="low">Low</option>
                              </select>
                              <input
                                   type="text"
                                   placeholder="Filter by symbol..."
                                   value={alertFilters.symbol}
                                   onChange={(e) => setAlertFilters({ ...alertFilters, symbol: e.target.value })}
                                   style={{
                                        padding: "8px 12px",
                                        backgroundColor: "#1a1a1a",
                                        border: "1px solid rgba(255, 174, 0, 0.3)",
                                        borderRadius: "8px",
                                        color: "#ffffff",
                                        fontSize: "13px",
                                        outline: "none",
                                        minWidth: "150px",
                                   }}
                              />
                              <input
                                   type="text"
                                   placeholder="Filter by type..."
                                   value={alertFilters.type === "all" ? "" : alertFilters.type}
                                   onChange={(e) => setAlertFilters({ ...alertFilters, type: e.target.value || "all" })}
                                   style={{
                                        padding: "8px 12px",
                                        backgroundColor: "#1a1a1a",
                                        border: "1px solid rgba(255, 174, 0, 0.3)",
                                        borderRadius: "8px",
                                        color: "#ffffff",
                                        fontSize: "13px",
                                        outline: "none",
                                        minWidth: "150px",
                                   }}
                              />
                         </div>

                         {/* Alert History List */}
                         <div style={{ maxHeight: "500px", overflowY: "auto" }}>
                              {(() => {
                                   const filteredHistory = alertHistory.filter((alert) => {
                                        if (alertFilters.severity !== "all" && alert.severity.toLowerCase() !== alertFilters.severity.toLowerCase()) return false;
                                        if (alertFilters.symbol && !alert.symbol.toLowerCase().includes(alertFilters.symbol.toLowerCase())) return false;
                                        if (alertFilters.type !== "all" && !alert.alert_type.toLowerCase().includes(alertFilters.type.toLowerCase())) return false;
                                        return true;
                                   });

                                   return filteredHistory.length > 0 ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                             {filteredHistory.map((alert, index) => (
                                                  <div
                                                       key={index}
                                                       style={{
                                                            padding: "16px",
                                                            backgroundColor: "rgba(255, 174, 0, 0.05)",
                                                            borderRadius: "8px",
                                                            border: `1px solid ${getSeverityColor(alert.severity)}40`,
                                                            borderLeft: `4px solid ${getSeverityColor(alert.severity)}`,
                                                       }}
                                                  >
                                                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                                                            <div>
                                                                 <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                                                      <span
                                                                           style={{
                                                                                padding: "4px 8px",
                                                                                backgroundColor: getSeverityColor(alert.severity),
                                                                                borderRadius: "4px",
                                                                                fontSize: "10px",
                                                                                fontWeight: "700",
                                                                                color: "white",
                                                                                textTransform: "uppercase",
                                                                           }}
                                                                      >
                                                                           {alert.severity}
                                                                      </span>
                                                                      <span style={{ fontSize: "12px", color: "#888" }}>{alert.alert_type}</span>
                                                                 </div>
                                                                 <div style={{ fontSize: "14px", fontWeight: "600", color: "#ffffff", marginTop: "4px" }}>
                                                                      {alert.symbol} - {alert.message}
                                                                 </div>
                                                            </div>
                                                            <div style={{ fontSize: "11px", color: "#888" }}>
                                                                 {new Date(alert.timestamp).toLocaleString()}
                                                            </div>
                                                       </div>
                                                       {Object.keys(alert.data).length > 0 && (
                                                            <div style={{ marginTop: "8px", padding: "8px", backgroundColor: "#1a1a1a", borderRadius: "4px" }}>
                                                                 <pre style={{ margin: 0, fontSize: "11px", color: "#888", fontFamily: "monospace" }}>
                                                                      {JSON.stringify(alert.data, null, 2)}
                                                                 </pre>
                                                            </div>
                                                       )}
                                                  </div>
                                             ))}
                                        </div>
                                   ) : (
                                        <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>No alerts found in history</div>
                                   );
                              })()}
                         </div>
                    </div>
               )}

               {!selectedSymbol ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#888", backgroundColor: "#2a2a2a", borderRadius: "16px", border: "1px solid rgba(255, 174, 0, 0.2)" }}>
                         <p style={{ fontSize: "16px", margin: 0 }}>Please select a symbol to start monitoring</p>
                    </div>
               ) : error && error.includes("Insufficient data") ? (
                    <div style={{ padding: "40px", textAlign: "center", backgroundColor: "#2a2a2a", borderRadius: "16px", border: "1px solid rgba(255, 174, 0, 0.2)" }}>
                         <div style={{ fontSize: "18px", fontWeight: "600", color: "#fbbf24", marginBottom: "12px" }}>⚠️ No Data Available</div>
                         <p style={{ fontSize: "14px", color: "#888", margin: "0 0 16px 0" }}>
                              {error}
                         </p>
                         <p style={{ fontSize: "13px", color: "#666", margin: "0 0 24px 0" }}>
                              Please download historical data for <strong style={{ color: "#FFAE00" }}>{selectedSymbol}</strong> with interval <strong style={{ color: "#FFAE00" }}>{interval}</strong> first.
                         </p>
                         <Link
                              href="/backfill"
                              style={{
                                   display: "inline-block",
                                   padding: "12px 24px",
                                   backgroundColor: "#FFAE00",
                                   color: "#1a1a1a",
                                   borderRadius: "8px",
                                   textDecoration: "none",
                                   fontWeight: "600",
                                   fontSize: "14px",
                                   transition: "all 0.2s",
                                   boxShadow: "0 2px 8px rgba(255, 174, 0, 0.3)",
                              }}
                              onMouseEnter={(e) => {
                                   e.currentTarget.style.backgroundColor = "#FFD700";
                                   e.currentTarget.style.transform = "translateY(-2px)";
                                   e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 174, 0, 0.4)";
                              }}
                              onMouseLeave={(e) => {
                                   e.currentTarget.style.backgroundColor = "#FFAE00";
                                   e.currentTarget.style.transform = "translateY(0)";
                                   e.currentTarget.style.boxShadow = "0 2px 8px rgba(255, 174, 0, 0.3)";
                              }}
                         >
                              📥 Go to Backfill Page
                         </Link>
                    </div>
               ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
                         {/* Anomaly Score Card */}
                         <div style={{ padding: "24px", backgroundColor: "#2a2a2a", border: "1px solid rgba(255, 174, 0, 0.2)", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)" }}>
                              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#FFAE00", marginBottom: "20px", marginTop: 0 }}>Anomaly Score</h3>
                              {anomalyLoading ? (
                                   <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>Loading...</div>
                              ) : anomalyScore ? (
                                   <div>
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "20px" }}>
                                             <div>
                                                  <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Z-Score</div>
                                                  <div style={{ fontSize: "24px", fontWeight: "700", color: "#ffffff" }}>
                                                       {anomalyScore.anomaly_score.z_score?.toFixed(2) || "N/A"}
                                                  </div>
                                             </div>
                                             <div>
                                                  <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>IQR Score</div>
                                                  <div style={{ fontSize: "24px", fontWeight: "700", color: "#ffffff" }}>
                                                       {anomalyScore.anomaly_score.iqr_score?.toFixed(2) || "N/A"}
                                                  </div>
                                             </div>
                                             <div style={{ gridColumn: "1 / -1" }}>
                                                  <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Combined Score</div>
                                                  <div style={{ fontSize: "32px", fontWeight: "700", color: anomalyScore.anomaly_score.is_anomaly ? "#ef4444" : "#22c55e" }}>
                                                       {anomalyScore.anomaly_score.combined_score?.toFixed(2) || "N/A"}
                                                  </div>
                                                  {anomalyScore.anomaly_score.is_anomaly && (
                                                       <div style={{ fontSize: "12px", color: "#ef4444", marginTop: "4px" }}>⚠️ Anomaly Detected</div>
                                                  )}
                                             </div>
                                        </div>

                                        {/* Anomaly Score History Chart */}
                                        {anomalyHistory.length > 0 && (
                                             <div style={{ marginTop: "20px" }}>
                                                  <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#ffffff", marginBottom: "12px" }}>Score History</h4>
                                                  <ResponsiveContainer width="100%" height={150}>
                                                       <LineChart data={anomalyHistory}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 174, 0, 0.1)" />
                                                            <XAxis dataKey="time" stroke="#888" style={{ fontSize: "10px" }} />
                                                            <YAxis stroke="#888" style={{ fontSize: "10px" }} />
                                                            <Tooltip
                                                                 contentStyle={{
                                                                      backgroundColor: "#1a1a1a",
                                                                      border: "1px solid rgba(255, 174, 0, 0.3)",
                                                                      borderRadius: "8px",
                                                                      color: "#ffffff",
                                                                 }}
                                                            />
                                                            <Line type="monotone" dataKey="score" stroke="#FFAE00" strokeWidth={2} dot={false} />
                                                       </LineChart>
                                                  </ResponsiveContainer>
                                             </div>
                                        )}
                                   </div>
                              ) : (
                                   <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>No data available</div>
                              )}
                         </div>

                         {/* Jump Detection Card */}
                         <div style={{ padding: "24px", backgroundColor: "#2a2a2a", border: "1px solid rgba(255, 174, 0, 0.2)", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)" }}>
                              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#FFAE00", marginBottom: "20px", marginTop: 0 }}>Jump Detection</h3>
                              {jumpLoading ? (
                                   <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>Loading...</div>
                              ) : jumpDetection ? (
                                   <div>
                                        <div style={{ marginBottom: "16px" }}>
                                             <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Threshold-Based</div>
                                             <div style={{ fontSize: "18px", fontWeight: "600", color: jumpDetection.jump_detection.threshold_based?.detected ? "#ef4444" : "#22c55e" }}>
                                                  {jumpDetection.jump_detection.threshold_based?.detected ? "⚠️ Jump Detected" : "✓ No Jump"}
                                             </div>
                                             {jumpDetection.jump_detection.threshold_based?.jump_percent !== undefined && (
                                                  <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                                                       Change: {jumpDetection.jump_detection.threshold_based.jump_percent.toFixed(2)}%
                                                  </div>
                                             )}
                                        </div>
                                        <div style={{ marginBottom: "16px" }}>
                                             <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>ML-Based</div>
                                             <div style={{ fontSize: "18px", fontWeight: "600", color: jumpDetection.jump_detection.ml_based?.detected ? "#ef4444" : "#22c55e" }}>
                                                  {jumpDetection.jump_detection.ml_based?.detected ? "⚠️ Jump Detected" : "✓ No Jump"}
                                             </div>
                                             {jumpDetection.jump_detection.ml_based?.probability !== undefined && (
                                                  <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                                                       Probability: {(jumpDetection.jump_detection.ml_based.probability * 100).toFixed(1)}%
                                                  </div>
                                             )}
                                        </div>
                                        {jumpDetection.jump_detection.combined_result && (
                                             <div style={{ padding: "12px", backgroundColor: "rgba(255, 174, 0, 0.1)", borderRadius: "8px", border: "1px solid rgba(255, 174, 0, 0.3)" }}>
                                                  <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Combined Result</div>
                                                  <div style={{ fontSize: "18px", fontWeight: "600", color: jumpDetection.jump_detection.combined_result.detected ? "#ef4444" : "#22c55e" }}>
                                                       {jumpDetection.jump_detection.combined_result.detected ? "⚠️ Jump Detected" : "✓ No Jump"}
                                                  </div>
                                                  <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                                                       Confidence: {(jumpDetection.jump_detection.combined_result.confidence * 100).toFixed(1)}%
                                                  </div>
                                             </div>
                                        )}
                                   </div>
                              ) : (
                                   <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>No data available</div>
                              )}
                         </div>

                         {/* Threshold Triggers Card */}
                         <div style={{ padding: "24px", backgroundColor: "#2a2a2a", border: "1px solid rgba(255, 174, 0, 0.2)", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)" }}>
                              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#FFAE00", marginBottom: "20px", marginTop: 0 }}>Threshold Triggers</h3>
                              {thresholdsLoading ? (
                                   <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>Loading...</div>
                              ) : thresholdTriggers.length > 0 ? (
                                   <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                        {thresholdTriggers.map((trigger, index) => (
                                             <div
                                                  key={index}
                                                  style={{
                                                       padding: "12px",
                                                       backgroundColor: trigger.triggered ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)",
                                                       borderRadius: "8px",
                                                       border: `1px solid ${trigger.triggered ? "rgba(239, 68, 68, 0.3)" : "rgba(34, 197, 94, 0.3)"}`,
                                                  }}
                                             >
                                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                                       <div style={{ fontSize: "14px", fontWeight: "600", color: "#ffffff" }}>{trigger.threshold_name}</div>
                                                       <div style={{ fontSize: "14px", fontWeight: "700", color: trigger.triggered ? "#ef4444" : "#22c55e" }}>
                                                            {trigger.triggered ? "⚠️ TRIGGERED" : "✓ OK"}
                                                       </div>
                                                  </div>
                                                  <div style={{ fontSize: "12px", color: "#888" }}>
                                                       Value: {trigger.value.toFixed(4)} / Threshold: {trigger.threshold.toFixed(4)}
                                                  </div>
                                                  {trigger.message && (
                                                       <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>{trigger.message}</div>
                                                  )}
                                             </div>
                                        ))}
                                   </div>
                              ) : (
                                   <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>No threshold triggers configured</div>
                              )}
                         </div>

                         {/* Alerts Card */}
                         <div style={{ padding: "24px", backgroundColor: "#2a2a2a", border: "1px solid rgba(255, 174, 0, 0.2)", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)", gridColumn: "1 / -1" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                   <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#FFAE00", margin: 0 }}>Recent Alerts</h3>
                                   <div style={{ display: "flex", gap: "8px" }}>
                                        {alerts.length > 0 && (
                                             <>
                                                  <button
                                                       onClick={() => {
                                                            // Export to CSV
                                                            const headers = ["Symbol", "Alert Type", "Severity", "Message", "Timestamp", "Data"];
                                                            const rows = alerts.map((alert) => [
                                                                 alert.symbol,
                                                                 alert.alert_type,
                                                                 alert.severity,
                                                                 alert.message,
                                                                 alert.timestamp,
                                                                 JSON.stringify(alert.data),
                                                            ]);
                                                            const csvContent = [headers, ...rows].map((row) => 
                                                                 row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
                                                            ).join("\n");
                                                            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                                                            const url = URL.createObjectURL(blob);
                                                            const a = document.createElement("a");
                                                            a.href = url;
                                                            a.download = `alerts_${new Date().toISOString().split("T")[0]}.csv`;
                                                            a.click();
                                                            URL.revokeObjectURL(url);
                                                            setSuccess("Alerts exported to CSV successfully!");
                                                       }}
                                                       style={{
                                                            padding: "8px 16px",
                                                            backgroundColor: "#22c55e",
                                                            border: "none",
                                                            borderRadius: "8px",
                                                            color: "#ffffff",
                                                            fontSize: "12px",
                                                            cursor: "pointer",
                                                            fontWeight: "600",
                                                       }}
                                                  >
                                                       📥 Export CSV
                                                  </button>
                                                  <button
                                                       onClick={() => {
                                                            // Export to JSON
                                                            const jsonData = JSON.stringify(alerts, null, 2);
                                                            const blob = new Blob([jsonData], { type: "application/json" });
                                                            const url = URL.createObjectURL(blob);
                                                            const a = document.createElement("a");
                                                            a.href = url;
                                                            a.download = `alerts_${new Date().toISOString().split("T")[0]}.json`;
                                                            a.click();
                                                            URL.revokeObjectURL(url);
                                                            setSuccess("Alerts exported to JSON successfully!");
                                                       }}
                                                       style={{
                                                            padding: "8px 16px",
                                                            backgroundColor: "#6366f1",
                                                            border: "none",
                                                            borderRadius: "8px",
                                                            color: "#ffffff",
                                                            fontSize: "12px",
                                                            cursor: "pointer",
                                                            fontWeight: "600",
                                                       }}
                                                  >
                                                       📥 Export JSON
                                                  </button>
                                             </>
                                        )}
                                        <button
                                             onClick={fetchAlerts}
                                             disabled={alertsLoading}
                                             style={{
                                                  padding: "8px 16px",
                                                  backgroundColor: "#2a2a2a",
                                                  border: "1px solid rgba(255, 174, 0, 0.3)",
                                                  borderRadius: "8px",
                                                  color: "#ffffff",
                                                  fontSize: "12px",
                                                  cursor: "pointer",
                                             }}
                                        >
                                             {alertsLoading ? "Loading..." : "🔄 Refresh"}
                                        </button>
                                   </div>
                              </div>
                              {alertsLoading ? (
                                   <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>Loading alerts...</div>
                              ) : alerts.length > 0 ? (
                                   <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "400px", overflowY: "auto" }}>
                                        {alerts.map((alert, index) => (
                                             <div
                                                  key={index}
                                                  style={{
                                                       padding: "16px",
                                                       backgroundColor: "rgba(255, 174, 0, 0.05)",
                                                       borderRadius: "8px",
                                                       border: `1px solid ${getSeverityColor(alert.severity)}40`,
                                                       borderLeft: `4px solid ${getSeverityColor(alert.severity)}`,
                                                  }}
                                             >
                                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                                                       <div>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                                                 <span
                                                                      style={{
                                                                           padding: "4px 8px",
                                                                           backgroundColor: getSeverityColor(alert.severity),
                                                                           borderRadius: "4px",
                                                                           fontSize: "10px",
                                                                           fontWeight: "700",
                                                                           color: "white",
                                                                           textTransform: "uppercase",
                                                                      }}
                                                                 >
                                                                      {alert.severity}
                                                                 </span>
                                                                 <span style={{ fontSize: "12px", color: "#888" }}>{alert.alert_type}</span>
                                                            </div>
                                                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#ffffff", marginTop: "4px" }}>
                                                                 {alert.symbol} - {alert.message}
                                                            </div>
                                                       </div>
                                                       <div style={{ fontSize: "11px", color: "#888" }}>
                                                            {new Date(alert.timestamp).toLocaleString()}
                                                       </div>
                                                  </div>
                                                  {Object.keys(alert.data).length > 0 && (
                                                       <div style={{ marginTop: "8px", padding: "8px", backgroundColor: "#1a1a1a", borderRadius: "4px" }}>
                                                            <pre style={{ margin: 0, fontSize: "11px", color: "#888", fontFamily: "monospace" }}>
                                                                 {JSON.stringify(alert.data, null, 2)}
                                                            </pre>
                                                       </div>
                                                  )}
                                             </div>
                                        ))}
                                   </div>
                              ) : (
                                   <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>No alerts found</div>
                              )}
                         </div>
                    </div>
               )}
          </div>
     );
}


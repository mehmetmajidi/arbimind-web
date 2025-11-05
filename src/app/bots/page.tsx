"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ExchangeAccount {
     id: number;
     exchange_name: string;
     is_active: boolean;
}

interface TradingBot {
     id: number;
     name: string;
     status: string;
     strategy_type: string;
     capital: string;
     current_capital: string;
     risk_per_trade: string;
     symbols: string[];
     max_position_size: string | null;
     stop_loss_percent: string | null;
     take_profit_percent: string | null;
     duration_hours: number | null;
     total_trades: number;
     winning_trades: number;
     losing_trades: number;
     total_pnl: string;
     created_at: string;
     updated_at: string;
     started_at: string | null;
     stopped_at: string | null;
     last_error: string | null;
}

interface BotStatus {
     id: number;
     name: string;
     status: string;
     strategy_type: string;
     capital: number;
     current_capital: number;
     total_trades: number;
     winning_trades: number;
     losing_trades: number;
     win_rate: number;
     total_pnl: number;
     open_positions: number;
     started_at: string | null;
     stopped_at: string | null;
     last_error: string | null;
}

interface BotTrade {
     id: number;
     bot_id: number;
     order_id: number | null;
     symbol: string;
     side: string;
     quantity: string;
     entry_price: string;
     exit_price: string | null;
     pnl: string;
     pnl_percent: string | null;
     status: string;
     entry_time: string;
     exit_time: string | null;
     entry_reason: string | null;
     exit_reason: string | null;
     prediction_confidence: string | null;
     prediction_horizon: string | null;
}

export default function BotsPage() {
     const [accounts, setAccounts] = useState<ExchangeAccount[]>([]);
     const [bots, setBots] = useState<TradingBot[]>([]);
     const [selectedBot, setSelectedBot] = useState<TradingBot | null>(null);
     const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
     const [botTrades, setBotTrades] = useState<BotTrade[]>([]);

     const [loading, setLoading] = useState(true);
     const [botsLoading, setBotsLoading] = useState(false);
     const [statusLoading, setStatusLoading] = useState(false);
     const [tradesLoading, setTradesLoading] = useState(false);
     const [error, setError] = useState<string | null>(null);

     // Create bot form state
     const [showCreateForm, setShowCreateForm] = useState(false);
     const [creating, setCreating] = useState(false);
     const [botForm, setBotForm] = useState({
          name: "",
          exchange_account_id: "",
          capital: "",
          risk_per_trade: "0.02",
          symbols: [] as string[],
          strategy_type: "prediction_based",
          max_position_size: "",
          stop_loss_percent: "",
          take_profit_percent: "",
          duration_hours: "",
     });
     const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
     const [symbolInput, setSymbolInput] = useState("");

     // Auto-refresh
     const [autoRefresh, setAutoRefresh] = useState(true);
     const [refreshInterval, setRefreshInterval] = useState(10); // seconds

     // Fetch exchange accounts
     useEffect(() => {
          const fetchAccounts = async () => {
               try {
                    const token = localStorage.getItem("auth_token") || "";
                    if (!token) {
                         setError("Please login to manage bots");
                         setLoading(false);
                         return;
                    }

                    const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

                    const response = await fetch(`${apiUrl}/exchange/accounts`, {
                         headers: { Authorization: `Bearer ${token}` },
                    });

                    if (response.ok) {
                         const data = await response.json();
                         const accountsList = Array.isArray(data) ? data : [];
                         const activeAccounts = accountsList.filter((acc: ExchangeAccount) => acc.is_active);
                         setAccounts(activeAccounts);
                    } else if (response.status === 401) {
                         setError("Please login to manage bots");
                         localStorage.removeItem("auth_token");
                    }
               } catch (error) {
                    console.error("Error fetching accounts:", error);
                    setError("Failed to load exchange accounts");
               } finally {
                    setLoading(false);
               }
          };

          fetchAccounts();
     }, []);

     // Fetch available symbols when account is selected
     useEffect(() => {
          const fetchSymbols = async () => {
               if (!botForm.exchange_account_id) {
                    setAvailableSymbols([]);
                    return;
               }

               try {
                    const token = localStorage.getItem("auth_token") || "";
                    if (!token) return;

                    const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

                    const response = await fetch(`${apiUrl}/market/pairs/${botForm.exchange_account_id}`, {
                         headers: { Authorization: `Bearer ${token}` },
                    });

                    if (response.ok) {
                         const data = await response.json();
                         const pairs = data.pairs || [];
                         setAvailableSymbols(pairs.map((p: { symbol: string }) => p.symbol));
                    }
               } catch (error) {
                    console.error("Error fetching symbols:", error);
               }
          };

          fetchSymbols();
     }, [botForm.exchange_account_id]);

     // Fetch bots
     const fetchBots = useCallback(async () => {
          setBotsLoading(true);
          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) return;

               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

               const response = await fetch(`${apiUrl}/bots`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setBots(Array.isArray(data) ? data : []);
                    setError(null);
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to load bots");
               }
          } catch (error) {
               console.error("Error fetching bots:", error);
               setError("Failed to load bots");
          } finally {
               setBotsLoading(false);
          }
     }, []);

     // Fetch bot status
     const fetchBotStatus = useCallback(async (botId: number) => {
          setStatusLoading(true);
          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) return;

               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

               const response = await fetch(`${apiUrl}/bots/${botId}/status`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setBotStatus(data);
               }
          } catch (error) {
               console.error("Error fetching bot status:", error);
          } finally {
               setStatusLoading(false);
          }
     }, []);

     // Fetch bot trades
     const fetchBotTrades = useCallback(async (botId: number) => {
          setTradesLoading(true);
          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) return;

               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

               const response = await fetch(`${apiUrl}/bots/${botId}/trades?limit=50`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setBotTrades(Array.isArray(data) ? data : []);
               }
          } catch (error) {
               console.error("Error fetching bot trades:", error);
          } finally {
               setTradesLoading(false);
          }
     }, []);

     // Initial fetch
     useEffect(() => {
          fetchBots();
     }, [fetchBots]);

     // Auto-refresh
     useEffect(() => {
          if (!autoRefresh) return;

          const interval = setInterval(() => {
               fetchBots();
               if (selectedBot) {
                    fetchBotStatus(selectedBot.id);
                    fetchBotTrades(selectedBot.id);
               }
          }, refreshInterval * 1000);

          return () => clearInterval(interval);
     }, [autoRefresh, refreshInterval, selectedBot, fetchBots, fetchBotStatus, fetchBotTrades]);

     // Update selected bot data
     useEffect(() => {
          if (selectedBot) {
               fetchBotStatus(selectedBot.id);
               fetchBotTrades(selectedBot.id);
          }
     }, [selectedBot, fetchBotStatus, fetchBotTrades]);

     // Create bot
     const handleCreateBot = async () => {
          if (!botForm.name || !botForm.exchange_account_id || !botForm.capital || botForm.symbols.length === 0) {
               setError("Please fill in all required fields");
               return;
          }

          setCreating(true);
          setError(null);

          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) {
                    setError("Please login");
                    setCreating(false);
                    return;
               }

               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

               const requestBody: Record<string, string | number | string[] | null> = {
                    name: botForm.name,
                    exchange_account_id: parseInt(botForm.exchange_account_id),
                    capital: parseFloat(botForm.capital),
                    risk_per_trade: parseFloat(botForm.risk_per_trade),
                    symbols: botForm.symbols,
                    strategy_type: botForm.strategy_type,
               };

               if (botForm.max_position_size) {
                    requestBody.max_position_size = parseFloat(botForm.max_position_size);
               }
               if (botForm.stop_loss_percent) {
                    requestBody.stop_loss_percent = parseFloat(botForm.stop_loss_percent);
               }
               if (botForm.take_profit_percent) {
                    requestBody.take_profit_percent = parseFloat(botForm.take_profit_percent);
               }
               if (botForm.duration_hours) {
                    requestBody.duration_hours = parseInt(botForm.duration_hours);
               }

               const response = await fetch(`${apiUrl}/bots/create`, {
                    method: "POST",
                    headers: {
                         Authorization: `Bearer ${token}`,
                         "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestBody),
               });

               if (response.ok) {
                    const data = await response.json();
                    console.log("Bot created:", data);
                    setShowCreateForm(false);
                    setBotForm({
                         name: "",
                         exchange_account_id: "",
                         capital: "",
                         risk_per_trade: "0.02",
                         symbols: [],
                         strategy_type: "prediction_based",
                         max_position_size: "",
                         stop_loss_percent: "",
                         take_profit_percent: "",
                         duration_hours: "",
                    });
                    setSymbolInput("");
                    await fetchBots();
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to create bot");
               }
          } catch (error) {
               console.error("Error creating bot:", error);
               setError("Network error. Please check your connection.");
          } finally {
               setCreating(false);
          }
     };

     // Start bot
     const handleStartBot = async (botId: number) => {
          if (!confirm("Are you sure you want to start this bot?")) {
               return;
          }

          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) return;

               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

               const response = await fetch(`${apiUrl}/bots/${botId}/start`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    await fetchBots();
                    if (selectedBot && selectedBot.id === botId) {
                         await fetchBotStatus(botId);
                    }
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to start bot");
               }
          } catch (error) {
               console.error("Error starting bot:", error);
               setError("Network error. Please check your connection.");
          }
     };

     // Stop bot
     const handleStopBot = async (botId: number) => {
          if (!confirm("Are you sure you want to stop this bot? All open positions will be closed.")) {
               return;
          }

          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) return;

               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

               const response = await fetch(`${apiUrl}/bots/${botId}/stop`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    await fetchBots();
                    if (selectedBot && selectedBot.id === botId) {
                         await fetchBotStatus(botId);
                    }
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to stop bot");
               }
          } catch (error) {
               console.error("Error stopping bot:", error);
               setError("Network error. Please check your connection.");
          }
     };

     // Add symbol to form
     const handleAddSymbol = () => {
          if (symbolInput && !botForm.symbols.includes(symbolInput.toUpperCase())) {
               setBotForm({ ...botForm, symbols: [...botForm.symbols, symbolInput.toUpperCase()] });
               setSymbolInput("");
          }
     };

     // Remove symbol from form
     const handleRemoveSymbol = (symbol: string) => {
          setBotForm({ ...botForm, symbols: botForm.symbols.filter((s) => s !== symbol) });
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
                    <h1>Bot Management</h1>
                    <p style={{ color: "#666", marginTop: "16px" }}>No active exchange accounts found.</p>
                    <p style={{ marginTop: "8px" }}>
                         <Link href="/settings" style={{ color: "#0070f3", textDecoration: "underline" }}>
                              Add an exchange account
                         </Link>{" "}
                         to create bots.
                    </p>
               </div>
          );
     }

     return (
          <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
               <h1>Bot Management Dashboard</h1>

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
                              onClick={() => setShowCreateForm(!showCreateForm)}
                              style={{
                                   width: "100%",
                                   padding: "12px",
                                   backgroundColor: showCreateForm ? "#0070f3" : "#22c55e",
                                   color: "white",
                                   border: "none",
                                   borderRadius: "4px",
                                   cursor: "pointer",
                                   fontWeight: "bold",
                                   fontSize: "16px",
                              }}
                         >
                              {showCreateForm ? "Cancel" : "+ Create Bot"}
                         </button>
                    </div>
               </div>

               {/* Create Bot Form */}
               {showCreateForm && (
                    <div
                         style={{
                              padding: "24px",
                              backgroundColor: "#fff",
                              border: "1px solid #eaeaea",
                              borderRadius: "8px",
                              marginBottom: "24px",
                         }}
                    >
                         <h2>Create New Bot</h2>
                         <div
                              style={{
                                   display: "grid",
                                   gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                                   gap: "16px",
                              }}
                         >
                              <div>
                                   <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Bot Name:</label>
                                   <input
                                        type="text"
                                        value={botForm.name}
                                        onChange={(e) => setBotForm({ ...botForm, name: e.target.value })}
                                        placeholder="My Trading Bot"
                                        style={{
                                             width: "100%",
                                             padding: "8px",
                                             borderRadius: "4px",
                                             border: "1px solid #ddd",
                                        }}
                                   />
                              </div>

                              <div>
                                   <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Exchange Account:</label>
                                   <select
                                        value={botForm.exchange_account_id}
                                        onChange={(e) => setBotForm({ ...botForm, exchange_account_id: e.target.value })}
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
                                                  {(acc.exchange_name || "Unknown").toUpperCase()}
                                             </option>
                                        ))}
                                   </select>
                              </div>

                              <div>
                                   <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Capital:</label>
                                   <input
                                        type="number"
                                        step="any"
                                        value={botForm.capital}
                                        onChange={(e) => setBotForm({ ...botForm, capital: e.target.value })}
                                        placeholder="1000"
                                        style={{
                                             width: "100%",
                                             padding: "8px",
                                             borderRadius: "4px",
                                             border: "1px solid #ddd",
                                        }}
                                   />
                              </div>

                              <div>
                                   <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Risk Per Trade (%):</label>
                                   <input
                                        type="number"
                                        step="0.001"
                                        min="0.001"
                                        max="0.1"
                                        value={botForm.risk_per_trade}
                                        onChange={(e) => setBotForm({ ...botForm, risk_per_trade: e.target.value })}
                                        placeholder="0.02"
                                        style={{
                                             width: "100%",
                                             padding: "8px",
                                             borderRadius: "4px",
                                             border: "1px solid #ddd",
                                        }}
                                   />
                              </div>

                              <div>
                                   <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Strategy Type:</label>
                                   <select
                                        value={botForm.strategy_type}
                                        onChange={(e) => setBotForm({ ...botForm, strategy_type: e.target.value })}
                                        style={{
                                             width: "100%",
                                             padding: "8px",
                                             borderRadius: "4px",
                                             border: "1px solid #ddd",
                                        }}
                                   >
                                        <option value="prediction_based">Prediction Based</option>
                                        <option value="momentum">Momentum</option>
                                        <option value="mean_reversion">Mean Reversion</option>
                                        <option value="breakout">Breakout</option>
                                   </select>
                              </div>

                              <div>
                                   <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Duration (hours, optional):</label>
                                   <input
                                        type="number"
                                        step="1"
                                        min="1"
                                        value={botForm.duration_hours}
                                        onChange={(e) => setBotForm({ ...botForm, duration_hours: e.target.value })}
                                        placeholder="2"
                                        style={{
                                             width: "100%",
                                             padding: "8px",
                                             borderRadius: "4px",
                                             border: "1px solid #ddd",
                                        }}
                                   />
                              </div>

                              <div>
                                   <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Stop Loss (%):</label>
                                   <input
                                        type="number"
                                        step="0.001"
                                        min="0.001"
                                        max="0.5"
                                        value={botForm.stop_loss_percent}
                                        onChange={(e) => setBotForm({ ...botForm, stop_loss_percent: e.target.value })}
                                        placeholder="0.05"
                                        style={{
                                             width: "100%",
                                             padding: "8px",
                                             borderRadius: "4px",
                                             border: "1px solid #ddd",
                                        }}
                                   />
                              </div>

                              <div>
                                   <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Take Profit (%):</label>
                                   <input
                                        type="number"
                                        step="0.001"
                                        min="0.001"
                                        max="2.0"
                                        value={botForm.take_profit_percent}
                                        onChange={(e) => setBotForm({ ...botForm, take_profit_percent: e.target.value })}
                                        placeholder="0.10"
                                        style={{
                                             width: "100%",
                                             padding: "8px",
                                             borderRadius: "4px",
                                             border: "1px solid #ddd",
                                        }}
                                   />
                              </div>
                         </div>

                         {/* Symbols Selection */}
                         <div style={{ marginTop: "16px" }}>
                              <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Trading Symbols:</label>
                              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                                   <input
                                        type="text"
                                        value={symbolInput}
                                        onChange={(e) => setSymbolInput(e.target.value)}
                                        onKeyPress={(e) => e.key === "Enter" && handleAddSymbol()}
                                        placeholder="BTC/USDT"
                                        list="symbols-list"
                                        style={{
                                             flex: 1,
                                             padding: "8px",
                                             borderRadius: "4px",
                                             border: "1px solid #ddd",
                                        }}
                                   />
                                   <datalist id="symbols-list">
                                        {availableSymbols.map((sym) => (
                                             <option key={sym} value={sym} />
                                        ))}
                                   </datalist>
                                   <button
                                        onClick={handleAddSymbol}
                                        style={{
                                             padding: "8px 16px",
                                             backgroundColor: "#0070f3",
                                             color: "white",
                                             border: "none",
                                             borderRadius: "4px",
                                             cursor: "pointer",
                                        }}
                                   >
                                        Add
                                   </button>
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                   {botForm.symbols.map((symbol) => (
                                        <span
                                             key={symbol}
                                             style={{
                                                  padding: "4px 8px",
                                                  backgroundColor: "#e5e7eb",
                                                  borderRadius: "4px",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: "4px",
                                             }}
                                        >
                                             {symbol}
                                             <button
                                                  onClick={() => handleRemoveSymbol(symbol)}
                                                  style={{
                                                       background: "none",
                                                       border: "none",
                                                       color: "#666",
                                                       cursor: "pointer",
                                                       fontSize: "16px",
                                                       padding: 0,
                                                       marginLeft: "4px",
                                                  }}
                                             >
                                                  ×
                                             </button>
                                        </span>
                                   ))}
                              </div>
                         </div>

                         <button
                              onClick={handleCreateBot}
                              disabled={creating}
                              style={{
                                   marginTop: "16px",
                                   padding: "12px 24px",
                                   backgroundColor: creating ? "#ccc" : "#0070f3",
                                   color: "white",
                                   border: "none",
                                   borderRadius: "4px",
                                   cursor: creating ? "not-allowed" : "pointer",
                                   fontWeight: "bold",
                                   fontSize: "16px",
                              }}
                         >
                              {creating ? "Creating Bot..." : "Create Bot"}
                         </button>
                    </div>
               )}

               {/* Bots List */}
               <div style={{ marginBottom: "24px" }}>
                    <h2>My Bots</h2>
                    {botsLoading ? (
                         <p>Loading bots...</p>
                    ) : bots.length > 0 ? (
                         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                              {bots.map((bot) => {
                                   const statusColors: Record<string, string> = {
                                        inactive: "#6b7280",
                                        active: "#22c55e",
                                        paused: "#fbbf24",
                                        stopped: "#6b7280",
                                        error: "#ef4444",
                                   };
                                   const statusColor = statusColors[bot.status.toLowerCase()] || "#666";
                                   const winRate = bot.total_trades > 0 ? (bot.winning_trades / bot.total_trades) * 100 : 0;
                                   const pnl = parseFloat(bot.total_pnl);
                                   const pnlColor = pnl >= 0 ? "green" : "red";

                                   return (
                                        <div
                                             key={bot.id}
                                             onClick={() => setSelectedBot(bot)}
                                             style={{
                                                  padding: "16px",
                                                  backgroundColor: "#fff",
                                                  border: "1px solid #eaeaea",
                                                  borderRadius: "8px",
                                                  cursor: "pointer",
                                                  transition: "all 0.2s",
                                             }}
                                             onMouseEnter={(e) => {
                                                  e.currentTarget.style.borderColor = "#0070f3";
                                                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,112,243,0.1)";
                                             }}
                                             onMouseLeave={(e) => {
                                                  e.currentTarget.style.borderColor = "#eaeaea";
                                                  e.currentTarget.style.boxShadow = "none";
                                             }}
                                        >
                                             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                                  <h3 style={{ margin: 0 }}>{bot.name}</h3>
                                                  <span
                                                       style={{
                                                            padding: "4px 8px",
                                                            borderRadius: "4px",
                                                            backgroundColor: statusColor,
                                                            color: "white",
                                                            fontSize: "12px",
                                                            fontWeight: "bold",
                                                       }}
                                                  >
                                                       {bot.status.toUpperCase()}
                                                  </span>
                                             </div>
                                             <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>Strategy: {bot.strategy_type.replace("_", " ").toUpperCase()}</div>
                                             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                                                  <div>
                                                       <div style={{ fontSize: "12px", color: "#666" }}>Capital</div>
                                                       <div style={{ fontWeight: "bold" }}>
                                                            ${parseFloat(bot.current_capital).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                       </div>
                                                  </div>
                                                  <div>
                                                       <div style={{ fontSize: "12px", color: "#666" }}>Total P&L</div>
                                                       <div style={{ fontWeight: "bold", color: pnlColor }}>
                                                            ${pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                       </div>
                                                  </div>
                                                  <div>
                                                       <div style={{ fontSize: "12px", color: "#666" }}>Trades</div>
                                                       <div style={{ fontWeight: "bold" }}>{bot.total_trades}</div>
                                                  </div>
                                                  <div>
                                                       <div style={{ fontSize: "12px", color: "#666" }}>Win Rate</div>
                                                       <div style={{ fontWeight: "bold" }}>{winRate.toFixed(1)}%</div>
                                                  </div>
                                             </div>
                                             <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                                                  {bot.status === "inactive" || bot.status === "stopped" ? (
                                                       <button
                                                            onClick={(e) => {
                                                                 e.stopPropagation();
                                                                 handleStartBot(bot.id);
                                                            }}
                                                            style={{
                                                                 flex: 1,
                                                                 padding: "8px",
                                                                 backgroundColor: "#22c55e",
                                                                 color: "white",
                                                                 border: "none",
                                                                 borderRadius: "4px",
                                                                 cursor: "pointer",
                                                                 fontSize: "14px",
                                                            }}
                                                       >
                                                            Start
                                                       </button>
                                                  ) : (
                                                       <button
                                                            onClick={(e) => {
                                                                 e.stopPropagation();
                                                                 handleStopBot(bot.id);
                                                            }}
                                                            style={{
                                                                 flex: 1,
                                                                 padding: "8px",
                                                                 backgroundColor: "#ef4444",
                                                                 color: "white",
                                                                 border: "none",
                                                                 borderRadius: "4px",
                                                                 cursor: "pointer",
                                                                 fontSize: "14px",
                                                            }}
                                                       >
                                                            Stop
                                                       </button>
                                                  )}
                                             </div>
                                        </div>
                                   );
                              })}
                         </div>
                    ) : (
                         <p style={{ color: "#666" }}>No bots created yet. Create your first bot above.</p>
                    )}
               </div>

               {/* Bot Details */}
               {selectedBot && (
                    <div style={{ marginBottom: "24px" }}>
                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                              <h2>Bot Details: {selectedBot.name}</h2>
                              <button
                                   onClick={() => setSelectedBot(null)}
                                   style={{
                                        padding: "8px 16px",
                                        backgroundColor: "#6b7280",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                   }}
                              >
                                   Close
                              </button>
                         </div>

                         {/* Performance Metrics */}
                         {statusLoading ? (
                              <p>Loading status...</p>
                         ) : botStatus ? (
                              <div
                                   style={{
                                        padding: "16px",
                                        backgroundColor: "#fff",
                                        border: "1px solid #eaeaea",
                                        borderRadius: "8px",
                                        marginBottom: "24px",
                                   }}
                              >
                                   <h3>Performance Metrics</h3>
                                   <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px" }}>
                                        <div>
                                             <div style={{ fontSize: "12px", color: "#666" }}>Capital</div>
                                             <div style={{ fontSize: "24px", fontWeight: "bold" }}>
                                                  ${botStatus.current_capital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                             </div>
                                        </div>
                                        <div>
                                             <div style={{ fontSize: "12px", color: "#666" }}>Total Trades</div>
                                             <div style={{ fontSize: "24px", fontWeight: "bold" }}>{botStatus.total_trades}</div>
                                        </div>
                                        <div>
                                             <div style={{ fontSize: "12px", color: "#666" }}>Win Rate</div>
                                             <div style={{ fontSize: "24px", fontWeight: "bold", color: botStatus.win_rate >= 50 ? "green" : "red" }}>{botStatus.win_rate.toFixed(1)}%</div>
                                        </div>
                                        <div>
                                             <div style={{ fontSize: "12px", color: "#666" }}>Total P&L</div>
                                             <div style={{ fontSize: "24px", fontWeight: "bold", color: botStatus.total_pnl >= 0 ? "green" : "red" }}>
                                                  ${botStatus.total_pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                             </div>
                                        </div>
                                        <div>
                                             <div style={{ fontSize: "12px", color: "#666" }}>Open Positions</div>
                                             <div style={{ fontSize: "24px", fontWeight: "bold" }}>{botStatus.open_positions}</div>
                                        </div>
                                   </div>
                              </div>
                         ) : null}

                         {/* Bot Configuration */}
                         <div
                              style={{
                                   padding: "16px",
                                   backgroundColor: "#fff",
                                   border: "1px solid #eaeaea",
                                   borderRadius: "8px",
                                   marginBottom: "24px",
                              }}
                         >
                              <h3>Configuration</h3>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                                   <div>
                                        <div style={{ fontSize: "12px", color: "#666" }}>Strategy</div>
                                        <div style={{ fontWeight: "bold" }}>{selectedBot.strategy_type.replace("_", " ").toUpperCase()}</div>
                                   </div>
                                   <div>
                                        <div style={{ fontSize: "12px", color: "#666" }}>Risk Per Trade</div>
                                        <div style={{ fontWeight: "bold" }}>{(parseFloat(selectedBot.risk_per_trade) * 100).toFixed(2)}%</div>
                                   </div>
                                   <div>
                                        <div style={{ fontSize: "12px", color: "#666" }}>Symbols</div>
                                        <div style={{ fontWeight: "bold" }}>{selectedBot.symbols.join(", ")}</div>
                                   </div>
                                   {selectedBot.stop_loss_percent && (
                                        <div>
                                             <div style={{ fontSize: "12px", color: "#666" }}>Stop Loss</div>
                                             <div style={{ fontWeight: "bold" }}>{(parseFloat(selectedBot.stop_loss_percent) * 100).toFixed(2)}%</div>
                                        </div>
                                   )}
                                   {selectedBot.take_profit_percent && (
                                        <div>
                                             <div style={{ fontSize: "12px", color: "#666" }}>Take Profit</div>
                                             <div style={{ fontWeight: "bold" }}>{(parseFloat(selectedBot.take_profit_percent) * 100).toFixed(2)}%</div>
                                        </div>
                                   )}
                                   {selectedBot.duration_hours && (
                                        <div>
                                             <div style={{ fontSize: "12px", color: "#666" }}>Duration</div>
                                             <div style={{ fontWeight: "bold" }}>{selectedBot.duration_hours} hours</div>
                                        </div>
                                   )}
                              </div>
                              {selectedBot.last_error && (
                                   <div style={{ marginTop: "12px", padding: "8px", backgroundColor: "#fee", borderRadius: "4px", color: "#c00", fontSize: "12px" }}>
                                        <strong>Last Error:</strong> {selectedBot.last_error}
                                   </div>
                              )}
                         </div>

                         {/* Bot Trades */}
                         <div>
                              <h3>Trade History</h3>
                              {tradesLoading ? (
                                   <p>Loading trades...</p>
                              ) : botTrades.length > 0 ? (
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
                                                       <th style={{ padding: "12px", textAlign: "right" }}>Exit Price</th>
                                                       <th style={{ padding: "12px", textAlign: "right" }}>P&L</th>
                                                       <th style={{ padding: "12px", textAlign: "left" }}>Status</th>
                                                       <th style={{ padding: "12px", textAlign: "left" }}>Entry Time</th>
                                                  </tr>
                                             </thead>
                                             <tbody>
                                                  {botTrades.map((trade) => {
                                                       const pnl = parseFloat(trade.pnl);
                                                       const pnlColor = pnl >= 0 ? "green" : "red";
                                                       return (
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
                                                                      ${parseFloat(trade.entry_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                                                                 </td>
                                                                 <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace" }}>
                                                                      {trade.exit_price
                                                                           ? `$${parseFloat(trade.exit_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`
                                                                           : "N/A"}
                                                                 </td>
                                                                 <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace", color: pnlColor, fontWeight: "bold" }}>
                                                                      ${pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                 </td>
                                                                 <td style={{ padding: "8px" }}>
                                                                      <span
                                                                           style={{
                                                                                padding: "4px 8px",
                                                                                borderRadius: "4px",
                                                                                backgroundColor: trade.status === "closed" ? "#22c55e" : "#fbbf24",
                                                                                color: "white",
                                                                                fontSize: "12px",
                                                                           }}
                                                                      >
                                                                           {trade.status.toUpperCase()}
                                                                      </span>
                                                                 </td>
                                                                 <td style={{ padding: "8px", fontSize: "12px" }}>{new Date(trade.entry_time).toLocaleString()}</td>
                                                            </tr>
                                                       );
                                                  })}
                                             </tbody>
                                        </table>
                                   </div>
                              ) : (
                                   <p style={{ color: "#666" }}>No trades yet</p>
                              )}
                         </div>
                    </div>
               )}
          </div>
     );
}

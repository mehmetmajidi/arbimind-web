"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useExchange } from "@/contexts/ExchangeContext";

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
     exchange_account_id?: number;
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
     paper_trading: boolean;
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
     const { accounts } = useExchange();
     const [bots, setBots] = useState<TradingBot[]>([]);
     const [selectedBot, setSelectedBot] = useState<TradingBot | null>(null);
     const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
     const [botTrades, setBotTrades] = useState<BotTrade[]>([]);

     const [loading, setLoading] = useState(true);
     const [botsLoading, setBotsLoading] = useState(false);
     const [statusLoading, setStatusLoading] = useState(false);
     const [tradesLoading, setTradesLoading] = useState(false);
     const [error, setError] = useState<string | null>(null);
     const [editingBotId, setEditingBotId] = useState<number | null>(null);

     // Create bot form state
     const [showCreateForm, setShowCreateForm] = useState(false);
     const [creating, setCreating] = useState(false);
     const [botForm, setBotForm] = useState({
          name: "",
          exchange_account_id: "",
          capital: "",
          capital_currency: "", // Currency for capital (USDT, TRY, etc.)
          risk_per_trade: "0.02",
          symbols: [] as string[],
          strategy_type: "prediction_based",
          max_position_size: "",
          stop_loss_percent: "",
          take_profit_percent: "",
          duration_hours: "",
          paper_trading: true, // Default to paper trading (safe mode)
     });
     const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
     const [symbolInput, setSymbolInput] = useState("");
     const [availableBalances, setAvailableBalances] = useState<Record<string, { free: number; used: number; total: number }>>({});
     const [balancesLoading, setBalancesLoading] = useState(false);

     // Auto-refresh
     const [autoRefresh, setAutoRefresh] = useState(true);
     const [refreshInterval, setRefreshInterval] = useState(10); // seconds

     // Initialize loading state (accounts are now from ExchangeContext)
     useEffect(() => {
          setLoading(false);
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
                         // API returns {exchange, count, markets: [{symbol, base, quote, active, ...}]}
                         const markets = data.markets || [];
                         // Extract symbols and sort them
                         const symbols = markets
                              .filter((m: { active?: boolean }) => m.active !== false)
                              .map((m: { symbol: string }) => m.symbol)
                              .sort();
                         setAvailableSymbols(symbols);
                         console.log(`Fetched ${symbols.length} available symbols from ${data.exchange || 'exchange'}`);
                    } else {
                         console.error("Failed to fetch symbols:", response.status);
                         setAvailableSymbols([]);
                    }
               } catch (error) {
                    console.error("Error fetching symbols:", error);
                    setAvailableSymbols([]);
               }
          };

          fetchSymbols();
     }, [botForm.exchange_account_id]);

     // Fetch available balances when account is selected
     useEffect(() => {
          const fetchBalances = async () => {
               if (!botForm.exchange_account_id) {
                    setAvailableBalances({});
                    setBotForm(prev => ({ ...prev, capital_currency: "" }));
                    return;
               }

               setBalancesLoading(true);
               try {
                    const token = localStorage.getItem("auth_token") || "";
                    if (!token) return;

                    const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

                    const response = await fetch(`${apiUrl}/trading/balance/${botForm.exchange_account_id}`, {
                         headers: { Authorization: `Bearer ${token}` },
                    });

                    if (response.ok) {
                         const data = await response.json();
                         console.log("Balance API response:", data);
                         
                         // API returns {exchange, balances: {currency: {free, used, total}, ...}}
                         const balances = data.balances || {};
                         console.log("Parsed balances:", balances);
                         console.log("Balance keys:", Object.keys(balances));
                         
                         setAvailableBalances(balances);
                         
                         // Auto-select first currency with balance > 0
                         const currenciesWithBalance = Object.keys(balances).filter(
                              (currency) => {
                                   const balance = balances[currency];
                                   const free = balance?.free || 0;
                                   const total = balance?.total || 0;
                                   return free > 0 || total > 0;
                              }
                         );
                         
                         const allCurrencies = Object.keys(balances);
                         
                         console.log("Currencies with balance:", currenciesWithBalance);
                         console.log("All currencies:", allCurrencies);
                         
                         // Auto-select: prefer currency with balance, but if none exist, select first available currency
                         if (!botForm.capital_currency) {
                              if (currenciesWithBalance.length > 0) {
                                   setBotForm(prev => ({ ...prev, capital_currency: currenciesWithBalance[0] }));
                              } else if (allCurrencies.length > 0) {
                                   // Fallback: select first currency even if balance is 0 (useful for paper trading)
                                   setBotForm(prev => ({ ...prev, capital_currency: allCurrencies[0] }));
                              }
                         }
                         
                         console.log(`Fetched balances for ${Object.keys(balances).length} currencies from ${data.exchange || 'exchange'}`);
                    } else {
                         const errorText = await response.text().catch(() => "Unknown error");
                         console.error("Failed to fetch balances:", response.status, errorText);
                         setAvailableBalances({});
                         
                         if (response.status === 503) {
                              console.warn("Balance service unavailable - exchange might be down or account inactive");
                         }
                    }
               } catch (error) {
                    console.error("Error fetching balances:", error);
                    setAvailableBalances({});
               } finally {
                    setBalancesLoading(false);
               }
          };

          fetchBalances();
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
          // If editing, call update instead
          if (editingBotId) {
               await handleUpdateBot();
               return;
          }

          if (!botForm.name || !botForm.exchange_account_id || !botForm.capital || !botForm.capital_currency || botForm.symbols.length === 0) {
               setError("Please fill in all required fields including capital currency");
               return;
          }

          // Validate capital doesn't exceed available balance
          // Note: Paper trading bots don't need real balance, but we still validate the amount
          if (botForm.capital_currency) {
               const requestedAmount = parseFloat(botForm.capital);
               
               if (isNaN(requestedAmount) || requestedAmount <= 0) {
                    setError("Please enter a valid capital amount greater than 0");
                    return;
               }
               
               // Check if currency exists in available balances
               if (!availableBalances[botForm.capital_currency]) {
                    setError(`Currency ${botForm.capital_currency} not found in available balances. Please select a valid currency.`);
                    return;
               }
               
               const availableAmount = availableBalances[botForm.capital_currency].free;
               
               // Only validate balance for real trading bots (not paper trading)
               if (!botForm.paper_trading) {
                    // Check if balance is 0 or insufficient
                    if (availableAmount <= 0) {
                         setError(`Insufficient balance. Available: ${availableAmount.toFixed(8)} ${botForm.capital_currency}. Please deposit funds or select a different currency.`);
                         return;
                    }
                    
                    if (requestedAmount > availableAmount) {
                         setError(`Insufficient balance. Available: ${availableAmount.toFixed(8)} ${botForm.capital_currency}, Requested: ${requestedAmount.toFixed(8)}`);
                         return;
                    }
               }
               // For paper trading, we allow any amount (it's simulated)
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

               const requestBody: Record<string, string | number | string[] | boolean | null> = {
                    name: botForm.name,
                    exchange_account_id: parseInt(botForm.exchange_account_id),
                    capital: parseFloat(botForm.capital),
                    risk_per_trade: parseFloat(botForm.risk_per_trade),
                    symbols: botForm.symbols,
                    strategy_type: botForm.strategy_type,
                    paper_trading: botForm.paper_trading,
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
                         capital_currency: "",
                         risk_per_trade: "0.02",
                         symbols: [],
                         strategy_type: "prediction_based",
                         max_position_size: "",
                         stop_loss_percent: "",
                         take_profit_percent: "",
                         duration_hours: "",
                         paper_trading: true,
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

     // Delete bot
     const handleDeleteBot = async (botId: number) => {
          if (!confirm("Are you sure you want to delete this bot? This action cannot be undone.")) {
               return;
          }

          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) return;

               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

               const response = await fetch(`${apiUrl}/bots/${botId}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    await fetchBots();
                    if (selectedBot && selectedBot.id === botId) {
                         setSelectedBot(null);
                    }
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to delete bot");
               }
          } catch (error) {
               console.error("Error deleting bot:", error);
               setError("Network error. Please check your connection.");
          }
     };

     // Edit bot - load bot data into form
     const handleEditBot = (bot: TradingBot) => {
          console.log("Editing bot:", bot);
          console.log("Bot exchange_account_id:", bot.exchange_account_id);
          console.log("Available accounts:", accounts);
          
          setBotForm({
               name: bot.name,
               exchange_account_id: bot.exchange_account_id ? String(bot.exchange_account_id) : "",
               capital: String(bot.capital),
               capital_currency: "", // Will be auto-selected when balances are fetched
               risk_per_trade: String(bot.risk_per_trade),
               symbols: bot.symbols || [],
               strategy_type: bot.strategy_type,
               max_position_size: bot.max_position_size ? String(bot.max_position_size) : "",
               stop_loss_percent: bot.stop_loss_percent ? String(bot.stop_loss_percent) : "",
               take_profit_percent: bot.take_profit_percent ? String(bot.take_profit_percent) : "",
               duration_hours: bot.duration_hours ? String(bot.duration_hours) : "",
               paper_trading: bot.paper_trading || false,
          });
          setEditingBotId(bot.id);
          setShowCreateForm(true);
     };

     // Update bot
     const handleUpdateBot = async () => {
          if (!editingBotId) return;

          if (!botForm.name || !botForm.capital || botForm.symbols.length === 0) {
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

               const requestBody: Record<string, string | number | string[] | boolean | null> = {
                    name: botForm.name,
                    exchange_account_id: botForm.exchange_account_id ? parseInt(botForm.exchange_account_id) : null,
                    capital: parseFloat(botForm.capital),
                    risk_per_trade: parseFloat(botForm.risk_per_trade),
                    symbols: botForm.symbols,
                    strategy_type: botForm.strategy_type,
                    paper_trading: botForm.paper_trading,
               };

               if (botForm.max_position_size) requestBody.max_position_size = parseFloat(botForm.max_position_size);
               if (botForm.stop_loss_percent) requestBody.stop_loss_percent = parseFloat(botForm.stop_loss_percent);
               if (botForm.take_profit_percent) requestBody.take_profit_percent = parseFloat(botForm.take_profit_percent);
               if (botForm.duration_hours) requestBody.duration_hours = parseInt(botForm.duration_hours);

               const response = await fetch(`${apiUrl}/bots/${editingBotId}`, {
                    method: "PUT",
                    headers: {
                         "Content-Type": "application/json",
                         Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(requestBody),
               });

               if (response.ok) {
                    await fetchBots();
                    setShowCreateForm(false);
                    setEditingBotId(null);
                    setBotForm({
                         name: "",
                         exchange_account_id: "",
                         capital: "",
                         capital_currency: "",
                         risk_per_trade: "0.02",
                         symbols: [],
                         strategy_type: "prediction_based",
                         max_position_size: "",
                         stop_loss_percent: "",
                         take_profit_percent: "",
                         duration_hours: "",
                         paper_trading: true,
                    });
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to update bot");
               }
          } catch (error) {
               console.error("Error updating bot:", error);
               setError("Network error. Please check your connection.");
          } finally {
               setCreating(false);
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
          <div style={{ padding: "32px", maxWidth: "1600px", margin: "0 auto", backgroundColor: "#202020", minHeight: "100vh" }}>
               {/* Header */}
               <div style={{ marginBottom: "32px" }}>
                    <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#ffffff", marginBottom: "8px", letterSpacing: "-0.5px" }}>Bot Management Dashboard</h1>
                    <p style={{ color: "#888", fontSize: "14px" }}>Manage and monitor your trading bots</p>
               </div>

               {error && (
                    <div
                         style={{
                              padding: "16px",
                              backgroundColor: "rgba(239, 68, 68, 0.1)",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              borderRadius: "12px",
                              marginBottom: "24px",
                              color: "#ef4444",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                         }}
                    >
                         <span>{error}</span>
                         <button
                              onClick={() => setError(null)}
                              style={{
                                   background: "none",
                                   border: "none",
                                   color: "#ef4444",
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

               {/* Controls */}
               <div
                    style={{
                         display: "flex",
                         alignItems: "center",
                         justifyContent: "space-between",
                         marginBottom: "32px",
                         padding: "20px 24px",
                         backgroundColor: "#2a2a2a",
                         borderRadius: "16px",
                         border: "1px solid rgba(255, 174, 0, 0.2)",
                         boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                    }}
               >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                         <label
                              style={{
                                   display: "flex",
                                   alignItems: "center",
                                   gap: "10px",
                                   color: "#ffffff",
                                   fontSize: "15px",
                                   fontWeight: "500",
                                   cursor: "pointer",
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
                              Auto Refresh
                         </label>
                         {autoRefresh && (
                              <select
                                   value={refreshInterval}
                                   onChange={(e) => setRefreshInterval(Number(e.target.value))}
                                   style={{
                                        padding: "8px 12px",
                                        borderRadius: "8px",
                                        border: "1px solid rgba(255, 174, 0, 0.3)",
                                        backgroundColor: "#1a1a1a",
                                        color: "#ffffff",
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        outline: "none",
                                   }}
                              >
                                   <option value={5}>Every 5 seconds</option>
                                   <option value={10}>Every 10 seconds</option>
                                   <option value={30}>Every 30 seconds</option>
                                   <option value={60}>Every 1 minute</option>
                              </select>
                         )}
                    </div>

                    <button
                         onClick={() => setShowCreateForm(!showCreateForm)}
                         style={{
                              padding: "12px 32px",
                              backgroundColor: showCreateForm ? "#ef4444" : "#22c55e",
                              color: "white",
                              border: "none",
                              borderRadius: "12px",
                              cursor: "pointer",
                              fontWeight: "600",
                              fontSize: "16px",
                              boxShadow: showCreateForm ? "0 4px 12px rgba(239, 68, 68, 0.3)" : "0 4px 12px rgba(34, 197, 94, 0.3)",
                              transition: "all 0.2s",
                         }}
                         onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "translateY(-2px)";
                              e.currentTarget.style.boxShadow = showCreateForm ? "0 6px 16px rgba(239, 68, 68, 0.4)" : "0 6px 16px rgba(34, 197, 94, 0.4)";
                         }}
                         onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow = showCreateForm ? "0 4px 12px rgba(239, 68, 68, 0.3)" : "0 4px 12px rgba(34, 197, 94, 0.3)";
                         }}
                    >
                         {showCreateForm ? "Cancel" : "+ Create Bot"}
                    </button>
               </div>

               {/* Create Bot Form Modal */}
               {showCreateForm && (
                    <div
                         style={{
                              position: "fixed",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: "rgba(0, 0, 0, 0.7)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              zIndex: 1000,
                              padding: "24px",
                         }}
                         onClick={() => setShowCreateForm(false)}
                    >
                         <div
                              style={{
                                   backgroundColor: "#2a2a2a",
                                   borderRadius: "20px",
                                   padding: "32px",
                                   maxWidth: "800px",
                                   width: "100%",
                                   maxHeight: "90vh",
                                   overflowY: "auto",
                                   border: "1px solid rgba(255, 174, 0, 0.3)",
                                   boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
                              }}
                              onClick={(e) => e.stopPropagation()}
                         >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                                   <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#ffffff", margin: 0 }}>{editingBotId ? "Edit Bot" : "Create New Bot"}</h2>
                                   <button
                                        onClick={() => setShowCreateForm(false)}
                                        style={{
                                             background: "none",
                                             border: "none",
                                             color: "#888",
                                             cursor: "pointer",
                                             fontSize: "24px",
                                             padding: "0",
                                             width: "32px",
                                             height: "32px",
                                             display: "flex",
                                             alignItems: "center",
                                             justifyContent: "center",
                                             borderRadius: "8px",
                                             transition: "all 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                             e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                                             e.currentTarget.style.color = "#ffffff";
                                        }}
                                        onMouseLeave={(e) => {
                                             e.currentTarget.style.backgroundColor = "transparent";
                                             e.currentTarget.style.color = "#888";
                                        }}
                                   >
                                        ×
                                   </button>
                              </div>
                              
                              {/* Error message inside modal */}
                              {error && (
                                   <div
                                        style={{
                                             padding: "12px 16px",
                                             backgroundColor: "rgba(239, 68, 68, 0.1)",
                                             border: "1px solid rgba(239, 68, 68, 0.3)",
                                             borderRadius: "12px",
                                             marginBottom: "24px",
                                             color: "#ef4444",
                                             display: "flex",
                                             alignItems: "center",
                                             justifyContent: "space-between",
                                             fontSize: "14px",
                                        }}
                                   >
                                        <span>{error}</span>
                                        <button
                                             onClick={() => setError(null)}
                                             style={{
                                                  background: "none",
                                                  border: "none",
                                                  color: "#ef4444",
                                                  cursor: "pointer",
                                                  fontSize: "18px",
                                                  padding: "0 8px",
                                                  fontWeight: "bold",
                                             }}
                                        >
                                             ×
                                        </button>
                                   </div>
                              )}
                              
                              <div
                                   style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                                        gap: "20px",
                                   }}
                              >
                                   <div>
                                        <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#ffffff", fontSize: "14px" }}>Bot Name:</label>
                                        <input
                                             type="text"
                                             value={botForm.name}
                                             onChange={(e) => setBotForm({ ...botForm, name: e.target.value })}
                                             placeholder="My Trading Bot"
                                             style={{
                                                  width: "100%",
                                                  padding: "12px",
                                                  borderRadius: "10px",
                                                  border: "1px solid rgba(255, 174, 0, 0.3)",
                                                  backgroundColor: "#1a1a1a",
                                                  color: "#ffffff",
                                                  fontSize: "14px",
                                                  outline: "none",
                                                  transition: "all 0.2s",
                                             }}
                                             onFocus={(e) => {
                                                  e.currentTarget.style.borderColor = "#FFAE00";
                                                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255, 174, 0, 0.1)";
                                             }}
                                             onBlur={(e) => {
                                                  e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.3)";
                                                  e.currentTarget.style.boxShadow = "none";
                                             }}
                                        />
                                   </div>

                                   <div>
                                        <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#ffffff", fontSize: "14px" }}>Exchange Account:</label>
                                        <select
                                             value={botForm.exchange_account_id}
                                             onChange={(e) => setBotForm({ ...botForm, exchange_account_id: e.target.value })}
                                             style={{
                                                  width: "100%",
                                                  padding: "12px",
                                                  borderRadius: "10px",
                                                  border: "1px solid rgba(255, 174, 0, 0.3)",
                                                  backgroundColor: "#1a1a1a",
                                                  color: "#ffffff",
                                                  fontSize: "14px",
                                                  outline: "none",
                                                  cursor: "pointer",
                                                  transition: "all 0.2s",
                                             }}
                                             onFocus={(e) => {
                                                  e.currentTarget.style.borderColor = "#FFAE00";
                                                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255, 174, 0, 0.1)";
                                             }}
                                             onBlur={(e) => {
                                                  e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.3)";
                                                  e.currentTarget.style.boxShadow = "none";
                                             }}
                                        >
                                             <option value="" style={{ backgroundColor: "#1a1a1a" }}>
                                                  Select Exchange
                                             </option>
                                             {accounts.map((acc) => (
                                                  <option key={acc.id} value={String(acc.id)} style={{ backgroundColor: "#1a1a1a" }}>
                                                       {(acc.exchange_name || "Unknown").toUpperCase()}
                                                  </option>
                                             ))}
                                        </select>
                                   </div>

                                   <div>
                                        <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#ffffff", fontSize: "14px" }}>
                                             Capital:
                                             {botForm.exchange_account_id && botForm.capital_currency && availableBalances[botForm.capital_currency] && (
                                                  <span style={{ marginLeft: "8px", color: "#888", fontSize: "12px", fontWeight: "400" }}>
                                                       (Available: {availableBalances[botForm.capital_currency].free.toFixed(8)} {botForm.capital_currency})
                                                  </span>
                                             )}
                                        </label>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                             {botForm.exchange_account_id ? (
                                                  <>
                                                       <select
                                                            value={botForm.capital_currency}
                                                            onChange={(e) => setBotForm({ ...botForm, capital_currency: e.target.value, capital: "" })}
                                                            disabled={balancesLoading || Object.keys(availableBalances).length === 0}
                                                            style={{
                                                                 minWidth: "120px",
                                                                 padding: "12px",
                                                                 borderRadius: "10px",
                                                                 border: "1px solid rgba(255, 174, 0, 0.3)",
                                                                 backgroundColor: "#1a1a1a",
                                                                 color: "#ffffff",
                                                                 fontSize: "14px",
                                                                 outline: "none",
                                                                 cursor: balancesLoading || Object.keys(availableBalances).length === 0 ? "not-allowed" : "pointer",
                                                                 transition: "all 0.2s",
                                                                 opacity: balancesLoading || Object.keys(availableBalances).length === 0 ? 0.6 : 1,
                                                            }}
                                                            onFocus={(e) => {
                                                                 if (!balancesLoading && Object.keys(availableBalances).length > 0) {
                                                                      e.currentTarget.style.borderColor = "#FFAE00";
                                                                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255, 174, 0, 0.1)";
                                                                 }
                                                            }}
                                                            onBlur={(e) => {
                                                                 e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.3)";
                                                                 e.currentTarget.style.boxShadow = "none";
                                                            }}
                                                       >
                                                            <option value="" style={{ backgroundColor: "#1a1a1a", color: "#888" }}>
                                                                 {balancesLoading ? "Loading..." : Object.keys(availableBalances).length === 0 ? "No balance" : "Select Currency"}
                                                            </option>
                                                            {Object.keys(availableBalances)
                                                                 .sort()
                                                                 .map((currency) => {
                                                                      const balance = availableBalances[currency];
                                                                      const free = balance?.free || 0;
                                                                      const total = balance?.total || 0;
                                                                      const hasBalance = free > 0 || total > 0;
                                                                      return (
                                                                           <option key={currency} value={currency} style={{ backgroundColor: "#1a1a1a", color: hasBalance ? "#ffffff" : "#888" }}>
                                                                                {currency} (Free: {free.toFixed(8)})
                                                                           </option>
                                                                      );
                                                                 })}
                                                       </select>
                                                       <input
                                                            type="number"
                                                            step="any"
                                                            min="0"
                                                            value={botForm.capital}
                                                            onChange={(e) => setBotForm({ ...botForm, capital: e.target.value })}
                                                            placeholder={botForm.capital_currency ? `Enter amount in ${botForm.capital_currency}` : "Enter amount"}
                                                            disabled={!botForm.capital_currency}
                                                            style={{
                                                                 flex: 1,
                                                                 padding: "12px",
                                                                 borderRadius: "10px",
                                                                 border: "1px solid rgba(255, 174, 0, 0.3)",
                                                                 backgroundColor: "#1a1a1a",
                                                                 color: "#ffffff",
                                                                 fontSize: "14px",
                                                                 outline: "none",
                                                                 transition: "all 0.2s",
                                                                 opacity: !botForm.capital_currency ? 0.6 : 1,
                                                                 cursor: !botForm.capital_currency ? "not-allowed" : "text",
                                                            }}
                                                            onFocus={(e) => {
                                                                 if (botForm.capital_currency) {
                                                                      e.currentTarget.style.borderColor = "#FFAE00";
                                                                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255, 174, 0, 0.1)";
                                                                 }
                                                            }}
                                                            onBlur={(e) => {
                                                                 e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.3)";
                                                                 e.currentTarget.style.boxShadow = "none";
                                                            }}
                                                       />
                                                  </>
                                             ) : (
                                                  <div style={{
                                                       flex: 1,
                                                       padding: "12px",
                                                       borderRadius: "10px",
                                                       border: "1px solid rgba(255, 174, 0, 0.3)",
                                                       backgroundColor: "#1a1a1a",
                                                       color: "#888",
                                                       fontSize: "14px",
                                                       textAlign: "center",
                                                  }}>
                                                       Please select an exchange account first
                                                  </div>
                                             )}
                                        </div>
                                   </div>

                                   <div>
                                        <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#ffffff", fontSize: "14px" }}>Risk Per Trade (%):</label>
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
                                                  padding: "12px",
                                                  borderRadius: "10px",
                                                  border: "1px solid rgba(255, 174, 0, 0.3)",
                                                  backgroundColor: "#1a1a1a",
                                                  color: "#ffffff",
                                                  fontSize: "14px",
                                                  outline: "none",
                                                  transition: "all 0.2s",
                                             }}
                                             onFocus={(e) => {
                                                  e.currentTarget.style.borderColor = "#FFAE00";
                                                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255, 174, 0, 0.1)";
                                             }}
                                             onBlur={(e) => {
                                                  e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.3)";
                                                  e.currentTarget.style.boxShadow = "none";
                                             }}
                                        />
                                   </div>

                                   <div>
                                        <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#ffffff", fontSize: "14px" }}>Strategy Type:</label>
                                        <select
                                             value={botForm.strategy_type}
                                             onChange={(e) => setBotForm({ ...botForm, strategy_type: e.target.value })}
                                             style={{
                                                  width: "100%",
                                                  padding: "12px",
                                                  borderRadius: "10px",
                                                  border: "1px solid rgba(255, 174, 0, 0.3)",
                                                  backgroundColor: "#1a1a1a",
                                                  color: "#ffffff",
                                                  fontSize: "14px",
                                                  outline: "none",
                                                  cursor: "pointer",
                                                  transition: "all 0.2s",
                                             }}
                                             onFocus={(e) => {
                                                  e.currentTarget.style.borderColor = "#FFAE00";
                                                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255, 174, 0, 0.1)";
                                             }}
                                             onBlur={(e) => {
                                                  e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.3)";
                                                  e.currentTarget.style.boxShadow = "none";
                                             }}
                                        >
                                             <option value="prediction_based" style={{ backgroundColor: "#1a1a1a" }}>
                                                  Prediction Based
                                             </option>
                                             <option value="momentum" style={{ backgroundColor: "#1a1a1a" }}>
                                                  Momentum
                                             </option>
                                             <option value="mean_reversion" style={{ backgroundColor: "#1a1a1a" }}>
                                                  Mean Reversion
                                             </option>
                                             <option value="breakout" style={{ backgroundColor: "#1a1a1a" }}>
                                                  Breakout
                                             </option>
                                        </select>
                                   </div>

                                   <div>
                                        <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#ffffff", fontSize: "14px" }}>Duration (hours, optional):</label>
                                        <input
                                             type="number"
                                             step="1"
                                             min="1"
                                             value={botForm.duration_hours}
                                             onChange={(e) => setBotForm({ ...botForm, duration_hours: e.target.value })}
                                             placeholder="2"
                                             style={{
                                                  width: "100%",
                                                  padding: "12px",
                                                  borderRadius: "10px",
                                                  border: "1px solid rgba(255, 174, 0, 0.3)",
                                                  backgroundColor: "#1a1a1a",
                                                  color: "#ffffff",
                                                  fontSize: "14px",
                                                  outline: "none",
                                                  transition: "all 0.2s",
                                             }}
                                             onFocus={(e) => {
                                                  e.currentTarget.style.borderColor = "#FFAE00";
                                                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255, 174, 0, 0.1)";
                                             }}
                                             onBlur={(e) => {
                                                  e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.3)";
                                                  e.currentTarget.style.boxShadow = "none";
                                             }}
                                        />
                                   </div>

                                   {/* Paper Trading Mode */}
                                   <div
                                        style={{
                                             gridColumn: "1 / -1",
                                             marginTop: "8px",
                                             marginBottom: "16px",
                                             padding: "16px",
                                             backgroundColor: "rgba(255, 174, 0, 0.1)",
                                             borderRadius: "12px",
                                             border: "1px solid rgba(255, 174, 0, 0.3)",
                                        }}
                                   >
                                        <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                                             <input
                                                  type="checkbox"
                                                  checked={botForm.paper_trading}
                                                  onChange={(e) => setBotForm({ ...botForm, paper_trading: e.target.checked })}
                                                  style={{
                                                       width: "20px",
                                                       height: "20px",
                                                       cursor: "pointer",
                                                       accentColor: "#FFAE00",
                                                  }}
                                             />
                                             <div>
                                                  <span style={{ fontWeight: "600", color: "#FFAE00", fontSize: "15px" }}>📝 Paper Trading (Demo Mode)</span>
                                                  <div style={{ fontSize: "13px", color: "#aaa", marginTop: "4px" }}>معاملات شبیه‌سازی می‌شوند و پول واقعی استفاده نمی‌شود. برای تست امن است.</div>
                                             </div>
                                        </label>
                                   </div>

                                   <div>
                                        <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#ffffff", fontSize: "14px" }}>Stop Loss (%):</label>
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
                                                  padding: "12px",
                                                  borderRadius: "10px",
                                                  border: "1px solid rgba(255, 174, 0, 0.3)",
                                                  backgroundColor: "#1a1a1a",
                                                  color: "#ffffff",
                                                  fontSize: "14px",
                                                  outline: "none",
                                                  transition: "all 0.2s",
                                             }}
                                             onFocus={(e) => {
                                                  e.currentTarget.style.borderColor = "#FFAE00";
                                                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255, 174, 0, 0.1)";
                                             }}
                                             onBlur={(e) => {
                                                  e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.3)";
                                                  e.currentTarget.style.boxShadow = "none";
                                             }}
                                        />
                                   </div>

                                   <div>
                                        <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#ffffff", fontSize: "14px" }}>Take Profit (%):</label>
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
                                                  padding: "12px",
                                                  borderRadius: "10px",
                                                  border: "1px solid rgba(255, 174, 0, 0.3)",
                                                  backgroundColor: "#1a1a1a",
                                                  color: "#ffffff",
                                                  fontSize: "14px",
                                                  outline: "none",
                                                  transition: "all 0.2s",
                                             }}
                                             onFocus={(e) => {
                                                  e.currentTarget.style.borderColor = "#FFAE00";
                                                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255, 174, 0, 0.1)";
                                             }}
                                             onBlur={(e) => {
                                                  e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.3)";
                                                  e.currentTarget.style.boxShadow = "none";
                                             }}
                                        />
                                   </div>
                              </div>

                              {/* Symbols Selection */}
                              <div style={{ marginTop: "24px", gridColumn: "1 / -1" }}>
                                   <label style={{ display: "block", marginBottom: "12px", fontWeight: "600", color: "#ffffff", fontSize: "14px" }}>
                                        Trading Symbols:
                                        {!botForm.exchange_account_id && (
                                             <span style={{ marginLeft: "8px", color: "#888", fontSize: "12px", fontWeight: "400" }}>
                                                  (Select an exchange account first)
                                             </span>
                                        )}
                                        {botForm.exchange_account_id && availableSymbols.length > 0 && (
                                             <span style={{ marginLeft: "8px", color: "#888", fontSize: "12px", fontWeight: "400" }}>
                                                  ({availableSymbols.length} symbols available)
                                             </span>
                                        )}
                                   </label>
                                   <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                                        {botForm.exchange_account_id ? (
                                             <>
                                                  <select
                                                       value={symbolInput}
                                                       onChange={(e) => setSymbolInput(e.target.value)}
                                                       disabled={availableSymbols.length === 0}
                                                       style={{
                                                            flex: 1,
                                                            padding: "12px",
                                                            borderRadius: "10px",
                                                            border: "1px solid rgba(255, 174, 0, 0.3)",
                                                            backgroundColor: "#1a1a1a",
                                                            color: "#ffffff",
                                                            fontSize: "14px",
                                                            outline: "none",
                                                            transition: "all 0.2s",
                                                            cursor: availableSymbols.length === 0 ? "not-allowed" : "pointer",
                                                            opacity: availableSymbols.length === 0 ? 0.6 : 1,
                                                       }}
                                                       onFocus={(e) => {
                                                            if (availableSymbols.length > 0) {
                                                                 e.currentTarget.style.borderColor = "#FFAE00";
                                                                 e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255, 174, 0, 0.1)";
                                                            }
                                                       }}
                                                       onBlur={(e) => {
                                                            e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.3)";
                                                            e.currentTarget.style.boxShadow = "none";
                                                       }}
                                                  >
                                                       <option value="" style={{ backgroundColor: "#1a1a1a", color: "#888" }}>
                                                            {availableSymbols.length === 0 ? "Loading symbols..." : "Select a symbol"}
                                                       </option>
                                                       {availableSymbols.map((sym) => (
                                                            <option key={sym} value={sym} style={{ backgroundColor: "#1a1a1a", color: "#ffffff" }}>
                                                                 {sym}
                                                            </option>
                                                       ))}
                                                  </select>
                                                  <button
                                                       onClick={handleAddSymbol}
                                                       disabled={!symbolInput || botForm.symbols.includes(symbolInput.toUpperCase())}
                                                       style={{
                                                            padding: "12px 24px",
                                                            backgroundColor: symbolInput && !botForm.symbols.includes(symbolInput.toUpperCase()) ? "#FFAE00" : "#666",
                                                            color: "#1a1a1a",
                                                            border: "none",
                                                            borderRadius: "10px",
                                                            cursor: symbolInput && !botForm.symbols.includes(symbolInput.toUpperCase()) ? "pointer" : "not-allowed",
                                                            fontWeight: "600",
                                                            fontSize: "14px",
                                                            transition: "all 0.2s",
                                                            opacity: symbolInput && !botForm.symbols.includes(symbolInput.toUpperCase()) ? 1 : 0.6,
                                                       }}
                                                       onMouseEnter={(e) => {
                                                            if (symbolInput && !botForm.symbols.includes(symbolInput.toUpperCase())) {
                                                                 e.currentTarget.style.backgroundColor = "#ffb833";
                                                                 e.currentTarget.style.transform = "translateY(-2px)";
                                                                 e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 174, 0, 0.3)";
                                                            }
                                                       }}
                                                       onMouseLeave={(e) => {
                                                            if (symbolInput && !botForm.symbols.includes(symbolInput.toUpperCase())) {
                                                                 e.currentTarget.style.backgroundColor = "#FFAE00";
                                                                 e.currentTarget.style.transform = "translateY(0)";
                                                                 e.currentTarget.style.boxShadow = "none";
                                                            }
                                                       }}
                                                  >
                                                       Add
                                                  </button>
                                             </>
                                        ) : (
                                             <div style={{
                                                  flex: 1,
                                                  padding: "12px",
                                                  borderRadius: "10px",
                                                  border: "1px solid rgba(255, 174, 0, 0.3)",
                                                  backgroundColor: "#1a1a1a",
                                                  color: "#888",
                                                  fontSize: "14px",
                                                  textAlign: "center",
                                             }}>
                                                  Please select an exchange account to view available symbols
                                             </div>
                                        )}
                                   </div>
                                   <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                        {botForm.symbols.map((symbol) => (
                                             <span
                                                  key={symbol}
                                                  style={{
                                                       padding: "6px 12px",
                                                       backgroundColor: "rgba(255, 174, 0, 0.2)",
                                                       borderRadius: "8px",
                                                       display: "flex",
                                                       alignItems: "center",
                                                       gap: "8px",
                                                       color: "#FFAE00",
                                                       fontSize: "13px",
                                                       fontWeight: "500",
                                                  }}
                                             >
                                                  {symbol}
                                                  <button
                                                       onClick={() => handleRemoveSymbol(symbol)}
                                                       style={{
                                                            background: "none",
                                                            border: "none",
                                                            color: "#FFAE00",
                                                            cursor: "pointer",
                                                            fontSize: "18px",
                                                            padding: 0,
                                                            width: "20px",
                                                            height: "20px",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            borderRadius: "4px",
                                                            transition: "all 0.2s",
                                                       }}
                                                       onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.2)";
                                                       }}
                                                       onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = "transparent";
                                                       }}
                                                  >
                                                       ×
                                                  </button>
                                             </span>
                                        ))}
                                   </div>
                              </div>

                              <div style={{ marginTop: "24px", gridColumn: "1 / -1", display: "flex", gap: "12px" }}>
                                   <button
                                        onClick={handleCreateBot}
                                        disabled={creating}
                                        style={{
                                             flex: 1,
                                             padding: "14px 32px",
                                             backgroundColor: creating ? "#666" : "#22c55e",
                                             color: "white",
                                             border: "none",
                                             borderRadius: "12px",
                                             cursor: creating ? "not-allowed" : "pointer",
                                             fontWeight: "600",
                                             fontSize: "16px",
                                             transition: "all 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                             if (!creating) {
                                                  e.currentTarget.style.transform = "translateY(-2px)";
                                                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(34, 197, 94, 0.4)";
                                             }
                                        }}
                                        onMouseLeave={(e) => {
                                             if (!creating) {
                                                  e.currentTarget.style.transform = "translateY(0)";
                                                  e.currentTarget.style.boxShadow = "none";
                                             }
                                        }}
                                   >
                                        {creating ? (editingBotId ? "Updating Bot..." : "Creating Bot...") : editingBotId ? "Update Bot" : "Create Bot"}
                                   </button>
                                   {editingBotId && (
                                        <button
                                             onClick={() => {
                                                  setEditingBotId(null);
                                                  setShowCreateForm(false);
                                                  setBotForm({
                                                       name: "",
                                                       exchange_account_id: "",
                                                       capital: "",
                                                       capital_currency: "",
                                                       risk_per_trade: "0.02",
                                                       symbols: [],
                                                       strategy_type: "prediction_based",
                                                       max_position_size: "",
                                                       stop_loss_percent: "",
                                                       take_profit_percent: "",
                                                       duration_hours: "",
                                                       paper_trading: true,
                                                  });
                                             }}
                                             style={{
                                                  padding: "14px 32px",
                                                  backgroundColor: "#6b7280",
                                                  color: "white",
                                                  border: "none",
                                                  borderRadius: "12px",
                                                  cursor: "pointer",
                                                  fontWeight: "600",
                                                  fontSize: "16px",
                                                  transition: "all 0.2s",
                                             }}
                                             onMouseEnter={(e) => {
                                                  e.currentTarget.style.backgroundColor = "#4b5563";
                                                  e.currentTarget.style.transform = "translateY(-2px)";
                                             }}
                                             onMouseLeave={(e) => {
                                                  e.currentTarget.style.backgroundColor = "#6b7280";
                                                  e.currentTarget.style.transform = "translateY(0)";
                                             }}
                                        >
                                             Cancel
                                        </button>
                                   )}
                              </div>
                         </div>
                    </div>
               )}

               {/* Bots List */}
               <div style={{ marginBottom: "32px" }}>
                    <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#ffffff", marginBottom: "20px" }}>My Bots</h2>
                    {botsLoading ? (
                         <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>Loading bots...</div>
                    ) : bots.length > 0 ? (
                         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" }}>
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
                                   const pnlColor = pnl >= 0 ? "#22c55e" : "#ef4444";

                                   return (
                                        <div
                                             key={bot.id}
                                             onClick={() => setSelectedBot(bot)}
                                             style={{
                                                  padding: "20px",
                                                  backgroundColor: "#2a2a2a",
                                                  border: "1px solid rgba(255, 174, 0, 0.2)",
                                                  borderRadius: "16px",
                                                  cursor: "pointer",
                                                  transition: "all 0.3s",
                                                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                                             }}
                                             onMouseEnter={(e) => {
                                                  e.currentTarget.style.borderColor = "#FFAE00";
                                                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(255, 174, 0, 0.2)";
                                                  e.currentTarget.style.transform = "translateY(-4px)";
                                             }}
                                             onMouseLeave={(e) => {
                                                  e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.2)";
                                                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
                                                  e.currentTarget.style.transform = "translateY(0)";
                                             }}
                                        >
                                             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#ffffff" }}>{bot.name}</h3>
                                                  <span
                                                       style={{
                                                            padding: "6px 12px",
                                                            borderRadius: "8px",
                                                            backgroundColor: statusColor,
                                                            color: "white",
                                                            fontSize: "11px",
                                                            fontWeight: "700",
                                                            letterSpacing: "0.5px",
                                                       }}
                                                  >
                                                       {bot.status.toUpperCase()}
                                                  </span>
                                             </div>
                                             <div style={{ fontSize: "13px", color: "#888", marginBottom: "12px", fontWeight: "500" }}>
                                                  Strategy: {bot.strategy_type.replace("_", " ").toUpperCase()}
                                             </div>
                                             
                                             {/* Exchange and Trading Mode */}
                                             <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
                                                  {/* Exchange Name */}
                                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                       <span style={{ fontSize: "12px", color: "#888" }}>Exchange:</span>
                                                       <span style={{ 
                                                            fontSize: "12px", 
                                                            color: "#FFAE00", 
                                                            fontWeight: "600",
                                                            textTransform: "uppercase"
                                                       }}>
                                                            {(() => {
                                                                 if (!bot.exchange_account_id) {
                                                                      return "Not Set";
                                                                 }
                                                                 const account = accounts.find(acc => acc.id === bot.exchange_account_id);
                                                                 return account?.exchange_name || `Account #${bot.exchange_account_id}`;
                                                            })()}
                                                       </span>
                                                  </div>
                                                  
                                                  {/* Paper Trading Badge */}
                                                  <div style={{ display: "flex", alignItems: "center" }}>
                                                       <span
                                                            style={{
                                                                 padding: "4px 10px",
                                                                 borderRadius: "6px",
                                                                 backgroundColor: bot.paper_trading ? "rgba(255, 174, 0, 0.2)" : "rgba(34, 197, 94, 0.2)",
                                                                 color: bot.paper_trading ? "#FFAE00" : "#22c55e",
                                                                 fontSize: "11px",
                                                                 fontWeight: "700",
                                                                 letterSpacing: "0.5px",
                                                                 border: `1px solid ${bot.paper_trading ? "rgba(255, 174, 0, 0.4)" : "rgba(34, 197, 94, 0.4)"}`,
                                                            }}
                                                       >
                                                            {bot.paper_trading ? "DEMO" : "REAL"}
                                                       </span>
                                                  </div>
                                             </div>
                                             
                                             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                                                  <div>
                                                       <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Capital</div>
                                                       <div style={{ fontWeight: "600", color: "#ffffff", fontSize: "16px" }}>
                                                            ${parseFloat(bot.current_capital).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                       </div>
                                                  </div>
                                                  <div>
                                                       <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Total P&L</div>
                                                       <div style={{ fontWeight: "600", color: pnlColor, fontSize: "16px" }}>
                                                            ${pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                       </div>
                                                  </div>
                                                  <div>
                                                       <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Trades</div>
                                                       <div style={{ fontWeight: "600", color: "#ffffff", fontSize: "16px" }}>{bot.total_trades}</div>
                                                  </div>
                                                  <div>
                                                       <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Win Rate</div>
                                                       <div style={{ fontWeight: "600", color: winRate >= 50 ? "#22c55e" : "#ef4444", fontSize: "16px" }}>{winRate.toFixed(1)}%</div>
                                                  </div>
                                             </div>
                                             <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
                                                  {bot.status === "inactive" || bot.status === "stopped" ? (
                                                       <button
                                                            onClick={(e) => {
                                                                 e.stopPropagation();
                                                                 handleStartBot(bot.id);
                                                            }}
                                                            style={{
                                                                 flex: 1,
                                                                 minWidth: "90px",
                                                                 padding: "10px 16px",
                                                                 backgroundColor: "#22c55e",
                                                                 color: "white",
                                                                 border: "none",
                                                                 borderRadius: "10px",
                                                                 cursor: "pointer",
                                                                 fontSize: "13px",
                                                                 fontWeight: "600",
                                                                 transition: "all 0.2s",
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                 e.currentTarget.style.backgroundColor = "#16a34a";
                                                                 e.currentTarget.style.transform = "translateY(-2px)";
                                                                 e.currentTarget.style.boxShadow = "0 4px 12px rgba(34, 197, 94, 0.3)";
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                 e.currentTarget.style.backgroundColor = "#22c55e";
                                                                 e.currentTarget.style.transform = "translateY(0)";
                                                                 e.currentTarget.style.boxShadow = "none";
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
                                                                 minWidth: "90px",
                                                                 padding: "10px 16px",
                                                                 backgroundColor: "#ef4444",
                                                                 color: "white",
                                                                 border: "none",
                                                                 borderRadius: "10px",
                                                                 cursor: "pointer",
                                                                 fontSize: "13px",
                                                                 fontWeight: "600",
                                                                 transition: "all 0.2s",
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                 e.currentTarget.style.backgroundColor = "#dc2626";
                                                                 e.currentTarget.style.transform = "translateY(-2px)";
                                                                 e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.3)";
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                 e.currentTarget.style.backgroundColor = "#ef4444";
                                                                 e.currentTarget.style.transform = "translateY(0)";
                                                                 e.currentTarget.style.boxShadow = "none";
                                                            }}
                                                       >
                                                            Stop
                                                       </button>
                                                  )}
                                                  <button
                                                       onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditBot(bot);
                                                       }}
                                                       style={{
                                                            padding: "10px 16px",
                                                            backgroundColor: "#3b82f6",
                                                            color: "white",
                                                            border: "none",
                                                            borderRadius: "10px",
                                                            cursor: "pointer",
                                                            fontSize: "13px",
                                                            fontWeight: "600",
                                                            transition: "all 0.2s",
                                                       }}
                                                       onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = "#2563eb";
                                                            e.currentTarget.style.transform = "translateY(-2px)";
                                                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.3)";
                                                       }}
                                                       onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = "#3b82f6";
                                                            e.currentTarget.style.transform = "translateY(0)";
                                                            e.currentTarget.style.boxShadow = "none";
                                                       }}
                                                  >
                                                       Edit
                                                  </button>
                                                  <button
                                                       onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteBot(bot.id);
                                                       }}
                                                       style={{
                                                            padding: "10px 16px",
                                                            backgroundColor: "#dc2626",
                                                            color: "white",
                                                            border: "none",
                                                            borderRadius: "10px",
                                                            cursor: "pointer",
                                                            fontSize: "13px",
                                                            fontWeight: "600",
                                                            transition: "all 0.2s",
                                                       }}
                                                       onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = "#b91c1c";
                                                            e.currentTarget.style.transform = "translateY(-2px)";
                                                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(220, 38, 38, 0.3)";
                                                       }}
                                                       onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = "#dc2626";
                                                            e.currentTarget.style.transform = "translateY(0)";
                                                            e.currentTarget.style.boxShadow = "none";
                                                       }}
                                                  >
                                                       Delete
                                                  </button>
                                             </div>
                                        </div>
                                   );
                              })}
                         </div>
                    ) : (
                         <div style={{ padding: "40px", textAlign: "center", color: "#888", backgroundColor: "#2a2a2a", borderRadius: "16px", border: "1px solid rgba(255, 174, 0, 0.2)" }}>
                              <p style={{ fontSize: "16px", margin: 0 }}>No bots created yet. Create your first bot above.</p>
                         </div>
                    )}
               </div>

               {/* Bot Details */}
               {selectedBot && (
                    <div style={{ marginBottom: "32px" }}>
                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                              <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#ffffff", margin: 0 }}>Bot Details: {selectedBot.name}</h2>
                              <button
                                   onClick={() => setSelectedBot(null)}
                                   style={{
                                        padding: "10px 20px",
                                        backgroundColor: "#6b7280",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "10px",
                                        cursor: "pointer",
                                        fontWeight: "600",
                                        fontSize: "14px",
                                        transition: "all 0.2s",
                                   }}
                                   onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#4b5563";
                                        e.currentTarget.style.transform = "translateY(-2px)";
                                   }}
                                   onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "#6b7280";
                                        e.currentTarget.style.transform = "translateY(0)";
                                   }}
                              >
                                   Close
                              </button>
                         </div>

                         {/* Performance Metrics */}
                         {statusLoading ? (
                              <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>Loading status...</div>
                         ) : botStatus ? (
                              <div
                                   style={{
                                        padding: "24px",
                                        backgroundColor: "#2a2a2a",
                                        border: "1px solid rgba(255, 174, 0, 0.2)",
                                        borderRadius: "16px",
                                        marginBottom: "24px",
                                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                                   }}
                              >
                                   <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#FFAE00", marginBottom: "20px", marginTop: 0 }}>Performance Metrics</h3>
                                   <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "20px" }}>
                                        <div>
                                             <div style={{ fontSize: "12px", color: "#888", marginBottom: "8px", fontWeight: "500" }}>Capital</div>
                                             <div style={{ fontSize: "28px", fontWeight: "700", color: "#ffffff" }}>
                                                  ${botStatus.current_capital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                             </div>
                                        </div>
                                        <div>
                                             <div style={{ fontSize: "12px", color: "#888", marginBottom: "8px", fontWeight: "500" }}>Total Trades</div>
                                             <div style={{ fontSize: "28px", fontWeight: "700", color: "#ffffff" }}>{botStatus.total_trades}</div>
                                        </div>
                                        <div>
                                             <div style={{ fontSize: "12px", color: "#888", marginBottom: "8px", fontWeight: "500" }}>Win Rate</div>
                                             <div style={{ fontSize: "28px", fontWeight: "700", color: botStatus.win_rate >= 50 ? "#22c55e" : "#ef4444" }}>{botStatus.win_rate.toFixed(1)}%</div>
                                        </div>
                                        <div>
                                             <div style={{ fontSize: "12px", color: "#888", marginBottom: "8px", fontWeight: "500" }}>Total P&L</div>
                                             <div style={{ fontSize: "28px", fontWeight: "700", color: botStatus.total_pnl >= 0 ? "#22c55e" : "#ef4444" }}>
                                                  ${botStatus.total_pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                             </div>
                                        </div>
                                        <div>
                                             <div style={{ fontSize: "12px", color: "#888", marginBottom: "8px", fontWeight: "500" }}>Open Positions</div>
                                             <div style={{ fontSize: "28px", fontWeight: "700", color: "#ffffff" }}>{botStatus.open_positions}</div>
                                        </div>
                                   </div>
                              </div>
                         ) : null}

                         {/* Bot Configuration */}
                         <div
                              style={{
                                   padding: "24px",
                                   backgroundColor: "#2a2a2a",
                                   border: "1px solid rgba(255, 174, 0, 0.2)",
                                   borderRadius: "16px",
                                   marginBottom: "24px",
                                   boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                              }}
                         >
                              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#FFAE00", marginBottom: "20px", marginTop: 0 }}>Configuration</h3>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                                   <div>
                                        <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px", fontWeight: "500" }}>Strategy</div>
                                        <div style={{ fontWeight: "600", color: "#ffffff", fontSize: "15px" }}>{selectedBot.strategy_type.replace("_", " ").toUpperCase()}</div>
                                   </div>
                                   <div>
                                        <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px", fontWeight: "500" }}>Risk Per Trade</div>
                                        <div style={{ fontWeight: "600", color: "#ffffff", fontSize: "15px" }}>{(parseFloat(selectedBot.risk_per_trade) * 100).toFixed(2)}%</div>
                                   </div>
                                   <div>
                                        <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px", fontWeight: "500" }}>Symbols</div>
                                        <div style={{ fontWeight: "600", color: "#FFAE00", fontSize: "15px" }}>{selectedBot.symbols.join(", ")}</div>
                                   </div>
                                   {selectedBot.stop_loss_percent && (
                                        <div>
                                             <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px", fontWeight: "500" }}>Stop Loss</div>
                                             <div style={{ fontWeight: "600", color: "#ef4444", fontSize: "15px" }}>{(parseFloat(selectedBot.stop_loss_percent) * 100).toFixed(2)}%</div>
                                        </div>
                                   )}
                                   {selectedBot.take_profit_percent && (
                                        <div>
                                             <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px", fontWeight: "500" }}>Take Profit</div>
                                             <div style={{ fontWeight: "600", color: "#22c55e", fontSize: "15px" }}>{(parseFloat(selectedBot.take_profit_percent) * 100).toFixed(2)}%</div>
                                        </div>
                                   )}
                                   {selectedBot.duration_hours && (
                                        <div>
                                             <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px", fontWeight: "500" }}>Duration</div>
                                             <div style={{ fontWeight: "600", color: "#ffffff", fontSize: "15px" }}>{selectedBot.duration_hours} hours</div>
                                        </div>
                                   )}
                              </div>
                              {selectedBot.last_error && (
                                   <div
                                        style={{
                                             marginTop: "20px",
                                             padding: "12px",
                                             backgroundColor: "rgba(239, 68, 68, 0.1)",
                                             borderRadius: "10px",
                                             border: "1px solid rgba(239, 68, 68, 0.3)",
                                             color: "#ef4444",
                                             fontSize: "13px",
                                        }}
                                   >
                                        <strong>Last Error:</strong> {selectedBot.last_error}
                                   </div>
                              )}
                         </div>

                         {/* Bot Trades */}
                         <div>
                              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#FFAE00", marginBottom: "20px" }}>Trade History</h3>
                              {tradesLoading ? (
                                   <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>Loading trades...</div>
                              ) : botTrades.length > 0 ? (
                                   <div style={{ overflowX: "auto", borderRadius: "16px", border: "1px solid rgba(255, 174, 0, 0.2)", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)" }}>
                                        <table
                                             style={{
                                                  width: "100%",
                                                  borderCollapse: "collapse",
                                                  backgroundColor: "#2a2a2a",
                                             }}
                                        >
                                             <thead>
                                                  <tr style={{ backgroundColor: "rgba(255, 174, 0, 0.1)", borderBottom: "2px solid rgba(255, 174, 0, 0.3)" }}>
                                                       <th style={{ padding: "14px 16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "13px" }}>Symbol</th>
                                                       <th style={{ padding: "14px 16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "13px" }}>Side</th>
                                                       <th style={{ padding: "14px 16px", textAlign: "right", color: "#FFAE00", fontWeight: "600", fontSize: "13px" }}>Quantity</th>
                                                       <th style={{ padding: "14px 16px", textAlign: "right", color: "#FFAE00", fontWeight: "600", fontSize: "13px" }}>Entry Price</th>
                                                       <th style={{ padding: "14px 16px", textAlign: "right", color: "#FFAE00", fontWeight: "600", fontSize: "13px" }}>Exit Price</th>
                                                       <th style={{ padding: "14px 16px", textAlign: "right", color: "#FFAE00", fontWeight: "600", fontSize: "13px" }}>P&L</th>
                                                       <th style={{ padding: "14px 16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "13px" }}>Status</th>
                                                       <th style={{ padding: "14px 16px", textAlign: "left", color: "#FFAE00", fontWeight: "600", fontSize: "13px" }}>Entry Time</th>
                                                  </tr>
                                             </thead>
                                             <tbody>
                                                  {botTrades.map((trade, index) => {
                                                       const pnl = parseFloat(trade.pnl);
                                                       const pnlColor = pnl >= 0 ? "#22c55e" : "#ef4444";
                                                       return (
                                                            <tr
                                                                 key={trade.id}
                                                                 style={{
                                                                      borderBottom: index < botTrades.length - 1 ? "1px solid rgba(255, 174, 0, 0.1)" : "none",
                                                                      transition: "background-color 0.2s",
                                                                 }}
                                                                 onMouseEnter={(e) => {
                                                                      e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.05)";
                                                                 }}
                                                                 onMouseLeave={(e) => {
                                                                      e.currentTarget.style.backgroundColor = "transparent";
                                                                 }}
                                                            >
                                                                 <td style={{ padding: "12px 16px", fontWeight: "600", color: "#ffffff", fontSize: "14px" }}>{trade.symbol}</td>
                                                                 <td style={{ padding: "12px 16px" }}>
                                                                      <span
                                                                           style={{
                                                                                padding: "6px 10px",
                                                                                borderRadius: "8px",
                                                                                backgroundColor: trade.side === "buy" ? "#22c55e" : "#ef4444",
                                                                                color: "white",
                                                                                fontSize: "11px",
                                                                                fontWeight: "700",
                                                                                letterSpacing: "0.5px",
                                                                           }}
                                                                      >
                                                                           {trade.side.toUpperCase()}
                                                                      </span>
                                                                 </td>
                                                                 <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "monospace", color: "#ffffff", fontSize: "13px" }}>
                                                                      {parseFloat(trade.quantity).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                                                 </td>
                                                                 <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "monospace", color: "#ffffff", fontSize: "13px" }}>
                                                                      ${parseFloat(trade.entry_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                                                                 </td>
                                                                 <td
                                                                      style={{
                                                                           padding: "12px 16px",
                                                                           textAlign: "right",
                                                                           fontFamily: "monospace",
                                                                           color: trade.exit_price ? "#ffffff" : "#888",
                                                                           fontSize: "13px",
                                                                      }}
                                                                 >
                                                                      {trade.exit_price
                                                                           ? `$${parseFloat(trade.exit_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`
                                                                           : "N/A"}
                                                                 </td>
                                                                 <td
                                                                      style={{
                                                                           padding: "12px 16px",
                                                                           textAlign: "right",
                                                                           fontFamily: "monospace",
                                                                           color: pnlColor,
                                                                           fontWeight: "700",
                                                                           fontSize: "14px",
                                                                      }}
                                                                 >
                                                                      ${pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                 </td>
                                                                 <td style={{ padding: "12px 16px" }}>
                                                                      <span
                                                                           style={{
                                                                                padding: "6px 10px",
                                                                                borderRadius: "8px",
                                                                                backgroundColor: trade.status === "closed" ? "#22c55e" : "#fbbf24",
                                                                                color: "white",
                                                                                fontSize: "11px",
                                                                                fontWeight: "700",
                                                                                letterSpacing: "0.5px",
                                                                           }}
                                                                      >
                                                                           {trade.status.toUpperCase()}
                                                                      </span>
                                                                 </td>
                                                                 <td style={{ padding: "12px 16px", fontSize: "12px", color: "#888" }}>{new Date(trade.entry_time).toLocaleString()}</td>
                                                            </tr>
                                                       );
                                                  })}
                                             </tbody>
                                        </table>
                                   </div>
                              ) : (
                                   <div style={{ padding: "40px", textAlign: "center", color: "#888", backgroundColor: "#2a2a2a", borderRadius: "16px", border: "1px solid rgba(255, 174, 0, 0.2)" }}>
                                        <p style={{ fontSize: "16px", margin: 0 }}>No trades yet</p>
                                   </div>
                              )}
                         </div>
                    </div>
               )}
          </div>
     );
}

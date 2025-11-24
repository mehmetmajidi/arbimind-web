"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useExchange } from "@/contexts/ExchangeContext";
import Alert from "@/components/Alert";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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
     strategy_params?: Record<string, unknown> | null;
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
     const [success, setSuccess] = useState<string | null>(null);
     const [warning, setWarning] = useState<string | null>(null);
     const [info, setInfo] = useState<string | null>(null);
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
          strategy_params: {} as Record<string, unknown>,
     });
     const [strategyParamsInput, setStrategyParamsInput] = useState("");
     const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
     const [symbolInput, setSymbolInput] = useState("");
     const [availableBalances, setAvailableBalances] = useState<Record<string, { free: number; used: number; total: number }>>({});
     const [balancesLoading, setBalancesLoading] = useState(false);

     // Auto-refresh
     const [autoRefresh, setAutoRefresh] = useState(true);
     const [refreshInterval, setRefreshInterval] = useState(10); // seconds
     const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
     const [isRefreshing, setIsRefreshing] = useState(false);
     const [useWebSocket, setUseWebSocket] = useState(true);

     // WebSocket connections for bot status updates
     const [botWsConnections, setBotWsConnections] = useState<Record<number, WebSocket>>({});
     const [botWsStatus, setBotWsStatus] = useState<Record<number, "disconnected" | "connecting" | "connected" | "error">>({});

     // Filter and search
     const [searchQuery, setSearchQuery] = useState("");
     const [statusFilter, setStatusFilter] = useState<string>("all");
     const [strategyFilter, setStrategyFilter] = useState<string>("all");
     const [paperTradingFilter, setPaperTradingFilter] = useState<string>("all");

     // Bot Trades filters and pagination
     const [tradeStatusFilter, setTradeStatusFilter] = useState<string>("all");
     const [tradeSymbolFilter, setTradeSymbolFilter] = useState<string>("");
     const [tradesPage, setTradesPage] = useState(1);
     const [tradesPerPage, setTradesPerPage] = useState(20);
     const [allBotTrades, setAllBotTrades] = useState<BotTrade[]>([]);

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
                              setWarning("Balance service unavailable - exchange might be down or account inactive");
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
          setIsRefreshing(true);
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
                    setLastRefreshTime(new Date());
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to load bots");
               }
          } catch (error) {
               console.error("Error fetching bots:", error);
               setError("Failed to load bots");
          } finally {
               setBotsLoading(false);
               setIsRefreshing(false);
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
     const fetchBotTrades = useCallback(async (botId: number, status?: string) => {
          setTradesLoading(true);
          try {
               const token = localStorage.getItem("auth_token") || "";
               if (!token) return;

               const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

               // Fetch more trades for pagination (fetch 1000 to have enough data)
               const statusParam = status && status !== "all" ? `&status=${status}` : "";
               const response = await fetch(`${apiUrl}/bots/${botId}/trades?limit=1000${statusParam}`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setAllBotTrades(Array.isArray(data) ? data : []);
               }
          } catch (error) {
               console.error("Error fetching bot trades:", error);
               setError("Failed to fetch bot trades");
          } finally {
               setTradesLoading(false);
          }
     }, []);

     // Initial fetch
     useEffect(() => {
          fetchBots();
     }, [fetchBots]);

     // WebSocket connections for active bots
     useEffect(() => {
          if (!useWebSocket || !autoRefresh) {
               // Close all WebSocket connections
               Object.values(botWsConnections).forEach((ws) => {
                    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                         ws.close();
                    }
               });
               setBotWsConnections({});
               setBotWsStatus({});
               return;
          }

          const token = localStorage.getItem("auth_token");
          if (!token) return;

          const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const wsUrl = apiUrl.replace("http://", "ws://").replace("https://", "wss://");

          // Get running bot IDs
          const runningBotIds = bots.filter((bot) => bot.status === "running").map((bot) => bot.id);
          
          // Close connections for bots that are no longer running
          Object.keys(botWsConnections).forEach((botIdStr) => {
               const botId = parseInt(botIdStr);
               if (!runningBotIds.includes(botId)) {
                    const ws = botWsConnections[botId];
                    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
                         ws.close();
                    }
                    setBotWsConnections((prev) => {
                         const newConn = { ...prev };
                         delete newConn[botId];
                         return newConn;
                    });
                    setBotWsStatus((prev) => {
                         const newStatus = { ...prev };
                         delete newStatus[botId];
                         return newStatus;
                    });
               }
          });

          // Connect WebSocket for each running bot that doesn't have a connection
          runningBotIds.forEach((botId) => {
               // Skip if already connected or connecting
               if (botWsConnections[botId] && (botWsConnections[botId].readyState === WebSocket.OPEN || botWsConnections[botId].readyState === WebSocket.CONNECTING)) {
                    return;
               }

               // Close existing connection if any (in error state)
               if (botWsConnections[botId]) {
                    const existingWs = botWsConnections[botId];
                    if (existingWs.readyState === WebSocket.CLOSING || existingWs.readyState === WebSocket.CLOSED) {
                         // Connection is already closed, remove it
                         setBotWsConnections((prev) => {
                              const newConn = { ...prev };
                              delete newConn[botId];
                              return newConn;
                         });
                    } else {
                         existingWs.close();
                    }
               }

               // Create new connection
               const wsEndpoint = `${wsUrl}/ws/bot/${botId}?token=${token}&interval=${refreshInterval}`;
               setBotWsStatus((prev) => ({ ...prev, [botId]: "connecting" }));

               try {
                    const ws = new WebSocket(wsEndpoint);

                    ws.onopen = () => {
                         console.log(`WebSocket connected for bot ${botId}`);
                         setBotWsStatus((prev) => ({ ...prev, [botId]: "connected" }));
                         setBotWsConnections((prev) => ({ ...prev, [botId]: ws }));
                    };

                    ws.onmessage = (event) => {
                         try {
                              const data = JSON.parse(event.data);
                              console.log(`WebSocket message received for bot ${botId}:`, data);

                              if (data.type === "bot_status_update" && data.data) {
                                   // Update bot status in the list
                                   setBots((prevBots) =>
                                        prevBots.map((b) =>
                                             b.id === botId
                                                  ? {
                                                       ...b,
                                                       status: data.data.status,
                                                       current_capital: data.data.current_capital.toString(),
                                                       total_trades: data.data.total_trades,
                                                       winning_trades: data.data.winning_trades,
                                                       losing_trades: data.data.losing_trades,
                                                       total_pnl: data.data.total_pnl.toString(),
                                                       last_error: data.data.last_error,
                                                    }
                                                  : b
                                        )
                                   );

                                   // Update selected bot status if it's the same bot
                                   if (selectedBot && selectedBot.id === botId) {
                                        setBotStatus({
                                             id: data.data.id,
                                             name: data.data.name,
                                             status: data.data.status,
                                             strategy_type: data.data.strategy_type,
                                             capital: data.data.capital,
                                             current_capital: data.data.current_capital,
                                             total_trades: data.data.total_trades,
                                             winning_trades: data.data.winning_trades,
                                             losing_trades: data.data.losing_trades,
                                             win_rate: data.data.win_rate,
                                             total_pnl: data.data.total_pnl,
                                             open_positions: data.data.open_positions,
                                             started_at: data.data.started_at,
                                             stopped_at: data.data.stopped_at,
                                             last_error: data.data.last_error,
                                        });
                                   }
                              } else if (data.type === "error") {
                                   console.error(`WebSocket error for bot ${botId}:`, data.message);
                                   setBotWsStatus((prev) => ({ ...prev, [botId]: "error" }));
                              } else if (data.type === "connected") {
                                   console.log(`WebSocket connected for bot ${botId}:`, data.message);
                                   setBotWsStatus((prev) => ({ ...prev, [botId]: "connected" }));
                              }
                         } catch (error) {
                              console.error(`Error parsing WebSocket message for bot ${botId}:`, error);
                         }
                    };

                    ws.onerror = (error) => {
                         console.error(`WebSocket error for bot ${botId}:`, error);
                         setBotWsStatus((prev) => ({ ...prev, [botId]: "error" }));
                    };

                    ws.onclose = (event) => {
                         console.log(`WebSocket disconnected for bot ${botId}:`, event.code, event.reason);
                         setBotWsStatus((prev) => ({ ...prev, [botId]: "disconnected" }));
                         setBotWsConnections((prev) => {
                              const newConn = { ...prev };
                              delete newConn[botId];
                              return newConn;
                         });

                         // Auto-reconnect if not manual close and bot is still running
                         if (event.code !== 1008 && useWebSocket && autoRefresh && runningBotIds.includes(botId)) {
                              setTimeout(() => {
                                   if (useWebSocket && autoRefresh && bots.some((b) => b.id === botId && b.status === "running")) {
                                        setBotWsStatus((prev) => ({ ...prev, [botId]: "connecting" }));
                                   }
                              }, 3000);
                         }
                    };

                    setBotWsConnections((prev) => ({ ...prev, [botId]: ws }));
               } catch (error) {
                    console.error(`Error creating WebSocket for bot ${botId}:`, error);
                    setBotWsStatus((prev) => ({ ...prev, [botId]: "error" }));
               }
          });

          return () => {
               // Close all connections on cleanup
               Object.values(botWsConnections).forEach((ws) => {
                    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
                         ws.close();
                    }
               });
          };
     }, [bots.map((b) => `${b.id}:${b.status}`).join(","), useWebSocket, autoRefresh, refreshInterval, selectedBot?.id]);

     // Manual refresh handler
     const handleManualRefresh = async () => {
          setInfo("Refreshing bot data...");
          try {
               await fetchBots();
               if (selectedBot) {
                    await fetchBotStatus(selectedBot.id);
                    await fetchBotTrades(selectedBot.id);
               }
               setInfo("Data refreshed successfully!");
               setError(null);
          } catch (error) {
               setError("Failed to refresh data");
               setInfo(null);
          }
     };

     // Filter and paginate bot trades
     useEffect(() => {
          let filtered = [...allBotTrades];

          // Filter by status
          if (tradeStatusFilter !== "all") {
               filtered = filtered.filter((trade) => trade.status.toLowerCase() === tradeStatusFilter.toLowerCase());
          }

          // Filter by symbol
          if (tradeSymbolFilter) {
               filtered = filtered.filter((trade) => trade.symbol.toLowerCase().includes(tradeSymbolFilter.toLowerCase()));
          }

          // Pagination
          const startIndex = (tradesPage - 1) * tradesPerPage;
          const endIndex = startIndex + tradesPerPage;
          setBotTrades(filtered.slice(startIndex, endIndex));
     }, [allBotTrades, tradeStatusFilter, tradeSymbolFilter, tradesPage, tradesPerPage]);

     // Reset pagination when filters change
     useEffect(() => {
          setTradesPage(1);
     }, [tradeStatusFilter, tradeSymbolFilter]);

     // Auto-refresh (fallback when WebSocket is disabled)
     useEffect(() => {
          if (!autoRefresh || useWebSocket) return; // Skip if WebSocket is enabled

          const interval = setInterval(() => {
               fetchBots();
               if (selectedBot) {
                    fetchBotStatus(selectedBot.id);
                    fetchBotTrades(selectedBot.id, tradeStatusFilter);
               }
          }, refreshInterval * 1000);

          return () => clearInterval(interval);
     }, [autoRefresh, useWebSocket, refreshInterval, selectedBot, fetchBots, fetchBotStatus, fetchBotTrades]);

     // Update selected bot data
     useEffect(() => {
          if (selectedBot) {
               fetchBotStatus(selectedBot.id);
               fetchBotTrades(selectedBot.id, tradeStatusFilter);
               // Reset filters and pagination
               setTradeStatusFilter("all");
               setTradeSymbolFilter("");
               setTradesPage(1);
          }
     }, [selectedBot, fetchBotStatus, fetchBotTrades, tradeStatusFilter]);

     // Create bot
     const handleCreateBot = async () => {
          // If editing, call update instead
          if (editingBotId) {
               await handleUpdateBot();
               return;
          }

          if (!botForm.name || !botForm.exchange_account_id || !botForm.capital || !botForm.capital_currency || botForm.symbols.length === 0) {
               setWarning("Please fill in all required fields including capital currency");
               return;
          }

          // Validate capital doesn't exceed available balance
          // Note: Paper trading bots don't need real balance, but we still validate the amount
          if (botForm.capital_currency) {
               const requestedAmount = parseFloat(botForm.capital);
               
               if (isNaN(requestedAmount) || requestedAmount <= 0) {
                    setWarning("Please enter a valid capital amount greater than 0");
                    return;
               }
               
               // Check if currency exists in available balances
               if (!availableBalances[botForm.capital_currency]) {
                    setWarning(`Currency ${botForm.capital_currency} not found in available balances. Please select a valid currency.`);
                    return;
               }
               
               const availableAmount = availableBalances[botForm.capital_currency].free;
               
               // Only validate balance for real trading bots (not paper trading)
               if (!botForm.paper_trading) {
                    // Check if balance is 0 or insufficient
                    if (availableAmount <= 0) {
                         setWarning(`Insufficient balance. Available: ${availableAmount.toFixed(8)} ${botForm.capital_currency}. Please deposit funds or select a different currency.`);
                         return;
                    }
                    
                    if (requestedAmount > availableAmount) {
                         setWarning(`Insufficient balance. Available: ${availableAmount.toFixed(8)} ${botForm.capital_currency}, Requested: ${requestedAmount.toFixed(8)}`);
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
               
               // Parse strategy_params from JSON string
               if (strategyParamsInput.trim()) {
                    try {
                         requestBody.strategy_params = JSON.parse(strategyParamsInput);
                    } catch (e) {
                         setWarning("Invalid JSON format for Strategy Parameters. Please check your JSON syntax.");
                         setCreating(false);
                         return;
                    }
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
                    setSuccess("Bot created successfully!");
                    setError(null);
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
                         strategy_params: {},
                    });
                    setSymbolInput("");
                    setStrategyParamsInput("");
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
                    setSuccess("Bot started successfully!");
                    setError(null);
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
                    setSuccess("Bot stopped successfully!");
                    setError(null);
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
                    setSuccess("Bot deleted successfully!");
                    setError(null);
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
          setInfo(`Editing bot: ${bot.name}`);
          setError(null);
          setWarning(null);
          
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
               strategy_params: bot.strategy_params || {},
          });
          setStrategyParamsInput(bot.strategy_params ? JSON.stringify(bot.strategy_params, null, 2) : "");
          setEditingBotId(bot.id);
          setShowCreateForm(true);
     };

     // Update bot
     const handleUpdateBot = async () => {
          if (!editingBotId) return;

          if (!botForm.name || !botForm.capital || botForm.symbols.length === 0) {
               setWarning("Please fill in all required fields");
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
               
               // Parse strategy_params from JSON string
               if (strategyParamsInput.trim()) {
                    try {
                         requestBody.strategy_params = JSON.parse(strategyParamsInput);
                    } catch (e) {
                         setWarning("Invalid JSON format for Strategy Parameters. Please check your JSON syntax.");
                         setCreating(false);
                         return;
                    }
               }

               const response = await fetch(`${apiUrl}/bots/${editingBotId}`, {
                    method: "PUT",
                    headers: {
                         "Content-Type": "application/json",
                         Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(requestBody),
               });

               if (response.ok) {
                    setSuccess("Bot updated successfully!");
                    setError(null);
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
                         strategy_params: {},
                    });
                    setStrategyParamsInput("");
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
          <>
               <style>{`
                    @keyframes spin {
                         0% { transform: rotate(0deg); }
                         100% { transform: rotate(360deg); }
                    }
               `}</style>
               <div style={{ padding: "32px", maxWidth: "1600px", margin: "0 auto", backgroundColor: "#202020", minHeight: "100vh" }}>
                    {/* Header */}
               <div style={{ marginBottom: "32px" }}>
                    <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#ffffff", marginBottom: "8px", letterSpacing: "-0.5px" }}>Bot Management Dashboard</h1>
                    <p style={{ color: "#888", fontSize: "14px" }}>Manage and monitor your trading bots</p>
               </div>

               {error && (
                    <Alert
                         type="error"
                         message={error}
                         onClose={() => setError(null)}
                         dismissible={true}
                    />
               )}
               
               {warning && (
                    <Alert
                         type="warning"
                         message={warning}
                         onClose={() => setWarning(null)}
                         dismissible={true}
                         autoClose={true}
                         duration={7000}
                    />
               )}
               
               {info && (
                    <Alert
                         type="info"
                         message={info}
                         onClose={() => setInfo(null)}
                         dismissible={true}
                         autoClose={true}
                         duration={5000}
                    />
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
                              <>
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
                                             checked={useWebSocket}
                                             onChange={(e) => setUseWebSocket(e.target.checked)}
                                             style={{
                                                  width: "18px",
                                                  height: "18px",
                                                  cursor: "pointer",
                                                  accentColor: "#FFAE00",
                                             }}
                                        />
                                        Use WebSocket (Real-time)
                                   </label>
                                   {!useWebSocket && (
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
                                   {useWebSocket && (
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#888" }}>
                                             <div
                                                  style={{
                                                       width: "8px",
                                                       height: "8px",
                                                       borderRadius: "50%",
                                                       backgroundColor:
                                                            Object.values(botWsStatus).some((s) => s === "connected")
                                                                 ? "#00ff00"
                                                                 : Object.values(botWsStatus).some((s) => s === "connecting")
                                                                 ? "#FFAE00"
                                                                 : Object.values(botWsStatus).some((s) => s === "error")
                                                                 ? "#ff4444"
                                                                 : "#888",
                                                  }}
                                             />
                                             <span>
                                                  {Object.values(botWsStatus).filter((s) => s === "connected").length} / {Object.keys(botWsStatus).length} bots connected
                                             </span>
                                        </div>
                                   )}
                              </>
                         )}
                         
                         {/* Manual Refresh Button */}
                         <button
                              onClick={handleManualRefresh}
                              disabled={isRefreshing}
                              style={{
                                   padding: "10px 20px",
                                   backgroundColor: isRefreshing ? "#666" : "#3b82f6",
                                   color: "white",
                                   border: "none",
                                   borderRadius: "10px",
                                   cursor: isRefreshing ? "not-allowed" : "pointer",
                                   fontSize: "14px",
                                   fontWeight: "600",
                                   display: "flex",
                                   alignItems: "center",
                                   gap: "8px",
                                   transition: "all 0.2s",
                                   opacity: isRefreshing ? 0.6 : 1,
                              }}
                              onMouseEnter={(e) => {
                                   if (!isRefreshing) {
                                        e.currentTarget.style.backgroundColor = "#2563eb";
                                        e.currentTarget.style.transform = "translateY(-2px)";
                                   }
                              }}
                              onMouseLeave={(e) => {
                                   if (!isRefreshing) {
                                        e.currentTarget.style.backgroundColor = "#3b82f6";
                                        e.currentTarget.style.transform = "translateY(0)";
                                   }
                              }}
                         >
                              <span style={{ 
                                   display: "inline-block",
                                   width: "16px",
                                   height: "16px",
                                   border: "2px solid white",
                                   borderTopColor: "transparent",
                                   borderRadius: "50%",
                                   animation: isRefreshing ? "spin 1s linear infinite" : "none",
                              }} />
                              {isRefreshing ? "Refreshing..." : "Refresh"}
                         </button>
                         
                         {/* Last Refresh Time */}
                         {lastRefreshTime && (
                              <span style={{ 
                                   fontSize: "12px", 
                                   color: "#888",
                                   marginLeft: "8px",
                              }}>
                                   Last: {lastRefreshTime.toLocaleTimeString()}
                              </span>
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
                                   <Alert
                                        type="error"
                                        message={error}
                                        onClose={() => setError(null)}
                                        dismissible={true}
                                   />
                              )}
                              
                              {success && (
                                   <Alert
                                        type="success"
                                        message={success}
                                        onClose={() => setSuccess(null)}
                                        dismissible={true}
                                        autoClose={true}
                                        duration={5000}
                                   />
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

                              {/* Strategy Parameters */}
                              <div style={{ marginTop: "24px", gridColumn: "1 / -1" }}>
                                   <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#ffffff", fontSize: "14px" }}>
                                        Strategy Parameters (JSON, optional):
                                        <span style={{ marginLeft: "8px", color: "#888", fontSize: "12px", fontWeight: "400" }}>
                                             (e.g., {"{"}"lookback_period": 20, "threshold": 0.05{"}"})
                                        </span>
                                   </label>
                                   <textarea
                                        value={strategyParamsInput}
                                        onChange={(e) => setStrategyParamsInput(e.target.value)}
                                        placeholder='{"lookback_period": 20, "threshold": 0.05}'
                                        style={{
                                             width: "100%",
                                             minHeight: "120px",
                                             padding: "12px",
                                             borderRadius: "10px",
                                             border: "1px solid rgba(255, 174, 0, 0.3)",
                                             backgroundColor: "#1a1a1a",
                                             color: "#ffffff",
                                             fontSize: "13px",
                                             fontFamily: "monospace",
                                             outline: "none",
                                             transition: "all 0.2s",
                                             resize: "vertical",
                                        }}
                                        onFocus={(e) => {
                                             e.currentTarget.style.borderColor = "#FFAE00";
                                             e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255, 174, 0, 0.1)";
                                        }}
                                        onBlur={(e) => {
                                             e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.3)";
                                             e.currentTarget.style.boxShadow = "none";
                                             // Validate JSON on blur
                                             if (e.target.value.trim()) {
                                                  try {
                                                       JSON.parse(e.target.value);
                                                       setWarning(null); // Clear warning if valid
                                                  } catch (err) {
                                                       setWarning("Invalid JSON format in Strategy Parameters. Please check your JSON syntax.");
                                                  }
                                             } else {
                                                  setWarning(null); // Clear warning if empty
                                             }
                                        }}
                                   />
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
                                                  strategy_params: {},
                                             });
                                             setStrategyParamsInput("");
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

               {/* Dashboard - Overall Stats */}
               <div style={{ marginBottom: "32px" }}>
                    <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#ffffff", marginBottom: "20px" }}>Bots Dashboard</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "24px" }}>
                         {(() => {
                              const totalBots = bots.length;
                              const activeBots = bots.filter((b) => b.status.toLowerCase() === "active").length;
                              const totalTrades = bots.reduce((sum, b) => sum + b.total_trades, 0);
                              const totalWinningTrades = bots.reduce((sum, b) => sum + b.winning_trades, 0);
                              const totalLosingTrades = bots.reduce((sum, b) => sum + b.losing_trades, 0);
                              const overallWinRate = totalTrades > 0 ? (totalWinningTrades / totalTrades) * 100 : 0;
                              const totalPnl = bots.reduce((sum, b) => sum + parseFloat(b.total_pnl || "0"), 0);
                              const totalCapital = bots.reduce((sum, b) => sum + parseFloat(b.current_capital || b.capital || "0"), 0);
                              
                              return (
                                   <>
                                        <div style={{
                                             padding: "20px",
                                             backgroundColor: "#2a2a2a",
                                             border: "1px solid rgba(255, 174, 0, 0.2)",
                                             borderRadius: "16px",
                                             boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                                        }}>
                                             <div style={{ fontSize: "12px", color: "#888", marginBottom: "8px", fontWeight: "500" }}>Total Bots</div>
                                             <div style={{ fontSize: "32px", fontWeight: "700", color: "#ffffff" }}>{totalBots}</div>
                                             <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
                                                  {activeBots} active
                                             </div>
                                        </div>
                                        
                                        <div style={{
                                             padding: "20px",
                                             backgroundColor: "#2a2a2a",
                                             border: "1px solid rgba(255, 174, 0, 0.2)",
                                             borderRadius: "16px",
                                             boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                                        }}>
                                             <div style={{ fontSize: "12px", color: "#888", marginBottom: "8px", fontWeight: "500" }}>Total Trades</div>
                                             <div style={{ fontSize: "32px", fontWeight: "700", color: "#ffffff" }}>{totalTrades.toLocaleString()}</div>
                                             <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
                                                  {totalWinningTrades} wins / {totalLosingTrades} losses
                                             </div>
                                        </div>
                                        
                                        <div style={{
                                             padding: "20px",
                                             backgroundColor: "#2a2a2a",
                                             border: "1px solid rgba(255, 174, 0, 0.2)",
                                             borderRadius: "16px",
                                             boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                                        }}>
                                             <div style={{ fontSize: "12px", color: "#888", marginBottom: "8px", fontWeight: "500" }}>Overall Win Rate</div>
                                             <div style={{ fontSize: "32px", fontWeight: "700", color: overallWinRate >= 50 ? "#22c55e" : "#ef4444" }}>
                                                  {overallWinRate.toFixed(1)}%
                                             </div>
                                             <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
                                                  {totalWinningTrades} / {totalTrades} trades
                                             </div>
                                        </div>
                                        
                                        <div style={{
                                             padding: "20px",
                                             backgroundColor: "#2a2a2a",
                                             border: "1px solid rgba(255, 174, 0, 0.2)",
                                             borderRadius: "16px",
                                             boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                                        }}>
                                             <div style={{ fontSize: "12px", color: "#888", marginBottom: "8px", fontWeight: "500" }}>Total P&L</div>
                                             <div style={{ fontSize: "32px", fontWeight: "700", color: totalPnl >= 0 ? "#22c55e" : "#ef4444" }}>
                                                  ${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                             </div>
                                             <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
                                                  Across all bots
                                             </div>
                                        </div>
                                        
                                        <div style={{
                                             padding: "20px",
                                             backgroundColor: "#2a2a2a",
                                             border: "1px solid rgba(255, 174, 0, 0.2)",
                                             borderRadius: "16px",
                                             boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                                        }}>
                                             <div style={{ fontSize: "12px", color: "#888", marginBottom: "8px", fontWeight: "500" }}>Total Capital</div>
                                             <div style={{ fontSize: "32px", fontWeight: "700", color: "#ffffff" }}>
                                                  ${totalCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                             </div>
                                             <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
                                                  Combined capital
                                             </div>
                                        </div>
                                   </>
                              );
                         })()}
                    </div>
               </div>

               {/* Bots List */}
               <div style={{ marginBottom: "32px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
                         <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#ffffff", margin: 0 }}>My Bots</h2>
                         
                         {/* Search and Filters */}
                         <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                              {/* Search Input */}
                              <input
                                   type="text"
                                   placeholder="Search bots..."
                                   value={searchQuery}
                                   onChange={(e) => setSearchQuery(e.target.value)}
                                   style={{
                                        padding: "10px 16px",
                                        backgroundColor: "#2a2a2a",
                                        border: "1px solid rgba(255, 174, 0, 0.3)",
                                        borderRadius: "10px",
                                        color: "#ffffff",
                                        fontSize: "14px",
                                        minWidth: "200px",
                                        outline: "none",
                                   }}
                                   onFocus={(e) => {
                                        e.currentTarget.style.borderColor = "#FFAE00";
                                   }}
                                   onBlur={(e) => {
                                        e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.3)";
                                   }}
                              />
                              
                              {/* Status Filter */}
                              <select
                                   value={statusFilter}
                                   onChange={(e) => setStatusFilter(e.target.value)}
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
                                   <option value="all">All Status</option>
                                   <option value="active">Active</option>
                                   <option value="inactive">Inactive</option>
                                   <option value="paused">Paused</option>
                                   <option value="stopped">Stopped</option>
                                   <option value="error">Error</option>
                              </select>
                              
                              {/* Strategy Filter */}
                              <select
                                   value={strategyFilter}
                                   onChange={(e) => setStrategyFilter(e.target.value)}
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
                                   <option value="all">All Strategies</option>
                                   <option value="prediction_based">Prediction Based</option>
                                   <option value="momentum">Momentum</option>
                                   <option value="mean_reversion">Mean Reversion</option>
                                   <option value="breakout">Breakout</option>
                              </select>
                              
                              {/* Paper Trading Filter */}
                              <select
                                   value={paperTradingFilter}
                                   onChange={(e) => setPaperTradingFilter(e.target.value)}
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
                                   <option value="all">All Modes</option>
                                   <option value="paper">Paper Trading</option>
                                   <option value="real">Real Trading</option>
                              </select>
                         </div>
                    </div>
                    
                    {botsLoading ? (
                         <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>Loading bots...</div>
                    ) : (() => {
                         // Filter bots
                         const filteredBots = bots.filter((bot) => {
                              // Search filter
                              if (searchQuery) {
                                   const query = searchQuery.toLowerCase();
                                   if (
                                        !bot.name.toLowerCase().includes(query) &&
                                        !bot.symbols.some(s => s.toLowerCase().includes(query)) &&
                                        !bot.strategy_type.toLowerCase().includes(query)
                                   ) {
                                        return false;
                                   }
                              }
                              
                              // Status filter
                              if (statusFilter !== "all" && bot.status.toLowerCase() !== statusFilter.toLowerCase()) {
                                   return false;
                              }
                              
                              // Strategy filter
                              if (strategyFilter !== "all" && bot.strategy_type !== strategyFilter) {
                                   return false;
                              }
                              
                              // Paper trading filter
                              if (paperTradingFilter === "paper" && !bot.paper_trading) {
                                   return false;
                              }
                              if (paperTradingFilter === "real" && bot.paper_trading) {
                                   return false;
                              }
                              
                              return true;
                         });
                         
                         return filteredBots.length > 0 ? (
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" }}>
                                   {filteredBots.map((bot) => {
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
                                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                       <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#ffffff" }}>{bot.name}</h3>
                                                       {useWebSocket && bot.status === "running" && botWsStatus[bot.id] && (
                                                            <div
                                                                 style={{
                                                                      width: "8px",
                                                                      height: "8px",
                                                                      borderRadius: "50%",
                                                                      backgroundColor:
                                                                           botWsStatus[bot.id] === "connected"
                                                                                ? "#00ff00"
                                                                                : botWsStatus[bot.id] === "connecting"
                                                                                ? "#FFAE00"
                                                                                : botWsStatus[bot.id] === "error"
                                                                                ? "#ff4444"
                                                                                : "#888",
                                                                      animation: botWsStatus[bot.id] === "connecting" ? "pulse 2s infinite" : "none",
                                                                      boxShadow:
                                                                           botWsStatus[bot.id] === "connected"
                                                                                ? "0 0 8px rgba(0, 255, 0, 0.5)"
                                                                                : "none",
                                                                 }}
                                                                 title={
                                                                      botWsStatus[bot.id] === "connected"
                                                                           ? "Real-time updates active"
                                                                           : botWsStatus[bot.id] === "connecting"
                                                                           ? "Connecting..."
                                                                           : botWsStatus[bot.id] === "error"
                                                                           ? "Connection error"
                                                                           : "Disconnected"
                                                                 }
                                                            />
                                                       )}
                                                  </div>
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
                                   <p style={{ fontSize: "16px", margin: 0 }}>
                                        {bots.length > 0 
                                             ? "No bots match your filters. Try adjusting your search criteria."
                                             : "No bots created yet. Create your first bot above."}
                                   </p>
                              </div>
                         );
                    })()}
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

                         {/* Performance Charts */}
                         {botStatus && allBotTrades.length > 0 && (
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
                                   <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#FFAE00", marginBottom: "20px", marginTop: 0 }}>Performance Charts</h3>
                                   
                                   <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
                                        {/* P&L Over Time Chart */}
                                        <div>
                                             <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#ffffff", marginBottom: "12px" }}>P&L Over Time</h4>
                                             <ResponsiveContainer width="100%" height={250}>
                                                  <LineChart
                                                       data={(() => {
                                                            // Group trades by date and calculate cumulative P&L
                                                            const tradesByDate: Record<string, number> = {};
                                                            let cumulativePnl = 0;
                                                            
                                                            [...allBotTrades]
                                                                 .filter((t) => t.exit_time && t.status === "closed")
                                                                 .sort((a, b) => new Date(a.exit_time!).getTime() - new Date(b.exit_time!).getTime())
                                                                 .forEach((trade) => {
                                                                      cumulativePnl += parseFloat(trade.pnl);
                                                                      const date = new Date(trade.exit_time!).toLocaleDateString();
                                                                      tradesByDate[date] = cumulativePnl;
                                                                 });
                                                            
                                                            return Object.entries(tradesByDate).map(([date, pnl]) => ({
                                                                 date,
                                                                 pnl: Number(pnl.toFixed(2)),
                                                            }));
                                                       })()}
                                                  >
                                                       <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 174, 0, 0.1)" />
                                                       <XAxis dataKey="date" stroke="#888" style={{ fontSize: "11px" }} />
                                                       <YAxis stroke="#888" style={{ fontSize: "11px" }} />
                                                       <Tooltip
                                                            contentStyle={{
                                                                 backgroundColor: "#1a1a1a",
                                                                 border: "1px solid rgba(255, 174, 0, 0.3)",
                                                                 borderRadius: "8px",
                                                                 color: "#ffffff",
                                                            }}
                                                       />
                                                       <Legend />
                                                       <Line
                                                            type="monotone"
                                                            dataKey="pnl"
                                                            stroke="#FFAE00"
                                                            strokeWidth={2}
                                                            dot={{ fill: "#FFAE00", r: 3 }}
                                                            name="Cumulative P&L"
                                                       />
                                                  </LineChart>
                                             </ResponsiveContainer>
                                        </div>

                                        {/* Win/Loss Distribution Chart */}
                                        <div>
                                             <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#ffffff", marginBottom: "12px" }}>Win/Loss Distribution</h4>
                                             <ResponsiveContainer width="100%" height={250}>
                                                  <BarChart
                                                       data={(() => {
                                                            const closedTrades = allBotTrades.filter((t) => t.status === "closed");
                                                            const wins = closedTrades.filter((t) => parseFloat(t.pnl) > 0).length;
                                                            const losses = closedTrades.filter((t) => parseFloat(t.pnl) < 0).length;
                                                            const breakeven = closedTrades.filter((t) => parseFloat(t.pnl) === 0).length;
                                                            
                                                            return [
                                                                 { name: "Wins", value: wins, color: "#22c55e" },
                                                                 { name: "Losses", value: losses, color: "#ef4444" },
                                                                 { name: "Breakeven", value: breakeven, color: "#888" },
                                                            ];
                                                       })()}
                                                  >
                                                       <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 174, 0, 0.1)" />
                                                       <XAxis dataKey="name" stroke="#888" style={{ fontSize: "11px" }} />
                                                       <YAxis stroke="#888" style={{ fontSize: "11px" }} />
                                                       <Tooltip
                                                            contentStyle={{
                                                                 backgroundColor: "#1a1a1a",
                                                                 border: "1px solid rgba(255, 174, 0, 0.3)",
                                                                 borderRadius: "8px",
                                                                 color: "#ffffff",
                                                            }}
                                                       />
                                                       <Bar dataKey="value" fill="#FFAE00" />
                                                  </BarChart>
                                             </ResponsiveContainer>
                                        </div>

                                        {/* Win Rate Over Time Chart */}
                                        <div>
                                             <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#ffffff", marginBottom: "12px" }}>Win Rate Over Time</h4>
                                             <ResponsiveContainer width="100%" height={250}>
                                                  <LineChart
                                                       data={(() => {
                                                            // Calculate win rate for each day
                                                            const tradesByDate: Record<string, { wins: number; total: number }> = {};
                                                            
                                                            [...allBotTrades]
                                                                 .filter((t) => t.exit_time && t.status === "closed")
                                                                 .sort((a, b) => new Date(a.exit_time!).getTime() - new Date(b.exit_time!).getTime())
                                                                 .forEach((trade) => {
                                                                      const date = new Date(trade.exit_time!).toLocaleDateString();
                                                                      if (!tradesByDate[date]) {
                                                                           tradesByDate[date] = { wins: 0, total: 0 };
                                                                      }
                                                                      tradesByDate[date].total++;
                                                                      if (parseFloat(trade.pnl) > 0) {
                                                                           tradesByDate[date].wins++;
                                                                      }
                                                                 });
                                                            
                                                            return Object.entries(tradesByDate).map(([date, stats]) => ({
                                                                 date,
                                                                 winRate: stats.total > 0 ? Number(((stats.wins / stats.total) * 100).toFixed(1)) : 0,
                                                            }));
                                                       })()}
                                                  >
                                                       <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 174, 0, 0.1)" />
                                                       <XAxis dataKey="date" stroke="#888" style={{ fontSize: "11px" }} />
                                                       <YAxis stroke="#888" style={{ fontSize: "11px" }} domain={[0, 100]} />
                                                       <Tooltip
                                                            contentStyle={{
                                                                 backgroundColor: "#1a1a1a",
                                                                 border: "1px solid rgba(255, 174, 0, 0.3)",
                                                                 borderRadius: "8px",
                                                                 color: "#ffffff",
                                                            }}
                                                            formatter={(value: number) => [`${value}%`, "Win Rate"]}
                                                       />
                                                       <Legend />
                                                       <Line
                                                            type="monotone"
                                                            dataKey="winRate"
                                                            stroke="#22c55e"
                                                            strokeWidth={2}
                                                            dot={{ fill: "#22c55e", r: 3 }}
                                                            name="Win Rate %"
                                                       />
                                                  </LineChart>
                                             </ResponsiveContainer>
                                        </div>

                                        {/* Trade Frequency Chart */}
                                        <div>
                                             <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#ffffff", marginBottom: "12px" }}>Trade Frequency</h4>
                                             <ResponsiveContainer width="100%" height={250}>
                                                  <BarChart
                                                       data={(() => {
                                                            // Count trades per day
                                                            const tradesByDate: Record<string, number> = {};
                                                            
                                                            allBotTrades.forEach((trade) => {
                                                                 const date = new Date(trade.entry_time).toLocaleDateString();
                                                                 tradesByDate[date] = (tradesByDate[date] || 0) + 1;
                                                            });
                                                            
                                                            return Object.entries(tradesByDate)
                                                                 .map(([date, count]) => ({ date, count }))
                                                                 .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                                                 .slice(-14); // Last 14 days
                                                       })()}
                                                  >
                                                       <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 174, 0, 0.1)" />
                                                       <XAxis dataKey="date" stroke="#888" style={{ fontSize: "11px" }} />
                                                       <YAxis stroke="#888" style={{ fontSize: "11px" }} />
                                                       <Tooltip
                                                            contentStyle={{
                                                                 backgroundColor: "#1a1a1a",
                                                                 border: "1px solid rgba(255, 174, 0, 0.3)",
                                                                 borderRadius: "8px",
                                                                 color: "#ffffff",
                                                            }}
                                                       />
                                                       <Bar dataKey="count" fill="#6366f1" />
                                                  </BarChart>
                                             </ResponsiveContainer>
                                        </div>

                                        {/* P&L by Symbol Chart */}
                                        {(() => {
                                             const pnlBySymbol: Record<string, number> = {};
                                             allBotTrades
                                                  .filter((t) => t.status === "closed")
                                                  .forEach((trade) => {
                                                       if (!pnlBySymbol[trade.symbol]) {
                                                            pnlBySymbol[trade.symbol] = 0;
                                                       }
                                                       pnlBySymbol[trade.symbol] += parseFloat(trade.pnl);
                                                  });
                                             
                                             const chartData = Object.entries(pnlBySymbol)
                                                  .map(([symbol, pnl]) => ({ symbol, pnl: Number(pnl.toFixed(2)) }))
                                                  .sort((a, b) => b.pnl - a.pnl)
                                                  .slice(0, 10); // Top 10 symbols
                                             
                                             if (chartData.length === 0) return null;
                                             
                                             return (
                                                  <div style={{ gridColumn: "1 / -1" }}>
                                                       <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#ffffff", marginBottom: "12px" }}>P&L by Symbol (Top 10)</h4>
                                                       <ResponsiveContainer width="100%" height={300}>
                                                            <BarChart data={chartData} layout="vertical">
                                                                 <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 174, 0, 0.1)" />
                                                                 <XAxis type="number" stroke="#888" style={{ fontSize: "11px" }} />
                                                                 <YAxis dataKey="symbol" type="category" stroke="#888" style={{ fontSize: "11px" }} width={80} />
                                                                 <Tooltip
                                                                      contentStyle={{
                                                                           backgroundColor: "#1a1a1a",
                                                                           border: "1px solid rgba(255, 174, 0, 0.3)",
                                                                           borderRadius: "8px",
                                                                           color: "#ffffff",
                                                                      }}
                                                                 />
                                                                 <Bar dataKey="pnl" fill="#FFAE00" />
                                                            </BarChart>
                                                       </ResponsiveContainer>
                                                  </div>
                                             );
                                        })()}
                                   </div>
                              </div>
                         )}

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
                              
                              {/* Strategy Parameters Display */}
                              {selectedBot.strategy_params && Object.keys(selectedBot.strategy_params).length > 0 && (
                                   <div style={{ marginTop: "20px", padding: "16px", backgroundColor: "rgba(255, 174, 0, 0.05)", borderRadius: "10px", border: "1px solid rgba(255, 174, 0, 0.2)" }}>
                                        <div style={{ fontSize: "12px", color: "#888", marginBottom: "8px", fontWeight: "500" }}>Strategy Parameters</div>
                                        <pre style={{
                                             margin: 0,
                                             padding: "12px",
                                             backgroundColor: "#1a1a1a",
                                             borderRadius: "8px",
                                             color: "#ffffff",
                                             fontSize: "12px",
                                             fontFamily: "monospace",
                                             overflow: "auto",
                                             maxHeight: "200px",
                                        }}>
                                             {JSON.stringify(selectedBot.strategy_params, null, 2)}
                                        </pre>
                                   </div>
                              )}
                              
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
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
                                   <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#FFAE00", margin: 0 }}>Trade History</h3>
                                   
                                   {/* Export and Filters */}
                                   <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                                        {/* Export Buttons */}
                                        {allBotTrades.length > 0 && (
                                             <>
                                                  <button
                                                       onClick={() => {
                                                            // Export to CSV
                                                            const headers = ["ID", "Symbol", "Side", "Quantity", "Entry Price", "Exit Price", "P&L", "P&L %", "Status", "Entry Time", "Exit Time", "Entry Reason", "Exit Reason", "Prediction Confidence", "Prediction Horizon"];
                                                            
                                                            const rows = allBotTrades.map((trade) => [
                                                                 trade.id,
                                                                 trade.symbol,
                                                                 trade.side,
                                                                 trade.quantity,
                                                                 trade.entry_price,
                                                                 trade.exit_price || "N/A",
                                                                 trade.pnl,
                                                                 trade.pnl_percent || "N/A",
                                                                 trade.status,
                                                                 trade.entry_time,
                                                                 trade.exit_time || "N/A",
                                                                 trade.entry_reason || "N/A",
                                                                 trade.exit_reason || "N/A",
                                                                 trade.prediction_confidence || "N/A",
                                                                 trade.prediction_horizon || "N/A",
                                                            ]);
                                                            
                                                            const csvContent = [headers, ...rows].map((row) => 
                                                                 row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
                                                            ).join("\n");
                                                            
                                                            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                                                            const url = URL.createObjectURL(blob);
                                                            const a = document.createElement("a");
                                                            a.href = url;
                                                            a.download = `bot_${selectedBot?.id}_trades_${new Date().toISOString().split("T")[0]}.csv`;
                                                            a.click();
                                                            URL.revokeObjectURL(url);
                                                            setSuccess("Trades exported to CSV successfully!");
                                                       }}
                                                       style={{
                                                            padding: "8px 16px",
                                                            backgroundColor: "#22c55e",
                                                            border: "none",
                                                            borderRadius: "8px",
                                                            color: "white",
                                                            fontSize: "13px",
                                                            cursor: "pointer",
                                                            fontWeight: "600",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "6px",
                                                       }}
                                                       onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = "#16a34a";
                                                       }}
                                                       onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = "#22c55e";
                                                       }}
                                                  >
                                                       📥 Export CSV
                                                  </button>
                                                  
                                                  <button
                                                       onClick={() => {
                                                            // Export to JSON
                                                            const jsonData = JSON.stringify(allBotTrades, null, 2);
                                                            const blob = new Blob([jsonData], { type: "application/json" });
                                                            const url = URL.createObjectURL(blob);
                                                            const a = document.createElement("a");
                                                            a.href = url;
                                                            a.download = `bot_${selectedBot?.id}_trades_${new Date().toISOString().split("T")[0]}.json`;
                                                            a.click();
                                                            URL.revokeObjectURL(url);
                                                            setSuccess("Trades exported to JSON successfully!");
                                                       }}
                                                       style={{
                                                            padding: "8px 16px",
                                                            backgroundColor: "#6366f1",
                                                            border: "none",
                                                            borderRadius: "8px",
                                                            color: "white",
                                                            fontSize: "13px",
                                                            cursor: "pointer",
                                                            fontWeight: "600",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "6px",
                                                       }}
                                                       onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = "#4f46e5";
                                                       }}
                                                       onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = "#6366f1";
                                                       }}
                                                  >
                                                       📥 Export JSON
                                                  </button>
                                             </>
                                        )}
                                        
                                        {/* Filters */}
                                        {/* Status Filter */}
                                        <select
                                             value={tradeStatusFilter}
                                             onChange={(e) => setTradeStatusFilter(e.target.value)}
                                             style={{
                                                  padding: "8px 12px",
                                                  backgroundColor: "#2a2a2a",
                                                  border: "1px solid rgba(255, 174, 0, 0.3)",
                                                  borderRadius: "8px",
                                                  color: "#ffffff",
                                                  fontSize: "13px",
                                                  cursor: "pointer",
                                                  outline: "none",
                                             }}
                                        >
                                             <option value="all">All Status</option>
                                             <option value="open">Open</option>
                                             <option value="closed">Closed</option>
                                        </select>

                                        {/* Symbol Filter */}
                                        <input
                                             type="text"
                                             placeholder="Filter by symbol..."
                                             value={tradeSymbolFilter}
                                             onChange={(e) => setTradeSymbolFilter(e.target.value)}
                                             style={{
                                                  padding: "8px 12px",
                                                  backgroundColor: "#2a2a2a",
                                                  border: "1px solid rgba(255, 174, 0, 0.3)",
                                                  borderRadius: "8px",
                                                  color: "#ffffff",
                                                  fontSize: "13px",
                                                  width: "150px",
                                                  outline: "none",
                                             }}
                                        />

                                        {/* Trades Per Page */}
                                        <select
                                             value={tradesPerPage}
                                             onChange={(e) => {
                                                  setTradesPerPage(Number(e.target.value));
                                                  setTradesPage(1);
                                             }}
                                             style={{
                                                  padding: "8px 12px",
                                                  backgroundColor: "#2a2a2a",
                                                  border: "1px solid rgba(255, 174, 0, 0.3)",
                                                  borderRadius: "8px",
                                                  color: "#ffffff",
                                                  fontSize: "13px",
                                                  cursor: "pointer",
                                                  outline: "none",
                                             }}
                                        >
                                             <option value={10}>10 per page</option>
                                             <option value={20}>20 per page</option>
                                             <option value={50}>50 per page</option>
                                             <option value={100}>100 per page</option>
                                        </select>
                                   </div>
                              </div>

                              {/* Pagination Info */}
                              {(() => {
                                   const filteredTrades = allBotTrades.filter((trade) => {
                                        if (tradeStatusFilter !== "all" && trade.status.toLowerCase() !== tradeStatusFilter.toLowerCase()) return false;
                                        if (tradeSymbolFilter && !trade.symbol.toLowerCase().includes(tradeSymbolFilter.toLowerCase())) return false;
                                        return true;
                                   });
                                   const totalPages = Math.ceil(filteredTrades.length / tradesPerPage);
                                   const startIndex = (tradesPage - 1) * tradesPerPage;
                                   const endIndex = Math.min(startIndex + tradesPerPage, filteredTrades.length);
                                   
                                   return (
                                        <div style={{ marginBottom: "16px", color: "#888", fontSize: "13px" }}>
                                             Showing {startIndex + 1}-{endIndex} of {filteredTrades.length} trades
                                        </div>
                                   );
                              })()}

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

                              {/* Pagination Controls */}
                              {(() => {
                                   const filteredTrades = allBotTrades.filter((trade) => {
                                        if (tradeStatusFilter !== "all" && trade.status.toLowerCase() !== tradeStatusFilter.toLowerCase()) return false;
                                        if (tradeSymbolFilter && !trade.symbol.toLowerCase().includes(tradeSymbolFilter.toLowerCase())) return false;
                                        return true;
                                   });
                                   const totalPages = Math.ceil(filteredTrades.length / tradesPerPage);
                                   
                                   if (totalPages <= 1) return null;
                                   
                                   return (
                                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "20px" }}>
                                             <button
                                                  onClick={() => setTradesPage((p) => Math.max(1, p - 1))}
                                                  disabled={tradesPage === 1}
                                                  style={{
                                                       padding: "8px 16px",
                                                       backgroundColor: tradesPage === 1 ? "#1a1a1a" : "#2a2a2a",
                                                       border: "1px solid rgba(255, 174, 0, 0.3)",
                                                       borderRadius: "8px",
                                                       color: tradesPage === 1 ? "#666" : "#ffffff",
                                                       fontSize: "13px",
                                                       cursor: tradesPage === 1 ? "not-allowed" : "pointer",
                                                       fontWeight: "600",
                                                  }}
                                             >
                                                  Previous
                                             </button>
                                             
                                             <span style={{ color: "#888", fontSize: "13px", padding: "0 12px" }}>
                                                  Page {tradesPage} of {totalPages}
                                             </span>
                                             
                                             <button
                                                  onClick={() => setTradesPage((p) => Math.min(totalPages, p + 1))}
                                                  disabled={tradesPage === totalPages}
                                                  style={{
                                                       padding: "8px 16px",
                                                       backgroundColor: tradesPage === totalPages ? "#1a1a1a" : "#2a2a2a",
                                                       border: "1px solid rgba(255, 174, 0, 0.3)",
                                                       borderRadius: "8px",
                                                       color: tradesPage === totalPages ? "#666" : "#ffffff",
                                                       fontSize: "13px",
                                                       cursor: tradesPage === totalPages ? "not-allowed" : "pointer",
                                                       fontWeight: "600",
                                                  }}
                                             >
                                                  Next
                                             </button>
                                        </div>
                                   );
                              })()}
                         </div>
                    </div>
               )}
          </div>
          </>
     );
}

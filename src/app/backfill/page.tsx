"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useExchange } from "@/contexts/ExchangeContext";

interface BackfillJob {
     symbol: string;
     interval: string;
     total_pages: number;
     current_page: number;
     status: "running" | "paused" | "completed" | "failed";
     started_at: string | null;
     last_updated: string | null;
     error_message?: string;
}

interface BackupFile {
     filename: string;
     path: string;
     size_mb: number;
     created: string;
}

interface Market {
     symbol: string;
     base: string;
     quote: string;
     active: boolean;
}

interface DataStatus {
     exists: boolean;
     count: number;
     first_timestamp: number | null;
     last_timestamp: number | null;
     last_updated: string | null;
     is_complete: boolean;
     status: "complete" | "incomplete" | "missing";
}

interface SymbolDataStatus {
     [interval: string]: DataStatus;
}

export default function BackfillPage() {
     const { selectedAccountId } = useExchange();
     const [jobs, setJobs] = useState<BackfillJob[]>([]);
     const [backups, setBackups] = useState<BackupFile[]>([]);
     const [markets, setMarkets] = useState<Market[]>([]);
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState<string | null>(null);
     const [success, setSuccess] = useState<string | null>(null);

     // Form state
     const [formData, setFormData] = useState({
          symbol: "",
          interval: "1h",
          total_pages: 18,
          resume: false,
     });

     const [processing, setProcessing] = useState<Record<string, boolean>>({});
     const [autoRefresh, setAutoRefresh] = useState(false);
     const [symbolsLoading, setSymbolsLoading] = useState(false);
     const [dataStatus, setDataStatus] = useState<Record<string, SymbolDataStatus>>({});
     const [dataStatusLoading, setDataStatusLoading] = useState(false);

     // Filter and search state
     const [searchQuery, setSearchQuery] = useState("");
     const [statusFilter, setStatusFilter] = useState<"all" | "missing" | "incomplete" | "complete" | "running" | "paused">("all");
     const [intervalFilter, setIntervalFilter] = useState<string>("all");

     // Available intervals - useMemo to avoid dependency issues
     const availableIntervals = useMemo(() => ["1m", "5m", "15m", "30m", "1h", "4h", "1d"], []);

     const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

     const getAuthToken = () => {
          return localStorage.getItem("auth_token") || "";
     };

     // Fetch markets/symbols from database
     const fetchMarkets = useCallback(async () => {
          if (!selectedAccountId) {
               setMarkets([]);
               return;
          }

          setSymbolsLoading(true);
          try {
               const token = getAuthToken();
               // Load from database instead of exchange API
               const response = await fetch(`${apiUrl}/market/pairs/${selectedAccountId}/db?active_only=true`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    const marketsList = (data.markets || []).filter((m: Market) => m.active !== false);
                    setMarkets(marketsList);

                    // Auto-select first symbol if form is empty
                    if (marketsList.length > 0 && !formData.symbol) {
                         setFormData((prev) => ({ ...prev, symbol: marketsList[0].symbol }));
                    }
               } else if (response.status === 404) {
                    // No symbols in database yet, show empty
                    setMarkets([]);
               }
          } catch (error) {
               console.error("Error fetching markets:", error);
          } finally {
               setSymbolsLoading(false);
          }
     }, [selectedAccountId, apiUrl, formData.symbol]);

     // Sync symbols from exchange to database
     const syncSymbols = useCallback(async () => {
          if (!selectedAccountId) {
               setError("Please select an exchange account");
               return;
          }

          setSymbolsLoading(true);
          setError(null);
          setSuccess(null);

          try {
               const token = getAuthToken();
               const response = await fetch(`${apiUrl}/market/pairs/${selectedAccountId}/sync`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setSuccess(data.message || "Symbols synced successfully");
                    // Reload markets after sync
                    await fetchMarkets();
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to sync symbols");
               }
          } catch (error) {
               console.error("Error syncing symbols:", error);
               setError("Failed to sync symbols");
          } finally {
               setSymbolsLoading(false);
          }
     }, [selectedAccountId, apiUrl, fetchMarkets]);

     // Fetch data status
     const fetchDataStatus = useCallback(async () => {
          if (!selectedAccountId || markets.length === 0) {
               setDataStatus({});
               return;
          }

          setDataStatusLoading(true);
          try {
               const token = getAuthToken();
               const symbols = markets.map((m) => m.symbol);
               const symbolsParam = symbols.join(",");
               const intervals = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];
               const intervalsParam = intervals.join(",");

               const response = await fetch(`${apiUrl}/backfill/data-status?symbols=${encodeURIComponent(symbolsParam)}&intervals=${encodeURIComponent(intervalsParam)}`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setDataStatus(data.data || {});
               }
          } catch (error) {
               console.error("Error fetching data status:", error);
          } finally {
               setDataStatusLoading(false);
          }
     }, [selectedAccountId, markets, apiUrl]);

     // Fetch all jobs
     const fetchJobs = useCallback(async () => {
          try {
               const token = getAuthToken();
               const response = await fetch(`${apiUrl}/backfill/jobs`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setJobs(data.jobs || []);
                    setError(null); // Clear any previous errors
               } else {
                    if (response.status === 401) {
                         setError("Please login to view backfill jobs");
                    } else if (response.status === 404) {
                         // No jobs found is not an error
                         setJobs([]);
                         setError(null);
                    } else {
                         const errorData = await response.json().catch(() => ({}));
                         setError(errorData.detail || "Failed to load jobs");
                    }
               }
          } catch (error) {
               console.error("Error fetching jobs:", error);
               // Only set error if it's not a network error on initial load
               if (jobs.length === 0) {
                    setError("Failed to load backfill jobs. Please check your connection.");
               }
          }
     }, [apiUrl, jobs.length]);

     // Fetch backups
     const fetchBackups = useCallback(async () => {
          try {
               const token = getAuthToken();
               const response = await fetch(`${apiUrl}/backfill/backup/list`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setBackups(data.backups || []);
               }
          } catch (error) {
               console.error("Error fetching backups:", error);
          }
     }, [apiUrl]);

     // Start backfill for specific symbol/interval
     const startBackfillForSymbol = async (symbol: string, interval: string, totalPages?: number) => {
          setLoading(true);
          setError(null);
          setSuccess(null);

          try {
               const token = getAuthToken();
               const pages = totalPages || calculatePages(interval);
               const response = await fetch(`${apiUrl}/backfill/start`, {
                    method: "POST",
                    headers: {
                         Authorization: `Bearer ${token}`,
                         "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                         symbol: symbol,
                         interval: interval,
                         total_pages: pages,
                         resume: false,
                    }),
               });

               if (response.ok) {
                    const data = await response.json();
                    await fetchJobs();
                    return { success: true, message: data.message };
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    return { success: false, message: errorData.detail || "Failed to start backfill" };
               }
          } catch (error) {
               console.error("Error starting backfill:", error);
               return { success: false, message: "Failed to start backfill" };
          } finally {
               setLoading(false);
          }
     };

     // Start backfill
     const handleStart = async () => {
          if (!formData.symbol) {
               setError("Please select a symbol");
               return;
          }

          const result = await startBackfillForSymbol(formData.symbol, formData.interval, formData.total_pages);
          if (result.success) {
               setSuccess(result.message || "Backfill started successfully");
               // Reset form
               setFormData((prev) => ({ ...prev, symbol: "", total_pages: 18, resume: false }));
          } else {
               setError(result.message);
          }
     };

     // Pause backfill
     const handlePause = async (symbol: string, interval: string) => {
          setProcessing({ ...processing, [`${symbol}_${interval}`]: true });
          setError(null);
          setSuccess(null);

          try {
               const token = getAuthToken();
               const response = await fetch(`${apiUrl}/backfill/pause?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setSuccess(data.message || "Backfill paused");
                    await fetchJobs();
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to pause backfill");
               }
          } catch (error) {
               console.error("Error pausing backfill:", error);
               setError("Failed to pause backfill");
          } finally {
               setProcessing({ ...processing, [`${symbol}_${interval}`]: false });
          }
     };

     // Stop backfill
     const handleStop = async (symbol: string, interval: string) => {
          if (!confirm(`Are you sure you want to stop backfill for ${symbol}/${interval}?`)) {
               return;
          }

          setProcessing({ ...processing, [`${symbol}_${interval}`]: true });
          setError(null);
          setSuccess(null);

          try {
               const token = getAuthToken();
               const response = await fetch(`${apiUrl}/backfill/stop?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setSuccess(data.message || "Backfill stopped");
                    await fetchJobs();
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to stop backfill");
               }
          } catch (error) {
               console.error("Error stopping backfill:", error);
               setError("Failed to stop backfill");
          } finally {
               setProcessing({ ...processing, [`${symbol}_${interval}`]: false });
          }
     };

     // Process pages
     const handleProcess = async (symbol: string, interval: string) => {
          setProcessing({ ...processing, [`${symbol}_${interval}`]: true });
          setError(null);

          try {
               const token = getAuthToken();
               const response = await fetch(`${apiUrl}/backfill/process?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&max_pages=5`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    if (data.status === "completed") {
                         setSuccess(`✅ Backfill completed for ${symbol}/${interval}`);
                    } else {
                         setSuccess(`📊 Processed ${data.pages_processed || 0} pages. Progress: ${data.current_page}/${data.total_pages} (${data.percentage?.toFixed(1) || 0}%)`);
                    }
                    await fetchJobs();
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to process backfill");
               }
          } catch (error) {
               console.error("Error processing backfill:", error);
               setError("Failed to process backfill");
          } finally {
               setProcessing({ ...processing, [`${symbol}_${interval}`]: false });
          }
     };

     // Create backup
     const handleCreateBackup = async (symbol: string, interval: string) => {
          setProcessing({ ...processing, [`backup_${symbol}_${interval}`]: true });
          setError(null);
          setSuccess(null);

          try {
               const token = getAuthToken();
               const response = await fetch(`${apiUrl}/backfill/backup/create?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setSuccess(data.message || "Backup created successfully");
                    await fetchBackups();
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to create backup");
               }
          } catch (error) {
               console.error("Error creating backup:", error);
               setError("Failed to create backup");
          } finally {
               setProcessing({ ...processing, [`backup_${symbol}_${interval}`]: false });
          }
     };

     // Restore backup
     const handleRestoreBackup = async (backupFile: string, replaceExisting: boolean = false) => {
          if (!confirm(`Are you sure you want to restore from ${backupFile}?`)) {
               return;
          }

          setProcessing({ ...processing, [`restore_${backupFile}`]: true });
          setError(null);
          setSuccess(null);

          try {
               const token = getAuthToken();
               const response = await fetch(`${apiUrl}/backfill/backup/restore`, {
                    method: "POST",
                    headers: {
                         Authorization: `Bearer ${token}`,
                         "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                         backup_file: backupFile,
                         replace_existing: replaceExisting,
                    }),
               });

               if (response.ok) {
                    const data = await response.json();
                    setSuccess(data.message || "Backup restored successfully");
                    await fetchJobs();
                    await fetchBackups();
                    await fetchDataStatus(); // Refresh data status after restore
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to restore backup");
               }
          } catch (error) {
               console.error("Error restoring backup:", error);
               setError("Failed to restore backup");
          } finally {
               setProcessing({ ...processing, [`restore_${backupFile}`]: false });
          }
     };

     // Calculate pages helper
     const calculatePages = (interval: string, years: number = 2) => {
          const candlesPerYear: Record<string, number> = {
               "1m": 525600,
               "5m": 105120,
               "15m": 35040,
               "30m": 17520,
               "1h": 8760,
               "4h": 2190,
               "1d": 365,
          };
          const totalCandles = (candlesPerYear[interval] || 8760) * years;
          return Math.ceil(totalCandles / 1000);
     };

     // Auto-refresh
     useEffect(() => {
          fetchJobs();
          fetchBackups();
          if (selectedAccountId) {
               fetchMarkets();
          }
     }, [fetchJobs, fetchBackups, selectedAccountId, fetchMarkets]);

     // Fetch data status when markets change
     useEffect(() => {
          if (markets.length > 0) {
               fetchDataStatus();
          }
     }, [markets, fetchDataStatus]);

     useEffect(() => {
          if (!autoRefresh) return;

          const interval = setInterval(() => {
               fetchJobs();
               fetchDataStatus();
          }, 10000); // Increased to 10 seconds to reduce rate limit issues

          return () => clearInterval(interval);
     }, [autoRefresh, fetchJobs, fetchDataStatus]);

     // Update pages when interval changes
     useEffect(() => {
          setFormData((prev) => ({ ...prev, total_pages: calculatePages(prev.interval) }));
     }, [formData.interval]);

     const getStatusColor = (status: string) => {
          switch (status) {
               case "running":
                    return "bg-green-500/20 text-green-400 border-green-500/30";
               case "paused":
                    return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
               case "completed":
                    return "bg-blue-500/20 text-blue-400 border-blue-500/30";
               case "failed":
                    return "bg-red-500/20 text-red-400 border-red-500/30";
               default:
                    return "bg-gray-500/20 text-gray-400 border-gray-500/30";
          }
     };

     const calculateProgress = (job: BackfillJob) => {
          if (job.total_pages === 0) return 0;
          return (job.current_page / job.total_pages) * 100;
     };

     // Filter markets based on search and filters
     const filteredMarkets = useMemo(() => {
          return markets.filter((market) => {
               // Search filter
               if (searchQuery && !market.symbol.toLowerCase().includes(searchQuery.toLowerCase())) {
                    return false;
               }

               // Status filter
               if (statusFilter !== "all") {
                    const symbolStatus = dataStatus[market.symbol] || {};
                    let matchesStatus = false;

                    if (statusFilter === "running" || statusFilter === "paused") {
                         // Check if any interval has active job with this status
                         matchesStatus = availableIntervals.some((interval) => {
                              const activeJob = jobs.find((j) => j.symbol === market.symbol && j.interval === interval);
                              return activeJob?.status === statusFilter;
                         });
                    } else if (statusFilter === "missing") {
                         // Check if any interval has no data
                         matchesStatus = availableIntervals.some((interval) => {
                              const status = symbolStatus[interval];
                              return !status || !status.exists || status.count === 0;
                         });
                    } else if (statusFilter === "incomplete") {
                         // Check if any interval is incomplete
                         matchesStatus = availableIntervals.some((interval) => {
                              const status = symbolStatus[interval];
                              return status && status.exists && status.status === "incomplete";
                         });
                    } else if (statusFilter === "complete") {
                         // Check if all intervals are complete
                         matchesStatus = availableIntervals.every((interval) => {
                              const status = symbolStatus[interval];
                              return status && status.exists && status.status === "complete";
                         });
                    }

                    if (!matchesStatus) return false;
               }

               // Interval filter
               if (intervalFilter !== "all") {
                    const symbolStatus = dataStatus[market.symbol] || {};
                    const status = symbolStatus[intervalFilter];
                    const hasActiveJob = jobs.some((j) => j.symbol === market.symbol && j.interval === intervalFilter);

                    // Show symbols that have missing data for this interval or have active jobs
                    if (!status || !status.exists || status.count === 0 || hasActiveJob) {
                         return true;
                    }
                    return false;
               }

               return true;
          });
     }, [markets, searchQuery, statusFilter, intervalFilter, dataStatus, jobs, availableIntervals]);

     return (
          <div className="min-h-screen bg-[#1a1a1a] text-white p-6" style={{ marginLeft: "250px", paddingTop: "90px" }}>
               <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                         <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#FFAE00] to-[#FFD700] bg-clip-text text-transparent">📥 Backfill Management</h1>
                         <p className="text-gray-400 text-lg">Manage historical data collection with start/stop, resume, and backup capabilities</p>
                    </div>

                    {/* Messages */}
                    {error && (
                         <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-2">
                              <span>⚠️</span>
                              <span>{error}</span>
                         </div>
                    )}
                    {success && (
                         <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 flex items-center gap-2">
                              <span>✅</span>
                              <span>{success}</span>
                         </div>
                    )}

                    {/* Exchange Account Selector */}
                    {!selectedAccountId && (
                         <div className="mb-6 p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400">
                              ⚠️ Please select an exchange account from the header to view available symbols
                         </div>
                    )}

                    {/* Sync Symbols Button */}
                    {selectedAccountId && (
                         <div className="mb-6 flex justify-between items-center">
                              <div className="text-sm text-gray-400">
                                   {markets.length > 0 ? <>📊 {markets.length} symbols loaded from database</> : <>⚠️ No symbols in database. Sync from exchange to load symbols.</>}
                              </div>
                              <button
                                   onClick={syncSymbols}
                                   disabled={symbolsLoading}
                                   className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors disabled:opacity-50 text-sm font-medium"
                              >
                                   {symbolsLoading ? "⏳ Syncing..." : "🔄 Sync Symbols from Exchange"}
                              </button>
                         </div>
                    )}

                    {/* All Symbols Table - For Download */}
                    {selectedAccountId && markets.length > 0 && (
                         <div className="bg-[#252525] border border-[#333] rounded-xl p-6 mb-6 shadow-xl">
                              <div className="flex justify-between items-center mb-6">
                                   <h2 className="text-2xl font-semibold">All Symbols - Start Download</h2>
                                   <button
                                        onClick={() => {
                                             fetchMarkets();
                                             fetchDataStatus();
                                        }}
                                        className="px-4 py-2 bg-[#1a1a1a] border border-[#333] text-gray-300 rounded-lg hover:bg-[#2a2a2a] transition-colors"
                                   >
                                        🔄 Refresh
                                   </button>
                              </div>

                              {/* Search and Filter Bar */}
                              <div className="mb-6 flex flex-col md:flex-row gap-4">
                                   {/* Search Input */}
                                   <div className="flex-1">
                                        <input
                                             type="text"
                                             placeholder="🔍 Search symbols (e.g., BTC, ETH, USDT)..."
                                             value={searchQuery}
                                             onChange={(e) => setSearchQuery(e.target.value)}
                                             className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#333] text-white rounded-lg focus:outline-none focus:border-[#FFAE00] transition-colors"
                                        />
                                   </div>

                                   {/* Status Filter */}
                                   <div className="flex-shrink-0">
                                        <select
                                             value={statusFilter}
                                             onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                                             className="px-4 py-2 bg-[#1a1a1a] border border-[#333] text-white rounded-lg focus:outline-none focus:border-[#FFAE00] transition-colors"
                                        >
                                             <option value="all">All Status</option>
                                             <option value="missing">❌ Missing</option>
                                             <option value="incomplete">⚠️ Incomplete</option>
                                             <option value="complete">✅ Complete</option>
                                             <option value="running">🔄 Running</option>
                                             <option value="paused">⏸️ Paused</option>
                                        </select>
                                   </div>

                                   {/* Interval Filter */}
                                   <div className="flex-shrink-0">
                                        <select
                                             value={intervalFilter}
                                             onChange={(e) => setIntervalFilter(e.target.value)}
                                             className="px-4 py-2 bg-[#1a1a1a] border border-[#333] text-white rounded-lg focus:outline-none focus:border-[#FFAE00] transition-colors"
                                        >
                                             <option value="all">All Intervals</option>
                                             {availableIntervals.map((interval) => (
                                                  <option key={interval} value={interval}>
                                                       {interval}
                                                  </option>
                                             ))}
                                        </select>
                                   </div>

                                   {/* Clear Filters */}
                                   {(searchQuery || statusFilter !== "all" || intervalFilter !== "all") && (
                                        <button
                                             onClick={() => {
                                                  setSearchQuery("");
                                                  setStatusFilter("all");
                                                  setIntervalFilter("all");
                                             }}
                                             className="px-4 py-2 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
                                        >
                                             ✕ Clear
                                        </button>
                                   )}
                              </div>

                              {/* Results Count */}
                              <div className="mb-4 text-sm text-gray-400">
                                   Showing {filteredMarkets.length} of {markets.length} symbols
                              </div>

                              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                                   <table className="w-full">
                                        <thead className="bg-[#1a1a1a] border-b border-[#333] sticky top-0">
                                             <tr>
                                                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 sticky left-0 bg-[#1a1a1a] z-10 border-r border-[#333]">Symbol</th>
                                                  {availableIntervals.map((interval) => (
                                                       <th key={interval} className="px-3 py-3 text-center text-xs font-medium text-gray-300 min-w-[120px]">
                                                            {interval}
                                                       </th>
                                                  ))}
                                                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
                                             </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#333]">
                                             {filteredMarkets.map((market) => {
                                                  const symbolStatus = dataStatus[market.symbol] || {};
                                                  // Normalize symbol for backup filename matching
                                                  const normalizedSymbol = market.symbol.replace("/", "_");

                                                  return (
                                                       <tr key={market.symbol} className="hover:bg-[#1a1a1a]/50 transition-colors">
                                                            <td className="px-4 py-3 font-semibold text-white sticky left-0 bg-[#252525] z-10 border-r border-[#333]">{market.symbol}</td>
                                                            {availableIntervals.map((interval) => {
                                                                 const status = symbolStatus[interval];
                                                                 const hasData = status && status.exists && status.count > 0;
                                                                 const isComplete = status && status.status === "complete";
                                                                 const isIncomplete = status && status.status === "incomplete";

                                                                 // Check if there's an active job for this symbol/interval
                                                                 const activeJob = jobs.find((j) => j.symbol === market.symbol && j.interval === interval);

                                                                 // Check if backup exists for this symbol/interval
                                                                 // Backup filename format: {normalizedSymbol}_{interval}.json
                                                                 // Example: BTC_USDT_1h.json
                                                                 const backupFilePattern = `${normalizedSymbol}_${interval}`;
                                                                 const hasBackup = backups.some((b) => {
                                                                      // Match exact pattern or pattern with timestamp
                                                                      const nameWithoutExt = b.filename.replace(".json", "");
                                                                      return nameWithoutExt === backupFilePattern || nameWithoutExt.startsWith(`${backupFilePattern}_`);
                                                                 });
                                                                 const backupFile = backups.find((b) => {
                                                                      const nameWithoutExt = b.filename.replace(".json", "");
                                                                      return nameWithoutExt === backupFilePattern || nameWithoutExt.startsWith(`${backupFilePattern}_`);
                                                                 })?.filename;

                                                                 return (
                                                                      <td key={interval} className="px-3 py-3 text-center">
                                                                           <div className="flex flex-col items-center gap-1">
                                                                                {activeJob ? (
                                                                                     <span
                                                                                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                                                                               activeJob.status === "running"
                                                                                                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                                                                                    : activeJob.status === "paused"
                                                                                                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                                                                                    : activeJob.status === "completed"
                                                                                                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                                                                                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                                                                                          }`}
                                                                                     >
                                                                                          {activeJob.status.toUpperCase()}
                                                                                     </span>
                                                                                ) : hasData ? (
                                                                                     <span
                                                                                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                                                                               isComplete
                                                                                                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                                                                                    : isIncomplete
                                                                                                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                                                                                    : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                                                                                          }`}
                                                                                     >
                                                                                          {isComplete ? "✅" : isIncomplete ? "⚠️" : "📊"}
                                                                                     </span>
                                                                                ) : (
                                                                                     <span className="inline-block px-2 py-1 rounded text-xs bg-gray-500/20 text-gray-400 border border-gray-500/30">
                                                                                          ❌
                                                                                     </span>
                                                                                )}
                                                                                {!activeJob && (
                                                                                     <div className="flex gap-1">
                                                                                          {hasBackup && !hasData && backupFile && (
                                                                                               <button
                                                                                                    onClick={async () => {
                                                                                                         await handleRestoreBackup(backupFile, false);
                                                                                                         await fetchDataStatus();
                                                                                                    }}
                                                                                                    disabled={processing[`restore_${backupFile}`] || loading}
                                                                                                    className="px-2 py-1 text-xs bg-purple-600/20 border border-purple-500/30 text-purple-400 rounded hover:bg-purple-600/30 transition-colors disabled:opacity-50"
                                                                                                    title={`Restore backup for ${market.symbol} ${interval} from ${backupFile}`}
                                                                                               >
                                                                                                    📥
                                                                                               </button>
                                                                                          )}
                                                                                          <button
                                                                                               onClick={async () => {
                                                                                                    const result = await startBackfillForSymbol(market.symbol, interval);
                                                                                                    if (result.success) {
                                                                                                         setSuccess(`Started download for ${market.symbol} ${interval}`);
                                                                                                    } else {
                                                                                                         setError(result.message);
                                                                                                    }
                                                                                               }}
                                                                                               disabled={loading}
                                                                                               className="px-2 py-1 text-xs bg-green-600/20 border border-green-500/30 text-green-400 rounded hover:bg-green-600/30 transition-colors disabled:opacity-50"
                                                                                               title={`Start download for ${market.symbol} ${interval}`}
                                                                                          >
                                                                                               ⬇️
                                                                                          </button>
                                                                                     </div>
                                                                                )}
                                                                           </div>
                                                                      </td>
                                                                 );
                                                            })}
                                                            <td className="px-4 py-3">
                                                                 <button
                                                                      onClick={async () => {
                                                                           // Start download for all intervals sequentially
                                                                           const intervals = availableIntervals;
                                                                           let started = 0;
                                                                           for (const interval of intervals) {
                                                                                const existingJob = jobs.find((j) => j.symbol === market.symbol && j.interval === interval);
                                                                                if (!existingJob) {
                                                                                     const result = await startBackfillForSymbol(market.symbol, interval);
                                                                                     if (result.success) {
                                                                                          started++;
                                                                                     }
                                                                                     // Small delay between starts
                                                                                     await new Promise((resolve) => setTimeout(resolve, 500));
                                                                                }
                                                                           }
                                                                           if (started > 0) {
                                                                                setSuccess(`Started ${started} download(s) for ${market.symbol}`);
                                                                           }
                                                                      }}
                                                                      disabled={loading}
                                                                      className="px-3 py-1.5 text-xs bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded hover:bg-blue-600/30 transition-colors disabled:opacity-50"
                                                                      title={`Start download for all intervals`}
                                                                 >
                                                                      ⬇️ All
                                                                 </button>
                                                            </td>
                                                       </tr>
                                                  );
                                             })}
                                        </tbody>
                                   </table>
                              </div>
                         </div>
                    )}

                    {/* Backfill Jobs Table */}
                    <div className="bg-[#252525] border border-[#333] rounded-xl p-6 mb-6 shadow-xl">
                         <div className="flex justify-between items-center mb-6">
                              <h2 className="text-2xl font-semibold">Backfill Jobs</h2>
                              <button
                                   onClick={() => {
                                        fetchJobs();
                                        fetchBackups();
                                        fetchDataStatus();
                                   }}
                                   className="px-4 py-2 bg-[#1a1a1a] border border-[#333] text-gray-300 rounded-lg hover:bg-[#2a2a2a] transition-colors"
                              >
                                   🔄 Refresh
                              </button>
                         </div>

                         {jobs.length === 0 ? (
                              <div className="text-center py-12 text-gray-400">
                                   <div className="text-4xl mb-4">📭</div>
                                   <p>No active backfill jobs</p>
                              </div>
                         ) : (
                              <div className="overflow-x-auto">
                                   <table className="w-full">
                                        <thead className="bg-[#1a1a1a] border-b border-[#333]">
                                             <tr>
                                                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Symbol</th>
                                                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Last Updated</th>
                                                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Intervals</th>
                                                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Progress</th>
                                                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Pages</th>
                                                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                                                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Backup File Name</th>
                                                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
                                             </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#333]">
                                             {jobs.map((job) => {
                                                  const progress = calculateProgress(job);
                                                  const isProcessing = processing[`${job.symbol}_${job.interval}`] || false;

                                                  // Find backup file for this symbol/interval
                                                  const normalizedSymbol = job.symbol.replace("/", "_");
                                                  const backupFile = backups.find(
                                                       (b) => b.filename.startsWith(`${normalizedSymbol}_${job.interval}.json`) || b.filename.startsWith(`${normalizedSymbol}_${job.interval}_`)
                                                  );

                                                  return (
                                                       <tr key={`${job.symbol}_${job.interval}`} className="hover:bg-[#1a1a1a]/50 transition-colors">
                                                            {/* Symbol */}
                                                            <td className="px-4 py-4">
                                                                 <div className="font-semibold text-white">{job.symbol}</div>
                                                            </td>

                                                            {/* Last Updated */}
                                                            <td className="px-4 py-4">
                                                                 <div className="text-sm text-gray-300">
                                                                      {job.last_updated
                                                                           ? new Date(job.last_updated).toLocaleDateString()
                                                                           : job.started_at
                                                                           ? new Date(job.started_at).toLocaleDateString()
                                                                           : "N/A"}
                                                                 </div>
                                                            </td>

                                                            {/* Intervals */}
                                                            <td className="px-4 py-4">
                                                                 <div className="text-sm text-gray-300 font-medium">{job.interval}</div>
                                                            </td>

                                                            {/* Progress */}
                                                            <td className="px-4 py-4">
                                                                 <div className="text-sm font-semibold text-gray-300">%{progress.toFixed(0)}</div>
                                                            </td>

                                                            {/* Pages */}
                                                            <td className="px-4 py-4">
                                                                 <div className="text-sm text-gray-300">
                                                                      <span className="font-semibold">{job.current_page}</span>
                                                                      <span className="text-gray-500"> / </span>
                                                                      <span className="text-gray-400">{job.total_pages}</span>
                                                                 </div>
                                                            </td>

                                                            {/* Status */}
                                                            <td className="px-4 py-4">
                                                                 <span className={`inline-block px-3 py-1 rounded text-xs font-medium ${getStatusColor(job.status)}`}>{job.status.toUpperCase()}</span>
                                                            </td>

                                                            {/* Backup File Name */}
                                                            <td className="px-4 py-4">
                                                                 <div className="text-xs text-gray-400 font-mono">{backupFile ? backupFile.filename : "-"}</div>
                                                            </td>

                                                            {/* Actions */}
                                                            <td className="px-4 py-4">
                                                                 <div className="flex gap-2">
                                                                      {job.status === "running" && (
                                                                           <button
                                                                                onClick={() => handlePause(job.symbol, job.interval)}
                                                                                disabled={isProcessing}
                                                                                className="px-4 py-2 bg-orange-600/20 border border-orange-500/30 text-orange-400 rounded hover:bg-orange-600/30 transition-colors disabled:opacity-50 text-sm font-medium"
                                                                                title="Pause"
                                                                           >
                                                                                Pause
                                                                           </button>
                                                                      )}
                                                                      {job.status === "paused" && (
                                                                           <button
                                                                                onClick={() => {
                                                                                     setFormData({
                                                                                          symbol: job.symbol,
                                                                                          interval: job.interval,
                                                                                          total_pages: job.total_pages,
                                                                                          resume: true,
                                                                                     });
                                                                                     handleStart();
                                                                                }}
                                                                                disabled={isProcessing}
                                                                                className="px-4 py-2 bg-green-600/20 border border-green-500/30 text-green-400 rounded hover:bg-green-600/30 transition-colors disabled:opacity-50 text-sm font-medium"
                                                                                title="Resume/Download"
                                                                           >
                                                                                Download
                                                                           </button>
                                                                      )}
                                                                      {job.status === "completed" && (
                                                                           <button
                                                                                onClick={() => {
                                                                                     setFormData({
                                                                                          symbol: job.symbol,
                                                                                          interval: job.interval,
                                                                                          total_pages: job.total_pages,
                                                                                          resume: false,
                                                                                     });
                                                                                     handleStart();
                                                                                }}
                                                                                disabled={isProcessing}
                                                                                className="px-4 py-2 bg-green-600/20 border border-green-500/30 text-green-400 rounded hover:bg-green-600/30 transition-colors disabled:opacity-50 text-sm font-medium"
                                                                                title="Start/Download"
                                                                           >
                                                                                Download
                                                                           </button>
                                                                      )}
                                                                      {job.status === "running" && (
                                                                           <button
                                                                                onClick={() => handleProcess(job.symbol, job.interval)}
                                                                                disabled={isProcessing}
                                                                                className="px-4 py-2 bg-green-600/20 border border-green-500/30 text-green-400 rounded hover:bg-green-600/30 transition-colors disabled:opacity-50 text-sm font-medium"
                                                                                title="Process Pages"
                                                                           >
                                                                                {isProcessing ? "Processing..." : "Download"}
                                                                           </button>
                                                                      )}
                                                                      <button
                                                                           onClick={() => handleCreateBackup(job.symbol, job.interval)}
                                                                           disabled={processing[`backup_${job.symbol}_${job.interval}`] || false}
                                                                           className="px-4 py-2 bg-orange-600/20 border border-orange-500/30 text-orange-400 rounded hover:bg-orange-600/30 transition-colors disabled:opacity-50 text-sm font-medium"
                                                                           title="Create Backup"
                                                                      >
                                                                           {processing[`backup_${job.symbol}_${job.interval}`] ? "Creating..." : "Backup"}
                                                                      </button>
                                                                 </div>
                                                            </td>
                                                       </tr>
                                                  );
                                             })}
                                        </tbody>
                                   </table>
                              </div>
                         )}
                    </div>
               </div>
          </div>
     );
}

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useExchange } from "@/contexts/ExchangeContext";

interface BackfillJob {
     symbol: string;
     interval: string;
     total_pages: number;
     current_page: number;
     status: "running" | "paused" | "completed" | "failed" | "error";
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

interface BatchBackfillJob {
     batch_id: string;
     exchange_account_id: number;
     total_jobs: number;
     completed_jobs: number;
     failed_jobs: number;
     status: "running" | "paused" | "completed" | "failed";
     started_at: string;
     last_updated: string;
     symbols: string[];
     intervals: string[];
     total_pages_per_job: number;
     auto_backup: boolean;
}

export default function BackfillPage() {
     const { selectedAccountId } = useExchange();
     const [activeTab, setActiveTab] = useState<"single" | "batch">("single");
     const [jobs, setJobs] = useState<BackfillJob[]>([]);
     const [batchJobs, setBatchJobs] = useState<BatchBackfillJob[]>([]);
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

     // Batch Backfill form state
     const [batchFormData, setBatchFormData] = useState({
          exchange_account_id: selectedAccountId || 0,
          symbols: [] as string[],
          intervals: [] as string[],
          total_pages_per_job: 18,
          auto_backup: true,
     });

     const [processing, setProcessing] = useState<Record<string, boolean>>({});
     const [autoRefresh, setAutoRefresh] = useState(false);
     const [autoProcessingJobs, setAutoProcessingJobs] = useState<Set<string>>(new Set());
     const [symbolsLoading, setSymbolsLoading] = useState(false);
     const [dataStatus, setDataStatus] = useState<Record<string, SymbolDataStatus>>({});
     const [dataStatusLoading, setDataStatusLoading] = useState(false);
     
     // Sync All Exchanges state
     const [syncingAll, setSyncingAll] = useState(false);
     const [syncAllResults, setSyncAllResults] = useState<{
          summary?: {
               exchanges_synced: number;
               exchanges_failed: number;
               total_symbols: number;
               total_added: number;
               total_updated: number;
          };
          results?: Record<string, any>;
     } | null>(null);
     const [showSyncAllResults, setShowSyncAllResults] = useState(false);
     
     // Sync Specific Exchange state
     const [exchanges, setExchanges] = useState<Array<{ id: number; name: string; display_name: string; is_active: boolean }>>([]);
     const [selectedExchangeName, setSelectedExchangeName] = useState<string>("");
     const [syncingExchange, setSyncingExchange] = useState(false);
     const [syncExchangeResult, setSyncExchangeResult] = useState<{
          exchange_name?: string;
          total?: number;
          added?: number;
          updated?: number;
          error?: string;
     } | null>(null);
     const [showSyncExchangeResult, setShowSyncExchangeResult] = useState(false);

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

     // Fetch exchanges list
     const fetchExchanges = useCallback(async () => {
          try {
               const token = getAuthToken();
               if (!token) return;

               const response = await fetch(`${apiUrl}/exchange/exchanges`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    const activeExchanges = (Array.isArray(data) ? data : []).filter((ex: any) => ex.is_active !== false);
                    setExchanges(activeExchanges);
               }
          } catch (error) {
               console.error("Error fetching exchanges:", error);
          }
     }, [apiUrl]);

     // Sync all exchanges
     const syncAllExchanges = useCallback(async () => {
          setSyncingAll(true);
          setError(null);
          setSuccess(null);
          setSyncAllResults(null);
          setShowSyncAllResults(false);

          try {
               const token = getAuthToken();
               if (!token) {
                    setError("Please login to sync exchanges");
                    return;
               }

               const response = await fetch(`${apiUrl}/market/symbols/sync-all`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setSyncAllResults({
                         summary: data.summary,
                         results: data.results,
                    });
                    setSuccess(data.message || "All exchanges synced successfully");
                    setShowSyncAllResults(true);
                    
                    // Reload markets if we have a selected account
                    if (selectedAccountId) {
                         await fetchMarkets();
                    }
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to sync all exchanges");
               }
          } catch (error) {
               console.error("Error syncing all exchanges:", error);
               setError("Failed to sync all exchanges");
          } finally {
               setSyncingAll(false);
          }
     }, [apiUrl, selectedAccountId, fetchMarkets]);

     // Sync specific exchange
     const syncSpecificExchange = useCallback(async () => {
          if (!selectedExchangeName) {
               setError("Please select an exchange");
               return;
          }

          setSyncingExchange(true);
          setError(null);
          setSuccess(null);
          setSyncExchangeResult(null);
          setShowSyncExchangeResult(false);

          try {
               const token = getAuthToken();
               if (!token) {
                    setError("Please login to sync exchange");
                    return;
               }

               const response = await fetch(`${apiUrl}/market/symbols/sync/${encodeURIComponent(selectedExchangeName)}`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setSyncExchangeResult({
                         exchange_name: selectedExchangeName,
                         total: data.data?.total || 0,
                         added: data.data?.added || 0,
                         updated: data.data?.updated || 0,
                    });
                    setSuccess(data.message || `Exchange ${selectedExchangeName} synced successfully`);
                    setShowSyncExchangeResult(true);
                    
                    // Reload markets if we have a selected account
                    if (selectedAccountId) {
                         await fetchMarkets();
                    }
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMsg = errorData.detail || "Failed to sync exchange";
                    setSyncExchangeResult({
                         exchange_name: selectedExchangeName,
                         error: errorMsg,
                    });
                    setError(errorMsg);
                    setShowSyncExchangeResult(true);
               }
          } catch (error) {
               console.error("Error syncing exchange:", error);
               const errorMsg = "Failed to sync exchange";
               setSyncExchangeResult({
                    exchange_name: selectedExchangeName,
                    error: errorMsg,
               });
               setError(errorMsg);
               setShowSyncExchangeResult(true);
          } finally {
               setSyncingExchange(false);
          }
     }, [selectedExchangeName, apiUrl, selectedAccountId, fetchMarkets]);

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

     // Fetch batch backfill jobs
     const fetchBatchJobs = useCallback(async () => {
          try {
               const token = getAuthToken();
               const response = await fetch(`${apiUrl}/backfill/batch/jobs`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setBatchJobs(data.jobs || []);
                    setError(null); // Clear any previous errors
               } else {
                    if (response.status === 401) {
                         setError("Please login to view batch backfill jobs");
                    } else if (response.status === 404) {
                         // No jobs found is not an error
                         setBatchJobs([]);
                         setError(null);
                    } else {
                         const errorData = await response.json().catch(() => ({}));
                         setError(errorData.detail || "Failed to load batch jobs");
                    }
               }
          } catch (error) {
               console.error("Error fetching batch jobs:", error);
               // Only set error if it's not a network error on initial load
               if (batchJobs.length === 0) {
                    setError("Failed to load batch backfill jobs. Please check your connection.");
               }
          }
     }, [apiUrl, batchJobs.length]);

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
     const startBackfillForSymbol = async (symbol: string, interval: string, totalPages?: number, resume: boolean = false) => {
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
                         resume: resume,
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

     // Restart failed/error job
     const handleRestart = async (symbol: string, interval: string, totalPages: number) => {
          const key = `${symbol}_${interval}`;
          setProcessing((prev) => ({ ...prev, [key]: true }));
          setError(null);
          setSuccess(null);

          try {
               const result = await startBackfillForSymbol(symbol, interval, totalPages, true);
               if (result.success) {
                    setSuccess(`Restarted backfill for ${symbol}/${interval}`);
                    await fetchJobs();
               } else {
                    setError(result.message || "Failed to restart backfill");
               }
          } catch (error) {
               console.error("Error restarting backfill:", error);
               setError("Failed to restart backfill");
          } finally {
               setProcessing((prev) => ({ ...prev, [key]: false }));
          }
     };

     // Start backfill
     const handleStart = async () => {
          if (!formData.symbol) {
               setError("Please select a symbol");
               return;
          }

          const result = await startBackfillForSymbol(formData.symbol, formData.interval, formData.total_pages, formData.resume);
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
          const jobKey = `${symbol}_${interval}`;
          setProcessing((prev) => ({ ...prev, [jobKey]: true }));
          setError(null);
          setSuccess(null);

          // Remove from auto-processing when paused
          setAutoProcessingJobs((prev) => {
               const newSet = new Set(prev);
               newSet.delete(jobKey);
               return newSet;
          });

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
               setProcessing((prev) => ({ ...prev, [jobKey]: false }));
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

     // Update candles (download new candles from last timestamp to now)
     const handleUpdate = async (symbol: string, interval: string) => {
          console.log("handleUpdate called:", { symbol, interval });
          const jobKey = `update_${symbol}_${interval}`;
          setProcessing((prev) => ({ ...prev, [jobKey]: true }));
          setError(null);
          setSuccess(null);

          try {
               const token = getAuthToken();
               const url = `${apiUrl}/backfill/update?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}`;
               console.log("Calling update endpoint:", url);
               
               const response = await fetch(url, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
               });

               console.log("Update response status:", response.status);
               
               if (response.ok) {
                    const data = await response.json();
                    console.log("Update response data:", data);
                    if (data.status === "success") {
                         setSuccess(data.message || `Updated ${data.candles_added || 0} new candles`);
                    } else {
                         setError(data.message || "Failed to update candles");
                    }
                    await fetchJobs();
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    console.error("Update error response:", errorData);
                    setError(errorData.detail || `Failed to update candles (${response.status})`);
               }
          } catch (error) {
               console.error("Error updating candles:", error);
               setError(`Failed to update candles: ${error instanceof Error ? error.message : String(error)}`);
          } finally {
               setProcessing((prev) => ({ ...prev, [jobKey]: false }));
          }
     };

     // Process pages
     const handleProcess = useCallback(async (symbol: string, interval: string, autoContinue: boolean = false) => {
          const jobKey = `${symbol}_${interval}`;
          setProcessing((prev) => ({ ...prev, [jobKey]: true }));
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
                         // Remove from auto-processing if completed
                         setAutoProcessingJobs((prev) => {
                              const newSet = new Set(prev);
                              newSet.delete(jobKey);
                              return newSet;
                         });
                    } else {
                         setSuccess(`📊 Processed ${data.pages_processed || 0} pages. Progress: ${data.current_page}/${data.total_pages} (${data.percentage?.toFixed(1) || 0}%)`);
                         // If auto-continue is enabled and job is still running, continue processing
                         if (autoContinue && data.status === "running") {
                              // Continue processing after a short delay
                              setTimeout(() => {
                                   handleProcess(symbol, interval, true);
                              }, 1000);
                         }
                    }
                    await fetchJobs();
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to process backfill");
                    // Remove from auto-processing on error
                    setAutoProcessingJobs((prev) => {
                         const newSet = new Set(prev);
                         newSet.delete(jobKey);
                         return newSet;
                    });
               }
          } catch (error) {
               console.error("Error processing backfill:", error);
               setError("Failed to process backfill");
               // Remove from auto-processing on error
               setAutoProcessingJobs((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(jobKey);
                    return newSet;
               });
          } finally {
               setProcessing((prev) => ({ ...prev, [jobKey]: false }));
          }
     }, [apiUrl, fetchJobs]);

     // Toggle auto-processing for a job
     const toggleAutoProcess = (symbol: string, interval: string) => {
          const jobKey = `${symbol}_${interval}`;
          setAutoProcessingJobs((prev) => {
               const newSet = new Set(prev);
               if (newSet.has(jobKey)) {
                    // Stop auto-processing
                    newSet.delete(jobKey);
               } else {
                    // Start auto-processing
                    newSet.add(jobKey);
                    // Start processing immediately
                    handleProcess(symbol, interval, true);
               }
               return newSet;
          });
     };

     // Start batch backfill
     const handleStartBatch = async () => {
          if (!batchFormData.exchange_account_id) {
               setError("Please select an exchange account");
               return;
          }
          if (batchFormData.symbols.length === 0) {
               setError("Please select at least one symbol");
               return;
          }
          if (batchFormData.intervals.length === 0) {
               setError("Please select at least one interval");
               return;
          }

          setLoading(true);
          setError(null);
          setSuccess(null);

          try {
               const token = getAuthToken();
               const response = await fetch(`${apiUrl}/backfill/batch/start`, {
                    method: "POST",
                    headers: {
                         Authorization: `Bearer ${token}`,
                         "Content-Type": "application/json",
                    },
                    body: JSON.stringify(batchFormData),
               });

               if (response.ok) {
                    const data = await response.json();
                    setSuccess(data.message || "Batch backfill started successfully");
                    await fetchBatchJobs();
                    // Reset form
                    setBatchFormData((prev) => ({
                         ...prev,
                         symbols: [],
                         intervals: [],
                    }));
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to start batch backfill");
               }
          } catch (error) {
               console.error("Error starting batch backfill:", error);
               setError("Failed to start batch backfill");
          } finally {
               setLoading(false);
          }
     };

     // Process batch backfill
     const handleProcessBatch = async (batchId: string) => {
          setProcessing({ ...processing, [`batch_${batchId}`]: true });
          setError(null);

          try {
               const token = getAuthToken();
               const response = await fetch(`${apiUrl}/backfill/batch/process?batch_id=${encodeURIComponent(batchId)}`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setSuccess(data.message || "Batch processed");
                    await fetchBatchJobs();
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || "Failed to process batch");
               }
          } catch (error) {
               console.error("Error processing batch:", error);
               setError("Failed to process batch");
          } finally {
               setProcessing({ ...processing, [`batch_${batchId}`]: false });
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
               if (activeTab === "batch") {
                    fetchBatchJobs();
               }
          }, 10000); // Increased to 10 seconds to reduce rate limit issues

          return () => clearInterval(interval);
     }, [autoRefresh, fetchJobs, fetchDataStatus, activeTab, fetchBatchJobs]);

     // Auto-process jobs that are in auto-processing mode
     useEffect(() => {
          if (autoProcessingJobs.size === 0) return;

          const checkAndProcess = async () => {
               // Clean up jobs that are no longer running (completed, paused, failed, etc.)
               setAutoProcessingJobs((prev) => {
                    const newSet = new Set(prev);
                    for (const jobKey of prev) {
                         // jobKey format is "SYMBOL_INTERVAL" where symbol may contain "/"
                         // We need to find the last "_" to split symbol and interval
                         const lastUnderscore = jobKey.lastIndexOf('_');
                         if (lastUnderscore === -1) continue;
                         
                         const symbol = jobKey.substring(0, lastUnderscore);
                         const interval = jobKey.substring(lastUnderscore + 1);
                         const job = jobs.find(j => j.symbol === symbol && j.interval === interval);
                         if (!job || job.status !== "running") {
                              newSet.delete(jobKey);
                         }
                    }
                    return newSet;
               });

               // Get current jobs that are still running and in auto-processing
               const currentJobs = jobs.filter(job => {
                    const jobKey = `${job.symbol}_${job.interval}`;
                    return autoProcessingJobs.has(jobKey) && job.status === "running";
               });

               // Process each job that's still running
               for (const job of currentJobs) {
                    const jobKey = `${job.symbol}_${job.interval}`;
                    const isCurrentlyProcessing = processing[jobKey];
                    
                    // Only process if not already processing
                    if (!isCurrentlyProcessing && autoProcessingJobs.has(jobKey)) {
                         await handleProcess(job.symbol, job.interval, true);
                    }
               }
          };

          // Check every 2 seconds
          const interval = setInterval(checkAndProcess, 2000);

          return () => clearInterval(interval);
     }, [autoProcessingJobs, jobs, processing, handleProcess]);

     useEffect(() => {
          if (activeTab === "batch") {
               fetchBatchJobs();
          }
     }, [activeTab, fetchBatchJobs]);

     useEffect(() => {
          if (selectedAccountId) {
               setBatchFormData((prev) => ({ ...prev, exchange_account_id: selectedAccountId }));
          }
     }, [selectedAccountId]);

     // Fetch exchanges on mount
     useEffect(() => {
          fetchExchanges();
     }, [fetchExchanges]);

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
          <div style={{ padding: "0 16px", maxWidth: "1870px", margin: "0 auto", color: "#ededed", minHeight: "100vh" }}>
               {/* Header */}
               <div style={{ marginBottom: "32px", marginTop: "24px" }}>
                    <h1 style={{ 
                         fontSize: "32px", 
                         fontWeight: "bold", 
                         marginBottom: "8px",
                         background: "linear-gradient(to right, #FFAE00, #FFD700)",
                         WebkitBackgroundClip: "text",
                         WebkitTextFillColor: "transparent",
                         backgroundClip: "text"
                    }}>
                         📥 Backfill Management
                    </h1>
                    <p style={{ color: "#888888", fontSize: "16px", margin: 0 }}>
                         Manage historical data collection with start/stop, resume, and backup capabilities
                    </p>
               </div>

               {/* Tabs */}
               <div style={{ 
                    marginBottom: "24px", 
                    display: "flex", 
                    gap: "16px", 
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)" 
               }}>
                    <button
                         onClick={() => setActiveTab("single")}
                         style={{
                              padding: "12px 24px",
                              fontWeight: "600",
                              fontSize: "14px",
                              transition: "all 0.2s",
                              border: "none",
                              background: "transparent",
                              color: activeTab === "single" ? "#FFAE00" : "#888888",
                              borderBottom: activeTab === "single" ? "2px solid #FFAE00" : "2px solid transparent",
                              cursor: "pointer",
                         }}
                         onMouseEnter={(e) => {
                              if (activeTab !== "single") {
                                   e.currentTarget.style.color = "#ededed";
                              }
                         }}
                         onMouseLeave={(e) => {
                              if (activeTab !== "single") {
                                   e.currentTarget.style.color = "#888888";
                              }
                         }}
                    >
                         Single Backfill
                    </button>
                    <button
                         onClick={() => setActiveTab("batch")}
                         style={{
                              padding: "12px 24px",
                              fontWeight: "600",
                              fontSize: "14px",
                              transition: "all 0.2s",
                              border: "none",
                              background: "transparent",
                              color: activeTab === "batch" ? "#FFAE00" : "#888888",
                              borderBottom: activeTab === "batch" ? "2px solid #FFAE00" : "2px solid transparent",
                              cursor: "pointer",
                         }}
                         onMouseEnter={(e) => {
                              if (activeTab !== "batch") {
                                   e.currentTarget.style.color = "#ededed";
                              }
                         }}
                         onMouseLeave={(e) => {
                              if (activeTab !== "batch") {
                                   e.currentTarget.style.color = "#888888";
                              }
                         }}
                    >
                         Batch Backfill
                    </button>
               </div>

               {/* Messages */}
               {error && (
                    <div style={{
                         marginBottom: "16px",
                         padding: "12px",
                         backgroundColor: "rgba(239, 68, 68, 0.15)",
                         border: "2px solid rgba(239, 68, 68, 0.5)",
                         borderRadius: "8px",
                         color: "#ef4444",
                         fontSize: "14px",
                         fontWeight: "500",
                         display: "flex",
                         alignItems: "center",
                         gap: "8px"
                    }}>
                         <span>⚠️</span>
                         <span>{error}</span>
                    </div>
               )}
               {success && (
                    <div style={{
                         marginBottom: "16px",
                         padding: "12px",
                         backgroundColor: "rgba(34, 197, 94, 0.15)",
                         border: "2px solid rgba(34, 197, 94, 0.5)",
                         borderRadius: "8px",
                         color: "#22c55e",
                         fontSize: "14px",
                         fontWeight: "500",
                         display: "flex",
                         alignItems: "center",
                         gap: "8px"
                    }}>
                         <span>✅</span>
                         <span>{success}</span>
                    </div>
               )}

               {/* Exchange Account Selector */}
               {!selectedAccountId && (
                    <div style={{
                         marginBottom: "24px",
                         padding: "24px",
                         backgroundColor: "rgba(234, 179, 8, 0.15)",
                         border: "1px solid rgba(234, 179, 8, 0.3)",
                         borderRadius: "8px",
                         color: "#eab308"
                    }}>
                         ⚠️ Please select an exchange account from the header to view available symbols
                    </div>
               )}

               {/* Sync Symbols Buttons */}
               {selectedAccountId && (
                    <div style={{ marginBottom: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                         <div style={{ 
                              display: "flex", 
                              justifyContent: "space-between", 
                              alignItems: "center", 
                              gap: "16px",
                              flexWrap: "wrap"
                         }}>
                              <div style={{ fontSize: "14px", color: "#888888" }}>
                                   {markets.length > 0 ? <>📊 {markets.length} symbols loaded from database</> : <>⚠️ No symbols in database. Sync from exchange to load symbols.</>}
                              </div>
                              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                                   <button
                                        onClick={syncSymbols}
                                        disabled={symbolsLoading}
                                        style={{
                                             padding: "8px 16px",
                                             backgroundColor: "rgba(37, 99, 235, 0.2)",
                                             border: "1px solid rgba(59, 130, 246, 0.3)",
                                             color: "#60a5fa",
                                             borderRadius: "8px",
                                             fontSize: "14px",
                                             fontWeight: "500",
                                             cursor: symbolsLoading ? "not-allowed" : "pointer",
                                             opacity: symbolsLoading ? 0.5 : 1,
                                             transition: "all 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                             if (!symbolsLoading) {
                                                  e.currentTarget.style.backgroundColor = "rgba(37, 99, 235, 0.3)";
                                             }
                                        }}
                                        onMouseLeave={(e) => {
                                             if (!symbolsLoading) {
                                                  e.currentTarget.style.backgroundColor = "rgba(37, 99, 235, 0.2)";
                                             }
                                        }}
                                   >
                                        {symbolsLoading ? "⏳ Syncing..." : "🔄 Sync Current Exchange"}
                                   </button>
                                   <button
                                        onClick={syncAllExchanges}
                                        disabled={syncingAll || symbolsLoading}
                                        style={{
                                             padding: "8px 16px",
                                             backgroundColor: "rgba(255, 174, 0, 0.2)",
                                             border: "1px solid rgba(255, 174, 0, 0.3)",
                                             color: "#FFAE00",
                                             borderRadius: "8px",
                                             fontSize: "14px",
                                             fontWeight: "500",
                                             cursor: (syncingAll || symbolsLoading) ? "not-allowed" : "pointer",
                                             opacity: (syncingAll || symbolsLoading) ? 0.5 : 1,
                                             transition: "all 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                             if (!syncingAll && !symbolsLoading) {
                                                  e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.3)";
                                             }
                                        }}
                                        onMouseLeave={(e) => {
                                             if (!syncingAll && !symbolsLoading) {
                                                  e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.2)";
                                             }
                                        }}
                                   >
                                        {syncingAll ? "⏳ Syncing All..." : "🌐 Sync All Exchanges"}
                                   </button>
                              </div>
                         </div>
                         
                         {/* Sync Specific Exchange */}
                         <div style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              padding: "16px",
                              backgroundColor: "#1a1a1a",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              borderRadius: "8px",
                              flexWrap: "wrap"
                         }}>
                              <label style={{ 
                                   fontSize: "14px", 
                                   color: "#888888", 
                                   whiteSpace: "nowrap" 
                              }}>
                                   Sync Specific Exchange:
                              </label>
                              <select
                                   value={selectedExchangeName}
                                   onChange={(e) => setSelectedExchangeName(e.target.value)}
                                   disabled={syncingExchange || syncingAll}
                                   style={{
                                        flex: 1,
                                        minWidth: "200px",
                                        padding: "8px 16px",
                                        backgroundColor: "#252525",
                                        border: "1px solid rgba(255, 255, 255, 0.1)",
                                        color: "#ededed",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        outline: "none",
                                        cursor: (syncingExchange || syncingAll) ? "not-allowed" : "pointer",
                                        opacity: (syncingExchange || syncingAll) ? 0.5 : 1,
                                   }}
                                   onFocus={(e) => {
                                        e.currentTarget.style.borderColor = "#FFAE00";
                                   }}
                                   onBlur={(e) => {
                                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                                   }}
                              >
                                   <option value="">Select Exchange...</option>
                                   {exchanges.map((ex) => (
                                        <option key={ex.id} value={ex.name}>
                                             {ex.display_name} ({ex.name})
                                        </option>
                                   ))}
                              </select>
                              <button
                                   onClick={syncSpecificExchange}
                                   disabled={!selectedExchangeName || syncingExchange || syncingAll || symbolsLoading}
                                   style={{
                                        padding: "8px 16px",
                                        backgroundColor: "rgba(147, 51, 234, 0.2)",
                                        border: "1px solid rgba(168, 85, 247, 0.3)",
                                        color: "#a855f7",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        whiteSpace: "nowrap",
                                        cursor: (!selectedExchangeName || syncingExchange || syncingAll || symbolsLoading) ? "not-allowed" : "pointer",
                                        opacity: (!selectedExchangeName || syncingExchange || syncingAll || symbolsLoading) ? 0.5 : 1,
                                        transition: "all 0.2s",
                                   }}
                                   onMouseEnter={(e) => {
                                        if (selectedExchangeName && !syncingExchange && !syncingAll && !symbolsLoading) {
                                             e.currentTarget.style.backgroundColor = "rgba(147, 51, 234, 0.3)";
                                        }
                                   }}
                                   onMouseLeave={(e) => {
                                        if (selectedExchangeName && !syncingExchange && !syncingAll && !symbolsLoading) {
                                             e.currentTarget.style.backgroundColor = "rgba(147, 51, 234, 0.2)";
                                        }
                                   }}
                              >
                                   {syncingExchange ? "⏳ Syncing..." : "🔄 Sync"}
                              </button>
                         </div>
                    </div>
               )}
                    
                    {/* Sync All Exchanges Results Modal */}
                    {showSyncAllResults && syncAllResults && (
                         <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowSyncAllResults(false)}>
                              <div className="bg-[#252525] border border-[#333] rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                                   <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-semibold text-[#FFAE00]">Sync All Exchanges - Results</h2>
                                        <button
                                             onClick={() => setShowSyncAllResults(false)}
                                             className="text-gray-400 hover:text-white transition-colors text-2xl"
                                        >
                                             ×
                                        </button>
                                   </div>
                                   
                                   {/* Summary */}
                                   {syncAllResults.summary && (
                                        <div className="mb-6 p-4 bg-[#1a1a1a] border border-[#333] rounded-lg">
                                             <h3 className="text-lg font-semibold mb-3 text-white">Summary</h3>
                                             <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                  <div>
                                                       <div className="text-sm text-gray-400">Exchanges Synced</div>
                                                       <div className="text-xl font-bold text-green-400">{syncAllResults.summary.exchanges_synced}</div>
                                                  </div>
                                                  <div>
                                                       <div className="text-sm text-gray-400">Exchanges Failed</div>
                                                       <div className="text-xl font-bold text-red-400">{syncAllResults.summary.exchanges_failed}</div>
                                                  </div>
                                                  <div>
                                                       <div className="text-sm text-gray-400">Total Symbols</div>
                                                       <div className="text-xl font-bold text-blue-400">{syncAllResults.summary.total_symbols}</div>
                                                  </div>
                                                  <div>
                                                       <div className="text-sm text-gray-400">Added</div>
                                                       <div className="text-xl font-bold text-green-400">{syncAllResults.summary.total_added}</div>
                                                  </div>
                                                  <div>
                                                       <div className="text-sm text-gray-400">Updated</div>
                                                       <div className="text-xl font-bold text-yellow-400">{syncAllResults.summary.total_updated}</div>
                                                  </div>
                                             </div>
                                        </div>
                                   )}
                                   
                                   {/* Detailed Results */}
                                   {syncAllResults.results && (
                                        <div>
                                             <h3 className="text-lg font-semibold mb-3 text-white">Exchange Details</h3>
                                             <div className="space-y-3">
                                                  {Object.entries(syncAllResults.results).map(([exchangeName, result]: [string, any]) => (
                                                       <div
                                                            key={exchangeName}
                                                            className={`p-4 rounded-lg border ${
                                                                 result.error
                                                                      ? "bg-red-500/10 border-red-500/30"
                                                                      : "bg-green-500/10 border-green-500/30"
                                                            }`}
                                                       >
                                                            <div className="flex justify-between items-start mb-2">
                                                                 <div className="font-semibold text-white">{exchangeName}</div>
                                                                 {result.error ? (
                                                                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">Failed</span>
                                                                 ) : (
                                                                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Success</span>
                                                                 )}
                                                            </div>
                                                            {result.error ? (
                                                                 <div className="text-sm text-red-400">{result.error}</div>
                                                            ) : (
                                                                 <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                                                                      <div>
                                                                           <span className="text-gray-400">Total: </span>
                                                                           <span className="text-white font-semibold">{result.total || 0}</span>
                                                                      </div>
                                                                      <div>
                                                                           <span className="text-gray-400">Added: </span>
                                                                           <span className="text-green-400 font-semibold">{result.added || 0}</span>
                                                                      </div>
                                                                      <div>
                                                                           <span className="text-gray-400">Updated: </span>
                                                                           <span className="text-yellow-400 font-semibold">{result.updated || 0}</span>
                                                                      </div>
                                                                 </div>
                                                            )}
                                                       </div>
                                                  ))}
                                             </div>
                                        </div>
                                   )}
                                   
                                   <div className="mt-6 flex justify-end">
                                        <button
                                             onClick={() => setShowSyncAllResults(false)}
                                             className="px-6 py-2 bg-[#FFAE00] text-black rounded-lg hover:bg-[#FFD700] transition-colors font-semibold"
                                        >
                                             Close
                                        </button>
                                   </div>
                              </div>
                         </div>
                    )}

                    {/* Sync Specific Exchange Result Modal */}
                    {showSyncExchangeResult && syncExchangeResult && (
                         <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowSyncExchangeResult(false)}>
                              <div className="bg-[#252525] border border-[#333] rounded-xl p-6 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
                                   <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-semibold text-[#FFAE00]">Sync Exchange - Results</h2>
                                        <button
                                             onClick={() => setShowSyncExchangeResult(false)}
                                             className="text-gray-400 hover:text-white transition-colors text-2xl"
                                        >
                                             ×
                                        </button>
                                   </div>
                                   
                                   {syncExchangeResult.error ? (
                                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                                             <div className="flex items-center gap-2 mb-2">
                                                  <span className="text-red-400 font-semibold">❌ Error</span>
                                             </div>
                                             <div className="text-sm text-gray-300 mb-2">
                                                  <span className="text-gray-400">Exchange: </span>
                                                  <span className="font-semibold">{syncExchangeResult.exchange_name}</span>
                                             </div>
                                             <div className="text-sm text-red-400">{syncExchangeResult.error}</div>
                                        </div>
                                   ) : (
                                        <div className="space-y-4">
                                             <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                                                  <div className="flex items-center gap-2 mb-3">
                                                       <span className="text-green-400 font-semibold">✅ Success</span>
                                                  </div>
                                                  <div className="text-sm text-gray-300 mb-2">
                                                       <span className="text-gray-400">Exchange: </span>
                                                       <span className="font-semibold">{syncExchangeResult.exchange_name}</span>
                                                  </div>
                                                  <div className="grid grid-cols-3 gap-4 mt-4">
                                                       <div>
                                                            <div className="text-xs text-gray-400 mb-1">Total Symbols</div>
                                                            <div className="text-xl font-bold text-blue-400">{syncExchangeResult.total || 0}</div>
                                                       </div>
                                                       <div>
                                                            <div className="text-xs text-gray-400 mb-1">Added</div>
                                                            <div className="text-xl font-bold text-green-400">{syncExchangeResult.added || 0}</div>
                                                       </div>
                                                       <div>
                                                            <div className="text-xs text-gray-400 mb-1">Updated</div>
                                                            <div className="text-xl font-bold text-yellow-400">{syncExchangeResult.updated || 0}</div>
                                                       </div>
                                                  </div>
                                             </div>
                                        </div>
                                   )}
                                   
                                   <div className="mt-6 flex justify-end">
                                        <button
                                             onClick={() => setShowSyncExchangeResult(false)}
                                             className="px-6 py-2 bg-[#FFAE00] text-black rounded-lg hover:bg-[#FFD700] transition-colors font-semibold"
                                        >
                                             Close
                                        </button>
                                   </div>
                              </div>
                         </div>
                    )}

               {/* All Symbols Table - For Download */}
               {selectedAccountId && markets.length > 0 && (
                    <div style={{
                         backgroundColor: "#252525",
                         border: "1px solid rgba(255, 255, 255, 0.1)",
                         borderRadius: "12px",
                         padding: "24px",
                         marginBottom: "24px",
                         boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)"
                    }}>
                         <div style={{ 
                              display: "flex", 
                              justifyContent: "space-between", 
                              alignItems: "center", 
                              marginBottom: "24px",
                              flexWrap: "wrap",
                              gap: "16px"
                         }}>
                              <h2 style={{ 
                                   fontSize: "24px", 
                                   fontWeight: "600", 
                                   color: "#FFAE00",
                                   margin: 0
                              }}>
                                   All Symbols - Start Download
                              </h2>
                              <button
                                   onClick={() => {
                                        fetchMarkets();
                                        fetchDataStatus();
                                   }}
                                   style={{
                                        padding: "8px 16px",
                                        backgroundColor: "#1a1a1a",
                                        border: "1px solid rgba(255, 255, 255, 0.1)",
                                        color: "#ededed",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                   }}
                                   onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#2a2a2a";
                                   }}
                                   onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "#1a1a1a";
                                   }}
                              >
                                   🔄 Refresh
                              </button>
                         </div>

                         {/* Search and Filter Bar */}
                         <div style={{ 
                              marginBottom: "24px", 
                              display: "flex", 
                              flexDirection: "column",
                              gap: "16px"
                         }}>
                              <div style={{ 
                                   display: "flex", 
                                   flexDirection: "row",
                                   gap: "12px",
                                   flexWrap: "wrap"
                              }}>
                                   {/* Search Input */}
                                   <div style={{ flex: 1, minWidth: "200px" }}>
                                        <input
                                             type="text"
                                             placeholder="🔍 Search symbols (e.g., BTC, ETH, USDT)..."
                                             value={searchQuery}
                                             onChange={(e) => setSearchQuery(e.target.value)}
                                             style={{
                                                  width: "100%",
                                                  padding: "10px 16px",
                                                  backgroundColor: "#1a1a1a",
                                                  border: "1px solid rgba(255, 255, 255, 0.1)",
                                                  color: "#ededed",
                                                  borderRadius: "8px",
                                                  fontSize: "14px",
                                                  outline: "none",
                                                  transition: "all 0.2s",
                                             }}
                                             onFocus={(e) => {
                                                  e.currentTarget.style.borderColor = "#FFAE00";
                                             }}
                                             onBlur={(e) => {
                                                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                                             }}
                                        />
                                   </div>

                                   {/* Status Filter */}
                                   <div style={{ flexShrink: 0 }}>
                                        <select
                                             value={statusFilter}
                                             onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                                             style={{
                                                  padding: "10px 16px",
                                                  backgroundColor: "#1a1a1a",
                                                  border: "1px solid rgba(255, 255, 255, 0.1)",
                                                  color: "#ededed",
                                                  borderRadius: "8px",
                                                  fontSize: "14px",
                                                  outline: "none",
                                                  cursor: "pointer",
                                                  transition: "all 0.2s",
                                             }}
                                             onFocus={(e) => {
                                                  e.currentTarget.style.borderColor = "#FFAE00";
                                             }}
                                             onBlur={(e) => {
                                                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                                             }}
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
                                   <div style={{ flexShrink: 0 }}>
                                        <select
                                             value={intervalFilter}
                                             onChange={(e) => setIntervalFilter(e.target.value)}
                                             style={{
                                                  padding: "10px 16px",
                                                  backgroundColor: "#1a1a1a",
                                                  border: "1px solid rgba(255, 255, 255, 0.1)",
                                                  color: "#ededed",
                                                  borderRadius: "8px",
                                                  fontSize: "14px",
                                                  outline: "none",
                                                  cursor: "pointer",
                                                  transition: "all 0.2s",
                                             }}
                                             onFocus={(e) => {
                                                  e.currentTarget.style.borderColor = "#FFAE00";
                                             }}
                                             onBlur={(e) => {
                                                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                                             }}
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
                                             style={{
                                                  padding: "10px 16px",
                                                  backgroundColor: "rgba(220, 38, 38, 0.2)",
                                                  border: "1px solid rgba(239, 68, 68, 0.3)",
                                                  color: "#ef4444",
                                                  borderRadius: "8px",
                                                  fontSize: "14px",
                                                  cursor: "pointer",
                                                  transition: "all 0.2s",
                                             }}
                                             onMouseEnter={(e) => {
                                                  e.currentTarget.style.backgroundColor = "rgba(220, 38, 38, 0.3)";
                                             }}
                                             onMouseLeave={(e) => {
                                                  e.currentTarget.style.backgroundColor = "rgba(220, 38, 38, 0.2)";
                                             }}
                                        >
                                             ✕ Clear
                                        </button>
                                   )}
                              </div>

                              {/* Results Count */}
                              <div style={{ fontSize: "14px", color: "#888888" }}>
                                   Showing {filteredMarkets.length} of {markets.length} symbols
                              </div>
                         </div>

                         <div style={{
                              overflowX: "auto",
                              maxHeight: "600px",
                              overflowY: "auto"
                         }}>
                              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                   <thead style={{
                                        backgroundColor: "#1a1a1a",
                                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                                        position: "sticky",
                                        top: 0,
                                        zIndex: 10
                                   }}>
                                        <tr>
                                             <th style={{
                                                  padding: "12px 16px",
                                                  textAlign: "left",
                                                  fontSize: "14px",
                                                  fontWeight: "500",
                                                  color: "#ededed",
                                                  position: "sticky",
                                                  left: 0,
                                                  backgroundColor: "#1a1a1a",
                                                  zIndex: 11,
                                                  borderRight: "1px solid rgba(255, 255, 255, 0.1)"
                                             }}>
                                                  Symbol
                                             </th>
                                             {availableIntervals.map((interval) => (
                                                  <th key={interval} style={{
                                                       padding: "12px",
                                                       textAlign: "center",
                                                       fontSize: "12px",
                                                       fontWeight: "500",
                                                       color: "#ededed",
                                                       minWidth: "120px"
                                                  }}>
                                                       {interval}
                                                  </th>
                                             ))}
                                             <th style={{
                                                  padding: "12px 16px",
                                                  textAlign: "left",
                                                  fontSize: "14px",
                                                  fontWeight: "500",
                                                  color: "#ededed"
                                             }}>
                                                  Actions
                                             </th>
                                        </tr>
                                   </thead>
                                   <tbody>
                                        {filteredMarkets.map((market) => {
                                             const symbolStatus = dataStatus[market.symbol] || {};
                                             // Normalize symbol for backup filename matching
                                             const normalizedSymbol = market.symbol.replace("/", "_");

                                             return (
                                                  <tr 
                                                       key={market.symbol}
                                                       style={{
                                                            borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                                                            transition: "background-color 0.2s",
                                                       }}
                                                       onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = "rgba(26, 26, 26, 0.5)";
                                                       }}
                                                       onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = "transparent";
                                                       }}
                                                  >
                                                       <td style={{
                                                            padding: "12px 16px",
                                                            fontWeight: "600",
                                                            color: "#ededed",
                                                            position: "sticky",
                                                            left: 0,
                                                            backgroundColor: "#252525",
                                                            zIndex: 10,
                                                            borderRight: "1px solid rgba(255, 255, 255, 0.1)"
                                                       }}>
                                                            {market.symbol}
                                                       </td>
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
                                                                      <td key={interval} style={{
                                                                           padding: "12px",
                                                                           textAlign: "center"
                                                                      }}>
                                                                           <div style={{
                                                                                display: "flex",
                                                                                flexDirection: "column",
                                                                                alignItems: "center",
                                                                                gap: "4px"
                                                                           }}>
                                                                                {activeJob ? (
                                                                                     <span
                                                                                          style={{
                                                                                               display: "inline-block",
                                                                                               padding: "4px 8px",
                                                                                               borderRadius: "4px",
                                                                                               fontSize: "12px",
                                                                                               fontWeight: "500",
                                                                                               ...(activeJob.status === "running" ? {
                                                                                                    backgroundColor: "rgba(59, 130, 246, 0.2)",
                                                                                                    color: "#60a5fa",
                                                                                                    border: "1px solid rgba(59, 130, 246, 0.3)"
                                                                                               } : activeJob.status === "paused" ? {
                                                                                                    backgroundColor: "rgba(234, 179, 8, 0.2)",
                                                                                                    color: "#eab308",
                                                                                                    border: "1px solid rgba(234, 179, 8, 0.3)"
                                                                                               } : activeJob.status === "completed" ? {
                                                                                                    backgroundColor: "rgba(34, 197, 94, 0.2)",
                                                                                                    color: "#22c55e",
                                                                                                    border: "1px solid rgba(34, 197, 94, 0.3)"
                                                                                               } : {
                                                                                                    backgroundColor: "rgba(239, 68, 68, 0.2)",
                                                                                                    color: "#ef4444",
                                                                                                    border: "1px solid rgba(239, 68, 68, 0.3)"
                                                                                               })
                                                                                          }}
                                                                                     >
                                                                                          {activeJob.status.toUpperCase()}
                                                                                     </span>
                                                                                ) : hasData ? (
                                                                                     <span
                                                                                          style={{
                                                                                               display: "inline-block",
                                                                                               padding: "4px 8px",
                                                                                               borderRadius: "4px",
                                                                                               fontSize: "12px",
                                                                                               fontWeight: "500",
                                                                                               ...(isComplete ? {
                                                                                                    backgroundColor: "rgba(34, 197, 94, 0.2)",
                                                                                                    color: "#22c55e",
                                                                                                    border: "1px solid rgba(34, 197, 94, 0.3)"
                                                                                               } : isIncomplete ? {
                                                                                                    backgroundColor: "rgba(234, 179, 8, 0.2)",
                                                                                                    color: "#eab308",
                                                                                                    border: "1px solid rgba(234, 179, 8, 0.3)"
                                                                                               } : {
                                                                                                    backgroundColor: "rgba(107, 114, 128, 0.2)",
                                                                                                    color: "#9ca3af",
                                                                                                    border: "1px solid rgba(107, 114, 128, 0.3)"
                                                                                               })
                                                                                          }}
                                                                                     >
                                                                                          {isComplete ? "✅" : isIncomplete ? "⚠️" : "📊"}
                                                                                     </span>
                                                                                ) : (
                                                                                     <span style={{
                                                                                          display: "inline-block",
                                                                                          padding: "4px 8px",
                                                                                          borderRadius: "4px",
                                                                                          fontSize: "12px",
                                                                                          backgroundColor: "rgba(107, 114, 128, 0.2)",
                                                                                          color: "#9ca3af",
                                                                                          border: "1px solid rgba(107, 114, 128, 0.3)"
                                                                                     }}>
                                                                                          ❌
                                                                                     </span>
                                                                                )}
                                                                                {!activeJob && (
                                                                                     <div style={{ display: "flex", gap: "4px" }}>
                                                                                          {hasBackup && !hasData && backupFile && (
                                                                                               <button
                                                                                                    onClick={async () => {
                                                                                                         await handleRestoreBackup(backupFile, false);
                                                                                                         await fetchDataStatus();
                                                                                                    }}
                                                                                                    disabled={processing[`restore_${backupFile}`] || loading}
                                                                                                    style={{
                                                                                                         padding: "4px 8px",
                                                                                                         fontSize: "12px",
                                                                                                         backgroundColor: "rgba(147, 51, 234, 0.2)",
                                                                                                         border: "1px solid rgba(168, 85, 247, 0.3)",
                                                                                                         color: "#a855f7",
                                                                                                         borderRadius: "4px",
                                                                                                         cursor: (processing[`restore_${backupFile}`] || loading) ? "not-allowed" : "pointer",
                                                                                                         opacity: (processing[`restore_${backupFile}`] || loading) ? 0.5 : 1,
                                                                                                         transition: "all 0.2s",
                                                                                                    }}
                                                                                                    title={`Restore backup for ${market.symbol} ${interval} from ${backupFile}`}
                                                                                                    onMouseEnter={(e) => {
                                                                                                         if (!processing[`restore_${backupFile}`] && !loading) {
                                                                                                              e.currentTarget.style.backgroundColor = "rgba(147, 51, 234, 0.3)";
                                                                                                         }
                                                                                                    }}
                                                                                                    onMouseLeave={(e) => {
                                                                                                         if (!processing[`restore_${backupFile}`] && !loading) {
                                                                                                              e.currentTarget.style.backgroundColor = "rgba(147, 51, 234, 0.2)";
                                                                                                         }
                                                                                                    }}
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
                                                                                               style={{
                                                                                                    padding: "4px 8px",
                                                                                                    fontSize: "12px",
                                                                                                    backgroundColor: "rgba(34, 197, 94, 0.2)",
                                                                                                    border: "1px solid rgba(34, 197, 94, 0.3)",
                                                                                                    color: "#22c55e",
                                                                                                    borderRadius: "4px",
                                                                                                    cursor: loading ? "not-allowed" : "pointer",
                                                                                                    opacity: loading ? 0.5 : 1,
                                                                                                    transition: "all 0.2s",
                                                                                               }}
                                                                                               title={`Start download for ${market.symbol} ${interval}`}
                                                                                               onMouseEnter={(e) => {
                                                                                                    if (!loading) {
                                                                                                         e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 0.3)";
                                                                                                    }
                                                                                               }}
                                                                                               onMouseLeave={(e) => {
                                                                                                    if (!loading) {
                                                                                                         e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 0.2)";
                                                                                                    }
                                                                                               }}
                                                                                          >
                                                                                               ⬇️
                                                                                          </button>
                                                                                     </div>
                                                                                )}
                                                                           </div>
                                                                      </td>
                                                                 );
                                                            })}
                                                       <td style={{ padding: "12px 16px" }}>
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
                                                                 style={{
                                                                      padding: "6px 12px",
                                                                      fontSize: "12px",
                                                                      backgroundColor: "rgba(37, 99, 235, 0.2)",
                                                                      border: "1px solid rgba(59, 130, 246, 0.3)",
                                                                      color: "#60a5fa",
                                                                      borderRadius: "4px",
                                                                      cursor: loading ? "not-allowed" : "pointer",
                                                                      opacity: loading ? 0.5 : 1,
                                                                      transition: "all 0.2s",
                                                                 }}
                                                                 title="Start download for all intervals"
                                                                 onMouseEnter={(e) => {
                                                                      if (!loading) {
                                                                           e.currentTarget.style.backgroundColor = "rgba(37, 99, 235, 0.3)";
                                                                      }
                                                                 }}
                                                                 onMouseLeave={(e) => {
                                                                      if (!loading) {
                                                                           e.currentTarget.style.backgroundColor = "rgba(37, 99, 235, 0.2)";
                                                                      }
                                                                 }}
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
               <div style={{
                    backgroundColor: "#252525",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "12px",
                    padding: "24px",
                    marginBottom: "24px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)"
               }}>
                    <div style={{
                         display: "flex",
                         justifyContent: "space-between",
                         alignItems: "center",
                         marginBottom: "24px",
                         flexWrap: "wrap",
                         gap: "16px"
                    }}>
                         <h2 style={{
                              fontSize: "24px",
                              fontWeight: "600",
                              color: "#FFAE00",
                              margin: 0
                         }}>
                              Backfill Jobs
                         </h2>
                         <button
                              onClick={() => {
                                   fetchJobs();
                                   fetchBackups();
                                   fetchDataStatus();
                              }}
                              style={{
                                   padding: "8px 16px",
                                   backgroundColor: "#1a1a1a",
                                   border: "1px solid rgba(255, 255, 255, 0.1)",
                                   color: "#ededed",
                                   borderRadius: "8px",
                                   fontSize: "14px",
                                   cursor: "pointer",
                                   transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                   e.currentTarget.style.backgroundColor = "#2a2a2a";
                              }}
                              onMouseLeave={(e) => {
                                   e.currentTarget.style.backgroundColor = "#1a1a1a";
                              }}
                         >
                              🔄 Refresh
                         </button>
                    </div>

                    {jobs.length === 0 ? (
                         <div style={{
                              textAlign: "center",
                              padding: "48px 0",
                              color: "#888888"
                         }}>
                              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📭</div>
                              <p style={{ margin: 0 }}>No active backfill jobs</p>
                         </div>
                    ) : (
                         <div style={{ overflowX: "auto" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                   <thead style={{
                                        backgroundColor: "#1a1a1a",
                                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
                                   }}>
                                        <tr>
                                             <th style={{
                                                  padding: "12px 16px",
                                                  textAlign: "left",
                                                  fontSize: "14px",
                                                  fontWeight: "500",
                                                  color: "#ededed"
                                             }}>
                                                  Symbol
                                             </th>
                                             <th style={{
                                                  padding: "12px 16px",
                                                  textAlign: "left",
                                                  fontSize: "14px",
                                                  fontWeight: "500",
                                                  color: "#ededed"
                                             }}>
                                                  Last Updated
                                             </th>
                                             <th style={{
                                                  padding: "12px 16px",
                                                  textAlign: "left",
                                                  fontSize: "14px",
                                                  fontWeight: "500",
                                                  color: "#ededed"
                                             }}>
                                                  Intervals
                                             </th>
                                             <th style={{
                                                  padding: "12px 16px",
                                                  textAlign: "left",
                                                  fontSize: "14px",
                                                  fontWeight: "500",
                                                  color: "#ededed"
                                             }}>
                                                  Progress
                                             </th>
                                             <th style={{
                                                  padding: "12px 16px",
                                                  textAlign: "left",
                                                  fontSize: "14px",
                                                  fontWeight: "500",
                                                  color: "#ededed"
                                             }}>
                                                  Pages
                                             </th>
                                             <th style={{
                                                  padding: "12px 16px",
                                                  textAlign: "left",
                                                  fontSize: "14px",
                                                  fontWeight: "500",
                                                  color: "#ededed"
                                             }}>
                                                  Status
                                             </th>
                                             <th style={{
                                                  padding: "12px 16px",
                                                  textAlign: "left",
                                                  fontSize: "14px",
                                                  fontWeight: "500",
                                                  color: "#ededed"
                                             }}>
                                                  Backup File Name
                                             </th>
                                             <th style={{
                                                  padding: "12px 16px",
                                                  textAlign: "left",
                                                  fontSize: "14px",
                                                  fontWeight: "500",
                                                  color: "#ededed"
                                             }}>
                                                  Actions
                                             </th>
                                        </tr>
                                   </thead>
                                   <tbody>
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
                                                                 {backupFile ? (
                                                                      <div>
                                                                           <div className="text-xs text-gray-400 font-mono">{backupFile.filename}</div>
                                                                           {backupFile.created && (
                                                                                <div className="text-xs text-gray-500 mt-1">
                                                                                     {new Date(backupFile.created).toLocaleDateString('en-US', { 
                                                                                          year: 'numeric', 
                                                                                          month: '2-digit', 
                                                                                          day: '2-digit',
                                                                                          hour: '2-digit',
                                                                                          minute: '2-digit'
                                                                                     })}
                                                                                </div>
                                                                           )}
                                                                      </div>
                                                                 ) : (
                                                                      <div className="text-xs text-gray-400">-</div>
                                                                 )}
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
                                                                      {(job.status === "error" || job.status === "failed") && (
                                                                           <button
                                                                                onClick={() => handleRestart(job.symbol, job.interval, job.total_pages)}
                                                                                disabled={isProcessing}
                                                                                className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded hover:bg-blue-600/30 transition-colors disabled:opacity-50 text-sm font-medium"
                                                                                title="Restart failed/error job"
                                                                           >
                                                                                🔄 Restart
                                                                           </button>
                                                                      )}
                                                                      {(job.status === "error" || job.status === "failed") && (
                                                                           <button
                                                                                onClick={() => handleRestart(job.symbol, job.interval, job.total_pages)}
                                                                                disabled={isProcessing}
                                                                                className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded hover:bg-blue-600/30 transition-colors disabled:opacity-50 text-sm font-medium"
                                                                                title="Restart failed/error job"
                                                                           >
                                                                                🔄 Restart
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
                                                                                onClick={() => {
                                                                                     const jobKey = `${job.symbol}_${job.interval}`;
                                                                                     if (autoProcessingJobs.has(jobKey)) {
                                                                                          // Stop auto-processing
                                                                                          toggleAutoProcess(job.symbol, job.interval);
                                                                                     } else {
                                                                                          // Start auto-processing (will continue until done)
                                                                                          toggleAutoProcess(job.symbol, job.interval);
                                                                                     }
                                                                                }}
                                                                                disabled={isProcessing}
                                                                                style={{
                                                                                     padding: "8px 16px",
                                                                                     backgroundColor: autoProcessingJobs.has(`${job.symbol}_${job.interval}`) 
                                                                                          ? "rgba(239, 68, 68, 0.2)" 
                                                                                          : "rgba(34, 197, 94, 0.2)",
                                                                                     border: `1px solid ${autoProcessingJobs.has(`${job.symbol}_${job.interval}`) 
                                                                                          ? "rgba(239, 68, 68, 0.3)" 
                                                                                          : "rgba(34, 197, 94, 0.3)"}`,
                                                                                     color: autoProcessingJobs.has(`${job.symbol}_${job.interval}`) 
                                                                                          ? "#ef4444" 
                                                                                          : "#22c55e",
                                                                                     borderRadius: "4px",
                                                                                     fontSize: "14px",
                                                                                     fontWeight: "500",
                                                                                     cursor: isProcessing ? "not-allowed" : "pointer",
                                                                                     opacity: isProcessing ? 0.5 : 1,
                                                                                     transition: "all 0.2s",
                                                                                }}
                                                                                title={autoProcessingJobs.has(`${job.symbol}_${job.interval}`) 
                                                                                     ? "Stop auto-download" 
                                                                                     : "Start auto-download (will continue until complete)"}
                                                                                onMouseEnter={(e) => {
                                                                                     if (!isProcessing) {
                                                                                          const jobKey = `${job.symbol}_${job.interval}`;
                                                                                          if (autoProcessingJobs.has(jobKey)) {
                                                                                               e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.3)";
                                                                                          } else {
                                                                                               e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 0.3)";
                                                                                          }
                                                                                     }
                                                                                }}
                                                                                onMouseLeave={(e) => {
                                                                                     if (!isProcessing) {
                                                                                          const jobKey = `${job.symbol}_${job.interval}`;
                                                                                          if (autoProcessingJobs.has(jobKey)) {
                                                                                               e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
                                                                                          } else {
                                                                                               e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 0.2)";
                                                                                          }
                                                                                     }
                                                                                }}
                                                                           >
                                                                                {isProcessing ? "Processing..." : (autoProcessingJobs.has(`${job.symbol}_${job.interval}`) ? "⏹️ Stop" : "⬇️ Auto Download")}
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
                                                                      <button
                                                                           onClick={() => {
                                                                                console.log("Update button clicked:", { symbol: job.symbol, interval: job.interval, status: job.status });
                                                                                handleUpdate(job.symbol, job.interval);
                                                                           }}
                                                                           disabled={processing[`update_${job.symbol}_${job.interval}`] || false}
                                                                           className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded hover:bg-blue-600/30 transition-colors disabled:opacity-50 text-sm font-medium"
                                                                           title="Update - Download new candles from last timestamp to now"
                                                                      >
                                                                           {processing[`update_${job.symbol}_${job.interval}`] ? "Updating..." : "Update"}
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

                    {/* Batch Backfill Tab */}
                    {activeTab === "batch" && (
                         <div>
                              {/* Batch Backfill Form */}
                              <div className="mb-8 p-6 bg-[#202020] border border-[#2a2a2a] rounded-lg">
                                   <h2 className="text-2xl font-bold mb-6 text-[#FFAE00]">Start Batch Backfill</h2>
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Exchange Account ID */}
                                        <div>
                                             <label className="block text-sm font-medium text-gray-300 mb-2">
                                                  Exchange Account ID *
                                             </label>
                                             <input
                                                  type="number"
                                                  value={batchFormData.exchange_account_id}
                                                  onChange={(e) =>
                                                       setBatchFormData((prev) => ({
                                                            ...prev,
                                                            exchange_account_id: parseInt(e.target.value) || 0,
                                                       }))
                                                  }
                                                  className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white"
                                                  placeholder="Exchange Account ID"
                                             />
                                        </div>

                                        {/* Total Pages Per Job */}
                                        <div>
                                             <label className="block text-sm font-medium text-gray-300 mb-2">
                                                  Total Pages Per Job
                                             </label>
                                             <input
                                                  type="number"
                                                  value={batchFormData.total_pages_per_job}
                                                  onChange={(e) =>
                                                       setBatchFormData((prev) => ({
                                                            ...prev,
                                                            total_pages_per_job: parseInt(e.target.value) || 18,
                                                       }))
                                                  }
                                                  className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white"
                                                  placeholder="18"
                                             />
                                        </div>

                                        {/* Symbols Selection */}
                                        <div className="md:col-span-2">
                                             <label className="block text-sm font-medium text-gray-300 mb-2">
                                                  Symbols * (Select multiple)
                                             </label>
                                             <div className="max-h-40 overflow-y-auto p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
                                                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                                                       {markets.map((market) => (
                                                            <label
                                                                 key={market.symbol}
                                                                 className="flex items-center gap-2 cursor-pointer hover:bg-[#2a2a2a] p-2 rounded"
                                                            >
                                                                 <input
                                                                      type="checkbox"
                                                                      checked={batchFormData.symbols.includes(market.symbol)}
                                                                      onChange={(e) => {
                                                                           if (e.target.checked) {
                                                                                setBatchFormData((prev) => ({
                                                                                     ...prev,
                                                                                     symbols: [...prev.symbols, market.symbol],
                                                                                }));
                                                                           } else {
                                                                                setBatchFormData((prev) => ({
                                                                                     ...prev,
                                                                                     symbols: prev.symbols.filter((s) => s !== market.symbol),
                                                                                }));
                                                                           }
                                                                      }}
                                                                      className="w-4 h-4"
                                                                 />
                                                                 <span className="text-sm text-gray-300">{market.symbol}</span>
                                                            </label>
                                                       ))}
                                                  </div>
                                             </div>
                                             <div className="mt-2 text-sm text-gray-400">
                                                  Selected: {batchFormData.symbols.length} symbols
                                             </div>
                                        </div>

                                        {/* Intervals Selection */}
                                        <div className="md:col-span-2">
                                             <label className="block text-sm font-medium text-gray-300 mb-2">
                                                  Intervals * (Select multiple)
                                             </label>
                                             <div className="flex flex-wrap gap-2">
                                                  {availableIntervals.map((interval) => (
                                                       <label
                                                            key={interval}
                                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border transition-colors ${
                                                                 batchFormData.intervals.includes(interval)
                                                                      ? "bg-[#FFAE00]/20 border-[#FFAE00] text-[#FFAE00]"
                                                                      : "bg-[#1a1a1a] border-[#2a2a2a] text-gray-300 hover:border-[#FFAE00]/50"
                                                            }`}
                                                       >
                                                            <input
                                                                 type="checkbox"
                                                                 checked={batchFormData.intervals.includes(interval)}
                                                                 onChange={(e) => {
                                                                      if (e.target.checked) {
                                                                           setBatchFormData((prev) => ({
                                                                                ...prev,
                                                                                intervals: [...prev.intervals, interval],
                                                                           }));
                                                                      } else {
                                                                           setBatchFormData((prev) => ({
                                                                                ...prev,
                                                                                intervals: prev.intervals.filter((i) => i !== interval),
                                                                           }));
                                                                      }
                                                                 }}
                                                                 className="w-4 h-4"
                                                            />
                                                            <span>{interval}</span>
                                                       </label>
                                                  ))}
                                             </div>
                                        </div>

                                        {/* Auto Backup */}
                                        <div className="md:col-span-2">
                                             <label className="flex items-center gap-2 cursor-pointer">
                                                  <input
                                                       type="checkbox"
                                                       checked={batchFormData.auto_backup}
                                                       onChange={(e) =>
                                                            setBatchFormData((prev) => ({
                                                                 ...prev,
                                                                 auto_backup: e.target.checked,
                                                            }))
                                                       }
                                                       className="w-4 h-4"
                                                  />
                                                  <span className="text-sm text-gray-300">Auto Backup</span>
                                             </label>
                                        </div>
                                   </div>

                                   <div className="mt-6">
                                        <button
                                             onClick={handleStartBatch}
                                             disabled={loading}
                                             className="px-6 py-3 bg-[#FFAE00] text-[#1a1a1a] font-semibold rounded-lg hover:bg-[#FFD700] transition-colors disabled:opacity-50"
                                        >
                                             {loading ? "Starting..." : "Start Batch Backfill"}
                                        </button>
                                   </div>
                              </div>

                              {/* Batch Jobs Table */}
                              <div className="mb-8">
                                   <h2 className="text-2xl font-bold mb-4 text-[#FFAE00]">Batch Jobs</h2>
                                   {batchJobs.length === 0 ? (
                                        <div className="p-6 bg-[#202020] border border-[#2a2a2a] rounded-lg text-center text-gray-400">
                                             No batch jobs found
                                        </div>
                                   ) : (
                                        <div className="overflow-x-auto">
                                             <table className="w-full border-collapse">
                                                  <thead>
                                                       <tr className="bg-[#1a1a1a] border-b border-[#2a2a2a]">
                                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Batch ID</th>
                                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
                                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Progress</th>
                                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Symbols</th>
                                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Intervals</th>
                                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Started At</th>
                                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Actions</th>
                                                       </tr>
                                                  </thead>
                                                  <tbody>
                                                       {batchJobs.map((batchJob) => {
                                                            const progress = batchJob.total_jobs > 0 ? (batchJob.completed_jobs / batchJob.total_jobs) * 100 : 0;
                                                            const isProcessing = processing[`batch_${batchJob.batch_id}`] || false;

                                                            return (
                                                                 <tr key={batchJob.batch_id} className="hover:bg-[#1a1a1a]/50 transition-colors border-b border-[#2a2a2a]">
                                                                      <td className="px-4 py-4">
                                                                           <div className="font-semibold text-white text-sm">{batchJob.batch_id}</div>
                                                                      </td>
                                                                      <td className="px-4 py-4">
                                                                           <span
                                                                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                                                     batchJob.status === "running"
                                                                                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                                                                          : batchJob.status === "completed"
                                                                                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                                                                          : batchJob.status === "failed"
                                                                                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                                                                          : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                                                                                }`}
                                                                           >
                                                                                {batchJob.status.toUpperCase()}
                                                                           </span>
                                                                      </td>
                                                                      <td className="px-4 py-4">
                                                                           <div className="flex items-center gap-2">
                                                                                <div className="flex-1 bg-[#1a1a1a] rounded-full h-2 overflow-hidden">
                                                                                     <div
                                                                                          className="h-full bg-[#FFAE00] transition-all duration-300"
                                                                                          style={{ width: `${progress}%` }}
                                                                                     />
                                                                                </div>
                                                                                <span className="text-sm text-gray-300 whitespace-nowrap">
                                                                                     {batchJob.completed_jobs}/{batchJob.total_jobs} ({progress.toFixed(1)}%)
                                                                                </span>
                                                                           </div>
                                                                           {batchJob.failed_jobs > 0 && (
                                                                                <div className="text-xs text-red-400 mt-1">
                                                                                     {batchJob.failed_jobs} failed
                                                                                </div>
                                                                           )}
                                                                      </td>
                                                                      <td className="px-4 py-4">
                                                                           <div className="text-sm text-gray-300">
                                                                                {batchJob.symbols.length} symbols
                                                                                <div className="text-xs text-gray-500 mt-1">
                                                                                     {batchJob.symbols.slice(0, 3).join(", ")}
                                                                                     {batchJob.symbols.length > 3 && "..."}
                                                                                </div>
                                                                           </div>
                                                                      </td>
                                                                      <td className="px-4 py-4">
                                                                           <div className="text-sm text-gray-300">
                                                                                {batchJob.intervals.join(", ")}
                                                                           </div>
                                                                      </td>
                                                                      <td className="px-4 py-4">
                                                                           <div className="text-sm text-gray-400">
                                                                                {new Date(batchJob.started_at).toLocaleString()}
                                                                           </div>
                                                                      </td>
                                                                      <td className="px-4 py-4">
                                                                           <div className="flex gap-2">
                                                                                {batchJob.status === "running" && (
                                                                                     <button
                                                                                          onClick={() => handleProcessBatch(batchJob.batch_id)}
                                                                                          disabled={isProcessing}
                                                                                          className="px-4 py-2 bg-green-600/20 border border-green-500/30 text-green-400 rounded hover:bg-green-600/30 transition-colors disabled:opacity-50 text-sm font-medium"
                                                                                     >
                                                                                          {isProcessing ? "Processing..." : "Process"}
                                                                                     </button>
                                                                                )}
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
                    )}
          </div>
     );
}

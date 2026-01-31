import { useState, useEffect, useMemo } from "react";
import { useMarkets } from "./useMarkets";
import { useSync } from "./useSync";
import { useJobs } from "./useJobs";
import { useBackup } from "./useBackup";
import { useBatch } from "./useBatch";
import { useFilters } from "./useFilters";
import { calculatePages, getStatusColor, calculateProgress } from "./utils";
import type { BackfillJob } from "../types";

export function useBackfillData(selectedAccountId: number | null) {
     const [currentTab, setCurrentTab] = useState<"symbols" | "single" | "batch">("symbols");
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState<string | null>(null);
     const [success, setSuccess] = useState<string | null>(null);
     const [formData, setFormData] = useState({
          symbol: "",
          interval: "1h",
          total_pages: 18,
          resume: false,
     });
     const [autoRefresh, setAutoRefresh] = useState(false);

     const availableIntervals = useMemo(() => ["1m", "5m", "15m", "30m", "1h", "4h", "1d"], []);

     // Feature hooks
     const marketsHook = useMarkets(selectedAccountId);
     const syncHook = useSync(selectedAccountId, marketsHook.fetchMarkets);
     const jobsHook = useJobs();
     const backupHook = useBackup();
     const batchHook = useBatch(selectedAccountId);
     const filtersHook = useFilters(
          marketsHook.markets,
          marketsHook.dataStatus,
          jobsHook.jobs,
          availableIntervals
     );

     // Wrapper functions with error/success handling
     const syncSymbols = async () => {
          try {
               const result = await marketsHook.syncSymbols(() => {
                    setSuccess("Symbols synced successfully");
               });
               if (result?.success) {
                    setSuccess(result.message);
               }
          } catch (error) {
               setError(error instanceof Error ? error.message : "Failed to sync symbols");
          }
     };

     const syncAllExchanges = async () => {
          try {
               const result = await syncHook.syncAllExchanges();
               if (result && result.success) {
                    setSuccess(result.message);
               }
          } catch (error) {
               setError(error instanceof Error ? error.message : "Failed to sync all exchanges");
          }
     };

     const syncSpecificExchange = async () => {
          try {
               const result = await syncHook.syncSpecificExchange();
               if (result && result.success) {
                    setSuccess(result.message);
               }
          } catch (error) {
               setError(error instanceof Error ? error.message : "Failed to sync exchange");
          }
     };

     const startBackfillForSymbol = async (symbol: string, interval: string, totalPages?: number, resume: boolean = false) => {
          try {
               return await jobsHook.startBackfillForSymbol(symbol, interval, totalPages, resume);
          } catch (error) {
               setError(error instanceof Error ? error.message : "Failed to start backfill");
               return { success: false, message: error instanceof Error ? error.message : "Failed to start backfill" };
          }
     };

     const handleRestart = async (symbol: string, interval: string, totalPages: number) => {
          try {
               const result = await startBackfillForSymbol(symbol, interval, totalPages, true);
               if (result.success) {
                    setSuccess(`Restarted backfill for ${symbol}/${interval}`);
               } else {
                    setError(result.message || "Failed to restart backfill");
               }
          } catch (error) {
               setError(error instanceof Error ? error.message : "Failed to restart backfill");
          }
     };

     const handleStart = async () => {
          if (!formData.symbol) {
               setError("Please select a symbol");
               return;
          }

          const result = await startBackfillForSymbol(formData.symbol, formData.interval, formData.total_pages, formData.resume);
          if (result.success) {
               setSuccess(result.message || "Backfill started successfully");
               setFormData((prev) => ({ ...prev, symbol: "", total_pages: 18, resume: false }));
          } else {
               setError(result.message);
          }
     };

     const handlePause = async (symbol: string, interval: string) => {
          try {
               const result = await jobsHook.handlePause(symbol, interval);
               setSuccess(result.message);
          } catch (error) {
               setError(error instanceof Error ? error.message : "Failed to pause backfill");
          }
     };

     const handleUpdate = async (symbol: string, interval: string) => {
          try {
               const result = await jobsHook.handleUpdate(symbol, interval, marketsHook.fetchDataStatus);
               setSuccess(result.message);
          } catch (error) {
               setError(error instanceof Error ? error.message : "Failed to update candles");
          }
     };

     const handleProcess = async (symbol: string, interval: string, autoContinue: boolean = false) => {
          try {
               await jobsHook.handleProcess(symbol, interval, autoContinue, marketsHook.fetchDataStatus);
          } catch (error) {
               setError(error instanceof Error ? error.message : "Failed to process backfill");
          }
     };

     const handleCreateBackup = async (symbol: string, interval: string) => {
          try {
               const result = await backupHook.handleCreateBackup(symbol, interval);
               setSuccess(result.message);
          } catch (error) {
               setError(error instanceof Error ? error.message : "Failed to create backup");
          }
     };

     const handleRestoreBackup = async (backupFile: string, replaceExisting: boolean = false) => {
          try {
               const result = await backupHook.handleRestoreBackup(backupFile, replaceExisting, jobsHook.fetchJobs, marketsHook.fetchDataStatus);
               if (result) {
                    setSuccess(result.message);
               }
          } catch (error) {
               setError(error instanceof Error ? error.message : "Failed to restore backup");
          }
     };

     const handleStartBatch = async () => {
          setLoading(true);
          setError(null);
          setSuccess(null);
          try {
               const result = await batchHook.handleStartBatch();
               setSuccess(result.message);
          } catch (error) {
               setError(error instanceof Error ? error.message : "Failed to start batch backfill");
          } finally {
               setLoading(false);
          }
     };

     const handleProcessBatch = async (batchId: string) => {
          try {
               const result = await batchHook.handleProcessBatch(batchId);
               if (result) {
                    setSuccess(result.message);
               }
          } catch (error) {
               setError(error instanceof Error ? error.message : "Failed to process batch");
          }
     };

     const calculateProgressForJob = (job: BackfillJob) => {
          return calculateProgress(job.current_page, job.total_pages);
     };

     // Effects
     useEffect(() => {
          jobsHook.fetchJobs().catch((err) => setError(err.message));
          backupHook.fetchBackups();
          if (selectedAccountId) {
               marketsHook.fetchMarkets();
          }
     }, [selectedAccountId]);

     useEffect(() => {
          if (marketsHook.markets.length > 0) {
               marketsHook.fetchDataStatus();
          }
     }, [marketsHook.markets.length]);

     useEffect(() => {
          if (!autoRefresh) return;

          const interval = setInterval(() => {
               jobsHook.fetchJobs().catch(() => {});
               marketsHook.fetchDataStatus();
               if (currentTab === "batch") {
                    batchHook.fetchBatchJobs().catch(() => {});
               }
          }, 10000);

          return () => clearInterval(interval);
     }, [autoRefresh, currentTab]);

     useEffect(() => {
          if (jobsHook.autoProcessingJobs.size === 0) return;

          const checkAndProcess = async () => {
               // Clean up completed jobs
               const currentJobs = jobsHook.jobs.filter(job => {
                    const jobKey = `${job.symbol}_${job.interval}`;
                    return jobsHook.autoProcessingJobs.has(jobKey) && job.status === "running";
               });

               for (const job of currentJobs) {
                    const jobKey = `${job.symbol}_${job.interval}`;
                    const isCurrentlyProcessing = jobsHook.processing[jobKey];
                    
                    if (!isCurrentlyProcessing && jobsHook.autoProcessingJobs.has(jobKey)) {
                         await handleProcess(job.symbol, job.interval, true);
                    }
               }
          };

          const interval = setInterval(checkAndProcess, 2000);
          return () => clearInterval(interval);
     }, [jobsHook.autoProcessingJobs, jobsHook.jobs, jobsHook.processing]);

     useEffect(() => {
          if (currentTab === "batch") {
               batchHook.fetchBatchJobs().catch(() => {});
          }
     }, [currentTab]);

     useEffect(() => {
          if (selectedAccountId) {
               batchHook.setBatchFormData((prev) => ({ ...prev, exchange_account_id: selectedAccountId }));
          }
     }, [selectedAccountId]);

     useEffect(() => {
          syncHook.fetchExchanges();
     }, []);

     useEffect(() => {
          setFormData((prev) => ({ ...prev, total_pages: calculatePages(prev.interval) }));
     }, [formData.interval]);

     return {
          // State
          currentTab,
          setCurrentTab,
          jobs: jobsHook.jobs,
          batchJobs: batchHook.batchJobs,
          backups: backupHook.backups,
          markets: marketsHook.markets,
          loading,
          error,
          setError,
          success,
          setSuccess,
          formData,
          setFormData,
          batchFormData: batchHook.batchFormData,
          setBatchFormData: batchHook.setBatchFormData,
          processing: { ...jobsHook.processing, ...backupHook.processing, ...batchHook.processing },
          autoRefresh,
          setAutoRefresh,
          autoProcessingJobs: jobsHook.autoProcessingJobs,
          symbolsLoading: marketsHook.symbolsLoading,
          dataStatus: marketsHook.dataStatus,
          syncingAll: syncHook.syncingAll,
          syncAllResults: syncHook.syncAllResults,
          showSyncAllResults: syncHook.showSyncAllResults,
          setShowSyncAllResults: syncHook.setShowSyncAllResults,
          exchanges: syncHook.exchanges,
          selectedExchangeName: syncHook.selectedExchangeName,
          setSelectedExchangeName: syncHook.setSelectedExchangeName,
          syncingExchange: syncHook.syncingExchange,
          syncExchangeResult: syncHook.syncExchangeResult,
          showSyncExchangeResult: syncHook.showSyncExchangeResult,
          setShowSyncExchangeResult: syncHook.setShowSyncExchangeResult,
          searchQuery: filtersHook.searchQuery,
          setSearchQuery: filtersHook.setSearchQuery,
          statusFilter: filtersHook.statusFilter,
          setStatusFilter: filtersHook.setStatusFilter,
          intervalFilter: filtersHook.intervalFilter,
          setIntervalFilter: filtersHook.setIntervalFilter,
          jobSearchQuery: filtersHook.jobSearchQuery,
          setJobSearchQuery: filtersHook.setJobSearchQuery,
          jobStatusFilter: filtersHook.jobStatusFilter,
          setJobStatusFilter: filtersHook.setJobStatusFilter,
          jobIntervalFilter: filtersHook.jobIntervalFilter,
          setJobIntervalFilter: filtersHook.setJobIntervalFilter,
          availableIntervals,
          filteredMarkets: filtersHook.filteredMarkets,
          // Functions
          fetchMarkets: marketsHook.fetchMarkets,
          syncSymbols,
          fetchExchanges: syncHook.fetchExchanges,
          syncAllExchanges,
          syncSpecificExchange,
          fetchDataStatus: marketsHook.fetchDataStatus,
          fetchJobs: async () => {
               await jobsHook.fetchJobs().catch(() => {});
          },
          fetchBatchJobs: async () => {
               await batchHook.fetchBatchJobs().catch(() => {});
          },
          fetchBackups: backupHook.fetchBackups,
          startBackfillForSymbol,
          handleRestart,
          handleStart,
          handlePause,
          handleUpdate,
          handleProcess,
          toggleAutoProcess: jobsHook.toggleAutoProcess,
          handleCreateBackup,
          handleRestoreBackup,
          handleStartBatch,
          handleProcessBatch,
          getStatusColor,
          calculateProgress: calculateProgressForJob,
     };
}

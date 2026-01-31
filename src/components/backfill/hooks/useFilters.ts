import { useState, useMemo } from "react";
import type { Market, SymbolDataStatus, BackfillJob } from "../types";

export function useFilters(
     markets: Market[],
     dataStatus: Record<string, SymbolDataStatus>,
     jobs: BackfillJob[],
     availableIntervals: string[]
) {
     const [searchQuery, setSearchQuery] = useState("");
     const [statusFilter, setStatusFilter] = useState<"all" | "missing" | "incomplete" | "complete" | "running" | "paused">("all");
     const [intervalFilter, setIntervalFilter] = useState<string>("all");

     const [jobSearchQuery, setJobSearchQuery] = useState("");
     const [jobStatusFilter, setJobStatusFilter] = useState<string>("all");
     const [jobIntervalFilter, setJobIntervalFilter] = useState<string>("all");

     const filteredMarkets = useMemo(() => {
          return markets.filter((market) => {
               // Search filter - check symbol name (case-insensitive)
               if (searchQuery) {
                    const query = searchQuery.toLowerCase().trim();
                    const symbol = market.symbol.toLowerCase();
                    // Check if symbol contains the search query
                    if (!symbol.includes(query)) {
                         return false;
                    }
               }

               // If there's a search query, we might want to be more lenient with other filters
               // But for now, we'll still apply status and interval filters

               if (statusFilter !== "all") {
                    const symbolStatus = dataStatus[market.symbol] || {};
                    let matchesStatus = false;

                    if (statusFilter === "running" || statusFilter === "paused") {
                         matchesStatus = availableIntervals.some((interval) => {
                              const activeJob = jobs.find((j) => j.symbol === market.symbol && j.interval === interval);
                              return activeJob?.status === statusFilter;
                         });
                    } else if (statusFilter === "missing") {
                         matchesStatus = availableIntervals.some((interval) => {
                              const status = symbolStatus[interval];
                              return !status || !status.exists || status.count === 0;
                         });
                    } else if (statusFilter === "incomplete") {
                         matchesStatus = availableIntervals.some((interval) => {
                              const status = symbolStatus[interval];
                              return status && status.exists && status.status === "incomplete";
                         });
                    } else if (statusFilter === "complete") {
                         matchesStatus = availableIntervals.every((interval) => {
                              const status = symbolStatus[interval];
                              return status && status.exists && status.status === "complete";
                         });
                    }

                    if (!matchesStatus) return false;
               }

               if (intervalFilter !== "all") {
                    const symbolStatus = dataStatus[market.symbol] || {};
                    const status = symbolStatus[intervalFilter];
                    const hasActiveJob = jobs.some((j) => j.symbol === market.symbol && j.interval === intervalFilter);

                    // Show symbols that need data for this interval (missing, incomplete, or have active job)
                    if (!status || !status.exists || status.count === 0 || hasActiveJob) {
                         return true;
                    }
                    return false;
               }

               return true;
          });
     }, [markets, searchQuery, statusFilter, intervalFilter, dataStatus, jobs, availableIntervals]);

     return {
          searchQuery,
          setSearchQuery,
          statusFilter,
          setStatusFilter,
          intervalFilter,
          setIntervalFilter,
          jobSearchQuery,
          setJobSearchQuery,
          jobStatusFilter,
          setJobStatusFilter,
          jobIntervalFilter,
          setJobIntervalFilter,
          filteredMarkets,
     };
}


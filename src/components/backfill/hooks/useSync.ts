import { useState, useCallback } from "react";
import { getMarketApiBase } from "@/lib/marketEndpoints";
import { getExchangeApiBase } from "@/lib/exchangeEndpoints";
import { API_URL, getAuthToken } from "./utils";

export function useSync(selectedAccountId: number | null, fetchMarkets: () => Promise<void>) {
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

     const fetchExchanges = useCallback(async () => {
          try {
               const token = getAuthToken();
               if (!token) return;

               const response = await fetch(`${getExchangeApiBase()}/exchanges`, {
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
     }, []);

     const syncAllExchanges = useCallback(async () => {
          setSyncingAll(true);
          setSyncAllResults(null);
          setShowSyncAllResults(false);

          try {
               const token = getAuthToken();
               if (!token) {
                    throw new Error("Please login to sync exchanges");
               }

               const response = await fetch(`${getMarketApiBase()}/symbols/sync-all`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setSyncAllResults({
                         summary: data.summary,
                         results: data.results,
                    });
                    setShowSyncAllResults(true);
                    
                    if (selectedAccountId) {
                         await fetchMarkets();
                    }
                    return { success: true, message: data.message || "All exchanges synced successfully" };
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || "Failed to sync all exchanges");
               }
          } catch (error) {
               console.error("Error syncing all exchanges:", error);
               throw error;
          } finally {
               setSyncingAll(false);
          }
     }, [selectedAccountId, fetchMarkets]);

     const syncSpecificExchange = useCallback(async () => {
          if (!selectedExchangeName) {
               throw new Error("Please select an exchange");
          }

          setSyncingExchange(true);
          setSyncExchangeResult(null);
          setShowSyncExchangeResult(false);

          try {
               const token = getAuthToken();
               if (!token) {
                    throw new Error("Please login to sync exchange");
               }

               const response = await fetch(`${getMarketApiBase()}/symbols/sync/${encodeURIComponent(selectedExchangeName)}`, {
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
                    setShowSyncExchangeResult(true);
                    
                    if (selectedAccountId) {
                         await fetchMarkets();
                    }
                    return { success: true, message: data.message || `Exchange ${selectedExchangeName} synced successfully` };
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMsg = errorData.detail || "Failed to sync exchange";
                    setSyncExchangeResult({
                         exchange_name: selectedExchangeName,
                         error: errorMsg,
                    });
                    setShowSyncExchangeResult(true);
                    throw new Error(errorMsg);
               }
          } catch (error) {
               console.error("Error syncing exchange:", error);
               const errorMsg = error instanceof Error ? error.message : "Failed to sync exchange";
               setSyncExchangeResult({
                    exchange_name: selectedExchangeName,
                    error: errorMsg,
               });
               setShowSyncExchangeResult(true);
               throw error;
          } finally {
               setSyncingExchange(false);
          }
     }, [selectedExchangeName, selectedAccountId, fetchMarkets]);

     return {
          syncingAll,
          syncAllResults,
          showSyncAllResults,
          setShowSyncAllResults,
          exchanges,
          selectedExchangeName,
          setSelectedExchangeName,
          syncingExchange,
          syncExchangeResult,
          showSyncExchangeResult,
          setShowSyncExchangeResult,
          fetchExchanges,
          syncAllExchanges,
          syncSpecificExchange,
     };
}


import { useState, useCallback } from "react";
import type { Market, SymbolDataStatus } from "../types";
import { API_URL, getAuthToken } from "./utils";

export function useMarkets(selectedAccountId: number | null) {
     const [markets, setMarkets] = useState<Market[]>([]);
     const [symbolsLoading, setSymbolsLoading] = useState(false);
     const [dataStatus, setDataStatus] = useState<Record<string, SymbolDataStatus>>({});
     const [dataStatusLoading, setDataStatusLoading] = useState(false);

     const fetchMarkets = useCallback(async () => {
          if (!selectedAccountId) {
               setMarkets([]);
               return;
          }

          setSymbolsLoading(true);
          try {
               const token = getAuthToken();
               const response = await fetch(`${API_URL}/market/pairs/${selectedAccountId}/db?active_only=true`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    const marketsList = (data.markets || []).filter((m: Market) => m.active !== false);
                    setMarkets(marketsList);
               } else if (response.status === 404) {
                    setMarkets([]);
               }
          } catch (error) {
               console.error("Error fetching markets:", error);
          } finally {
               setSymbolsLoading(false);
          }
     }, [selectedAccountId]);

     const syncSymbols = useCallback(async (onSuccess?: () => void) => {
          if (!selectedAccountId) {
               throw new Error("Please select an exchange account");
          }

          setSymbolsLoading(true);
          try {
               const token = getAuthToken();
               const response = await fetch(`${API_URL}/market/pairs/${selectedAccountId}/sync`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    await fetchMarkets();
                    if (onSuccess) onSuccess();
                    return { success: true, message: data.message || "Symbols synced successfully" };
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || "Failed to sync symbols");
               }
          } catch (error) {
               console.error("Error syncing symbols:", error);
               throw error;
          } finally {
               setSymbolsLoading(false);
          }
     }, [selectedAccountId, fetchMarkets]);

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

               const response = await fetch(`${API_URL}/backfill/data-status?symbols=${encodeURIComponent(symbolsParam)}&intervals=${encodeURIComponent(intervalsParam)}`, {
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
     }, [selectedAccountId, markets]);

     return {
          markets,
          setMarkets,
          symbolsLoading,
          dataStatus,
          dataStatusLoading,
          fetchMarkets,
          syncSymbols,
          fetchDataStatus,
     };
}


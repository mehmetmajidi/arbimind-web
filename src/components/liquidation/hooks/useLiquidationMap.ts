"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getLiquidationMap, refreshLiquidationMap } from "@/lib/liquidationApi";
import { LiquidationMapResponse } from "@/types/liquidation";

interface UseLiquidationMapOptions {
    symbol: string;
    timeframe: string;
    autoFetch?: boolean;
    autoRefreshInterval?: number; // Auto-refresh interval in seconds (0 to disable)
    debounceMs?: number; // Debounce delay for symbol/timeframe changes (default: 300ms)
    enableCache?: boolean; // Enable localStorage caching (default: true)
}

/**
 * Custom hook for managing liquidation map data with caching, debouncing, and auto-refresh
 * 
 * @param options - Configuration options for the hook
 * @param options.symbol - Trading symbol (e.g., "BTC", "ETH")
 * @param options.timeframe - Timeframe for the data (e.g., "1w", "1d", "4h", "1h")
 * @param options.autoFetch - Whether to automatically fetch data on mount/changes (default: true)
 * @param options.autoRefreshInterval - Auto-refresh interval in seconds (0 to disable, default: 0)
 * @param options.debounceMs - Debounce delay for symbol/timeframe changes in milliseconds (default: 300)
 * @param options.enableCache - Enable localStorage caching (default: true)
 * @returns Object containing data, loading state, error, and refresh function
 * 
 * @example
 * ```tsx
 * const { data, loading, error, refresh } = useLiquidationMap({
 *   symbol: "BTC",
 *   timeframe: "1w",
 *   autoRefreshInterval: 60, // Refresh every 60 seconds
 *   debounceMs: 500,
 * });
 * ```
 */
export function useLiquidationMap({
    symbol,
    timeframe,
    autoFetch = true,
    autoRefreshInterval = 0,
    debounceMs = 300,
    enableCache = true,
}: UseLiquidationMapOptions) {
    const [data, setData] = useState<LiquidationMapResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Refs for debouncing and cleanup
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
    const cacheKeyRef = useRef<string>("");

    /**
     * Generate cache key for localStorage
     */
    const getCacheKey = useCallback((sym: string, tf: string): string => {
        return `liquidation_map_${sym}_${tf}`;
    }, []);

    /**
     * Get cached data from localStorage
     */
    const getCachedData = useCallback((key: string): LiquidationMapResponse | null => {
        if (!enableCache || typeof window === "undefined") return null;
        
        try {
            const cached = localStorage.getItem(key);
            if (cached) {
                const parsed = JSON.parse(cached);
                // Check if cache is still valid (5 minutes TTL)
                const cacheAge = Date.now() - (parsed.timestamp || 0);
                if (cacheAge < 5 * 60 * 1000) {
                    return parsed.data;
                }
            }
        } catch (err) {
            console.warn("Failed to read from cache:", err);
        }
        return null;
    }, [enableCache]);

    /**
     * Save data to localStorage cache
     */
    const setCachedData = useCallback((key: string, data: LiquidationMapResponse): void => {
        if (!enableCache || typeof window === "undefined") return;
        
        try {
            localStorage.setItem(key, JSON.stringify({
                data,
                timestamp: Date.now(),
            }));
        } catch (err) {
            console.warn("Failed to save to cache:", err);
        }
    }, [enableCache]);

    /**
     * Fetch liquidation map data with caching support
     */
    const fetchData = useCallback(async (forceRefresh = false) => {
        if (!symbol || !timeframe) {
            setData(null);
            return;
        }

        const cacheKey = getCacheKey(symbol, timeframe);
        cacheKeyRef.current = cacheKey;

        // Try to get from cache first (unless force refresh)
        if (!forceRefresh) {
            const cached = getCachedData(cacheKey);
            if (cached) {
                setData(cached);
                setError(null);
                // Still fetch in background to update cache
                fetchData(true).catch(() => {
                    // Silent fail for background refresh
                });
                return;
            }
        }

        setLoading(true);
        setError(null);

        try {
            const result = forceRefresh
                ? await refreshLiquidationMap(symbol, timeframe)
                : await getLiquidationMap(symbol, timeframe);
            
            setData(result);
            setCachedData(cacheKey, result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to fetch liquidation map";
            setError(errorMessage);
            setData(null);
            console.error("Error fetching liquidation map:", err);
        } finally {
            setLoading(false);
        }
    }, [symbol, timeframe, getCacheKey, getCachedData, setCachedData]);

    /**
     * Debounced fetch function
     */
    const debouncedFetch = useCallback((forceRefresh = false) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        
        debounceTimerRef.current = setTimeout(() => {
            fetchData(forceRefresh);
        }, debounceMs);
    }, [fetchData, debounceMs]);

    /**
     * Manual refresh function
     */
    const refresh = useCallback(() => {
        fetchData(true);
    }, [fetchData]);

    /**
     * Setup auto-refresh interval
     */
    useEffect(() => {
        if (autoRefreshInterval > 0 && symbol && timeframe) {
            autoRefreshTimerRef.current = setInterval(() => {
                fetchData(true);
            }, autoRefreshInterval * 1000);
            
            return () => {
                if (autoRefreshTimerRef.current) {
                    clearInterval(autoRefreshTimerRef.current);
                }
            };
        }
    }, [autoRefreshInterval, symbol, timeframe, fetchData]);

    /**
     * Auto-fetch on mount and when symbol/timeframe changes (with debounce)
     */
    useEffect(() => {
        if (autoFetch) {
            debouncedFetch(false);
        }
        
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [autoFetch, debouncedFetch]);

    /**
     * Cleanup on unmount
     */
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            if (autoRefreshTimerRef.current) {
                clearInterval(autoRefreshTimerRef.current);
            }
        };
    }, []);

    return {
        data,
        loading,
        error,
        refresh,
        fetchData,
    };
}


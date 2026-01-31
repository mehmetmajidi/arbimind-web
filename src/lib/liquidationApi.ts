// API service functions for Liquidation Map module

import { LiquidationMapResponse } from "@/types/liquidation";

const apiUrl = typeof window !== "undefined" 
    ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getAuthToken = (): string => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("auth_token") || "";
};

const getHeaders = (): HeadersInit => {
    const token = getAuthToken();
    return {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
    };
};

const handleAuthError = (response: Response): void => {
    if (response.status === 401) {
        // Token expired or invalid - redirect to login
        localStorage.removeItem("auth_token");
        localStorage.removeItem("selectedAccountId");
        window.dispatchEvent(new Event("authTokenRemoved"));
        if (typeof window !== "undefined") {
            window.location.href = "/login";
        }
    }
};

/**
 * Get liquidation map data for a specific symbol and timeframe
 * @param symbol - Trading symbol (e.g., "BTC", "ETH")
 * @param timeframe - Timeframe for the data (e.g., "1w", "1d", "4h", "1h")
 * @returns Liquidation map data including price levels and liquidation amounts
 */
export async function getLiquidationMap(
    symbol: string,
    timeframe: string
): Promise<LiquidationMapResponse> {
    const encodedSymbol = encodeURIComponent(symbol);
    const url = new URL(`${apiUrl}/market/liquidation-map/${encodedSymbol}`);
    url.searchParams.append("timeframe", timeframe);

    const response = await fetch(url.toString(), {
        method: "GET",
        headers: getHeaders(),
    });

    if (!response.ok) {
        handleAuthError(response);
        
        // Handle 404 specifically
        if (response.status === 404) {
            throw new Error(`Liquidation map endpoint not found. The API endpoint may not be implemented yet.`);
        }
        
        const error = await response.json().catch(() => ({ 
            detail: response.status === 404 
                ? `Liquidation map endpoint not found for ${symbol}` 
                : `Failed to fetch liquidation map for ${symbol} (${response.status})`
        }));
        throw new Error(error.detail || `Failed to fetch liquidation map: ${response.status}`);
    }

    return response.json();
}

/**
 * Refresh liquidation map data (same as getLiquidationMap but can be used for manual refresh)
 * This function is essentially an alias for getLiquidationMap but can be extended
 * in the future to bypass cache or force refresh
 * @param symbol - Trading symbol (e.g., "BTC", "ETH")
 * @param timeframe - Timeframe for the data (e.g., "1w", "1d", "4h", "1h")
 * @returns Liquidation map data including price levels and liquidation amounts
 */
export async function refreshLiquidationMap(
    symbol: string,
    timeframe: string
): Promise<LiquidationMapResponse> {
    // For now, this is the same as getLiquidationMap
    // In the future, we can add cache-busting parameters or force refresh flags
    const encodedSymbol = encodeURIComponent(symbol);
    const url = new URL(`${apiUrl}/market/liquidation-map/${encodedSymbol}`);
    url.searchParams.append("timeframe", timeframe);
    // Add timestamp to bypass cache if needed
    url.searchParams.append("_t", Date.now().toString());

    const response = await fetch(url.toString(), {
        method: "GET",
        headers: getHeaders(),
        cache: "no-store", // Force fresh data
    });

    if (!response.ok) {
        handleAuthError(response);
        
        // Handle 404 specifically
        if (response.status === 404) {
            throw new Error(`Liquidation map endpoint not found. The API endpoint may not be implemented yet.`);
        }
        
        const error = await response.json().catch(() => ({ 
            detail: response.status === 404 
                ? `Liquidation map endpoint not found for ${symbol}` 
                : `Failed to refresh liquidation map for ${symbol} (${response.status})`
        }));
        throw new Error(error.detail || `Failed to refresh liquidation map: ${response.status}`);
    }

    return response.json();
}


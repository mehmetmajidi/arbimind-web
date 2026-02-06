// API service functions for Liquidation Map module

import { LiquidationMapResponse } from "@/types/liquidation";
import { parseApiError, handleApiError, retryRequest, RetryOptions, type ApiError } from "./errorHandler";

const apiUrl = typeof window !== "undefined" 
    ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Request timeout in milliseconds (30 seconds)
const REQUEST_TIMEOUT = 30000;

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
 * Create a fetch request with timeout
 */
async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
            throw new Error("Request timeout. Please try again.");
        }
        throw error;
    }
}

/**
 * Default retry options for liquidation map requests
 */
const defaultRetryOptions: RetryOptions = {
    maxRetries: 3,
    retryDelay: 1000, // 1 second initial delay
    retryCondition: (error: any) => {
        // Retry on network errors, timeouts, or 5xx server errors
        if (error instanceof TypeError && (
            error.message.includes("fetch") || 
            error.message.includes("network") ||
            error.message.includes("timeout")
        )) {
            return true; // Network error
        }
        if (error && typeof error === "object" && "status" in error) {
            const status = (error as ApiError).status;
            // Retry on server errors (500-599) or rate limiting (429)
            if (status !== undefined) {
                return status >= 500 || status === 429 || status === 0;
            }
        }
        return false;
    },
};

/**
 * Get liquidation map data for a specific symbol and timeframe
 * @param symbol - Trading symbol (e.g., "BTC", "ETH")
 * @param timeframe - Timeframe for the data (e.g., "1w", "1d", "4h", "1h")
 * @param retryOptions - Optional retry configuration
 * @returns Liquidation map data including price levels and liquidation amounts
 * @throws Error with user-friendly message if request fails
 */
export async function getLiquidationMap(
    symbol: string,
    timeframe: string,
    retryOptions?: RetryOptions
): Promise<LiquidationMapResponse> {
    const encodedSymbol = encodeURIComponent(symbol);
    const url = new URL(`${apiUrl}/market/liquidation-map/${encodedSymbol}`);
    url.searchParams.append("timeframe", timeframe);

    const requestFn = async (): Promise<LiquidationMapResponse> => {
        try {
            const response = await fetchWithTimeout(url.toString(), {
        method: "GET",
        headers: getHeaders(),
    });

    if (!response.ok) {
        handleAuthError(response);
        
                // Parse error from response
                const apiError = await parseApiError(response);
                
                // Handle specific status codes
        if (response.status === 404) {
                    throw new Error(
                        `Liquidation map endpoint not found for ${symbol}. ` +
                        `The API endpoint may not be implemented yet.`
                    );
        }
        
                if (response.status === 429) {
                    throw new Error(
                        `Rate limit exceeded. Please wait a moment and try again.`
                    );
                }
                
                // Throw parsed error
                throw apiError;
            }

            // Parse and validate response
            const data = await response.json();
            
            // Basic validation
            if (!data || typeof data !== "object") {
                throw new Error("Invalid response format from server");
            }
            
            return data as LiquidationMapResponse;
            
        } catch (error) {
            // Handle network errors and timeouts
            if (error instanceof TypeError || 
                (error instanceof Error && (
                    error.message.includes("fetch") || 
                    error.message.includes("network") ||
                    error.message.includes("timeout")
                ))) {
                throw new Error(
                    "Network error. Please check your connection and try again."
                );
            }
            
            // Re-throw if already an Error
            if (error instanceof Error) {
                throw error;
            }
            
            // Handle API errors
            if (error && typeof error === "object" && "status" in error) {
                const errorMessage = handleApiError(
                    error,
                    `Failed to fetch liquidation map for ${symbol}`
                );
                throw new Error(errorMessage);
            }
            
            throw new Error(`Failed to fetch liquidation map for ${symbol}`);
        }
    };

    // Apply retry logic if enabled
    const options = retryOptions || defaultRetryOptions;
    return retryRequest(requestFn, options);
}

/**
 * Refresh liquidation map data (same as getLiquidationMap but bypasses cache)
 * This function forces a fresh fetch by adding cache-busting parameters
 * @param symbol - Trading symbol (e.g., "BTC", "ETH")
 * @param timeframe - Timeframe for the data (e.g., "1w", "1d", "4h", "1h")
 * @param retryOptions - Optional retry configuration
 * @returns Liquidation map data including price levels and liquidation amounts
 * @throws Error with user-friendly message if request fails
 */
export async function refreshLiquidationMap(
    symbol: string,
    timeframe: string,
    retryOptions?: RetryOptions
): Promise<LiquidationMapResponse> {
    // Use getLiquidationMap with cache-busting
    // The timestamp parameter will bypass browser cache
    const encodedSymbol = encodeURIComponent(symbol);
    const url = new URL(`${apiUrl}/market/liquidation-map/${encodedSymbol}`);
    url.searchParams.append("timeframe", timeframe);
    url.searchParams.append("_t", Date.now().toString()); // Cache-busting parameter

    const requestFn = async (): Promise<LiquidationMapResponse> => {
        try {
            const response = await fetchWithTimeout(url.toString(), {
        method: "GET",
        headers: getHeaders(),
        cache: "no-store", // Force fresh data
    });

    if (!response.ok) {
        handleAuthError(response);
        
                // Parse error from response
                const apiError = await parseApiError(response);
                
                // Handle specific status codes
        if (response.status === 404) {
                    throw new Error(
                        `Liquidation map endpoint not found for ${symbol}. ` +
                        `The API endpoint may not be implemented yet.`
                    );
        }
        
                if (response.status === 429) {
                    throw new Error(
                        `Rate limit exceeded. Please wait a moment and try again.`
                    );
                }
                
                // Throw parsed error
                throw apiError;
            }

            // Parse and validate response
            const data = await response.json();
            
            // Basic validation
            if (!data || typeof data !== "object") {
                throw new Error("Invalid response format from server");
            }
            
            return data as LiquidationMapResponse;
            
        } catch (error) {
            // Handle network errors and timeouts
            if (error instanceof TypeError || 
                (error instanceof Error && (
                    error.message.includes("fetch") || 
                    error.message.includes("network") ||
                    error.message.includes("timeout")
                ))) {
                throw new Error(
                    "Network error. Please check your connection and try again."
                );
            }
            
            // Re-throw if already an Error
            if (error instanceof Error) {
                throw error;
            }
            
            // Handle API errors
            if (error && typeof error === "object" && "status" in error) {
                const errorMessage = handleApiError(
                    error,
                    `Failed to refresh liquidation map for ${symbol}`
                );
                throw new Error(errorMessage);
            }
            
            throw new Error(`Failed to refresh liquidation map for ${symbol}`);
        }
    };

    // Apply retry logic if enabled
    const options = retryOptions || defaultRetryOptions;
    return retryRequest(requestFn, options);
}


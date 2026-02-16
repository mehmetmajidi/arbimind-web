// Enhanced API client with error handling, retry, and logging

import { parseApiError, handleApiError, logError, retryRequest, RetryOptions, type ApiError } from "./errorHandler";
import { getApiUrl } from "./apiBaseUrl";

const apiUrl = getApiUrl();

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

interface ApiRequestOptions extends RequestInit {
    retry?: RetryOptions;
    logError?: boolean;
    errorContext?: {
        component?: string;
        action?: string;
        additionalData?: Record<string, any>;
    };
}

/**
 * Enhanced fetch with error handling, retry, and logging
 */
export async function apiRequest<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {}
): Promise<T> {
    const {
        retry,
        logError: shouldLogError = true,
        errorContext,
        ...fetchOptions
    } = options;

    const url = endpoint.startsWith("http") ? endpoint : `${apiUrl}${endpoint}`;
    const headers = {
        ...getHeaders(),
        ...fetchOptions.headers,
    };

    const requestFn = async (): Promise<Response> => {
        const response = await fetch(url, {
            ...fetchOptions,
            headers,
        });

        if (!response.ok) {
            handleAuthError(response);
            const error = await parseApiError(response);
            throw error;
        }

        return response;
    };

    try {
        const response = retry 
            ? await retryRequest(requestFn, retry)
            : await requestFn();

        const data = await response.json();
        return data as T;
    } catch (error) {
        if (shouldLogError) {
            // Type assertion for error logging
            const errorForLogging = error as string | Error | ApiError;
            logError(errorForLogging, errorContext);
        }

        // Type assertion for error handling
        const errorForHandling = error as string | Error | ApiError;
        const userFriendlyMessage = handleApiError(errorForHandling);
        throw new Error(userFriendlyMessage);
    }
}

/**
 * GET request
 */
export async function apiGet<T = any>(
    endpoint: string,
    options?: Omit<ApiRequestOptions, "method" | "body">
): Promise<T> {
    return apiRequest<T>(endpoint, {
        ...options,
        method: "GET",
    });
}

/**
 * POST request
 */
export async function apiPost<T = any>(
    endpoint: string,
    data?: any,
    options?: Omit<ApiRequestOptions, "method" | "body">
): Promise<T> {
    return apiRequest<T>(endpoint, {
        ...options,
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
    });
}

/**
 * PUT request
 */
export async function apiPut<T = any>(
    endpoint: string,
    data?: any,
    options?: Omit<ApiRequestOptions, "method" | "body">
): Promise<T> {
    return apiRequest<T>(endpoint, {
        ...options,
        method: "PUT",
        body: data ? JSON.stringify(data) : undefined,
    });
}

/**
 * DELETE request
 */
export async function apiDelete<T = any>(
    endpoint: string,
    options?: Omit<ApiRequestOptions, "method" | "body">
): Promise<T> {
    return apiRequest<T>(endpoint, {
        ...options,
        method: "DELETE",
    });
}

/**
 * PATCH request
 */
export async function apiPatch<T = any>(
    endpoint: string,
    data?: any,
    options?: Omit<ApiRequestOptions, "method" | "body">
): Promise<T> {
    return apiRequest<T>(endpoint, {
        ...options,
        method: "PATCH",
        body: data ? JSON.stringify(data) : undefined,
    });
}


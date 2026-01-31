// Error handling utilities

export interface ApiError {
    detail?: string;
    message?: string;
    errors?: Record<string, string[]>;
    status?: number;
    statusText?: string;
}

export interface RetryOptions {
    maxRetries?: number;
    retryDelay?: number;
    retryCondition?: (error: any) => boolean;
    onRetry?: (attempt: number) => void;
}

// Parse error from API response
export async function parseApiError(response: Response): Promise<ApiError> {
    let errorData: any = {};
    
    try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            errorData = await response.json();
        } else {
            const text = await response.text();
            errorData = { detail: text || response.statusText };
        }
    } catch {
        errorData = { detail: response.statusText || "Unknown error" };
    }

    return {
        detail: errorData.detail || errorData.message || errorData.error || "An error occurred",
        message: errorData.message,
        errors: errorData.errors || errorData.validation_errors,
        status: response.status,
        statusText: response.statusText,
    };
}

// Format error message for display
export function formatErrorMessage(error: ApiError | Error | string): string {
    if (typeof error === "string") {
        return error;
    }

    if (error instanceof Error) {
        return error.message;
    }

    // Handle validation errors
    if (error.errors && Object.keys(error.errors).length > 0) {
        const errorMessages = Object.entries(error.errors)
            .map(([field, messages]) => {
                const fieldName = field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
                const messageList = Array.isArray(messages) ? messages.join(", ") : messages;
                return `${fieldName}: ${messageList}`;
            })
            .join("\n");
        return errorMessages || error.detail || "Validation error";
    }

    return error.detail || error.message || "An error occurred";
}

// Log error to console and optionally to external service
export function logError(
    error: ApiError | Error | string,
    context?: {
        component?: string;
        action?: string;
        additionalData?: Record<string, any>;
    }
): void {
    const errorMessage = formatErrorMessage(error);
    const errorObj = typeof error === "object" && "status" in error ? error : null;

    const logData = {
        message: errorMessage,
        context,
        timestamp: new Date().toISOString(),
        ...(errorObj && {
            status: errorObj.status,
            statusText: errorObj.statusText,
        }),
    };

    // Console logging
    console.error("Error:", logData);

    // TODO: Add external error logging service (e.g., Sentry, LogRocket)
    // if (typeof window !== "undefined" && window.Sentry) {
    //     window.Sentry.captureException(error, { extra: logData });
    // }
}

// Retry function with exponential backoff
export async function retryRequest<T>(
    requestFn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = 3,
        retryDelay = 1000,
        retryCondition = (error) => {
            // Retry on network errors or 5xx errors
            if (error instanceof TypeError && error.message.includes("fetch")) {
                return true; // Network error
            }
            if (error && typeof error === "object" && "status" in error) {
                const status = (error as any).status;
                return status >= 500 || status === 0; // Server error or network failure
            }
            return false;
        },
        onRetry,
    } = options;

    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await requestFn();
        } catch (error) {
            lastError = error;
            
            // Don't retry if condition is not met
            if (!retryCondition(error)) {
                throw error;
            }

            // Don't retry on last attempt
            if (attempt < maxRetries) {
                const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
                
                if (onRetry) {
                    onRetry(attempt + 1);
                }

                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

// Enhanced fetch with error handling and retry
export async function fetchWithErrorHandling(
    url: string,
    options: RequestInit = {},
    retryOptions?: RetryOptions
): Promise<Response> {
    const fetchFn = async () => {
        const response = await fetch(url, options);

        if (!response.ok) {
            const error = await parseApiError(response);
            throw error;
        }

        return response;
    };

    if (retryOptions) {
        return retryRequest(fetchFn, retryOptions);
    }

    return fetchFn();
}

// Handle API errors and return user-friendly messages
export function handleApiError(
    error: any,
    defaultMessage: string = "An error occurred"
): string {
    if (typeof error === "string") {
        return error;
    }

    if (error instanceof Error) {
        // Network errors
        if (error.message.includes("fetch") || error.message.includes("network")) {
            return "Network error. Please check your connection and try again.";
        }
        return error.message;
    }

    // API error object
    if (error && typeof error === "object") {
        // Validation errors
        if (error.errors && Object.keys(error.errors).length > 0) {
            return formatErrorMessage(error);
        }

        // Status-specific messages
        if (error.status === 401) {
            return "Authentication required. Please log in again.";
        }
        if (error.status === 403) {
            return "You don't have permission to perform this action.";
        }
        if (error.status === 404) {
            return "Resource not found.";
        }
        if (error.status === 429) {
            return "Too many requests. Please try again later.";
        }
        if (error.status >= 500) {
            return "Server error. Please try again later.";
        }

        return error.detail || error.message || defaultMessage;
    }

    return defaultMessage;
}


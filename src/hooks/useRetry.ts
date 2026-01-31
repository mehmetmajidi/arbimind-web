"use client";

import { useState, useCallback } from "react";
import { retryRequest, RetryOptions } from "@/lib/errorHandler";

interface UseRetryOptions extends RetryOptions {
    onRetryAttempt?: (attempt: number) => void;
    onSuccess?: () => void;
    onError?: (error: any) => void;
}

export function useRetry<T>() {
    const [isRetrying, setIsRetrying] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [error, setError] = useState<any>(null);

    const execute = useCallback(
        async (
            requestFn: () => Promise<T>,
            options: UseRetryOptions = {}
        ): Promise<T> => {
            setIsRetrying(true);
            setError(null);
            setRetryCount(0);

            try {
                const result = await retryRequest(requestFn, {
                    ...options,
                    onRetry: (attempt) => {
                        setRetryCount(attempt);
                        if (options.onRetryAttempt) {
                            options.onRetryAttempt(attempt);
                        }
                    },
                });

                setIsRetrying(false);
                if (options.onSuccess) {
                    options.onSuccess();
                }
                return result;
            } catch (err) {
                setIsRetrying(false);
                setError(err);
                if (options.onError) {
                    options.onError(err);
                }
                throw err;
            }
        },
        []
    );

    const reset = useCallback(() => {
        setIsRetrying(false);
        setRetryCount(0);
        setError(null);
    }, []);

    return {
        execute,
        isRetrying,
        retryCount,
        error,
        reset,
    };
}


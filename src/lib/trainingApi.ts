// API service functions for Training module

import {
    TrainingJob,
    TrainingRequest,
    StartTrainingResponse,
    FilterStatus,
    PeriodicRetrainStatus,
    QueueStatus,
    JobLogsResponse,
    Model,
} from "@/types/training";

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
 * Get list of all training jobs
 */
export async function getTrainingJobs(): Promise<{ jobs: TrainingJob[] }> {
    const response = await fetch(`${apiUrl}/train/status`, {
        method: "GET",
        headers: getHeaders(),
    });

    if (!response.ok) {
        handleAuthError(response);
        const error = await response.json().catch(() => ({ detail: "Failed to fetch training jobs" }));
        throw new Error(error.detail || "Failed to fetch training jobs");
    }

    return response.json();
}

/**
 * Start a new training job
 */
export async function startTraining(
    request: TrainingRequest
): Promise<StartTrainingResponse> {
    const response = await fetch(`${apiUrl}/train/start`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        handleAuthError(response);
        const error = await response.json().catch(() => ({ detail: "Failed to start training" }));
        throw new Error(error.detail || "Failed to start training");
    }

    return response.json();
}

/**
 * Cancel a training job
 */
export async function cancelTraining(jobId: string): Promise<{ message: string }> {
    const response = await fetch(`${apiUrl}/train/cancel/${jobId}`, {
        method: "POST",
        headers: getHeaders(),
    });

    if (!response.ok) {
        handleAuthError(response);
        const error = await response.json().catch(() => ({ detail: "Failed to cancel training job" }));
        throw new Error(error.detail || "Failed to cancel training job");
    }

    return response.json();
}

/**
 * Get logs for a specific training job
 */
export async function getJobLogs(
    jobId: string,
    lines: number = 10000
): Promise<JobLogsResponse> {
    const response = await fetch(`${apiUrl}/train/logs/${jobId}?lines=${lines}`, {
        method: "GET",
        headers: getHeaders(),
    });

    if (!response.ok) {
        handleAuthError(response);
        const error = await response.json().catch(() => ({ detail: "Failed to fetch job logs" }));
        throw new Error(error.detail || "Failed to fetch job logs");
    }

    return response.json();
}

/**
 * Get status of a specific training job
 */
export async function getTrainingJobStatus(jobId: string): Promise<TrainingJob> {
    const response = await fetch(`${apiUrl}/train/status/${jobId}`, {
        method: "GET",
        headers: getHeaders(),
    });

    if (!response.ok) {
        handleAuthError(response);
        const error = await response.json().catch(() => ({ detail: "Failed to fetch job status" }));
        throw new Error(error.detail || "Failed to fetch job status");
    }

    return response.json();
}

/**
 * Get periodic retraining status and metrics
 */
export async function getPeriodicStatus(): Promise<PeriodicRetrainStatus> {
    const response = await fetch(`${apiUrl}/train/periodic-status`, {
        method: "GET",
        headers: getHeaders(),
    });

    if (!response.ok) {
        handleAuthError(response);
        const error = await response.json().catch(() => ({ detail: "Failed to fetch periodic status" }));
        throw new Error(error.detail || "Failed to fetch periodic status");
    }

    return response.json();
}

/**
 * Get filter status for a symbol
 */
export async function getFilterStatus(
    symbol: string,
    interval: string = "1h"
): Promise<FilterStatus> {
    const encodedSymbol = encodeURIComponent(symbol);
    const response = await fetch(`${apiUrl}/train/filter-status/${encodedSymbol}?interval=${interval}`, {
        method: "GET",
        headers: getHeaders(),
    });

    if (!response.ok) {
        handleAuthError(response);
        const error = await response.json().catch(() => ({ detail: "Failed to fetch filter status" }));
        throw new Error(error.detail || "Failed to fetch filter status");
    }

    return response.json();
}

/**
 * Get queue status (extracted from periodic-status)
 */
export async function getQueueStatus(): Promise<QueueStatus> {
    const periodicStatus = await getPeriodicStatus();
    return periodicStatus.queue || {
        total: 0,
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        max_concurrent: 3,
        available_slots: 3,
    };
}

/**
 * Get training metrics (extracted from periodic-status)
 */
export async function getMetrics(): Promise<PeriodicRetrainStatus["summary"]> {
    const periodicStatus = await getPeriodicStatus();
    return periodicStatus.summary || {
        total_retrain_sessions: 0,
        total_models_retrained: 0,
        total_successful: 0,
        total_failed: 0,
        success_rate: 0,
        avg_duration_seconds: 0,
        avg_duration_minutes: 0,
        total_filtered: 0,
        filtered_by_volatility: 0,
        filtered_by_data_freshness: 0,
    };
}

/**
 * Get list of available models
 */
export async function getAvailableModels(): Promise<{ models: Model[] }> {
    const response = await fetch(`${apiUrl}/train/models`, {
        method: "GET",
        headers: getHeaders(),
    });

    if (!response.ok) {
        handleAuthError(response);
        const error = await response.json().catch(() => ({ detail: "Failed to fetch models" }));
        throw new Error(error.detail || "Failed to fetch models");
    }

    return response.json();
}

/**
 * Trigger retraining for a model
 */
export async function retrainModel(modelVersion: string): Promise<StartTrainingResponse> {
    const response = await fetch(`${apiUrl}/train/retrain`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ model_version: modelVersion }),
    });

    if (!response.ok) {
        handleAuthError(response);
        const error = await response.json().catch(() => ({ detail: "Failed to retrain model" }));
        throw new Error(error.detail || "Failed to retrain model");
    }

    return response.json();
}

/**
 * Trigger periodic retraining manually
 */
export async function triggerPeriodicRetrain(tier: number = 1): Promise<{ status: string; message: string; session: any }> {
    const response = await fetch(`${apiUrl}/train/trigger-periodic?tier=${tier}`, {
        method: "POST",
        headers: getHeaders(),
    });

    if (!response.ok) {
        handleAuthError(response);
        const error = await response.json().catch(() => ({ detail: "Failed to trigger periodic retraining" }));
        throw new Error(error.detail || "Failed to trigger periodic retraining");
    }

    return response.json();
}


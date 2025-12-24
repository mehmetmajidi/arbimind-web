# Training API Integration Guide

## Overview

This guide explains how to integrate with the ArbiMind Training API from the frontend.

## Base Configuration

All API calls use the base URL from environment variables:

```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
```

## Authentication

All API endpoints require JWT authentication. The token is retrieved from localStorage:

```typescript
const token = localStorage.getItem("auth_token");
```

Headers are automatically added by the API service functions.

---

## API Service Functions

All API functions are located in `src/lib/trainingApi.ts`.

### 1. Training Jobs

#### Get All Training Jobs

```typescript
import { getTrainingJobs } from "@/lib/trainingApi";

const response = await getTrainingJobs();
// Returns: { jobs: TrainingJob[] }
```

**Response**:
```typescript
{
    jobs: [
        {
            job_id: string;
            symbol?: string;
            model_type: string;
            horizon: string;
            status: "running" | "completed" | "failed" | "pending" | "cancelled" | "rejected";
            started_at?: string;
            completed_at?: string;
            duration?: number;
            progress?: number;
            error?: string;
        }
    ]
}
```

#### Start Training Job

```typescript
import { startTraining } from "@/lib/trainingApi";

const result = await startTraining({
    symbol?: string; // Optional, e.g., "BTC/USDT"
    model_type: string; // "lightgbm" | "lstm" | "transformer" | ...
    horizon: string; // "10m" | "30m" | "1h" | "4h" | "1d"
    skip_filters?: boolean; // Admin only
});

// Returns: { job_id: string, status: string, message: string }
```

**Example**:
```typescript
try {
    const result = await startTraining({
        symbol: "BTC/USDT",
        model_type: "lightgbm",
        horizon: "1h",
    });
    console.log("Job started:", result.job_id);
} catch (error) {
    console.error("Failed to start training:", error);
}
```

#### Cancel Training Job

```typescript
import { cancelTraining } from "@/lib/trainingApi";

await cancelTraining(jobId);
// Returns: { message: string }
```

#### Get Job Status

```typescript
import { getTrainingJobStatus } from "@/lib/trainingApi";

const job = await getTrainingJobStatus(jobId);
// Returns: TrainingJob
```

#### Get Job Logs

```typescript
import { getJobLogs } from "@/lib/trainingApi";

const logs = await getJobLogs(jobId, lines = 10000);
// Returns: { log: string, error_log: string }
```

---

### 2. Filter Status

#### Get Filter Status for Symbol

```typescript
import { getFilterStatus } from "@/lib/trainingApi";

const status = await getFilterStatus("BTC/USDT", "1h");
// Returns: FilterStatus
```

**Response**:
```typescript
{
    symbol: string;
    interval: string;
    can_train: boolean;
    can_predict: boolean;
    volatility: {
        passed: boolean;
        score: number;
        metrics: {
            price_volatility: number;
            daily_range_avg: number;
            volume_volatility: number;
            movement_frequency: number;
        };
        reason?: string;
    };
    data_freshness: {
        is_fresh: boolean;
        last_candle_time?: string;
        data_age_hours?: number;
        completeness: number;
        gaps: Array<{ start: string; end: string }>;
        reason?: string;
    };
    filter_config: FilterConfig;
    reason: string;
}
```

---

### 3. Periodic Retraining

#### Get Periodic Retraining Status

```typescript
import { getPeriodicStatus } from "@/lib/trainingApi";

const status = await getPeriodicStatus();
// Returns: PeriodicRetrainStatus
```

**Response**:
```typescript
{
    scheduler: {
        enabled: boolean;
        interval_hours: number;
    };
    last_run?: string;
    next_run?: string;
    summary: {
        total_models: number;
        successful: number;
        failed: number;
        success_rate: number;
        total_filtered: number;
        filtered_by_volatility: number;
        filtered_by_data_freshness: number;
    };
    stats_7d: {
        total_models: number;
        successful: number;
        failed: number;
        success_rate: number;
        avg_duration_minutes: number;
    };
    queue: {
        pending: number;
        running: number;
        completed: number;
        failed: number;
        max_concurrent: number;
        available_slots: number;
        next_jobs?: QueueJob[];
        running_jobs?: QueueJob[];
    };
    recent_periodic: PeriodicRetrainSession[];
}
```

#### Trigger Periodic Retraining

```typescript
import { triggerPeriodicRetrain } from "@/lib/trainingApi";

await triggerPeriodicRetrain();
// Returns: { message: string, session_id?: string }
```

---

### 4. Filter Configuration

#### Get Filter Configuration

Filter configuration is included in the `getFilterStatus()` response under `filter_config`.

#### Update Filter Configuration

```typescript
import { updateFilterConfig } from "@/lib/trainingApi";

await updateFilterConfig({
    volatility: {
        min_volatility: 0.005,
        min_price_range: 0.01,
        min_volume_volatility: 0.3,
        min_movement_frequency: 0.5,
        window_days: 30,
    },
    data_freshness: {
        max_data_age_hours: 24.0,
        min_completeness: 0.95,
        max_gap_candles: 2,
        check_window_days: 7,
    },
    enabled: {
        volatility: true,
        data_freshness: true,
    },
    behavior: {
        block_on_failure: true,
    },
});
```

---

## WebSocket Integration

For real-time updates, use the WebSocket service:

```typescript
import { getTrainingWebSocketService } from "@/lib/trainingWebSocket";

const wsService = getTrainingWebSocketService();

// Connect
wsService.connect();

// Subscribe to job updates
const unsubscribe = wsService.onJobStatusUpdate((job: TrainingJob) => {
    console.log("Job updated:", job);
});

// Subscribe to errors
const errorUnsubscribe = wsService.onError((error: string) => {
    console.error("WebSocket error:", error);
});

// Check connection status
const isConnected = wsService.isConnected();

// Disconnect
wsService.disconnect();
unsubscribe();
errorUnsubscribe();
```

**WebSocket Endpoint**: `ws://localhost:8000/ws/training?token=YOUR_TOKEN`

**Message Types**:
- `all_jobs_update` - Initial list of all jobs
- `job_status_update` - Individual job status update
- `error` - Error message

---

## Error Handling

All API functions throw errors that should be caught:

```typescript
try {
    const jobs = await getTrainingJobs();
} catch (error) {
    if (error instanceof Error) {
        console.error("API Error:", error.message);
        // Show user-friendly error message
        showToast("error", error.message);
    }
}
```

**Common Error Scenarios**:
- **401 Unauthorized**: Token expired or invalid
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource doesn't exist
- **500 Internal Server Error**: Server error

---

## Type Definitions

All TypeScript types are available from:

```typescript
import type {
    TrainingJob,
    FilterStatus,
    FilterConfig,
    QueueStatus,
    QueueJob,
    PeriodicRetrainStatus,
    PeriodicRetrainSession,
} from "@/types/training";
```

---

## Example: Complete Training Flow

```typescript
import { 
    getFilterStatus, 
    startTraining, 
    getTrainingJobs,
    getTrainingWebSocketService 
} from "@/lib/trainingApi";
import { showToast } from "@/components/training/ToastContainer";

// 1. Check filter status before training
const filterStatus = await getFilterStatus("BTC/USDT", "1h");
if (!filterStatus.can_train) {
    showToast("warning", `Cannot train: ${filterStatus.reason}`);
    return;
}

// 2. Start training
try {
    const result = await startTraining({
        symbol: "BTC/USDT",
        model_type: "lightgbm",
        horizon: "1h",
    });
    
    showToast("success", `Training started: ${result.job_id}`);
    
    // 3. Subscribe to updates
    const wsService = getTrainingWebSocketService();
    wsService.connect();
    
    const unsubscribe = wsService.onJobStatusUpdate((job) => {
        if (job.job_id === result.job_id) {
            if (job.status === "completed") {
                showToast("success", "Training completed!");
                unsubscribe();
            } else if (job.status === "failed") {
                showToast("error", `Training failed: ${job.error}`);
                unsubscribe();
            }
        }
    });
    
} catch (error) {
    showToast("error", error instanceof Error ? error.message : "Failed to start training");
}
```

---

## Rate Limiting

The API may implement rate limiting. Handle 429 responses:

```typescript
try {
    await startTraining(params);
} catch (error: any) {
    if (error.status === 429) {
        showToast("warning", "Too many requests. Please wait a moment.");
    }
}
```

---

## Best Practices

1. **Always handle errors** with try-catch blocks
2. **Show user feedback** using toast notifications
3. **Use WebSocket for real-time updates** when available
4. **Fallback to polling** if WebSocket is unavailable
5. **Validate inputs** before making API calls
6. **Check filter status** before starting training
7. **Use TypeScript types** for type safety
8. **Handle loading states** in UI components


// TypeScript interfaces for Training module

export type TrainingJobStatus = "running" | "completed" | "failed" | "unknown" | "rejected" | "pending" | "cancelled" | "paused";

export type ModelType = 
    | "lightgbm"
    | "lstm"
    | "transformer"
    | "enhanced_lstm"
    | "enhanced_transformer"
    | "tft"
    | "jump_detection"
    | "hybrid_jump"
    | "all";

export type Horizon = "10m" | "30m" | "1h" | "4h" | "1d";

export type Interval = "1h" | "4h" | "1d";

export interface TrainingJob {
    job_id: string;
    status: TrainingJobStatus;
    log_file?: string;
    error_file?: string;
    log_size?: number;
    error_size?: number;
    last_log_lines?: string[];
    error_lines?: string[];
    log_file_exists?: boolean;
    error_file_exists?: boolean;
    symbol?: string;
    model_type?: string;
    horizon?: string;
    started_at?: string;
    duration?: number;
    created_at?: string;
    checkpoint_path?: string;
    parent_job_id?: string;
    paused_at?: string;
}

export interface TrainingRequest {
    model_version?: string;
    symbol?: string;
    horizon?: string;
    model_type?: ModelType;
    retrain?: boolean;
    skip_filters?: boolean;
}

export interface StartTrainingResponse {
    status: string;
    job_id: string;
    message?: string;
    filter_details?: FilterStatus;
}

export interface VolatilityMetrics {
    price_volatility?: number;
    daily_range_avg?: number;
    volume_volatility?: number;
    movement_frequency?: number;
    avg_price_change?: number;
    max_price_change?: number;
    data_points?: number;
}

export interface VolatilityStatus {
    passed?: boolean;
    score?: number;
    metrics?: VolatilityMetrics;
    checks?: {
        volatility_check?: boolean;
        price_range_check?: boolean;
        volume_volatility_check?: boolean;
        movement_frequency_check?: boolean;
    };
    reason?: string;
    recommendation?: string;
}

export interface DataFreshnessStatus {
    is_fresh?: boolean;
    last_candle_time?: string;
    data_age_hours?: number;
    completeness?: number;
    completeness_info?: {
        expected_candles?: number;
        actual_candles?: number;
        missing_candles?: number;
        completeness_percentage?: number;
    };
    gaps?: Array<{
        start: string;
        end: string;
        count: number;
        missing_count?: number;
        before_timestamp?: string;
    }>;
    checks?: {
        data_exists?: boolean;
        age_check?: boolean;
        completeness_check?: boolean;
        gap_check?: boolean;
    };
    reason?: string;
    recommendation?: string;
}

export interface FilterStatus {
    tier?: number;
    symbol: string;
    interval: string;
    can_train: boolean;
    can_predict: boolean;
    volatility?: VolatilityStatus;
    data_freshness?: DataFreshnessStatus;
    filter_config?: FilterConfig;
    reason?: string;
}

export interface FilterConfig {
    volatility?: {
        min_volatility?: number;
        min_price_range?: number;
        min_volume_volatility?: number;
        min_movement_frequency?: number;
        window_days?: number;
    };
    data_freshness?: {
        max_data_age_hours?: number;
        min_completeness?: number;
        max_gap_candles?: number;
        check_window_days?: number;
    };
    enabled?: {
        volatility?: boolean;
        data_freshness?: boolean;
    };
    behavior?: {
        block_on_failure?: boolean;
    };
}

export interface PeriodicRetrainSession {
    start_time: string;
    duration_seconds: number;
    total_models: number;
    successful: number;
    failed: number;
    success_rate: number;
    tier?: number;
}

export interface QueueJob {
    job_id: string;
    symbol: string;
    model_type: string;
    horizon: string;
    priority: "tier_1" | "tier_2" | "tier_3" | "performance_based";
    status: "pending" | "running" | "completed" | "failed" | "cancelled";
    created_at: string;
}

export interface QueueStatus {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    max_concurrent: number;
    available_slots: number;
    next_jobs?: QueueJob[];
    running_jobs?: QueueJob[];
}

export interface PeriodicRetrainStatus {
    scheduler?: {
        enabled: boolean;
        job_id?: string;
        interval_hours?: number;
    };
    last_run?: string;
    next_run?: string;
    summary?: {
        total_retrain_sessions?: number;
        total_models_retrained?: number;
        total_successful?: number;
        total_failed?: number;
        success_rate?: number;
        avg_duration_seconds?: number;
        avg_duration_minutes?: number;
        total_filtered?: number;
        filtered_by_volatility?: number;
        filtered_by_data_freshness?: number;
    };
    stats_7d?: {
        total_sessions?: number;
        total_models?: number;
        total_successful?: number;
        total_failed?: number;
        avg_duration_seconds?: number;
        avg_duration_minutes?: number;
        success_rate?: number;
    };
    recent_periodic?: PeriodicRetrainSession[];
    recent_performance?: Array<{
        start_time: string;
        duration_seconds: number;
        total_models: number;
        successful: number;
        failed: number;
        success_rate: number;
    }>;
    queue?: QueueStatus;
    filtered_symbols?: Array<{
        symbol: string;
        interval: string;
        filter_type: string;
        reason: string;
        timestamp: string;
        metrics?: Record<string, unknown>;
    }>;
}

export interface TrainingMetrics {
    total_retrain_sessions: number;
    total_models_retrained: number;
    total_successful: number;
    total_failed: number;
    success_rate: number;
    avg_duration_minutes: number;
    total_filtered: number;
    filtered_by_volatility: number;
    filtered_by_data_freshness: number;
}

export interface JobLogsResponse {
    log?: string;
    error_log?: string;
    log_size?: number;
    error_size?: number;
    last_log_lines?: string[];
    error_lines?: string[];
}

export interface Model {
    model_version: string;
    symbol?: string;
    interval?: string;
    horizon?: string;
    model_type?: string;
    trained_at?: string;
    performance?: {
        mae?: number;
        rmse?: number;
        mape?: number;
        directional_accuracy?: number;
    };
}


export interface BackfillJob {
     symbol: string;
     interval: string;
     total_pages: number;
     current_page: number;
     status: "running" | "paused" | "completed" | "failed" | "error";
     started_at: string | null;
     last_updated: string | null;
     error_message?: string;
}

export interface BackupFile {
     filename: string;
     path: string;
     size_mb: number;
     created: string;
}

export interface Market {
     symbol: string;
     base: string;
     quote: string;
     active: boolean;
}

export interface DataStatus {
     exists: boolean;
     count: number;
     first_timestamp: number | null;
     last_timestamp: number | null;
     last_updated: string | null;
     is_complete: boolean;
     status: "complete" | "incomplete" | "missing";
}

export interface SymbolDataStatus {
     [interval: string]: DataStatus;
}

export interface BatchBackfillJob {
     batch_id: string;
     exchange_account_id: number;
     total_jobs: number;
     completed_jobs: number;
     failed_jobs: number;
     status: "running" | "paused" | "completed" | "failed";
     started_at: string;
     last_updated: string;
     symbols: string[];
     intervals: string[];
     total_pages_per_job: number;
     auto_backup: boolean;
}


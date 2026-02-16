export const TIMEFRAME_MS: Record<string, number> = {
    "1m": 60 * 1000,
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "30m": 30 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
};

export const TIMEFRAME_SECONDS: Record<string, number> = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
};

const DEFAULT_MS = 60 * 60 * 1000;
const DEFAULT_SECONDS = 3600;

export function getTimeframeDurationMs(timeframe: string): number {
    return TIMEFRAME_MS[timeframe] ?? DEFAULT_MS;
}

export function getTimeframeDurationSeconds(timeframe: string): number {
    return TIMEFRAME_SECONDS[timeframe] ?? DEFAULT_SECONDS;
}

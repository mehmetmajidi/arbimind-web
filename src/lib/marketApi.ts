import { getApiV1Base } from "./apiBaseUrl";
import { getMarketApiBase } from "./marketEndpoints";
import type { OHLCVCandle } from "@/types/market";
import type { PredictionData } from "@/types/market";
import { getTimeframeDurationMs } from "./marketTimeframeUtils";
import { sortCandlesByTime, deduplicateCandles, normalizeCandleTime } from "./ohlcvUtils";

function getToken(): string {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("auth_token") || "";
}

export interface FetchOHLCVResult {
    candles: OHLCVCandle[];
    oldestTimestamp: number | null;
}

/**
 * Fetch OHLCV in batches (up to targetCandles). Returns sorted, deduplicated candles.
 */
export async function fetchOHLCV(
    accountId: number,
    symbol: string,
    timeframe: string
): Promise<FetchOHLCVResult> {
    const token = getToken();
    if (!token) throw new Error("Please login to view market data");
    const marketBase = getMarketApiBase();
    const encodedSymbol = encodeURIComponent(symbol);
    const timeframeDuration = getTimeframeDurationMs(timeframe);
    const targetCandles = 300;
    const maxPerRequest = 300;
    const maxAttempts = 2;
    const allCandles: OHLCVCandle[] = [];
    let currentSince: number | null = null;
    let attempts = 0;
    let previousCount = 0;
    let noProgressCount = 0;

    const OHLCV_TIMEOUT_MS = 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OHLCV_TIMEOUT_MS);

    try {
        while (allCandles.length < targetCandles && attempts < maxAttempts) {
            attempts++;
            const remaining = targetCandles - allCandles.length;
            const requestLimit = Math.min(remaining, maxPerRequest);
            const url = currentSince
                ? `${marketBase}/ohlcv-from-exchange/${accountId}/${encodedSymbol}?timeframe=${timeframe}&limit=${requestLimit}&since=${currentSince}`
                : `${marketBase}/ohlcv-from-exchange/${accountId}/${encodedSymbol}?timeframe=${timeframe}&limit=${requestLimit}`;

            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-cache",
                signal: controller.signal,
            });
            if (!response.ok) break;

        const data: { candles?: OHLCVCandle[] } = await response.json();
        const candles = data.candles ?? [];
        if (candles.length === 0) break;

        const sortedCandles = sortCandlesByTime(candles);
        for (const candle of sortedCandles) {
            const candleTime = normalizeCandleTime(candle.t);
            const exists = allCandles.some((c) => normalizeCandleTime(c.t) === candleTime);
            if (!exists) allCandles.push(candle);
        }

        if (allCandles.length === previousCount) {
            noProgressCount++;
            if (noProgressCount >= 2) break;
        } else {
            noProgressCount = 0;
        }
        previousCount = allCandles.length;

        if (candles.length < requestLimit) break;

        const oldest = sortedCandles[0];
        if (!oldest) break;
        const oldestTime = normalizeCandleTime(oldest.t);
        const oldestTimestampMs = oldestTime * 1000;
        currentSince = oldestTimestampMs - candles.length * timeframeDuration;
        if (currentSince >= oldestTimestampMs) break;
        }
    } finally {
        clearTimeout(timeoutId);
    }

    const sorted = sortCandlesByTime(allCandles);
    const uniqueCandles = deduplicateCandles(sorted);
    const oldestTimestamp =
        uniqueCandles.length > 0 ? normalizeCandleTime(uniqueCandles[0].t) : null;
    return { candles: uniqueCandles, oldestTimestamp };
}

export async function fetchLivePrice(
    accountId: number,
    symbol: string
): Promise<number | null> {
    const token = getToken();
    if (!token) return null;
    const marketBase = getMarketApiBase();
    const encodedSymbol = encodeURIComponent(symbol);
    const response = await fetch(
        `${marketBase}/price/${accountId}/${encodedSymbol}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-cache" }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const price = data.price ?? data.last ?? data.close ?? 0;
    return price > 0 ? price : null;
}

export async function fetchPredictions(
    accountId: number,
    symbol: string,
    horizonsParam: string
): Promise<Record<string, PredictionData>> {
    const token = getToken();
    if (!token) return {};
    const apiUrl = getApiV1Base();
    const encodedSymbol = encodeURIComponent(symbol);
    const response = await fetch(
        `${apiUrl}/predictions/symbol/${encodedSymbol}?horizons=${horizonsParam}&exchange_account_id=${accountId}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
            throw new Error("Rate limit exceeded. Please wait a moment and try again.");
        }
        const msg = errorData.detail ?? `Failed to fetch predictions (${response.status})`;
        if (response.status === 400 || response.status === 503) {
            throw new Error(`Prediction error: ${msg}`);
        }
        throw new Error(`Failed to fetch predictions: ${msg}`);
    }
    const data = await response.json();
    const predictionsData = data.predictions ?? {};
    const valid: Record<string, PredictionData> = {};
    for (const [horizon, pred] of Object.entries(predictionsData)) {
        if (pred != null) valid[horizon] = pred as PredictionData;
    }
    return valid;
}

export async function fetchDemoWallet(): Promise<Record<string, unknown>> {
    const token = getToken();
    if (!token) throw new Error("Not authenticated");
    const apiUrl = getApiV1Base();
    const res = await fetch(`${apiUrl}/demo/wallet`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch wallet");
    return res.json();
}

export interface FetchMoreOHLCVResult {
    candles: OHLCVCandle[];
    oldestTimestamp: number;
}

export async function fetchMoreOHLCV(
    accountId: number,
    symbol: string,
    timeframe: string,
    beforeTimestamp: number
): Promise<FetchMoreOHLCVResult | null> {
    const token = getToken();
    if (!token) return null;
    const marketBase = getMarketApiBase();
    const encodedSymbol = encodeURIComponent(symbol);
    const timeframeDuration = getTimeframeDurationMs(timeframe);
    const beforeTimestampMs =
        beforeTimestamp > 1000000000000 ? beforeTimestamp : beforeTimestamp * 1000;
    const sinceMs = beforeTimestampMs - 300 * timeframeDuration;
    const minSinceMs = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const finalSinceMs = Math.max(sinceMs, minSinceMs);

    const response = await fetch(
        `${marketBase}/ohlcv-from-exchange/${accountId}/${encodedSymbol}?timeframe=${timeframe}&limit=300&since=${finalSinceMs}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-cache" }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const newCandles: OHLCVCandle[] = data.candles ?? [];
    const beforeSeconds =
        beforeTimestamp > 1000000000000 ? beforeTimestamp / 1000 : beforeTimestamp;
    const filtered = newCandles.filter(
        (c) => normalizeCandleTime(c.t) < beforeSeconds
    );
    if (filtered.length === 0) return null;
    const sorted = sortCandlesByTime(filtered);
    const oldest = sorted[0];
    const oldestTimestamp = normalizeCandleTime(oldest.t);
    return { candles: sorted, oldestTimestamp };
}

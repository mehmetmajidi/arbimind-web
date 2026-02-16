import type { OHLCVCandle } from "@/types/market";

/** Normalize timestamp to seconds (handles ms or s). */
export function normalizeCandleTime(t: number): number {
    return t > 1000000000000 ? t / 1000 : t;
}

export function sortCandlesByTime<T extends { t: number }>(candles: T[]): T[] {
    return [...candles].sort((a, b) => normalizeCandleTime(a.t) - normalizeCandleTime(b.t));
}

export function deduplicateCandles(candles: OHLCVCandle[]): OHLCVCandle[] {
    return candles.filter((candle, index, self) => {
        const time = normalizeCandleTime(candle.t);
        return index === self.findIndex((c) => normalizeCandleTime(c.t) === time);
    });
}

/**
 * Compute 24h price change percent from OHLCV and current price.
 * Returns null if not enough data or invalid.
 */
export function computePriceChange24h(
    ohlcvData: OHLCVCandle[],
    currentPrice: number
): number | null {
    if (ohlcvData.length === 0 || currentPrice <= 0) return null;
    const now = Date.now() / 1000;
    const twentyFourHoursAgo = now - 24 * 60 * 60;
    let closestCandle = ohlcvData[0];
    for (const candle of ohlcvData) {
        const candleTime = normalizeCandleTime(candle.t);
        if (candleTime <= twentyFourHoursAgo) {
            closestCandle = candle;
        } else {
            break;
        }
    }
    const price24hAgo = closestCandle.c;
    if (price24hAgo <= 0) return null;
    return ((currentPrice - price24hAgo) / price24hAgo) * 100;
}

import type { OHLCVCandle } from "@/types/market";
import { getTimeframeDurationSeconds } from "./marketTimeframeUtils";
import { sortCandlesByTime, normalizeCandleTime } from "./ohlcvUtils";

/**
 * Returns seconds until the current candle closes. If already past close, returns 0.
 */
export function getTimeUntilCandleClose(
    ohlcvData: OHLCVCandle[],
    timeframe: string
): number {
    if (ohlcvData.length === 0) return 0;
    const duration = getTimeframeDurationSeconds(timeframe);
    const sorted = sortCandlesByTime(ohlcvData);
    const last = sorted[sorted.length - 1];
    const lastTime = normalizeCandleTime(last.t);
    const lastStart = Math.floor(lastTime / duration) * duration;
    const lastEnd = lastStart + duration;
    const now = Math.floor(Date.now() / 1000);
    const timeUntil = lastEnd - now;
    return timeUntil > 0 ? timeUntil : 0;
}

/**
 * If the current timeframe has rolled to a new candle, append that candle to prevData and return.
 * Otherwise returns prevData unchanged.
 */
export function addNewCandleAtClose(
    prevData: OHLCVCandle[],
    currentPrice: number,
    timeframe: string
): OHLCVCandle[] {
    if (prevData.length === 0) return prevData;
    const duration = getTimeframeDurationSeconds(timeframe);
    const now = Math.floor(Date.now() / 1000);
    const currentCandleStartTime = Math.floor(now / duration) * duration;
    const sorted = sortCandlesByTime(prevData);
    const last = sorted[sorted.length - 1];
    const lastTime = normalizeCandleTime(last.t);
    const lastStart = Math.floor(lastTime / duration) * duration;
    if (currentCandleStartTime <= lastStart) return prevData;
    const exists = sorted.some((c) => {
        const cStart = Math.floor(normalizeCandleTime(c.t) / duration) * duration;
        return cStart === currentCandleStartTime;
    });
    if (exists) return prevData;
    const newCandle: OHLCVCandle = {
        t: currentCandleStartTime * 1000,
        o: last.c,
        h: currentPrice,
        l: currentPrice,
        c: currentPrice,
        v: 0,
    };
    return sortCandlesByTime([...sorted, newCandle]);
}

/**
 * Apply real-time price update: update last candle's c/h/l or create new candle if timeframe rolled.
 */
export function applyRealtimeCandleUpdate(
    prevData: OHLCVCandle[],
    currentPrice: number,
    currentPriceTime: number,
    timeframe: string
): OHLCVCandle[] {
    if (prevData.length === 0) return prevData;
    const duration = getTimeframeDurationSeconds(timeframe);
    const now = normalizeCandleTime(currentPriceTime > 1000000000000 ? currentPriceTime / 1000 : currentPriceTime);
    const currentCandleStartTime = Math.floor(now / duration) * duration;
    const sorted = sortCandlesByTime(prevData);
    const lastCandle = sorted[sorted.length - 1];
    const lastCandleTime = normalizeCandleTime(lastCandle.t);
    const lastCandleStartTime = Math.floor(lastCandleTime / duration) * duration;
    const updated = [...sorted];

    if (currentCandleStartTime > lastCandleStartTime) {
        const newCandleTimestamp = currentCandleStartTime * 1000;
        const existingIndex = updated.findIndex((c) => {
            const cStart = Math.floor(normalizeCandleTime(c.t) / duration) * duration;
            return cStart === currentCandleStartTime;
        });
        if (existingIndex >= 0) {
            const existing = updated[existingIndex];
            updated[existingIndex] = {
                ...existing,
                c: currentPrice,
                h: Math.max(existing.h, currentPrice),
                l: Math.min(existing.l, currentPrice),
            };
        } else {
            const timeGap = currentCandleStartTime - lastCandleStartTime;
            const maxGap = duration * 2;
            const openPrice = timeGap > maxGap ? currentPrice : lastCandle.c;
            updated.push({
                t: newCandleTimestamp,
                o: openPrice,
                h: Math.max(openPrice, currentPrice),
                l: Math.min(openPrice, currentPrice),
                c: currentPrice,
                v: 0,
            });
        }
    } else if (lastCandleStartTime === currentCandleStartTime) {
        if (
            lastCandle.c !== currentPrice ||
            lastCandle.h < currentPrice ||
            lastCandle.l > currentPrice
        ) {
            updated[updated.length - 1] = {
                ...lastCandle,
                c: currentPrice,
                h: Math.max(lastCandle.h, currentPrice),
                l: Math.min(lastCandle.l, currentPrice),
            };
        }
    }
    return sortCandlesByTime(updated);
}

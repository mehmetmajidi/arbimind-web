/**
 * Market API base path. Backend routes are under /market (refactored into routers.market package).
 * All market endpoints: price, ohlcv, pairs, symbols, liquidation-map, arbitrage, etc.
 */
import { getApiV1Base } from "./apiBaseUrl";

export const MARKET_API_PREFIX = "/market";

/** Base URL for market API (e.g. "http://localhost:8000/api/v1/market") */
export function getMarketApiBase(): string {
  return `${getApiV1Base()}${MARKET_API_PREFIX}`;
}

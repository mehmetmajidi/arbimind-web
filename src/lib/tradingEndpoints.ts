/**
 * Trading API base path. Backend routes are under /trading (refactored into routers.trading package).
 * All trading endpoints: orders, positions, balance, trades, etc.
 */
import { getApiV1Base } from "./apiBaseUrl";

export const TRADING_API_PREFIX = "/trading";

/** Base URL for trading API (e.g. "http://localhost:8000/api/v1/trading") */
export function getTradingApiBase(): string {
  return `${getApiV1Base()}${TRADING_API_PREFIX}`;
}

/**
 * Exchange API base path. Backend routes are under /exchange (refactored into routers.exchange package).
 * All exchange endpoints: accounts, exchanges, supported, currencies, trading-permissions, etc.
 */
import { getApiUrl } from "./apiBaseUrl";

export const EXCHANGE_API_PREFIX = "/exchange";

/** Base URL for exchange API (e.g. "http://localhost:8000/exchange") */
export function getExchangeApiBase(): string {
  return `${getApiUrl()}${EXCHANGE_API_PREFIX}`;
}

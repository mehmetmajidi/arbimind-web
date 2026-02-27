/**
 * Bots API base path. Backend routes are under /bots (refactored into routers.bots package).
 * All bot endpoints: create, list, get, update, delete, start, stop, reset, status, trades, decision-logs, close trade.
 */
import { getApiV1Base } from "./apiBaseUrl";

export const BOTS_API_PREFIX = "/bots";

/** Base URL for bots API (e.g. "http://localhost:8000/api/v1/bots") */
export function getBotsApiBase(): string {
  return `${getApiV1Base()}${BOTS_API_PREFIX}`;
}

/**
 * Train API base path. Backend routes are under /train (refactored into routers.train package).
 * All train endpoints: start, status, logs, cancel, pause, resume, delete, periodic-status,
 * models, retrain, retrain-job, trigger-periodic, top-filtered-symbols, filter-symbols,
 * complete-candle-data, filter-status.
 */
import { getApiUrl } from "./apiBaseUrl";

export const TRAIN_API_PREFIX = "/train";

/** Base URL for train API (e.g. "http://localhost:8000/train") */
export function getTrainApiBase(): string {
  return `${getApiUrl()}${TRAIN_API_PREFIX}`;
}

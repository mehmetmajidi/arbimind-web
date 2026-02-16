/**
 * Central API base URL for REST and WebSocket.
 * Use this instead of hardcoding "http://localhost:8000" anywhere.
 */
/// <reference types="node" />

const DEFAULT_API_URL = "http://localhost:8000";

export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

export function getWsUrl(): string {
  const base = getApiUrl();
  return base.replace(/^http/, "ws");
}

/**
 * Central API base URL for REST and WebSocket.
 *
 * NEXT_PUBLIC_API_URL is baked into the JS bundle at build time, so it must
 * be reachable from the *browser* (e.g. http://localhost:8000), not from
 * inside the Docker network (http://api:8000).
 *
 * For server-side Next.js code (getServerSideProps, Route Handlers, etc.)
 * use INTERNAL_API_URL which can point to the Docker-internal hostname.
 */
/// <reference types="node" />

/** REST API version prefix (must match backend API_V1_PREFIX) */
export const API_V1_PREFIX = "/api/v1";

export function getApiUrl(): string {
  // Running in the browser → use the public URL (reachable from the client machine)
  if (typeof window !== "undefined") {
    // NEXT_PUBLIC_API_URL may be "http://api:8000" (Docker-internal) which is
    // unreachable from the browser, so we always fall back to localhost in that case.
    const pub = process.env.NEXT_PUBLIC_API_URL || "";
    if (pub && !pub.includes("api:") && !pub.includes("://api")) {
      return pub;
    }
    // Default: same host, port 8000
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }

  // Server-side (SSR / API routes) → prefer the Docker-internal URL
  return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
}

/** Base URL for versioned REST API (e.g. "http://localhost:8000/api/v1") */
export function getApiV1Base(): string {
  return `${getApiUrl()}${API_V1_PREFIX}`;
}

export function getWsUrl(): string {
  const base = getApiUrl();
  return base.replace(/^http/, "ws");
}

/** WebSocket base URL for versioned API (e.g. "ws://localhost:8000/api/v1") */
export function getWsV1Base(): string {
  return `${getWsUrl()}${API_V1_PREFIX}`;
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { colors } from "./constants";
import { getBotsApiBase } from "@/lib/botsEndpoints";
import { getApiUrl, getWsUrl } from "@/lib/apiBaseUrl";

interface DecisionLog {
  id: string;
  timestamp: string;
  symbol: string;
  action: "buy" | "sell" | "hold";
  reason: string;
  confidence?: number;
  price?: number;
  strategy?: string;
  metadata?: Record<string, unknown>;
}

interface BotDecisionLogsProps {
  botId: number | null;
  enabled?: boolean;
}

export default function BotDecisionLogs({ botId, enabled = true }: BotDecisionLogsProps) {
  const [logs, setLogs] = useState<DecisionLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const botIdRef = useRef<number | null>(null);
  const maxLogs = 100;

  // Scroll to bottom inside the logs container only (never scrolls the page)
  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // ── Fetch initial logs from REST API ────────────────────────────────────────
  const fetchDecisionLogs = useCallback(async (id: number) => {
    const token = localStorage.getItem("auth_token") || "";
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(
        `${getBotsApiBase()}/${id}/decision-logs?limit=50`,
        { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const list: DecisionLog[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.logs)
          ? data.logs
          : [];
        setLogs(list);
        setError(null);
      } else if (response.status !== 404) {
        setError(`Failed to load (${response.status})`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("abort")) {
        setError("Request timed out");
      } else {
        setError("Could not load. Check connection.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []); // no deps – uses param instead of closure over botId

  // ── Append a single live decision from WebSocket ─────────────────────────────
  const appendLog = useCallback((log: DecisionLog) => {
    setLogs((prev) => [log, ...prev].slice(0, maxLogs));
  }, []);

  // ── WebSocket + polling setup ─────────────────────────────────────────────────
  useEffect(() => {
    // Cleanup helper
    const cleanup = () => {
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };

    if (!botId || !enabled) {
      cleanup();
      return;
    }

    // If botId changed, reset logs
    if (botIdRef.current !== botId) {
      botIdRef.current = botId;
      setLogs([]);
      setError(null);
    }

    const token = localStorage.getItem("auth_token") || "";

    // Always do an initial REST fetch first so we have data immediately
    fetchDecisionLogs(botId);

    if (!token) {
      // No token → polling only
      pollingRef.current = setInterval(() => fetchDecisionLogs(botId), 10000);
      return cleanup;
    }

    // ── WebSocket ──────────────────────────────────────────────────────────────
    const wsUrl = `${getWsUrl()}/ws/bot/${botId}?token=${encodeURIComponent(token)}&interval=5`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      // WebSocket not supported / URL invalid → fall back to polling
      pollingRef.current = setInterval(() => fetchDecisionLogs(botId), 10000);
      return cleanup;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      setError(null);
      // Stop polling now that WS is live
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);

        if (msg.type === "bot_decision" || msg.type === "decision_update") {
          appendLog({
            id: msg.id || `${Date.now()}-${Math.random()}`,
            timestamp: msg.timestamp || new Date().toISOString(),
            symbol: msg.symbol || "N/A",
            action: msg.action || "hold",
            reason: msg.reason || msg.message || "No reason provided",
            confidence: msg.confidence,
            price: msg.price,
            strategy: msg.strategy,
            metadata: msg.metadata,
          });
        } else if (msg.type === "bot_status_update" && msg.data?.last_decision) {
          const d = msg.data.last_decision;
          appendLog({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: new Date().toISOString(),
            symbol: d.symbol || "N/A",
            action: d.action || "hold",
            reason: d.reason || "Status update",
            confidence: d.confidence,
            price: d.price,
            strategy: d.strategy,
          });
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      // Fall back to polling on error
      if (!pollingRef.current) {
        pollingRef.current = setInterval(() => fetchDecisionLogs(botId), 10000);
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      // Fall back to polling when WS closes
      if (!pollingRef.current) {
        pollingRef.current = setInterval(() => fetchDecisionLogs(botId), 10000);
      }
    };

    return cleanup;
    // Only re-run when botId or enabled changes – fetchDecisionLogs / appendLog
    // are stable (useCallback with no deps / empty deps).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botId, enabled]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "buy":  return "#10b981";
      case "sell": return "#ef4444";
      case "hold": return "#6b7280";
      default:     return colors.text;
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      backgroundColor: colors.panelBackground,
      border: `1px solid ${colors.border}`,
      borderRadius: "12px",
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      height: "600px",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "16px",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h3 style={{ color: colors.primary, margin: 0, fontSize: "18px", fontWeight: "600" }}>
            📊 Bot Decisions
          </h3>
          {error && (
            <>
              <span style={{
                fontSize: "12px",
                color: colors.error,
                padding: "4px 8px",
                backgroundColor: "rgba(239,68,68,0.15)",
                borderRadius: "4px",
              }}>
                {error}
              </span>
              <button
                type="button"
                onClick={() => { setError(null); if (botId) fetchDecisionLogs(botId); }}
                style={{
                  fontSize: "12px",
                  padding: "4px 10px",
                  backgroundColor: "transparent",
                  border: `1px solid ${colors.primary}`,
                  borderRadius: "4px",
                  color: colors.primary,
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <label style={{
            display: "flex", alignItems: "center", gap: "6px",
            cursor: "pointer", fontSize: "12px", color: colors.secondaryText,
          }}>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <span>Auto Scroll</span>
          </label>
          <button
            onClick={() => setLogs([])}
            style={{
              padding: "6px 12px",
              backgroundColor: "transparent",
              border: `1px solid ${colors.border}`,
              borderRadius: "6px",
              color: colors.text,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Logs Container */}
      <div ref={logsContainerRef} style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        paddingRight: "4px",
        minHeight: 0,
      }}>
        {isLoading && logs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: colors.secondaryText, fontSize: "14px" }}>
            Loading...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: colors.secondaryText, fontSize: "14px" }}>
            No decisions recorded yet
            <br />
            <span style={{ fontSize: "12px", marginTop: "8px", display: "block" }}>
              Decisions will appear after the bot starts trading
            </span>
            {error && (
              <button
                type="button"
                onClick={() => { setError(null); if (botId) fetchDecisionLogs(botId); }}
                style={{
                  marginTop: "16px",
                  padding: "8px 16px",
                  backgroundColor: colors.primary,
                  border: "none",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Retry loading
              </button>
            )}
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              style={{
                padding: "12px",
                backgroundColor: colors.background,
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                fontSize: "13px",
              }}
            >
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "8px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{
                    padding: "4px 8px",
                    backgroundColor: getActionColor(log.action) + "20",
                    color: getActionColor(log.action),
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                  }}>
                    {log.action.toUpperCase()}
                  </span>
                  <span style={{ color: colors.text, fontWeight: "500" }}>{log.symbol}</span>
                  {log.price && (
                    <span style={{ color: colors.secondaryText, fontSize: "12px" }}>
                      ${log.price.toLocaleString()}
                    </span>
                  )}
                </div>
                <span style={{ color: colors.secondaryText, fontSize: "11px" }}>
                  {formatTime(log.timestamp)}
                </span>
              </div>

              <div style={{ color: colors.text, fontSize: "12px", lineHeight: "1.5", marginBottom: "4px" }}>
                {log.reason}
              </div>

              {log.confidence !== undefined && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                  <span style={{ color: colors.secondaryText, fontSize: "11px" }}>Confidence:</span>
                  <div style={{
                    flex: 1, height: "4px",
                    backgroundColor: colors.border,
                    borderRadius: "2px",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${log.confidence * 100}%`,
                      height: "100%",
                      backgroundColor: log.confidence > 0.7 ? "#10b981" : log.confidence > 0.5 ? "#f59e0b" : "#ef4444",
                      transition: "width 0.3s",
                    }} />
                  </div>
                  <span style={{ color: colors.secondaryText, fontSize: "11px", minWidth: "40px", textAlign: "right" }}>
                    {(log.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              )}

              {log.strategy && (
                <div style={{ marginTop: "6px", fontSize: "11px", color: colors.secondaryText }}>
                  Strategy: <span style={{ color: colors.text }}>{log.strategy}</span>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Footer */}
      <div style={{
        marginTop: "12px",
        paddingTop: "12px",
        borderTop: `1px solid ${colors.border}`,
        fontSize: "11px",
        color: colors.secondaryText,
        textAlign: "center",
        flexShrink: 0,
      }}>
        {logs.length > 0 && (
          <span>
            {logs.length} decision{logs.length !== 1 ? "s" : ""} recorded
            {logs.length >= maxLogs && ` (showing last ${maxLogs})`}
          </span>
        )}
      </div>
    </div>
  );
}

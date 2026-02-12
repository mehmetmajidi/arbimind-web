"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { colors } from "./constants";

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
  const logsEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxLogs = 100; // Keep last 100 logs

  // Scroll to bottom when new log arrives
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  // Add log function
  const addLog = useCallback((log: DecisionLog) => {
    setLogs((prev) => {
      const newLogs = [log, ...prev].slice(0, maxLogs);
      return newLogs;
    });
  }, []);

  // Fetch decision logs from API (with timeout so we don't hang on "Loading...")
  const fetchDecisionLogs = useCallback(async () => {
    if (!botId || !enabled) return;

    const token = localStorage.getItem("auth_token") || "";
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const apiUrl = typeof window !== "undefined"
        ? "http://localhost:8000"
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${apiUrl}/bots/${botId}/decision-logs?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setLogs(data);
        } else if (data && Array.isArray(data.logs)) {
          setLogs(data.logs);
        } else {
          setLogs([]);
        }
        setError(null);
      } else if (response.status === 404) {
        setLogs([]);
      } else {
        setError(`Failed to load (${response.status})`);
        setLogs([]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("abort")) {
        setError("Request timed out");
      } else {
        setError("Could not load. Check connection.");
        console.debug("Decision logs endpoint not available:", err);
      }
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [botId, enabled]);

  // WebSocket connection for real-time decision logs
  useEffect(() => {
    if (!botId || !enabled) {
      // Cleanup
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    const token = localStorage.getItem("auth_token") || "";
    if (!token) {
      // Fallback to polling
      fetchDecisionLogs();
      pollingIntervalRef.current = setInterval(fetchDecisionLogs, 10000); // Poll every 10 seconds
      return;
    }

    const apiUrl = typeof window !== "undefined" 
      ? "http://localhost:8000" 
      : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    
    const wsUrl = apiUrl.replace("http://", "ws://").replace("https://", "wss://");
    const url = `${wsUrl}/ws/bot/${botId}?token=${encodeURIComponent(token)}&interval=5`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`Decision logs WebSocket connected for bot ${botId}`);
        setError(null);
        // Stop polling if WebSocket connects
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Debug: log all messages to see what we're receiving
          console.log(`[BotDecisionLogs] WebSocket message received:`, message);

          // Handle bot decision messages
          if (message.type === "bot_decision" || message.type === "decision_update") {
            console.log(`[BotDecisionLogs] Processing decision message:`, message);
            const log: DecisionLog = {
              id: message.id || `${Date.now()}-${Math.random()}`,
              timestamp: message.timestamp || new Date().toISOString(),
              symbol: message.symbol || "N/A",
              action: message.action || "hold",
              reason: message.reason || message.message || "No reason provided",
              confidence: message.confidence,
              price: message.price,
              strategy: message.strategy,
              metadata: message.metadata,
            };
            addLog(log);
            console.log(`[BotDecisionLogs] Added log:`, log);
          }
          // Also handle status updates that might contain decision info
          else if (message.type === "bot_status_update" && message.data) {
            // Extract decision info from status update if available
            if (message.data.last_decision) {
              const decision = message.data.last_decision;
              const log: DecisionLog = {
                id: `${Date.now()}-${Math.random()}`,
                timestamp: new Date().toISOString(),
                symbol: decision.symbol || "N/A",
                action: decision.action || "hold",
                reason: decision.reason || "Status update",
                confidence: decision.confidence,
                price: decision.price,
                strategy: decision.strategy,
              };
              addLog(log);
            }
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("Decision logs WebSocket error:", error);
        setError("WebSocket connection error");
        // Fallback to polling
        if (!pollingIntervalRef.current) {
          fetchDecisionLogs();
          pollingIntervalRef.current = setInterval(fetchDecisionLogs, 10000);
        }
      };

      ws.onclose = () => {
        console.log(`Decision logs WebSocket closed for bot ${botId}`);
        wsRef.current = null;
        // Fallback to polling
        if (!pollingIntervalRef.current) {
          fetchDecisionLogs();
          pollingIntervalRef.current = setInterval(fetchDecisionLogs, 10000);
        }
      };
    } catch (err) {
      console.error("Error creating WebSocket:", err);
      setError("Failed to connect");
      // Fallback to polling
      fetchDecisionLogs();
      pollingIntervalRef.current = setInterval(fetchDecisionLogs, 10000);
    }

    // Initial fetch
    fetchDecisionLogs();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [botId, enabled, fetchDecisionLogs, addLog]);

  // Simulate decision logs from bot activity (fallback if WebSocket doesn't send decision events)
  // This will be replaced by actual WebSocket messages when backend supports it
  useEffect(() => {
    if (!botId || !enabled) return;

    // Poll for bot status which might contain decision info
    const statusPollInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem("auth_token") || "";
        if (!token) return;

        const apiUrl = typeof window !== "undefined" 
          ? "http://localhost:8000" 
          : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

        const response = await fetch(`${apiUrl}/bots/${botId}/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          // If status contains last decision info, add it as log
          // This is a fallback until backend sends decision events via WebSocket
        }
      } catch (err) {
        // Silently fail
      }
    }, 15000); // Poll every 15 seconds as fallback

    return () => {
      clearInterval(statusPollInterval);
    };
  }, [botId, enabled]);

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "buy":
        return "#10b981"; // Green
      case "sell":
        return "#ef4444"; // Red
      case "hold":
        return "#6b7280"; // Gray
      default:
        return colors.text;
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString("en-US", { 
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit" 
      });
    } catch {
      return timestamp;
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div style={{
      backgroundColor: colors.panelBackground,
      border: `1px solid ${colors.border}`,
      borderRadius: "12px",
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      minHeight: "400px",
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
          <h3 style={{ 
            color: colors.primary, 
            margin: 0, 
            fontSize: "18px", 
            fontWeight: "600" 
          }}>
            📊 Bot Decisions
          </h3>
          {error && (
            <>
              <span style={{
                fontSize: "12px",
                color: colors.error,
                padding: "4px 8px",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                borderRadius: "4px",
              }}>
                {error}
              </span>
              <button
                type="button"
                onClick={() => { setError(null); fetchDecisionLogs(); }}
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
            display: "flex", 
            alignItems: "center", 
            gap: "6px", 
            cursor: "pointer",
            fontSize: "12px",
            color: colors.secondaryText,
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
            onClick={clearLogs}
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
      <div style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        paddingRight: "8px",
      }}>
        {isLoading && logs.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "40px",
            color: colors.secondaryText,
            fontSize: "14px",
          }}>
            Loading...
          </div>
        ) : logs.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "40px",
            color: colors.secondaryText,
            fontSize: "14px",
          }}>
            No decisions recorded yet
            <br />
            <span style={{ fontSize: "12px", marginTop: "8px", display: "block" }}>
              Decisions will be displayed after the bot starts
            </span>
            {error && (
              <button
                type="button"
                onClick={() => { setError(null); fetchDecisionLogs(); }}
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
                  <span style={{ color: colors.text, fontWeight: "500" }}>
                    {log.symbol}
                  </span>
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
              
              <div style={{
                color: colors.text,
                fontSize: "12px",
                lineHeight: "1.5",
                marginBottom: "4px",
              }}>
                {log.reason}
              </div>

              {log.confidence !== undefined && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: "8px",
                }}>
                  <span style={{ color: colors.secondaryText, fontSize: "11px" }}>
                    Confidence:
                  </span>
                  <div style={{
                    flex: 1,
                    height: "4px",
                    backgroundColor: colors.border,
                    borderRadius: "2px",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${log.confidence * 100}%`,
                      height: "100%",
                      backgroundColor: log.confidence > 0.7 
                        ? "#10b981" 
                        : log.confidence > 0.5 
                        ? "#f59e0b" 
                        : "#ef4444",
                      transition: "width 0.3s",
                    }} />
                  </div>
                  <span style={{
                    color: colors.secondaryText,
                    fontSize: "11px",
                    minWidth: "40px",
                    textAlign: "right",
                  }}>
                    {(log.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              )}

              {log.strategy && (
                <div style={{
                  marginTop: "6px",
                  fontSize: "11px",
                  color: colors.secondaryText,
                }}>
                  Strategy: <span style={{ color: colors.text }}>{log.strategy}</span>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Footer Info */}
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
            {logs.length >= maxLogs && ` (showing last ${maxLogs} items)`}
          </span>
        )}
      </div>
    </div>
  );
}


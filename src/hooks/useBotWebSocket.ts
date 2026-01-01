"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface BotStatusUpdate {
  type: "bot_status_update";
  bot_id: number;
  data: {
    id: number;
    name: string;
    status: string;
    strategy_type: string;
    capital: number;
    current_capital: number;
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    win_rate: number;
    total_pnl: number;
    open_positions: number;
    started_at: string | null;
    stopped_at: string | null;
    last_error: string | null;
  };
  timestamp: string;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

interface UseBotWebSocketOptions {
  botId: number | null;
  enabled?: boolean;
  interval?: number;
  onStatusUpdate?: (data: BotStatusUpdate["data"]) => void;
  onTradeUpdate?: (trade: unknown) => void;
  onPositionUpdate?: (position: unknown) => void;
  onMetricsUpdate?: (metrics: unknown) => void;
  onError?: (error: Error) => void;
  fallbackToPolling?: boolean;
  pollingInterval?: number;
}

export function useBotWebSocket({
  botId,
  enabled = true,
  interval = 5,
  onStatusUpdate,
  onTradeUpdate,
  onPositionUpdate,
  onMetricsUpdate,
  onError,
  fallbackToPolling = true,
  pollingInterval = 10000,
}: UseBotWebSocketOptions) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [lastError, setLastError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds
  const consecutiveFailuresRef = useRef(0);
  const maxConsecutiveFailures = 3; // Stop polling after 3 consecutive failures (reduced for faster stopping)

  // Polling fallback
  const startPolling = useCallback(async () => {
    if (!botId || !fallbackToPolling) {
      console.log(`[POLLING SKIP] botId=${botId}, fallbackToPolling=${fallbackToPolling}`);
      return;
    }
    
    // Prevent multiple polling instances
    if (isPollingRef.current) {
      console.warn(`[POLLING SKIP] Polling already active for bot ${botId}, skipping duplicate start`);
      return;
    }
    
    // Clear any existing polling interval first
    if (pollingIntervalRef.current) {
      console.warn(`[POLLING CLEANUP] Clearing existing polling interval for bot ${botId}`);
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    isPollingRef.current = true;
    setConnectionStatus("connecting");
    console.log(`[POLLING INIT] Initializing polling for bot ${botId}`);

    const poll = async () => {
      try {
        const token = localStorage.getItem("auth_token") || "";
        if (!token) {
          stopPolling();
          return;
        }

        const apiUrl = typeof window !== "undefined" 
          ? "http://localhost:8000" 
          : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

        const response = await fetch(`${apiUrl}/bots/${botId}/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          if (onStatusUpdate) {
            onStatusUpdate(data);
          }
          setConnectionStatus("connected");
          setLastError(null);
          consecutiveFailuresRef.current = 0; // Reset failure counter on success
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        consecutiveFailuresRef.current += 1;
        const errorMessage = error instanceof Error ? error.message : "Polling failed";
        const isNetworkError = errorMessage.includes("Failed to fetch") || 
                              errorMessage.includes("ERR_") ||
                              (error instanceof TypeError && errorMessage.includes("fetch"));
        
        // Only log error if it's not a network error (to reduce console spam)
        if (!isNetworkError) {
          console.error("Polling error:", error);
        }
        
        setConnectionStatus("error");
        setLastError(errorMessage);
        
        // Stop polling if too many consecutive failures (server is likely down)
        if (consecutiveFailuresRef.current >= maxConsecutiveFailures) {
          console.warn(`⚠️ Stopping polling after ${maxConsecutiveFailures} consecutive failures. Server may be down.`);
          stopPolling();
          setConnectionStatus("disconnected");
          setLastError(`Server unreachable after ${maxConsecutiveFailures} attempts`);
          if (onError && consecutiveFailuresRef.current === maxConsecutiveFailures) {
            // Only call onError once when stopping
            onError(new Error(`Server unreachable after ${maxConsecutiveFailures} attempts`));
          }
          return;
        }
        
        // For network errors, stop immediately after 2 failures (server is definitely down)
        if (isNetworkError && consecutiveFailuresRef.current >= 2) {
          console.warn(`⚠️ [POLLING STOP] Stopping polling immediately after ${consecutiveFailuresRef.current} network errors. Server is down.`);
          stopPolling();
          setConnectionStatus("disconnected");
          setLastError("Server unreachable - network errors");
          return;
        }
        
        // Log first failure for debugging
        if (consecutiveFailuresRef.current === 1 && isNetworkError) {
          console.warn(`⚠️ [POLLING] First network error detected. Will stop after 2 failures.`);
        }
        
        // Only call onError on first failure to avoid spam
        if (onError && consecutiveFailuresRef.current === 1 && !isNetworkError) {
          onError(error instanceof Error ? error : new Error("Polling failed"));
        }
      }
    };

    // Initial poll
    await poll();

    // Set up polling interval (only if still should be polling)
    if (isPollingRef.current && botId) {
      pollingIntervalRef.current = setInterval(poll, pollingInterval);
      console.log(`[POLLING START] Started polling for bot ${botId} with interval ${pollingInterval}ms`);
    }
  }, [botId, fallbackToPolling, pollingInterval, onStatusUpdate, onError]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log(`[POLLING STOP] Stopped polling for bot ${botId}`);
    }
    isPollingRef.current = false;
    consecutiveFailuresRef.current = 0; // Reset failure counter
  }, [botId]);

  // WebSocket connection
  const connect = useCallback(() => {
    if (!botId || !enabled) return;

    const token = localStorage.getItem("auth_token") || "";
    if (!token) {
      console.warn("No auth token found, falling back to polling");
      if (fallbackToPolling) {
        startPolling();
      }
      return;
    }

    const apiUrl = typeof window !== "undefined" 
      ? "http://localhost:8000" 
      : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    
    const wsUrl = apiUrl.replace("http://", "ws://").replace("https://", "wss://");
    const url = `${wsUrl}/ws/bot/${botId}?token=${encodeURIComponent(token)}&interval=${interval}`;

    try {
      setConnectionStatus("connecting");
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log(`WebSocket connected for bot ${botId}`);
        setConnectionStatus("connected");
        setLastError(null);
        reconnectAttemptsRef.current = 0;
        stopPolling(); // Stop polling if WebSocket connects
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case "connected":
              console.log("WebSocket connection confirmed");
              break;
            case "bot_status_update":
              if (onStatusUpdate && "data" in message) {
                onStatusUpdate((message as unknown as BotStatusUpdate).data);
              }
              break;
            case "bot_trade":
              if (onTradeUpdate && "trade" in message) {
                onTradeUpdate(message.trade);
              }
              break;
            case "bot_position":
              if (onPositionUpdate && "position" in message) {
                onPositionUpdate(message.position);
              }
              break;
            case "bot_metrics":
              if (onMetricsUpdate && "metrics" in message) {
                onMetricsUpdate(message.metrics);
              }
              break;
            case "error":
              const errorMsg = "error" in message ? String(message.error) : "Unknown error";
              setLastError(errorMsg);
              if (onError) {
                onError(new Error(errorMsg));
              }
              break;
            case "pong":
              // Keep-alive response
              break;
            default:
              console.log("Unknown WebSocket message type:", message.type);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        // Only log if it's not a network error (to reduce console spam)
        const errorStr = error?.toString() || "";
        if (!errorStr.includes("Failed to fetch") && !errorStr.includes("ERR_")) {
          console.error("WebSocket error:", error);
        }
        setConnectionStatus("error");
        setLastError("WebSocket connection error");
        
        // Don't fallback to polling on network errors (server is down)
        const isNetworkError = error?.toString().includes("Failed to fetch") || 
                              error?.toString().includes("ERR_");
        if (fallbackToPolling && !isPollingRef.current && !isNetworkError) {
          console.log("Falling back to polling");
          startPolling();
        } else if (isNetworkError) {
          console.warn("WebSocket network error - not falling back to polling (server is down)");
        }
      };

      ws.onclose = (event) => {
        console.log(`WebSocket closed for bot ${botId}`, event.code, event.reason);
        setConnectionStatus("disconnected");
        wsRef.current = null;

        // Attempt reconnection if not a normal closure
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const delay = reconnectDelay * reconnectAttemptsRef.current;
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.log("Max reconnection attempts reached");
          // Don't fallback to polling if server is down (network errors)
          if (event.code === 1006 && fallbackToPolling && !isPollingRef.current) {
            // Only fallback if it's not a network error (abnormal closure)
            console.log("Falling back to polling");
            startPolling();
          } else {
            console.warn("Not falling back to polling - server appears to be down");
          }
        } else if (fallbackToPolling && !isPollingRef.current && event.code === 1000) {
          // Only fallback to polling on normal closure (not network errors)
          startPolling();
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      setConnectionStatus("error");
      setLastError(error instanceof Error ? error.message : "Connection failed");
      
      if (fallbackToPolling && !isPollingRef.current) {
        startPolling();
      }
    }
  }, [botId, enabled, interval, onStatusUpdate, onTradeUpdate, onPositionUpdate, onMetricsUpdate, onError, fallbackToPolling, startPolling, stopPolling]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, "Client disconnect");
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    stopPolling();
    setConnectionStatus("disconnected");
    reconnectAttemptsRef.current = 0;
  }, [stopPolling]);

  // Connect on mount or when botId changes
  useEffect(() => {
    if (botId && enabled) {
      // Reset failure counter when botId changes
      consecutiveFailuresRef.current = 0;
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botId, enabled]); // Removed connect/disconnect from deps to prevent re-renders

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionStatus,
    lastError,
    reconnect: connect,
    disconnect,
    isPolling: isPollingRef.current,
  };
}


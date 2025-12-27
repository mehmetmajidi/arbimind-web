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

  // Polling fallback
  const startPolling = useCallback(async () => {
    if (!botId || !fallbackToPolling || isPollingRef.current) return;

    isPollingRef.current = true;
    setConnectionStatus("connecting");

    const poll = async () => {
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
          if (onStatusUpdate) {
            onStatusUpdate(data);
          }
          setConnectionStatus("connected");
          setLastError(null);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error("Polling error:", error);
        setConnectionStatus("error");
        setLastError(error instanceof Error ? error.message : "Polling failed");
        if (onError) {
          onError(error instanceof Error ? error : new Error("Polling failed"));
        }
      }
    };

    // Initial poll
    await poll();

    // Set up polling interval
    pollingIntervalRef.current = setInterval(poll, pollingInterval);
  }, [botId, fallbackToPolling, pollingInterval, onStatusUpdate, onError]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

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
        console.error("WebSocket error:", error);
        setConnectionStatus("error");
        setLastError("WebSocket connection error");
        
        // Fallback to polling on error
        if (fallbackToPolling && !isPollingRef.current) {
          console.log("Falling back to polling");
          startPolling();
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
          console.log("Max reconnection attempts reached, falling back to polling");
          if (fallbackToPolling && !isPollingRef.current) {
            startPolling();
          }
        } else if (fallbackToPolling && !isPollingRef.current) {
          // Fallback to polling on normal closure
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
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [botId, enabled, connect, disconnect]);

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


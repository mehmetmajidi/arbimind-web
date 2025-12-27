"use client";

import { ConnectionStatus } from "@/hooks/useBotWebSocket";
import { colors } from "./constants";
import BotStatusIndicator from "./BotStatusIndicator";

interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
  isPolling?: boolean;
  onReconnect?: () => void;
  size?: "small" | "medium" | "large";
}

export default function ConnectionStatusIndicator({
  status,
  isPolling = false,
  onReconnect,
  size = "small",
}: ConnectionStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "connected":
        return {
          color: colors.success,
          text: isPolling ? "Polling" : "Connected",
          pulse: false,
        };
      case "connecting":
        return {
          color: colors.warning || "#f59e0b",
          text: "Connecting...",
          pulse: true,
        };
      case "error":
        return {
          color: colors.error,
          text: "Error",
          pulse: false,
        };
      default: // disconnected
        return {
          color: colors.secondaryText,
          text: "Disconnected",
          pulse: false,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      gap: "8px",
      cursor: status === "error" && onReconnect ? "pointer" : "default",
    }}
    onClick={() => {
      if (status === "error" && onReconnect) {
        onReconnect();
      }
    }}
    title={status === "error" && onReconnect ? "Click to reconnect" : undefined}
    >
      <BotStatusIndicator 
        status={status === "connected" ? "active" : status === "error" ? "error" : "inactive"} 
        size={size}
      />
      <span style={{
        color: config.color,
        fontSize: size === "small" ? "11px" : size === "large" ? "14px" : "12px",
        fontWeight: "500",
      }}>
        {config.text}
      </span>
      {status === "error" && onReconnect && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReconnect();
          }}
          style={{
            padding: "2px 6px",
            backgroundColor: "transparent",
            border: `1px solid ${colors.border}`,
            borderRadius: "4px",
            color: colors.text,
            fontSize: "10px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.background;
            e.currentTarget.style.borderColor = colors.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.borderColor = colors.border;
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}


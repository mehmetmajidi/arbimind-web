"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BotInfoPanel,
  BotPerformanceCharts,
  BotTradeHistoryTable,
  BotPositionsList,
  BotMetricsPanel,
  BotStatusBadge,
  ConnectionStatusIndicator,
  EditBotForm,
  TradingBot,
  BotStatus,
  BotTrade,
  colors,
  layoutStyle,
  mainLayoutStyle,
} from "@/components/bots";
import { useBotWebSocket } from "@/hooks/useBotWebSocket";

/**
 * Bot Detail Page
 * 
 * Route: /bots/[id]
 * Shows detailed information about a specific bot
 */

export default function BotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const botId = params?.id ? parseInt(params.id as string) : null;

  const [bot, setBot] = useState<TradingBot | null>(null);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [trades, setTrades] = useState<BotTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  // Fetch bot details
  const fetchBot = useCallback(async () => {
    if (!botId) return;

    try {
      const token = localStorage.getItem("auth_token") || "";
      if (!token) {
        setError("Please login to view bot details");
        setLoading(false);
        return;
      }

      const apiUrl = typeof window !== "undefined" 
        ? "http://localhost:8000" 
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${apiUrl}/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setBot(data);
        setError(null);
      } else if (response.status === 404) {
        setError("Bot not found");
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || "Failed to load bot");
      }
    } catch (err) {
      console.error("Error fetching bot:", err);
      setError("Failed to load bot");
    } finally {
      setLoading(false);
    }
  }, [botId]);

  // Fetch bot status
  const fetchBotStatus = useCallback(async () => {
    if (!botId) return;

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
        setBotStatus(data);
      }
    } catch (err) {
      console.error("Error fetching bot status:", err);
    }
  }, [botId]);

  // Fetch bot trades
  const fetchBotTrades = useCallback(async () => {
    if (!botId) return;

    try {
      const token = localStorage.getItem("auth_token") || "";
      if (!token) return;

      const apiUrl = typeof window !== "undefined" 
        ? "http://localhost:8000" 
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${apiUrl}/bots/${botId}/trades?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTrades(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching bot trades:", err);
    }
  }, [botId]);

  useEffect(() => {
    if (botId) {
      setLoading(true);
      fetchBot();
      fetchBotStatus();
      fetchBotTrades();
    }
  }, [botId, fetchBot, fetchBotStatus, fetchBotTrades]);

  // WebSocket connection for real-time updates
  const {
    connectionStatus,
    lastError,
    reconnect,
    isPolling,
  } = useBotWebSocket({
    botId,
    enabled: !!botId && !!bot,
    interval: 5,
    onStatusUpdate: (data) => {
      setBotStatus(data);
    },
    onTradeUpdate: () => {
      // Refresh trades when new trade is received
      fetchBotTrades();
    },
    onPositionUpdate: () => {
      // Refresh trades (positions are in trades with status=open)
      fetchBotTrades();
    },
    onError: (error) => {
      console.error("WebSocket error:", error);
    },
    fallbackToPolling: true,
    pollingInterval: 10000,
  });

  // Handlers
  const handleStartBot = async () => {
    if (!botId) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem("auth_token") || "";
      if (!token) return;

      const apiUrl = typeof window !== "undefined" 
        ? "http://localhost:8000" 
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${apiUrl}/bots/${botId}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchBot();
        await fetchBotStatus();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || "Failed to start bot");
      }
    } catch (err) {
      console.error("Error starting bot:", err);
      setError("Failed to start bot");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopBot = async () => {
    if (!botId) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem("auth_token") || "";
      if (!token) return;

      const apiUrl = typeof window !== "undefined" 
        ? "http://localhost:8000" 
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${apiUrl}/bots/${botId}/stop`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchBot();
        await fetchBotStatus();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || "Failed to stop bot");
      }
    } catch (err) {
      console.error("Error stopping bot:", err);
      setError("Failed to stop bot");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditBot = () => {
    setShowEditForm(true);
  };
  
  const handleEditSuccess = () => {
    setShowEditForm(false);
    fetchBot(); // Refresh bot data
    fetchBotStatus(); // Refresh bot status
  };

  const handleDeleteBot = async () => {
    if (!botId) return;
    if (!confirm("Are you sure you want to delete this bot?")) return;

    setActionLoading(true);
    try {
      const token = localStorage.getItem("auth_token") || "";
      if (!token) return;

      const apiUrl = typeof window !== "undefined" 
        ? "http://localhost:8000" 
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${apiUrl}/bots/${botId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        router.push("/bots");
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || "Failed to delete bot");
      }
    } catch (err) {
      console.error("Error deleting bot:", err);
      setError("Failed to delete bot");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={layoutStyle}>
        <div style={{ textAlign: "center", padding: "40px", color: colors.secondaryText }}>
          Loading bot details...
        </div>
      </div>
    );
  }

  if (error && !bot) {
    return (
      <div style={layoutStyle}>
        <div style={{
          padding: "16px",
          backgroundColor: "rgba(239, 68, 68, 0.15)",
          border: "2px solid rgba(239, 68, 68, 0.5)",
          borderRadius: "8px",
          color: colors.error,
          fontSize: "14px",
          fontWeight: "500",
        }}>
          <strong>⚠️ Error:</strong> {error}
        </div>
        <button
          onClick={() => router.push("/bots")}
          style={{
            marginTop: "16px",
            padding: "10px 20px",
            backgroundColor: colors.primary,
            border: "none",
            borderRadius: "8px",
            color: colors.background,
            fontWeight: "600",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Back to Bots
        </button>
      </div>
    );
  }

  if (!bot) {
    return (
      <div style={layoutStyle}>
        <div style={{ textAlign: "center", padding: "40px", color: colors.secondaryText }}>
          Bot not found
        </div>
        <button
          onClick={() => router.push("/bots")}
          style={{
            marginTop: "16px",
            padding: "10px 20px",
            backgroundColor: colors.primary,
            border: "none",
            borderRadius: "8px",
            color: colors.background,
            fontWeight: "600",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Back to Bots
        </button>
      </div>
    );
  }

  const openPositions = trades.filter(t => t.status.toLowerCase() === "open");
  const recentTrades = trades.slice(0, 10);

  return (
    <div style={layoutStyle}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <button
            onClick={() => router.push("/bots")}
            style={{
              padding: "8px 12px",
              backgroundColor: "transparent",
              border: `1px solid ${colors.border}`,
              borderRadius: "8px",
              color: colors.text,
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            ← Back
          </button>
          <h1 style={{ color: colors.primary, margin: 0, fontSize: "28px", fontWeight: "bold" }}>
            {bot.name}
          </h1>
          <BotStatusBadge status={bot.status} size="medium" />
          <ConnectionStatusIndicator 
            status={connectionStatus} 
            isPolling={isPolling}
            onReconnect={reconnect}
            size="small"
          />
        </div>
        <button
          onClick={() => {
            fetchBot();
            fetchBotStatus();
            fetchBotTrades();
          }}
          disabled={actionLoading}
          style={{
            padding: "8px 16px",
            backgroundColor: colors.primary,
            border: "none",
            borderRadius: "8px",
            color: colors.background,
            fontWeight: "600",
            cursor: actionLoading ? "not-allowed" : "pointer",
            fontSize: "14px",
            opacity: actionLoading ? 0.6 : 1,
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: "16px",
          backgroundColor: "rgba(239, 68, 68, 0.15)",
          border: "2px solid rgba(239, 68, 68, 0.5)",
          borderRadius: "8px",
          marginBottom: "24px",
          color: colors.error,
          fontSize: "14px",
          fontWeight: "500",
        }}>
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      {/* Main Layout */}
      <div style={mainLayoutStyle}>
        {/* Left Panel */}
        <BotInfoPanel
          bot={bot}
          onStartBot={handleStartBot}
          onStopBot={handleStopBot}
          onEditBot={handleEditBot}
          onDeleteBot={handleDeleteBot}
        />

        {/* Center Panel */}
        <div style={{
          flex: "1",
          minWidth: "0",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}>
          <BotPerformanceCharts bot={bot} trades={trades} botStatus={botStatus} />
          <BotTradeHistoryTable 
            trades={trades} 
            loading={false}
            onRefresh={() => {
              fetchBotTrades();
            }}
          />
          <BotPositionsList 
            positions={openPositions} 
            loading={false}
            exchangeAccountId={bot?.exchange_account_id}
            onRefresh={() => {
              fetchBotTrades();
            }}
          />
        </div>

        {/* Right Panel */}
        <BotMetricsPanel
          botStatus={botStatus}
          currentPositions={openPositions}
          recentTrades={recentTrades}
          loading={false}
        />
      </div>
      
      {/* Edit Bot Form Modal */}
      {bot && (
        <EditBotForm
          isOpen={showEditForm}
          bot={bot}
          onClose={() => setShowEditForm(false)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}


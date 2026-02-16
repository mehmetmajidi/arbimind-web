"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { TradingBot, BotStatus, BotTrade } from "@/components/bots/types";
import { colors, layoutStyle, mainLayoutStyle } from "@/components/bots/constants";
import BotStatusBadge from "@/components/bots/BotStatusBadge";
import ConnectionStatusIndicator from "@/components/bots/ConnectionStatusIndicator";
import { useBotWebSocket } from "@/hooks/useBotWebSocket";
import {
  fetchBot as apiFetchBot,
  fetchBotStatus as apiFetchBotStatus,
  fetchBotTrades as apiFetchBotTrades,
  startBot as apiStartBot,
  stopBot as apiStopBot,
  deleteBot as apiDeleteBot,
} from "@/lib/botsApi";

const panelPlaceholder = { minHeight: 180, backgroundColor: colors.panelBackground, borderRadius: 12, border: `1px solid ${colors.border}` };

const BotInfoPanel = dynamic(
  () => import("@/components/bots/BotInfoPanel").then((m) => m.default),
  { ssr: false, loading: () => <div style={panelPlaceholder} /> }
);
const BotPerformanceCharts = dynamic(
  () => import("@/components/bots/BotPerformanceCharts").then((m) => m.default),
  { ssr: false, loading: () => <div style={{ ...panelPlaceholder, minHeight: 280 }} /> }
);
const BotTradeHistoryTable = dynamic(
  () => import("@/components/bots/BotTradeHistoryTable").then((m) => m.default),
  { ssr: false, loading: () => <div style={{ ...panelPlaceholder, minHeight: 200 }} /> }
);
const BotPositionsList = dynamic(
  () => import("@/components/bots/BotPositionsList").then((m) => m.default),
  { ssr: false, loading: () => <div style={{ ...panelPlaceholder, minHeight: 120 }} /> }
);
const BotMetricsPanel = dynamic(
  () => import("@/components/bots/BotMetricsPanel").then((m) => m.default),
  { ssr: false, loading: () => <div style={{ ...panelPlaceholder, minHeight: 220 }} /> }
);
const BotDecisionLogs = dynamic(
  () => import("@/components/bots/BotDecisionLogs").then((m) => m.default),
  { ssr: false, loading: () => null }
);
const EditBotForm = dynamic(
  () => import("@/components/bots/EditBotForm").then((m) => m.default),
  { ssr: false }
);

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

  const fetchBot = useCallback(async () => {
    if (!botId) return;
    try {
      const data = await apiFetchBot(botId);
      setBot(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching bot:", err);
      setError(err instanceof Error ? err.message : "Failed to load bot");
    } finally {
      setLoading(false);
    }
  }, [botId]);

  const fetchBotStatus = useCallback(async () => {
    if (!botId) return;
    try {
      const data = await apiFetchBotStatus(botId);
      if (data) setBotStatus(data);
    } catch (err) {
      console.error("Error fetching bot status:", err);
    }
  }, [botId]);

  const fetchBotTrades = useCallback(async () => {
    if (!botId) return;
    try {
      const data = await apiFetchBotTrades(botId, 100);
      setTrades(data);
    } catch (err) {
      console.error("Error fetching bot trades:", err);
    }
  }, [botId]);

  useEffect(() => {
    if (botId) {
      setLoading(true);
      void fetchBot();
      void Promise.all([fetchBotStatus(), fetchBotTrades()]);
    }
  }, [botId, fetchBot, fetchBotStatus, fetchBotTrades]);

  // WebSocket connection for real-time updates
  const { connectionStatus, reconnect, isPolling } = useBotWebSocket({
    botId,
    enabled: !!botId && !!bot,
    interval: 5,
    onStatusUpdate: (data) => {
      console.log("[BotStatus] WebSocket/Polling update received:", data);
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

  const handleStartBot = async () => {
    if (!botId) return;
    setActionLoading(true);
    try {
      await apiStartBot(botId);
      await fetchBot();
      await fetchBotStatus();
    } catch (err) {
      console.error("Error starting bot:", err);
      setError(err instanceof Error ? err.message : "Failed to start bot");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopBot = async () => {
    if (!botId) return;
    setActionLoading(true);
    try {
      await apiStopBot(botId);
      await fetchBot();
      await fetchBotStatus();
    } catch (err) {
      console.error("Error stopping bot:", err);
      setError(err instanceof Error ? err.message : "Failed to stop bot");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditBot = () => setShowEditForm(true);

  const handleEditSuccess = () => {
    setShowEditForm(false);
    fetchBot();
    fetchBotStatus();
  };

  const handleDeleteBot = async () => {
    if (!botId) return;
    if (!confirm("Are you sure you want to delete this bot?")) return;
    setActionLoading(true);
    try {
      await apiDeleteBot(botId);
      router.push("/bots");
    } catch (err) {
      console.error("Error deleting bot:", err);
      setError(err instanceof Error ? err.message : "Failed to delete bot");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={layoutStyle}>
        <div style={{ marginBottom: 8, height: 32, width: 120, backgroundColor: colors.panelBackground, borderRadius: 8 }} />
        <div style={{ marginBottom: 16, height: 36, width: 280, backgroundColor: colors.panelBackground, borderRadius: 8 }} />
        <p style={{ color: colors.secondaryText, fontSize: "13px", marginBottom: 16 }}>Loading bot details…</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ width: 320, minHeight: 180, backgroundColor: colors.panelBackground, borderRadius: 12, border: `1px solid ${colors.border}` }} />
          <div style={{ flex: 1, minWidth: 300, minHeight: 400, backgroundColor: colors.panelBackground, borderRadius: 12, border: `1px solid ${colors.border}` }} />
          <div style={{ width: 280, minHeight: 220, backgroundColor: colors.panelBackground, borderRadius: 12, border: `1px solid ${colors.border}` }} />
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
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* Quick Actions Buttons */}
          {bot && (
            <>
              {bot.status === "active" ? (
                <button
                  onClick={handleStopBot}
                  disabled={actionLoading}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: colors.error,
                    border: "none",
                    borderRadius: "8px",
                    color: colors.text,
                    fontWeight: "600",
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  Stop Bot
                </button>
              ) : (
                <button
                  onClick={handleStartBot}
                  disabled={actionLoading}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: colors.success,
                    border: "none",
                    borderRadius: "8px",
                    color: colors.text,
                    fontWeight: "600",
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  Start Bot
                </button>
              )}
              <button
                onClick={handleEditBot}
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
                Edit Bot
              </button>
              <button
                onClick={handleDeleteBot}
                disabled={actionLoading}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "transparent",
                  border: "1px solid rgba(239, 68, 68, 0.5)",
                  borderRadius: "8px",
                  color: colors.error,
                  fontWeight: "600",
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  opacity: actionLoading ? 0.6 : 1,
                }}
              >
                Delete Bot
              </button>
            </>
          )}
          {/* Refresh Button */}
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
          botStatus={botStatus}
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
          {bot?.status === "active" && (
            <BotDecisionLogs botId={botId} enabled={true} />
          )}
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
          loading={loading && !botStatus}
        />
      </div>
      
      {showEditForm && bot && (
        <EditBotForm
          isOpen={true}
          bot={bot}
          onClose={() => setShowEditForm(false)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}


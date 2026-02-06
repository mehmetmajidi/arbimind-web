"use client";

import { useState, useEffect } from "react";
import { colors, panelStyle, typography, spacing } from "@/components/shared/designSystem";
import { useExchange } from "@/contexts/ExchangeContext";
import DemoExchangeBadge from "./DemoExchangeBadge";

interface PortfolioStats {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
  total_pnl_percent: number;
  best_trade_pnl?: number;
  worst_trade_pnl?: number;
  avg_trade_duration?: number;
}

/**
 * Component to display Demo Exchange portfolio statistics.
 * 
 * Shows key metrics like win rate, total P&L, and trade statistics.
 */
export default function DemoPortfolioStats() {
  const { selectedAccountId } = useExchange();
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show for Demo Exchange
  const isDemoExchange = selectedAccountId === -999;

  useEffect(() => {
    if (!isDemoExchange) {
      setStats(null);
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("Not authenticated");
        }

        // Get wallet first to get user_id context
        const walletResponse = await fetch("http://localhost:8000/demo/wallet", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!walletResponse.ok) {
          throw new Error("Failed to fetch wallet");
        }

        // Portfolio stats are calculated in background tasks
        // For now, we'll show wallet-based stats
        const wallet = await walletResponse.json();
        
        setStats({
          total_trades: 0, // Would need separate endpoint
          winning_trades: 0,
          losing_trades: 0,
          win_rate: 0,
          total_pnl: parseFloat(wallet.total_pnl || "0"),
          total_pnl_percent: parseFloat(wallet.total_pnl_percent || "0"),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stats");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isDemoExchange]);

  if (!isDemoExchange) {
    return null;
  }

  if (loading) {
    return (
      <div style={panelStyle}>
        <div style={{ ...typography.h3, marginBottom: spacing.md }}>
          Portfolio Stats
        </div>
        <div style={{ ...typography.body, color: colors.secondaryText }}>
          Loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={panelStyle}>
        <div style={{ ...typography.h3, marginBottom: spacing.md }}>
          Portfolio Stats
        </div>
        <div style={{ ...typography.body, color: colors.error }}>
          {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const pnlColor = stats.total_pnl >= 0 ? colors.success : colors.error;
  const pnlSign = stats.total_pnl >= 0 ? "+" : "";

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
        <div style={typography.h3}>Portfolio Stats</div>
        <DemoExchangeBadge size="small" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
        {/* Total P&L */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ ...typography.body, color: colors.secondaryText }}>Total P&L</span>
          <span style={{ ...typography.body, fontWeight: "600", color: pnlColor }}>
            {pnlSign}{stats.total_pnl.toFixed(2)} USDT ({pnlSign}{stats.total_pnl_percent.toFixed(2)}%)
          </span>
        </div>

        {/* Win Rate */}
        {stats.total_trades > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ ...typography.body, color: colors.secondaryText }}>Win Rate</span>
              <span style={{ ...typography.body, fontWeight: "600", color: colors.primary }}>
                {(stats.win_rate * 100).toFixed(1)}%
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ ...typography.body, color: colors.secondaryText }}>Total Trades</span>
              <span style={{ ...typography.body, fontWeight: "600", color: colors.text }}>
                {stats.total_trades}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ ...typography.body, color: colors.secondaryText }}>Winning / Losing</span>
              <span style={{ ...typography.body, fontWeight: "600", color: colors.text }}>
                <span style={{ color: colors.success }}>{stats.winning_trades}</span> /{" "}
                <span style={{ color: colors.error }}>{stats.losing_trades}</span>
              </span>
            </div>
          </>
        )}

        {stats.total_trades === 0 && (
          <div style={{ ...typography.small, color: colors.secondaryText, textAlign: "center", padding: spacing.md }}>
            No trades yet. Start trading to see your statistics!
          </div>
        )}
      </div>
    </div>
  );
}


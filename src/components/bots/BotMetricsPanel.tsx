"use client";

import { BotStatus, BotTrade } from "./types";
import BotPerformancePanel from "./BotPerformancePanel";
import BotPositionsPanel from "./BotPositionsPanel";
import BotRecentTradesPanel from "./BotRecentTradesPanel";

interface BotMetricsPanelProps {
  botStatus: BotStatus | null;
  currentPositions: BotTrade[];
  recentTrades: BotTrade[];
  loading?: boolean;
  onPositionClick?: (position: BotTrade) => void;
  onTradeClick?: (trade: BotTrade) => void;
}

export default function BotMetricsPanel({
  botStatus,
  currentPositions,
  recentTrades,
  loading,
  onPositionClick,
  onTradeClick,
}: BotMetricsPanelProps) {
  return (
    <div style={{ width: "320px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Real-time Performance Metrics */}
      <BotPerformancePanel botStatus={botStatus} loading={loading} />

      {/* Current Positions */}
      <BotPositionsPanel 
        positions={currentPositions} 
        loading={loading}
        onPositionClick={onPositionClick}
      />

      {/* Recent Trades */}
      <BotRecentTradesPanel 
        trades={recentTrades} 
        loading={loading}
        onTradeClick={onTradeClick}
      />
    </div>
  );
}

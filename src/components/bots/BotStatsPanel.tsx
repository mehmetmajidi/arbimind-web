"use client";

import { TradingBot } from "./types";
import { colors, panelStyle } from "./constants";

interface BotStatsPanelProps {
  bots: TradingBot[];
  filteredBots: TradingBot[];
}

interface StatItemProps {
  label: string;
  value: string | number;
  color: string;
}

function StatItem({ label, value, color }: StatItemProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: colors.secondaryText, fontSize: "13px" }}>{label}:</span>
      <span style={{ color, fontWeight: "600", fontSize: "14px" }}>{value}</span>
    </div>
  );
}

export default function BotStatsPanel({ bots, filteredBots }: BotStatsPanelProps) {
  const totalBots = filteredBots.length;
  const totalAllBots = bots.length;
  const activeBots = filteredBots.filter(b => b.status === "active").length;
  const stoppedBots = filteredBots.filter(b => b.status === "stopped").length;
  const inactiveBots = filteredBots.filter(b => b.status === "inactive").length;
  const errorBots = filteredBots.filter(b => b.status === "error").length;
  
  // Calculate Total P&L
  const totalPnl = filteredBots.reduce((sum, bot) => {
    return sum + parseFloat(bot.total_pnl || "0");
  }, 0);
  
  // Calculate Win Rate (weighted average)
  const totalTrades = filteredBots.reduce((sum, bot) => sum + bot.total_trades, 0);
  const totalWinningTrades = filteredBots.reduce((sum, bot) => sum + bot.winning_trades, 0);
  const winRate = totalTrades > 0 ? (totalWinningTrades / totalTrades) * 100 : 0;

  return (
    <div style={panelStyle}>
      <h3 style={{ color: colors.primary, marginBottom: "12px", fontSize: "18px", fontWeight: "600" }}>
        Quick Stats
      </h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <StatItem 
          label="Total Bots" 
          value={totalAllBots > 0 ? `${totalBots} / ${totalAllBots}` : totalBots} 
          color={colors.primary} 
        />
        <StatItem 
          label="Active" 
          value={activeBots} 
          color={colors.success} 
        />
        <StatItem 
          label="Stopped" 
          value={stoppedBots} 
          color={colors.secondaryText} 
        />
        {errorBots > 0 && (
          <StatItem 
            label="Error" 
            value={errorBots} 
            color={colors.error} 
          />
        )}
        {inactiveBots > 0 && (
          <StatItem 
            label="Inactive" 
            value={inactiveBots} 
            color={colors.secondaryText} 
          />
        )}
      </div>
      
      <div style={{ 
        marginTop: "12px", 
        paddingTop: "12px", 
        borderTop: `1px solid ${colors.border}` 
      }}>
        <StatItem 
          label="Total P&L" 
          value={`${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}`} 
          color={totalPnl >= 0 ? colors.success : colors.error} 
        />
        <StatItem 
          label="Win Rate" 
          value={`${winRate.toFixed(1)}%`} 
          color={colors.primary} 
        />
        {totalTrades > 0 && (
          <StatItem 
            label="Total Trades" 
            value={totalTrades} 
            color={colors.secondaryText} 
          />
        )}
      </div>
    </div>
  );
}


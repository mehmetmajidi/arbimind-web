"use client";

import { BotStatus } from "./types";
import { colors, panelStyle } from "./constants";

interface BotPerformancePanelProps {
  botStatus: BotStatus | null;
  loading?: boolean;
}

export default function BotPerformancePanel({ botStatus, loading }: BotPerformancePanelProps) {
  if (loading) {
    return (
      <div style={panelStyle}>
        <h3 style={{ color: colors.primary, marginBottom: "12px", fontSize: "18px", fontWeight: "600" }}>
          Real-time Metrics
        </h3>
        <div style={{ color: colors.secondaryText, textAlign: "center", padding: "20px" }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!botStatus) {
    return (
      <div style={panelStyle}>
        <h3 style={{ color: colors.primary, marginBottom: "12px", fontSize: "18px", fontWeight: "600" }}>
          Real-time Metrics
        </h3>
        <div style={{ color: colors.secondaryText, fontSize: "14px", textAlign: "center", padding: "20px" }}>
          No status data available
        </div>
      </div>
    );
  }

  // Calculate additional metrics
  const avgWin = botStatus.total_trades > 0 && botStatus.winning_trades > 0
    ? (botStatus.total_pnl / botStatus.winning_trades).toFixed(2)
    : "0.00";
  
  const avgLoss = botStatus.total_trades > 0 && botStatus.losing_trades > 0
    ? (Math.abs(botStatus.total_pnl) / botStatus.losing_trades).toFixed(2)
    : "0.00";

  const profitFactor = botStatus.losing_trades > 0 && botStatus.winning_trades > 0
    ? (botStatus.winning_trades * parseFloat(avgWin)) / (botStatus.losing_trades * parseFloat(avgLoss))
    : botStatus.losing_trades === 0 ? Infinity : 0;

  // Calculate capital change
  const initialCapital = botStatus.capital;
  const capitalChange = botStatus.current_capital - initialCapital;
  const capitalChangePercentValue = initialCapital > 0 
    ? (capitalChange / initialCapital) * 100
    : 0;
  const capitalChangePercent = capitalChangePercentValue.toFixed(2);

  return (
    <div style={panelStyle}>
      <h3 style={{ color: colors.primary, marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>
        Real-time Metrics
      </h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* P&L Section */}
        <div style={{
          padding: "12px",
          backgroundColor: colors.background,
          borderRadius: "8px",
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ color: colors.secondaryText, fontSize: "12px" }}>Total P&L</span>
            <span
              style={{
                color: botStatus.total_pnl >= 0 ? colors.success : colors.error,
                fontWeight: "700",
                fontSize: "18px",
              }}
            >
              {botStatus.total_pnl >= 0 ? "+" : ""}{botStatus.total_pnl.toFixed(2)} USDT
            </span>
          </div>
          <div style={{ 
            fontSize: "11px", 
            color: colors.secondaryText,
            textAlign: "right",
          }}>
            {capitalChange >= 0 ? "+" : ""}{capitalChange.toFixed(2)} ({capitalChangePercentValue >= 0 ? "+" : ""}{capitalChangePercent}%)
          </div>
        </div>

        {/* Win Rate Section */}
        <div style={{
          padding: "12px",
          backgroundColor: colors.background,
          borderRadius: "8px",
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ color: colors.secondaryText, fontSize: "12px" }}>Win Rate</span>
            <span style={{ color: colors.text, fontWeight: "700", fontSize: "18px" }}>
              {botStatus.win_rate.toFixed(1)}%
            </span>
          </div>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            fontSize: "11px",
            marginTop: "4px",
          }}>
            <span style={{ color: colors.success }}>
              {botStatus.winning_trades} W
            </span>
            <span style={{ color: colors.error }}>
              {botStatus.losing_trades} L
            </span>
          </div>
        </div>

        {/* Trading Stats */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
        }}>
          <div style={{
            padding: "10px",
            backgroundColor: colors.background,
            borderRadius: "6px",
            border: `1px solid ${colors.border}`,
          }}>
            <div style={{ color: colors.secondaryText, fontSize: "11px", marginBottom: "4px" }}>
              Total Trades
            </div>
            <div style={{ color: colors.text, fontWeight: "600", fontSize: "16px" }}>
              {botStatus.total_trades}
            </div>
          </div>
          <div style={{
            padding: "10px",
            backgroundColor: colors.background,
            borderRadius: "6px",
            border: `1px solid ${colors.border}`,
          }}>
            <div style={{ color: colors.secondaryText, fontSize: "11px", marginBottom: "4px" }}>
              Open Positions
            </div>
            <div style={{ color: colors.text, fontWeight: "600", fontSize: "16px" }}>
              {botStatus.open_positions}
            </div>
          </div>
        </div>

        {/* Capital Info */}
        <div style={{
          padding: "10px",
          backgroundColor: colors.background,
          borderRadius: "6px",
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ color: colors.secondaryText, fontSize: "11px" }}>Current Capital</span>
            <span style={{ color: colors.text, fontWeight: "600", fontSize: "14px" }}>
              {botStatus.current_capital.toFixed(2)} USDT
            </span>
          </div>
          {initialCapital !== botStatus.current_capital && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
              <span style={{ color: colors.secondaryText }}>Initial Capital</span>
              <span style={{ color: colors.secondaryText }}>
                {initialCapital.toFixed(2)} USDT
              </span>
            </div>
          )}
        </div>

        {/* Advanced Metrics */}
        {botStatus.total_trades > 0 && (
          <div style={{
            padding: "10px",
            backgroundColor: colors.background,
            borderRadius: "6px",
            border: `1px solid ${colors.border}`,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
          }}>
            <div>
              <div style={{ color: colors.secondaryText, fontSize: "10px", marginBottom: "2px" }}>
                Avg Win
              </div>
              <div style={{ color: colors.success, fontWeight: "600", fontSize: "12px" }}>
                {avgWin} USDT
              </div>
            </div>
            <div>
              <div style={{ color: colors.secondaryText, fontSize: "10px", marginBottom: "2px" }}>
                Avg Loss
              </div>
              <div style={{ color: colors.error, fontWeight: "600", fontSize: "12px" }}>
                {avgLoss} USDT
              </div>
            </div>
            {profitFactor !== Infinity && profitFactor > 0 && (
              <div style={{ gridColumn: "1 / -1", marginTop: "4px" }}>
                <div style={{ color: colors.secondaryText, fontSize: "10px", marginBottom: "2px" }}>
                  Profit Factor
                </div>
                <div style={{ 
                  color: profitFactor >= 1 ? colors.success : colors.error, 
                  fontWeight: "600", 
                  fontSize: "12px" 
                }}>
                  {profitFactor.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


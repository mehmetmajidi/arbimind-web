"use client";

import { BotTrade } from "./types";
import { colors, panelStyle } from "./constants";

interface BotRecentTradesPanelProps {
  trades: BotTrade[];
  loading?: boolean;
  onTradeClick?: (trade: BotTrade) => void;
}

export default function BotRecentTradesPanel({ 
  trades, 
  loading,
  onTradeClick,
}: BotRecentTradesPanelProps) {
  if (loading) {
    return (
      <div style={panelStyle}>
        <h3 style={{ color: colors.primary, marginBottom: "12px", fontSize: "18px", fontWeight: "600" }}>
          Recent Activity
        </h3>
        <div style={{ color: colors.secondaryText, textAlign: "center", padding: "20px" }}>
          Loading...
        </div>
      </div>
    );
  }

  // Get recent closed trades (last 10)
  const recentTrades = trades
    .filter(t => t.status.toLowerCase() === "closed")
    .sort((a, b) => {
      const aTime = a.exit_time ? new Date(a.exit_time).getTime() : new Date(a.entry_time).getTime();
      const bTime = b.exit_time ? new Date(b.exit_time).getTime() : new Date(b.entry_time).getTime();
      return bTime - aTime;
    })
    .slice(0, 10);

  if (recentTrades.length === 0) {
    return (
      <div style={panelStyle}>
        <h3 style={{ color: colors.primary, marginBottom: "12px", fontSize: "18px", fontWeight: "600" }}>
          Recent Activity
        </h3>
        <div style={{ color: colors.secondaryText, fontSize: "14px", textAlign: "center", padding: "20px" }}>
          No recent activity
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ color: colors.primary, margin: 0, fontSize: "18px", fontWeight: "600" }}>
          Recent Activity
        </h3>
        <span style={{ 
          color: colors.secondaryText, 
          fontSize: "12px",
          backgroundColor: colors.background,
          padding: "4px 8px",
          borderRadius: "4px",
        }}>
          {recentTrades.length}
        </span>
      </div>

      {/* Trades List */}
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: "8px", 
        maxHeight: "300px", 
        overflowY: "auto",
        paddingRight: "4px",
      }}>
        {recentTrades.map((trade) => {
          const pnl = parseFloat(trade.pnl || "0");
          const entryPrice = parseFloat(trade.entry_price);
          const exitPrice = trade.exit_price ? parseFloat(trade.exit_price) : null;
          const quantity = parseFloat(trade.quantity);

          return (
            <div
              key={trade.id}
              onClick={() => onTradeClick?.(trade)}
              style={{
                padding: "10px",
                backgroundColor: colors.background,
                border: `1px solid ${colors.border}`,
                borderRadius: "6px",
                fontSize: "12px",
                cursor: onTradeClick ? "pointer" : "default",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (onTradeClick) {
                  e.currentTarget.style.borderColor = colors.primary;
                  e.currentTarget.style.backgroundColor = colors.panelBackground;
                }
              }}
              onMouseLeave={(e) => {
                if (onTradeClick) {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.backgroundColor = colors.background;
                }
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: colors.text, fontWeight: "600", fontSize: "13px" }}>
                    {trade.symbol}
                  </span>
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: "3px",
                      fontSize: "9px",
                      fontWeight: "600",
                      backgroundColor: trade.side === "buy" 
                        ? "rgba(34, 197, 94, 0.2)" 
                        : "rgba(239, 68, 68, 0.2)",
                      color: trade.side === "buy" ? colors.success : colors.error,
                      textTransform: "uppercase",
                    }}
                  >
                    {trade.side}
                  </span>
                </div>
                <span
                  style={{
                    color: pnl >= 0 ? colors.success : colors.error,
                    fontWeight: "600",
                    fontSize: "12px",
                  }}
                >
                  {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}
                </span>
              </div>

              {/* Price Info */}
              {entryPrice && exitPrice && (
                <div style={{ 
                  marginBottom: "6px",
                  fontSize: "10px",
                  color: colors.secondaryText,
                }}>
                  <span>{entryPrice.toFixed(4)}</span>
                  <span style={{ margin: "0 4px", color: colors.border }}>→</span>
                  <span>{exitPrice.toFixed(4)}</span>
                </div>
              )}

              {/* Details */}
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "1fr 1fr", 
                gap: "6px",
                fontSize: "10px",
                marginBottom: "6px",
              }}>
                <div>
                  <span style={{ color: colors.secondaryText }}>Qty:</span>
                  <span style={{ color: colors.text, marginLeft: "4px" }}>
                    {quantity.toFixed(4)}
                  </span>
                </div>
                {trade.pnl_percent && (
                  <div>
                    <span style={{ color: colors.secondaryText }}>P&L:</span>
                    <span style={{
                      color: pnl >= 0 ? colors.success : colors.error,
                      fontWeight: "600",
                      marginLeft: "4px",
                    }}>
                      {parseFloat(trade.pnl_percent) >= 0 ? "+" : ""}{parseFloat(trade.pnl_percent).toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Time */}
              <div style={{
                paddingTop: "6px",
                borderTop: `1px solid ${colors.border}`,
                fontSize: "10px",
                color: colors.secondaryText,
              }}>
                {trade.exit_time 
                  ? new Date(trade.exit_time).toLocaleString()
                  : new Date(trade.entry_time).toLocaleString()}
              </div>

              {/* Exit Reason */}
              {trade.exit_reason && (
                <div style={{
                  marginTop: "6px",
                  padding: "4px 6px",
                  backgroundColor: colors.panelBackground,
                  borderRadius: "4px",
                  fontSize: "9px",
                  color: colors.secondaryText,
                }}>
                  {trade.exit_reason}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


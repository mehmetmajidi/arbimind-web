"use client";

import { BotTrade } from "./types";
import { colors, panelStyle } from "./constants";

interface BotPositionsPanelProps {
  positions: BotTrade[];
  loading?: boolean;
  onPositionClick?: (position: BotTrade) => void;
}

export default function BotPositionsPanel({ 
  positions, 
  loading,
  onPositionClick,
}: BotPositionsPanelProps) {
  if (loading) {
    return (
      <div style={panelStyle}>
        <h3 style={{ color: colors.primary, marginBottom: "12px", fontSize: "18px", fontWeight: "600" }}>
          Current Positions
        </h3>
        <div style={{ color: colors.secondaryText, textAlign: "center", padding: "20px" }}>
          Loading...
        </div>
      </div>
    );
  }

  const openPositions = positions.filter(p => p.status.toLowerCase() === "open");

  if (openPositions.length === 0) {
    return (
      <div style={panelStyle}>
        <h3 style={{ color: colors.primary, marginBottom: "12px", fontSize: "18px", fontWeight: "600" }}>
          Current Positions
        </h3>
        <div style={{ color: colors.secondaryText, fontSize: "14px", textAlign: "center", padding: "20px" }}>
          No open positions
        </div>
      </div>
    );
  }

  // Calculate total unrealized P&L
  const totalUnrealizedPnl = openPositions.reduce((sum, pos) => {
    return sum + parseFloat(pos.pnl || "0");
  }, 0);

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ color: colors.primary, margin: 0, fontSize: "18px", fontWeight: "600" }}>
          Current Positions
        </h3>
        <span style={{ 
          color: colors.secondaryText, 
          fontSize: "12px",
          backgroundColor: colors.background,
          padding: "4px 8px",
          borderRadius: "4px",
        }}>
          {openPositions.length}
        </span>
      </div>

      {/* Total Unrealized P&L */}
      {openPositions.length > 0 && (
        <div style={{
          padding: "8px 12px",
          backgroundColor: colors.background,
          borderRadius: "6px",
          border: `1px solid ${colors.border}`,
          marginBottom: "12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ color: colors.secondaryText, fontSize: "11px" }}>Total Unrealized P&L:</span>
          <span style={{
            color: totalUnrealizedPnl >= 0 ? colors.success : colors.error,
            fontWeight: "600",
            fontSize: "13px",
          }}>
            {totalUnrealizedPnl >= 0 ? "+" : ""}{totalUnrealizedPnl.toFixed(2)} USDT
          </span>
        </div>
      )}

      {/* Positions List */}
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: "8px", 
        maxHeight: "300px", 
        overflowY: "auto",
        paddingRight: "4px",
      }}>
        {openPositions.slice(0, 10).map((position) => {
          const pnl = parseFloat(position.pnl || "0");
          const entryPrice = parseFloat(position.entry_price);
          const quantity = parseFloat(position.quantity);
          const entryValue = entryPrice * quantity;

          return (
            <div
              key={position.id}
              onClick={() => onPositionClick?.(position)}
              style={{
                padding: "10px",
                backgroundColor: colors.background,
                border: `1px solid ${colors.border}`,
                borderRadius: "6px",
                fontSize: "12px",
                cursor: onPositionClick ? "pointer" : "default",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (onPositionClick) {
                  e.currentTarget.style.borderColor = colors.primary;
                  e.currentTarget.style.backgroundColor = colors.panelBackground;
                }
              }}
              onMouseLeave={(e) => {
                if (onPositionClick) {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.backgroundColor = colors.background;
                }
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: colors.text, fontWeight: "600", fontSize: "13px" }}>
                    {position.symbol}
                  </span>
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: "3px",
                      fontSize: "9px",
                      fontWeight: "600",
                      backgroundColor: position.side === "buy" 
                        ? "rgba(34, 197, 94, 0.2)" 
                        : "rgba(239, 68, 68, 0.2)",
                      color: position.side === "buy" ? colors.success : colors.error,
                      textTransform: "uppercase",
                    }}
                  >
                    {position.side}
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

              {/* Details */}
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "1fr 1fr", 
                gap: "6px",
                fontSize: "10px",
              }}>
                <div>
                  <span style={{ color: colors.secondaryText }}>Entry:</span>
                  <span style={{ color: colors.text, marginLeft: "4px" }}>
                    {entryPrice.toFixed(4)}
                  </span>
                </div>
                <div>
                  <span style={{ color: colors.secondaryText }}>Qty:</span>
                  <span style={{ color: colors.text, marginLeft: "4px" }}>
                    {quantity.toFixed(4)}
                  </span>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: colors.secondaryText }}>Value:</span>
                  <span style={{ color: colors.text, marginLeft: "4px" }}>
                    {entryValue.toFixed(2)} USDT
                  </span>
                </div>
              </div>

              {/* P&L Percent */}
              {position.pnl_percent && (
                <div style={{
                  marginTop: "6px",
                  paddingTop: "6px",
                  borderTop: `1px solid ${colors.border}`,
                  fontSize: "10px",
                }}>
                  <span style={{ color: colors.secondaryText }}>P&L: </span>
                  <span style={{
                    color: pnl >= 0 ? colors.success : colors.error,
                    fontWeight: "600",
                  }}>
                    {parseFloat(position.pnl_percent) >= 0 ? "+" : ""}{parseFloat(position.pnl_percent).toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Show more indicator */}
      {openPositions.length > 10 && (
        <div style={{
          marginTop: "8px",
          padding: "8px",
          textAlign: "center",
          color: colors.secondaryText,
          fontSize: "11px",
          borderTop: `1px solid ${colors.border}`,
          paddingTop: "12px",
        }}>
          +{openPositions.length - 10} more positions
        </div>
      )}
    </div>
  );
}


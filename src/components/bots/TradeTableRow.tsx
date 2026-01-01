"use client";

import { useState } from "react";
import { BotTrade } from "./types";
import { colors } from "./constants";

interface TradeTableRowProps {
  trade: BotTrade;
}

// Helper function to format price with up to 10 decimal places, removing trailing zeros
function formatPrice(price: number): string {
  return price.toFixed(10).replace(/\.?0+$/, '');
}

export default function TradeTableRow({ trade }: TradeTableRowProps) {
  const [expanded, setExpanded] = useState(false);
  const pnl = parseFloat(trade.pnl || "0");

  return (
    <>
      <tr
        style={{
          borderBottom: `1px solid ${colors.border}`,
          transition: "background-color 0.2s",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.panelBackground;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <td style={{ padding: "12px", color: colors.text, fontSize: "13px" }}>
          {trade.symbol}
        </td>
        <td style={{ padding: "12px" }}>
          <span
            style={{
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: "500",
              backgroundColor: trade.side === "buy" 
                ? "rgba(34, 197, 94, 0.2)" 
                : "rgba(239, 68, 68, 0.2)",
              color: trade.side === "buy" ? colors.success : colors.error,
            }}
          >
            {trade.side.toUpperCase()}
          </span>
        </td>
        <td style={{ padding: "12px", textAlign: "right", color: colors.text, fontSize: "13px" }}>
          {formatPrice(parseFloat(trade.entry_price))}
        </td>
        <td style={{ padding: "12px", textAlign: "right", color: colors.text, fontSize: "13px" }}>
          {trade.exit_price ? parseFloat(trade.exit_price).toFixed(4) : "-"}
        </td>
        <td style={{ padding: "12px", textAlign: "right", color: colors.text, fontSize: "13px" }}>
          {parseFloat(trade.quantity).toFixed(4)}
        </td>
        <td
          style={{
            padding: "12px",
            textAlign: "right",
            color: pnl >= 0 ? colors.success : colors.error,
            fontWeight: "600",
            fontSize: "13px",
          }}
        >
          {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}
          {trade.pnl_percent && ` (${parseFloat(trade.pnl_percent).toFixed(2)}%)`}
        </td>
        <td style={{ padding: "12px" }}>
          <span
            style={{
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: "500",
              backgroundColor: trade.status === "open" 
                ? "rgba(34, 197, 94, 0.2)" 
                : "rgba(136, 136, 136, 0.2)",
              color: trade.status === "open" ? colors.success : colors.secondaryText,
            }}
          >
            {trade.status.toUpperCase()}
          </span>
        </td>
        <td style={{ padding: "12px", color: colors.secondaryText, fontSize: "12px" }}>
          {new Date(trade.entry_time).toLocaleString()}
        </td>
        <td style={{ padding: "12px", textAlign: "center", width: "30px" }}>
          <span style={{ color: colors.secondaryText, fontSize: "14px" }}>
            {expanded ? "▼" : "▶"}
          </span>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={9} style={{ padding: "0", backgroundColor: colors.background }}>
            <div style={{
              padding: "16px",
              borderTop: `1px solid ${colors.border}`,
              borderBottom: `1px solid ${colors.border}`,
            }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                fontSize: "12px",
              }}>
                <div>
                  <h4 style={{ color: colors.primary, marginBottom: "8px", fontSize: "13px", fontWeight: "600" }}>
                    Trade Details
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: colors.secondaryText }}>Trade ID:</span>
                      <span style={{ color: colors.text }}>{trade.id}</span>
                    </div>
                    {trade.order_id && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: colors.secondaryText }}>Order ID:</span>
                        <span style={{ color: colors.text }}>{trade.order_id}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: colors.secondaryText }}>Entry Time:</span>
                      <span style={{ color: colors.text }}>
                        {new Date(trade.entry_time).toLocaleString()}
                      </span>
                    </div>
                    {trade.exit_time && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: colors.secondaryText }}>Exit Time:</span>
                        <span style={{ color: colors.text }}>
                          {new Date(trade.exit_time).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {trade.exit_time && trade.entry_time && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: colors.secondaryText }}>Duration:</span>
                        <span style={{ color: colors.text }}>
                          {Math.round((new Date(trade.exit_time).getTime() - new Date(trade.entry_time).getTime()) / 1000 / 60)} minutes
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 style={{ color: colors.primary, marginBottom: "8px", fontSize: "13px", fontWeight: "600" }}>
                    Additional Info
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {trade.entry_reason && (
                      <div>
                        <span style={{ color: colors.secondaryText }}>Entry Reason:</span>
                        <div style={{ color: colors.text, marginTop: "4px", fontSize: "11px" }}>
                          {trade.entry_reason}
                        </div>
                      </div>
                    )}
                    {trade.exit_reason && (
                      <div>
                        <span style={{ color: colors.secondaryText }}>Exit Reason:</span>
                        <div style={{ color: colors.text, marginTop: "4px", fontSize: "11px" }}>
                          {trade.exit_reason}
                        </div>
                      </div>
                    )}
                    {trade.prediction_confidence && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: colors.secondaryText }}>Prediction Confidence:</span>
                        <span style={{ color: colors.text }}>
                          {(parseFloat(trade.prediction_confidence) * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {trade.prediction_horizon && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: colors.secondaryText }}>Prediction Horizon:</span>
                        <span style={{ color: colors.text }}>{trade.prediction_horizon}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}


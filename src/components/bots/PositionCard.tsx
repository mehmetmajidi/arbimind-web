"use client";

import { useState } from "react";
import { BotTrade } from "./types";
import { colors } from "./constants";

interface PositionCardProps {
  position: BotTrade;
  currentPrice: number | null;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  onClose?: (tradeId: number) => Promise<void>;
  exchangeAccountId?: number;
}

export default function PositionCard({
  position,
  currentPrice,
  unrealizedPnl,
  unrealizedPnlPercent,
  onClose,
  exchangeAccountId,
}: PositionCardProps) {
  const [closing, setClosing] = useState(false);
  const entryPrice = parseFloat(position.entry_price);
  const quantity = parseFloat(position.quantity);
  const entryValue = entryPrice * quantity;
  const currentValue = currentPrice ? currentPrice * quantity : null;
  const priceChange = currentPrice ? currentPrice - entryPrice : 0;
  const priceChangePercent = entryPrice > 0 ? (priceChange / entryPrice) * 100 : 0;

  const handleClose = async () => {
    if (!onClose) return;
    
    if (!confirm(`Are you sure you want to close this ${position.side.toUpperCase()} position?\n\nSymbol: ${position.symbol}\nQuantity: ${quantity.toFixed(4)}\nEntry Price: ${entryPrice.toFixed(4)}\nCurrent Price: ${currentPrice?.toFixed(4) || "N/A"}\nUnrealized P&L: ${unrealizedPnl >= 0 ? "+" : ""}${unrealizedPnl.toFixed(2)} (${unrealizedPnlPercent >= 0 ? "+" : ""}${unrealizedPnlPercent.toFixed(2)}%)\n\nThis will place a market order to close the position.`)) {
      return;
    }

    setClosing(true);
    try {
      await onClose(position.id);
    } catch (error) {
      console.error("Error closing position:", error);
      alert("Failed to close position. Please try again.");
    } finally {
      setClosing(false);
    }
  };

  return (
    <div
      style={{
        padding: "16px",
        backgroundColor: colors.background,
        border: `1px solid ${colors.border}`,
        borderRadius: "8px",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = colors.primary;
        e.currentTarget.style.boxShadow = `0 0 0 1px ${colors.primary}33`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = colors.border;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: colors.text, fontWeight: "600", fontSize: "16px" }}>
            {position.symbol}
          </span>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "4px",
              fontSize: "11px",
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span
            style={{
              color: unrealizedPnl >= 0 ? colors.success : colors.error,
              fontWeight: "700",
              fontSize: "16px",
            }}
          >
            {unrealizedPnl >= 0 ? "+" : ""}{unrealizedPnl.toFixed(2)} USDT
          </span>
          <span
            style={{
              color: unrealizedPnl >= 0 ? colors.success : colors.error,
              fontSize: "12px",
              marginTop: "2px",
            }}
          >
            {unrealizedPnlPercent >= 0 ? "+" : ""}{unrealizedPnlPercent.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Price Information */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr", 
        gap: "12px", 
        marginBottom: "12px",
        padding: "12px",
        backgroundColor: colors.panelBackground,
        borderRadius: "6px",
      }}>
        <div>
          <div style={{ color: colors.secondaryText, fontSize: "11px", marginBottom: "4px" }}>
            Entry Price
          </div>
          <div style={{ color: colors.text, fontSize: "14px", fontWeight: "600" }}>
            {entryPrice.toFixed(4)} USDT
          </div>
        </div>
        <div>
          <div style={{ color: colors.secondaryText, fontSize: "11px", marginBottom: "4px" }}>
            Current Price
          </div>
          <div style={{ 
            color: currentPrice ? (priceChange >= 0 ? colors.success : colors.error) : colors.secondaryText, 
            fontSize: "14px", 
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}>
            {currentPrice ? (
              <>
                {currentPrice.toFixed(4)} USDT
                <span style={{ fontSize: "11px", opacity: 0.8 }}>
                  ({priceChange >= 0 ? "+" : ""}{priceChange.toFixed(4)})
                </span>
              </>
            ) : (
              <span style={{ fontSize: "11px", color: colors.secondaryText }}>Loading...</span>
            )}
          </div>
        </div>
        <div>
          <div style={{ color: colors.secondaryText, fontSize: "11px", marginBottom: "4px" }}>
            Quantity
          </div>
          <div style={{ color: colors.text, fontSize: "14px", fontWeight: "600" }}>
            {quantity.toFixed(4)}
          </div>
        </div>
        <div>
          <div style={{ color: colors.secondaryText, fontSize: "11px", marginBottom: "4px" }}>
            Entry Value
          </div>
          <div style={{ color: colors.text, fontSize: "14px", fontWeight: "600" }}>
            {entryValue.toFixed(2)} USDT
          </div>
        </div>
      </div>

      {/* Price Change Indicator */}
      {currentPrice && (
        <div style={{
          marginBottom: "12px",
          padding: "8px",
          backgroundColor: priceChange >= 0 
            ? "rgba(34, 197, 94, 0.1)" 
            : "rgba(239, 68, 68, 0.1)",
          borderRadius: "6px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ color: colors.secondaryText, fontSize: "11px" }}>
            Price Change:
          </span>
          <span style={{
            color: priceChange >= 0 ? colors.success : colors.error,
            fontSize: "12px",
            fontWeight: "600",
          }}>
            {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(4)} USDT ({priceChangePercent >= 0 ? "+" : ""}{priceChangePercent.toFixed(2)}%)
          </span>
        </div>
      )}

      {/* Additional Info */}
      {position.entry_reason && (
        <div style={{ 
          marginBottom: "12px", 
          padding: "8px", 
          borderTop: `1px solid ${colors.border}`,
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <div style={{ color: colors.secondaryText, fontSize: "11px", marginBottom: "4px" }}>
            Entry Reason:
          </div>
          <div style={{ color: colors.text, fontSize: "11px" }}>
            {position.entry_reason}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginTop: "12px",
        paddingTop: "12px",
        borderTop: `1px solid ${colors.border}`,
      }}>
        <div style={{ color: colors.secondaryText, fontSize: "11px" }}>
          Opened: {new Date(position.entry_time).toLocaleString()}
        </div>
        {onClose && (
          <button
            onClick={handleClose}
            disabled={closing || !currentPrice}
            style={{
              padding: "6px 16px",
              backgroundColor: colors.error,
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              cursor: closing || !currentPrice ? "not-allowed" : "pointer",
              fontSize: "12px",
              fontWeight: "600",
              opacity: closing || !currentPrice ? 0.5 : 1,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!closing && currentPrice) {
                e.currentTarget.style.opacity = "0.8";
              }
            }}
            onMouseLeave={(e) => {
              if (!closing && currentPrice) {
                e.currentTarget.style.opacity = "1";
              }
            }}
          >
            {closing ? "Closing..." : "Close Position"}
          </button>
        )}
      </div>
    </div>
  );
}


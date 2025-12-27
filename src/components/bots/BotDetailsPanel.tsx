"use client";

import { TradingBot, BotStatus, BotTrade } from "./types";
import { colors, panelStyle } from "./constants";

interface BotDetailsPanelProps {
  selectedBot: TradingBot | null;
  botStatus: BotStatus | null;
  botTrades: BotTrade[];
  statusLoading: boolean;
  tradesLoading: boolean;
  onStartBot: (botId: number) => void;
  onStopBot: (botId: number) => void;
  onEditBot: (bot: TradingBot) => void;
  onDeleteBot: (botId: number) => void;
}

export default function BotDetailsPanel({
  selectedBot,
  botStatus,
  botTrades,
  statusLoading,
  tradesLoading,
  onStartBot,
  onStopBot,
  onEditBot,
  onDeleteBot,
}: BotDetailsPanelProps) {
  if (!selectedBot) {
    return (
      <>
        {/* Quick Actions Panel (when no bot selected) */}
        <div style={panelStyle}>
          <h3 style={{ color: colors.primary, marginBottom: "12px", fontSize: "18px", fontWeight: "600" }}>
            Quick Actions
          </h3>
          <div style={{ color: colors.secondaryText, fontSize: "14px" }}>
            Select a bot to view details
          </div>
        </div>

        {/* Info Panel */}
        <div style={panelStyle}>
          <h3 style={{ color: colors.primary, marginBottom: "12px", fontSize: "18px", fontWeight: "600" }}>
            Information
          </h3>
          <div style={{ color: colors.secondaryText, fontSize: "12px", lineHeight: "1.6" }}>
            <p style={{ marginBottom: "8px" }}>
              Manage your trading bots from this dashboard. Create, start, stop, and monitor your bots.
            </p>
            <p>
              All bots run with advanced risk management and multiple strategy options.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Performance Metrics Panel */}
      <div style={panelStyle}>
        <h3 style={{ color: colors.primary, marginBottom: "12px", fontSize: "18px", fontWeight: "600" }}>
          Performance Metrics
        </h3>
        {statusLoading ? (
          <div style={{ color: colors.secondaryText, fontSize: "14px" }}>Loading...</div>
        ) : botStatus ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: colors.secondaryText }}>Win Rate:</span>
              <span style={{ color: colors.text, fontWeight: "600" }}>
                {botStatus.win_rate.toFixed(1)}%
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: colors.secondaryText }}>Total P&L:</span>
              <span style={{ 
                color: botStatus.total_pnl >= 0 ? colors.success : colors.error,
                fontWeight: "600"
              }}>
                {botStatus.total_pnl >= 0 ? "+" : ""}{botStatus.total_pnl.toFixed(2)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: colors.secondaryText }}>Total Trades:</span>
              <span style={{ color: colors.text, fontWeight: "600" }}>
                {botStatus.total_trades}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: colors.secondaryText }}>Winning:</span>
              <span style={{ color: colors.success, fontWeight: "600" }}>
                {botStatus.winning_trades}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: colors.secondaryText }}>Losing:</span>
              <span style={{ color: colors.error, fontWeight: "600" }}>
                {botStatus.losing_trades}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: colors.secondaryText }}>Open Positions:</span>
              <span style={{ color: colors.text, fontWeight: "600" }}>
                {botStatus.open_positions}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: colors.secondaryText }}>Current Capital:</span>
              <span style={{ color: colors.text, fontWeight: "600" }}>
                {botStatus.current_capital.toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ color: colors.secondaryText, fontSize: "14px" }}>
            No status data available
          </div>
        )}
      </div>

      {/* Current Positions Panel */}
      <div style={panelStyle}>
        <h3 style={{ color: colors.primary, marginBottom: "12px", fontSize: "18px", fontWeight: "600" }}>
          Current Positions
        </h3>
        {tradesLoading ? (
          <div style={{ color: colors.secondaryText, fontSize: "14px" }}>Loading...</div>
        ) : botTrades.filter(t => t.status === "open").length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {botTrades.filter(t => t.status === "open").slice(0, 5).map((trade) => (
              <div
                key={trade.id}
                style={{
                  padding: "8px",
                  backgroundColor: colors.background,
                  border: "1px solid rgba(255, 174, 0, 0.1)",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: colors.text, fontWeight: "600" }}>{trade.symbol}</span>
                  <span style={{ 
                    color: trade.side === "buy" ? colors.success : colors.error,
                    fontSize: "10px"
                  }}>
                    {trade.side.toUpperCase()}
                  </span>
                </div>
                <div style={{ color: colors.secondaryText, fontSize: "11px" }}>
                  Entry: {parseFloat(trade.entry_price).toFixed(2)} | 
                  Qty: {parseFloat(trade.quantity).toFixed(4)}
                </div>
                {trade.pnl && (
                  <div style={{ 
                    color: parseFloat(trade.pnl) >= 0 ? colors.success : colors.error,
                    fontSize: "11px",
                    marginTop: "4px"
                  }}>
                    P&L: {parseFloat(trade.pnl) >= 0 ? "+" : ""}{parseFloat(trade.pnl).toFixed(2)}
                    {trade.pnl_percent && ` (${parseFloat(trade.pnl_percent).toFixed(2)}%)`}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: colors.secondaryText, fontSize: "14px" }}>
            No open positions
          </div>
        )}
      </div>

      {/* Recent Trades Panel */}
      <div style={panelStyle}>
        <h3 style={{ color: colors.primary, marginBottom: "12px", fontSize: "18px", fontWeight: "600" }}>
          Recent Trades
        </h3>
        {tradesLoading ? (
          <div style={{ color: colors.secondaryText, fontSize: "14px" }}>Loading...</div>
        ) : botTrades.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
            {botTrades.slice(0, 5).map((trade) => (
              <div
                key={trade.id}
                style={{
                  padding: "8px",
                  backgroundColor: colors.background,
                  border: "1px solid rgba(255, 174, 0, 0.1)",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: colors.text, fontWeight: "600" }}>{trade.symbol}</span>
                  <span style={{ 
                    color: trade.side === "buy" ? colors.success : colors.error,
                    fontSize: "10px"
                  }}>
                    {trade.side.toUpperCase()}
                  </span>
                </div>
                <div style={{ color: colors.secondaryText, fontSize: "11px" }}>
                  {trade.entry_price && trade.exit_price && (
                    <>
                      Entry: {parseFloat(trade.entry_price).toFixed(2)} → 
                      Exit: {parseFloat(trade.exit_price).toFixed(2)}
                    </>
                  )}
                </div>
                {trade.pnl && (
                  <div style={{ 
                    color: parseFloat(trade.pnl) >= 0 ? colors.success : colors.error,
                    fontSize: "11px",
                    marginTop: "4px"
                  }}>
                    P&L: {parseFloat(trade.pnl) >= 0 ? "+" : ""}{parseFloat(trade.pnl).toFixed(2)}
                    {trade.pnl_percent && ` (${parseFloat(trade.pnl_percent).toFixed(2)}%)`}
                  </div>
                )}
                <div style={{ color: colors.secondaryText, fontSize: "10px", marginTop: "4px" }}>
                  {new Date(trade.entry_time).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: colors.secondaryText, fontSize: "14px" }}>
            No trades yet
          </div>
        )}
      </div>

      {/* Quick Actions Panel */}
      <div style={panelStyle}>
        <h3 style={{ color: colors.primary, marginBottom: "12px", fontSize: "18px", fontWeight: "600" }}>
          Quick Actions
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {selectedBot.status === "active" ? (
            <button
              onClick={() => onStopBot(selectedBot.id)}
              style={{
                padding: "8px 16px",
                backgroundColor: colors.error,
                border: "none",
                borderRadius: "6px",
                color: colors.text,
                fontWeight: "600",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Stop Bot
            </button>
          ) : (
            <button
              onClick={() => onStartBot(selectedBot.id)}
              style={{
                padding: "8px 16px",
                backgroundColor: colors.success,
                border: "none",
                borderRadius: "6px",
                color: colors.text,
                fontWeight: "600",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Start Bot
            </button>
          )}
          <button
            onClick={() => onEditBot(selectedBot)}
            style={{
              padding: "8px 16px",
              backgroundColor: colors.primary,
              border: "none",
              borderRadius: "6px",
              color: colors.background,
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Edit Bot
          </button>
          <button
            onClick={() => onDeleteBot(selectedBot.id)}
            style={{
              padding: "8px 16px",
              backgroundColor: "transparent",
              border: "1px solid rgba(239, 68, 68, 0.5)",
              borderRadius: "6px",
              color: colors.error,
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Delete Bot
          </button>
        </div>
      </div>
    </>
  );
}


"use client";

import { TradingBot, SortField, SortDirection } from "./types";
import { colors, panelStyle } from "./constants";
import BotStatusBadge from "./BotStatusBadge";
import BotStatusIndicator from "./BotStatusIndicator";
import SymbolBadge from "./SymbolBadge";

interface BotListTableProps {
  bots: TradingBot[];
  selectedBot: TradingBot | null;
  sortField: SortField | null;
  sortDirection: SortDirection;
  actionLoading: Record<number, string>;
  onBotSelect: (bot: TradingBot) => void;
  onSort: (field: SortField) => void;
  onStartBot: (botId: number) => void;
  onStopBot: (botId: number) => void;
  onEditBot: (bot: TradingBot) => void;
  onDeleteBot: (botId: number) => void;
}

export default function BotListTable({
  bots,
  selectedBot,
  sortField,
  sortDirection,
  actionLoading,
  onBotSelect,
  onSort,
  onStartBot,
  onStopBot,
  onEditBot,
  onDeleteBot,
}: BotListTableProps) {
  if (bots.length === 0) {
    return (
      <div style={panelStyle}>
        <h3 style={{ color: colors.primary, marginBottom: "12px", fontSize: "18px", fontWeight: "600" }}>
          Bot List
        </h3>
        <div style={{ 
          color: colors.secondaryText, 
          textAlign: "center", 
          padding: "40px",
          fontSize: "14px"
        }}>
          No bots found. Create your first bot to get started.
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <h3 style={{ color: colors.primary, marginBottom: "12px", fontSize: "18px", fontWeight: "600" }}>
        Bot List
      </h3>
      
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
              <th 
                style={{ 
                  padding: "12px", 
                  textAlign: "left", 
                  color: colors.secondaryText,
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => onSort("name")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  Name
                  {sortField === "name" && (
                    <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </th>
              <th 
                style={{ 
                  padding: "12px", 
                  textAlign: "left", 
                  color: colors.secondaryText,
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => onSort("status")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  Status
                  {sortField === "status" && (
                    <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </th>
              <th 
                style={{ 
                  padding: "12px", 
                  textAlign: "left", 
                  color: colors.secondaryText,
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => onSort("strategy_type")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  Strategy
                  {sortField === "strategy_type" && (
                    <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </th>
              <th style={{ padding: "12px", textAlign: "left", color: colors.secondaryText }}>
                Symbols
              </th>
              <th 
                style={{ 
                  padding: "12px", 
                  textAlign: "right", 
                  color: colors.secondaryText,
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => onSort("capital")}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                  Capital
                  {sortField === "capital" && (
                    <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </th>
              <th 
                style={{ 
                  padding: "12px", 
                  textAlign: "right", 
                  color: colors.secondaryText,
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => onSort("total_pnl")}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                  P&L
                  {sortField === "total_pnl" && (
                    <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </th>
              <th 
                style={{ 
                  padding: "12px", 
                  textAlign: "center", 
                  color: colors.secondaryText,
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => onSort("win_rate")}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                  Win Rate
                  {sortField === "win_rate" && (
                    <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </th>
              <th 
                style={{ 
                  padding: "12px", 
                  textAlign: "center", 
                  color: colors.secondaryText,
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => onSort("total_trades")}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                  Trades
                  {sortField === "total_trades" && (
                    <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </th>
              <th style={{ padding: "12px", textAlign: "center", color: colors.secondaryText }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {bots.map((bot) => {
              const winRate = bot.total_trades > 0 
                ? ((bot.winning_trades / bot.total_trades) * 100).toFixed(1)
                : "0.0";
              const isSelected = selectedBot?.id === bot.id;
              const isLoading = actionLoading[bot.id];
              
              return (
                <tr
                  key={bot.id}
                  style={{
                    borderBottom: `1px solid ${colors.border}`,
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                    backgroundColor: isSelected ? "rgba(255, 174, 0, 0.05)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = colors.panelBackground;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                  onClick={() => onBotSelect(bot)}
                >
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <BotStatusIndicator status={bot.status} size="small" />
                      <a
                        href={`/bots/${bot.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        style={{
                          color: colors.text,
                          fontWeight: "500",
                          textDecoration: "none",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = colors.primary;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = colors.text;
                        }}
                      >
                        {bot.name}
                      </a>
                    </div>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <BotStatusBadge status={bot.status} size="small" />
                  </td>
                  <td style={{ padding: "12px", color: colors.secondaryText }}>
                    {bot.strategy_type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {bot.symbols.slice(0, 3).map(symbol => (
                        <span
                          key={symbol}
                          style={{
                            padding: "2px 8px",
                            backgroundColor: colors.background,
                            border: `1px solid ${colors.border}`,
                            borderRadius: "4px",
                            fontSize: "11px",
                            color: colors.secondaryText,
                          }}
                        >
                          {symbol}
                        </span>
                      ))}
                      {bot.symbols.length > 3 && (
                        <span
                          style={{
                            padding: "2px 8px",
                            backgroundColor: colors.background,
                            border: `1px solid ${colors.border}`,
                            borderRadius: "4px",
                            fontSize: "11px",
                            color: colors.secondaryText,
                          }}
                        >
                          +{bot.symbols.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "12px", textAlign: "right", color: colors.text }}>
                    {parseFloat(bot.capital).toFixed(2)}
                  </td>
                  <td style={{ 
                    padding: "12px", 
                    textAlign: "right",
                    color: parseFloat(bot.total_pnl) >= 0 ? colors.success : colors.error,
                    fontWeight: "500",
                  }}>
                    {parseFloat(bot.total_pnl) >= 0 ? "+" : ""}{parseFloat(bot.total_pnl).toFixed(2)}
                  </td>
                  <td style={{ padding: "12px", textAlign: "center", color: colors.primary, fontWeight: "500" }}>
                    {winRate}%
                  </td>
                  <td style={{ padding: "12px", textAlign: "center", color: colors.secondaryText }}>
                    {bot.total_trades}
                  </td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <div 
                      style={{ display: "flex", gap: "4px", justifyContent: "center" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {bot.status === "active" ? (
                        <button
                          onClick={() => onStopBot(bot.id)}
                          disabled={!!isLoading}
                          style={{
                            padding: "4px 8px",
                            backgroundColor: colors.error,
                            border: "none",
                            borderRadius: "4px",
                            color: colors.text,
                            fontSize: "11px",
                            cursor: isLoading ? "not-allowed" : "pointer",
                            opacity: isLoading ? 0.6 : 1,
                          }}
                          title="Stop Bot"
                        >
                          {isLoading === "stop" ? "..." : "⏹"}
                        </button>
                      ) : (
                        <button
                          onClick={() => onStartBot(bot.id)}
                          disabled={!!isLoading}
                          style={{
                            padding: "4px 8px",
                            backgroundColor: colors.success,
                            border: "none",
                            borderRadius: "4px",
                            color: colors.text,
                            fontSize: "11px",
                            cursor: isLoading ? "not-allowed" : "pointer",
                            opacity: isLoading ? 0.6 : 1,
                          }}
                          title="Start Bot"
                        >
                          {isLoading === "start" ? "..." : "▶"}
                        </button>
                      )}
                      <button
                        onClick={() => onEditBot(bot)}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: colors.primary,
                          border: "none",
                          borderRadius: "4px",
                          color: colors.background,
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                        title="Edit Bot"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onDeleteBot(bot.id)}
                        disabled={!!isLoading}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "transparent",
                          border: `1px solid ${colors.error}`,
                          borderRadius: "4px",
                          color: colors.error,
                          fontSize: "11px",
                          cursor: isLoading ? "not-allowed" : "pointer",
                          opacity: isLoading ? 0.6 : 1,
                        }}
                        title="Delete Bot"
                      >
                        {isLoading === "delete" ? "..." : "🗑️"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


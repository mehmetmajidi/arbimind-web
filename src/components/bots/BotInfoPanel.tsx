"use client";

import { useState, useEffect } from "react";
import { TradingBot, BotStatus } from "./types";
import { colors, panelStyle } from "./constants";
import BotStatusIndicator from "./BotStatusIndicator";
import BotStatusBadge from "./BotStatusBadge";
import SymbolBadge from "./SymbolBadge";

interface BotInfoPanelProps {
  bot: TradingBot;
  botStatus?: BotStatus | null;  // Optional bot status for symbol stats
}

export default function BotInfoPanel({
  bot,
  botStatus,
}: BotInfoPanelProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return colors.success;
      case "stopped":
        return colors.secondaryText;
      case "error":
        return colors.error;
      default:
        return colors.secondaryText;
    }
  };

  return (
    <div style={{ width: "320px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Bot Info Card */}
      <div style={panelStyle}>
        <h3 style={{ color: colors.primary, marginBottom: "12px", fontSize: "18px", fontWeight: "600" }}>
          Bot Information
        </h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: colors.secondaryText, fontSize: "13px" }}>Name:</span>
            <span style={{ color: colors.text, fontWeight: "600", fontSize: "14px" }}>{bot.name}</span>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: colors.secondaryText, fontSize: "13px" }}>Status:</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <BotStatusIndicator status={bot.status} size="small" />
              <BotStatusBadge status={bot.status} size="small" />
            </div>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: colors.secondaryText, fontSize: "13px" }}>Strategy:</span>
            <span style={{ color: colors.text, fontSize: "13px" }}>
              {bot.strategy_type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: colors.secondaryText, fontSize: "13px" }}>Mode:</span>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "500",
                backgroundColor: bot.paper_trading ? "rgba(245, 158, 11, 0.2)" : "rgba(34, 197, 94, 0.2)",
                color: bot.paper_trading ? colors.warning : colors.success,
              }}
            >
              {bot.paper_trading ? "DEMO" : "REAL"}
            </span>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: colors.secondaryText, fontSize: "13px" }}>Capital:</span>
            <span style={{ color: colors.text, fontWeight: "600", fontSize: "13px" }}>
              {parseFloat(bot.current_capital).toFixed(2)} / {parseFloat(bot.capital).toFixed(2)} USDT
            </span>
          </div>
          
          {/* Note: Available balance will be shown in BotPerformancePanel when botStatus is available */}
          
          {bot.started_at && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: colors.secondaryText, fontSize: "13px" }}>Started:</span>
              <span style={{ color: colors.text, fontSize: "12px" }}>
                {new Date(bot.started_at).toLocaleString()}
              </span>
            </div>
          )}
          
          {bot.created_at && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: colors.secondaryText, fontSize: "13px" }}>Created:</span>
                <span style={{ color: colors.text, fontSize: "12px" }}>
                  {new Date(bot.created_at).toLocaleString()}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: colors.secondaryText, fontSize: "13px" }}>Current Time:</span>
                <span style={{ color: colors.primary, fontSize: "12px", fontWeight: "600" }}>
                  {currentTime.toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>
      </div>


      {/* Configuration Summary */}
      <div style={panelStyle}>
        <h3 style={{ color: colors.primary, marginBottom: "12px", fontSize: "18px", fontWeight: "600" }}>
          Configuration
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: colors.secondaryText, fontSize: "13px" }}>Risk Per Trade:</span>
            <span style={{ color: colors.text, fontSize: "13px" }}>
              {(parseFloat(bot.risk_per_trade) * 100).toFixed(2)}%
            </span>
          </div>
          
          {bot.stop_loss_percent && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: colors.secondaryText, fontSize: "13px" }}>Stop Loss:</span>
              <span style={{ color: colors.text, fontSize: "13px" }}>
                {(parseFloat(bot.stop_loss_percent) * 100).toFixed(2)}%
              </span>
            </div>
          )}
          
          {bot.take_profit_percent && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: colors.secondaryText, fontSize: "13px" }}>Take Profit:</span>
              <span style={{ color: colors.text, fontSize: "13px" }}>
                {(parseFloat(bot.take_profit_percent) * 100).toFixed(2)}%
              </span>
            </div>
          )}
          
          {bot.max_position_size && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: colors.secondaryText, fontSize: "13px" }}>Max Position:</span>
              <span style={{ color: colors.text, fontSize: "13px" }}>
                {parseFloat(bot.max_position_size).toFixed(2)} USDT
              </span>
            </div>
          )}
          
          {bot.duration_hours && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: colors.secondaryText, fontSize: "13px" }}>Duration:</span>
              <span style={{ color: colors.text, fontSize: "13px" }}>
                {bot.duration_hours} hours
              </span>
            </div>
          )}
          
          <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: `1px solid ${colors.border}` }}>
            <div style={{ color: colors.secondaryText, fontSize: "13px", marginBottom: "8px" }}>
              Trading Symbols:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {bot.symbols.map(symbol => {
                const symbolStat = botStatus?.symbol_stats?.[symbol];
                return (
                  <div 
                    key={symbol}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 8px",
                      backgroundColor: colors.background,
                      borderRadius: "6px",
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <SymbolBadge symbol={symbol} size="small" />
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end", fontSize: "10px", minWidth: "120px" }}>
                      {symbolStat && symbolStat.total_quantity > 0 && (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: "8px" }}>
                            <span style={{ color: colors.secondaryText }}>Qty:</span>
                            <span style={{ color: colors.text, fontWeight: "600" }}>
                              {symbolStat.total_quantity.toFixed(4)}
                            </span>
                          </div>
                          {symbolStat.total_cost_at_entry > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: "8px" }}>
                              <span style={{ color: colors.secondaryText }}>Entry Value:</span>
                              <span style={{ color: colors.text }}>
                                {symbolStat.total_cost_at_entry.toFixed(2)} USDT
                              </span>
                            </div>
                          )}
                          {symbolStat.current_value > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: "8px" }}>
                              <span style={{ color: colors.secondaryText }}>Current Value:</span>
                              <span style={{ 
                                color: symbolStat.current_value >= symbolStat.total_cost_at_entry ? colors.success : colors.error,
                                fontWeight: "600"
                              }}>
                                {symbolStat.current_value.toFixed(2)} USDT
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      {symbolStat && symbolStat.total_pnl !== 0 && (
                        <div style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          width: "100%", 
                          gap: "8px",
                          marginTop: "4px",
                          paddingTop: "4px",
                          borderTop: `1px solid ${colors.border}`
                        }}>
                          <span style={{ color: colors.secondaryText }}>PnL:</span>
                          <span style={{ 
                            color: symbolStat.total_pnl >= 0 ? colors.success : colors.error, 
                            fontWeight: "700",
                            fontSize: "11px"
                          }}>
                            {symbolStat.total_pnl >= 0 ? "+" : ""}{symbolStat.total_pnl.toFixed(2)} USDT
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


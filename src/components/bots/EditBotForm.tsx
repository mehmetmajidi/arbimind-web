"use client";

import { useState, useEffect, useCallback } from "react";
import { TradingBot } from "./types";
import { colors } from "./constants";

interface EditBotFormProps {
  isOpen: boolean;
  bot: TradingBot | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditBotForm({ isOpen, bot, onClose, onSuccess }: EditBotFormProps) {
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [exchangeAccounts, setExchangeAccounts] = useState<Array<{id: number; exchange_name: string}>>([]);
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  
  // Form fields
  const [botName, setBotName] = useState("");
  const [exchangeAccountId, setExchangeAccountId] = useState<string>("");
  const [capital, setCapital] = useState("");
  const [riskPerTrade, setRiskPerTrade] = useState("2");
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState("prediction_based");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [paperTrading, setPaperTrading] = useState(true);
  const [hasDuration, setHasDuration] = useState(false);
  const [durationHours, setDurationHours] = useState("");

  // Fetch exchange accounts
  const fetchExchangeAccounts = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token") || "";
      if (!token) return;

      const apiUrl = typeof window !== "undefined" 
        ? "http://localhost:8000" 
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${apiUrl}/exchange/accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setExchangeAccounts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching exchange accounts:", err);
    }
  }, []);

  // Fetch available symbols
  const fetchAvailableSymbols = useCallback(async () => {
    // Common trading symbols - in production, fetch from market endpoint
    const commonSymbols = [
      "BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "ADA/USDT",
      "XRP/USDT", "DOT/USDT", "DOGE/USDT", "AVAX/USDT", "MATIC/USDT",
      "LINK/USDT", "UNI/USDT", "LTC/USDT", "ATOM/USDT", "ETC/USDT",
    ];
    setAvailableSymbols(commonSymbols);
  }, []);

  // Initialize form with bot data
  useEffect(() => {
    if (isOpen && bot) {
      fetchExchangeAccounts();
      fetchAvailableSymbols();
      
      // Populate form with bot data
      setBotName(bot.name);
      setExchangeAccountId(bot.exchange_account_id.toString());
      setCapital(bot.capital);
      setRiskPerTrade((parseFloat(bot.risk_per_trade) * 100).toFixed(1));
      setSelectedSymbols(bot.symbols);
      setSelectedStrategy(bot.strategy_type);
      setStopLoss(bot.stop_loss_percent ? (parseFloat(bot.stop_loss_percent) * 100).toFixed(1) : "");
      setTakeProfit(bot.take_profit_percent ? (parseFloat(bot.take_profit_percent) * 100).toFixed(1) : "");
      setPaperTrading(bot.paper_trading);
      setHasDuration(bot.duration_hours !== null);
      setDurationHours(bot.duration_hours ? bot.duration_hours.toString() : "");
      setFormError(null);
      setFormSuccess(null);
    }
  }, [isOpen, bot, fetchExchangeAccounts, fetchAvailableSymbols]);

  const handleSubmit = async () => {
    if (!bot) return;

    // Validation
    if (!botName.trim()) {
      setFormError("Bot name is required");
      return;
    }
    if (!exchangeAccountId) {
      setFormError("Exchange account is required");
      return;
    }
    if (!capital || parseFloat(capital) <= 0) {
      setFormError("Valid initial capital is required");
      return;
    }
    if (selectedSymbols.length === 0) {
      setFormError("At least one trading symbol is required");
      return;
    }

    setFormLoading(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const token = localStorage.getItem("auth_token") || "";
      if (!token) {
        setFormError("Please login to edit bot");
        return;
      }

      const apiUrl = typeof window !== "undefined" 
        ? "http://localhost:8000" 
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      // Prepare update data (only changed fields)
      const updateData: Record<string, unknown> = {};
      
      if (botName.trim() !== bot.name) {
        updateData.name = botName.trim();
      }
      if (parseInt(exchangeAccountId) !== bot.exchange_account_id) {
        updateData.exchange_account_id = parseInt(exchangeAccountId);
      }
      if (parseFloat(capital) !== parseFloat(bot.capital)) {
        updateData.capital = parseFloat(capital);
      }
      if (parseFloat(riskPerTrade) / 100 !== parseFloat(bot.risk_per_trade)) {
        updateData.risk_per_trade = parseFloat(riskPerTrade) / 100;
      }
      if (JSON.stringify(selectedSymbols.sort()) !== JSON.stringify(bot.symbols.sort())) {
        updateData.symbols = selectedSymbols;
      }
      if (selectedStrategy !== bot.strategy_type) {
        updateData.strategy_type = selectedStrategy;
      }
      if (stopLoss ? parseFloat(stopLoss) / 100 : null !== (bot.stop_loss_percent ? parseFloat(bot.stop_loss_percent) : null)) {
        updateData.stop_loss_percent = stopLoss ? parseFloat(stopLoss) / 100 : null;
      }
      if (takeProfit ? parseFloat(takeProfit) / 100 : null !== (bot.take_profit_percent ? parseFloat(bot.take_profit_percent) : null)) {
        updateData.take_profit_percent = takeProfit ? parseFloat(takeProfit) / 100 : null;
      }
      if (paperTrading !== bot.paper_trading) {
        updateData.paper_trading = paperTrading;
      }
      if ((hasDuration && durationHours ? parseInt(durationHours) : null) !== bot.duration_hours) {
        updateData.duration_hours = hasDuration && durationHours ? parseInt(durationHours) : null;
      }

      if (Object.keys(updateData).length === 0) {
        setFormError("No changes to save");
        setFormLoading(false);
        return;
      }

      const response = await fetch(`${apiUrl}/bots/${bot.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        setFormSuccess("Bot updated successfully!");
        setTimeout(() => {
          onClose();
          if (onSuccess) {
            onSuccess();
          }
        }, 1000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setFormError(errorData.detail || "Failed to update bot");
      }
    } catch (err) {
      console.error("Error updating bot:", err);
      setFormError("Failed to update bot. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  if (!isOpen || !bot) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: colors.panelBackground,
          border: `1px solid ${colors.border}`,
          borderRadius: "12px",
          padding: "24px",
          maxWidth: "600px",
          width: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Form Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ color: colors.primary, margin: 0, fontSize: "24px", fontWeight: "bold" }}>
            Edit Trading Bot
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: colors.secondaryText,
              fontSize: "24px",
              cursor: "pointer",
              padding: "0",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {/* Form Success */}
        {formSuccess && (
          <div style={{
            padding: "12px",
            backgroundColor: "rgba(34, 197, 94, 0.15)",
            border: `1px solid rgba(34, 197, 94, 0.5)`,
            borderRadius: "8px",
            marginBottom: "16px",
            color: colors.success,
            fontSize: "14px",
          }}>
            {formSuccess}
          </div>
        )}

        {/* Form Error */}
        {formError && (
          <div style={{
            padding: "12px",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            border: `1px solid rgba(239, 68, 68, 0.5)`,
            borderRadius: "8px",
            marginBottom: "16px",
            color: colors.error,
            fontSize: "14px",
          }}>
            {formError}
          </div>
        )}

        {/* Basic Info Section */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ color: colors.text, display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
              Bot Name *
            </label>
            <input
              type="text"
              placeholder="My Trading Bot"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                backgroundColor: colors.background,
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                color: colors.text,
                fontSize: "14px",
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ color: colors.text, display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
              Exchange Account *
            </label>
            <select
              value={exchangeAccountId}
              onChange={(e) => setExchangeAccountId(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                backgroundColor: colors.background,
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                color: colors.text,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <option value="">Select Exchange</option>
              {exchangeAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.exchange_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Trading Settings Section */}
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ color: colors.primary, marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>
            Trading Settings
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ color: colors.text, display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Initial Capital (USDT) *
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="1000"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "8px",
                  color: colors.text,
                  fontSize: "14px",
                }}
              />
            </div>

            <div>
              <label style={{ color: colors.text, display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Risk Per Trade (%)
              </label>
              <input
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                placeholder="2"
                value={riskPerTrade}
                onChange={(e) => setRiskPerTrade(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "8px",
                  color: colors.text,
                  fontSize: "14px",
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ color: colors.text, display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
              Trading Symbols *
            </label>
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              padding: "12px",
              backgroundColor: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: "8px",
              minHeight: "60px",
              maxHeight: "150px",
              overflowY: "auto",
            }}>
              {availableSymbols.map(symbol => (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => {
                    if (selectedSymbols.includes(symbol)) {
                      setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
                    } else {
                      setSelectedSymbols([...selectedSymbols, symbol]);
                    }
                  }}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: selectedSymbols.includes(symbol) 
                      ? colors.primary 
                      : "transparent",
                    border: `1px solid ${selectedSymbols.includes(symbol) ? colors.primary : colors.border}`,
                    borderRadius: "6px",
                    color: selectedSymbols.includes(symbol) 
                      ? colors.background 
                      : colors.text,
                    fontSize: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {symbol}
                </button>
              ))}
            </div>
            {selectedSymbols.length === 0 && (
              <p style={{ color: colors.warning, fontSize: "12px", marginTop: "4px" }}>
                Please select at least one symbol
              </p>
            )}
          </div>
        </div>

        {/* Strategy Selection Section */}
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ color: colors.primary, marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>
            Strategy
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { id: "prediction_based", name: "Prediction Based", desc: "Uses ML predictions for trading decisions" },
              { id: "confidence_weighted", name: "Confidence Weighted", desc: "Weights trades by prediction confidence" },
              { id: "multi_model_voting", name: "Multi-Model Voting", desc: "Combines multiple model predictions" },
              { id: "jump_enhanced", name: "Jump Enhanced", desc: "Optimized for price jumps and volatility" },
              { id: "regime_adaptive", name: "Regime Adaptive", desc: "Adapts to market conditions" },
              { id: "multi_timeframe_fusion", name: "Multi-Timeframe Fusion", desc: "Analyzes multiple timeframes" },
              { id: "mean_reversion", name: "Mean Reversion", desc: "Trades on price reversions" },
              { id: "trend_following", name: "Trend Following", desc: "Follows market trends" },
            ].map(strategy => (
              <div
                key={strategy.id}
                onClick={() => setSelectedStrategy(strategy.id)}
                style={{
                  padding: "16px",
                  border: selectedStrategy === strategy.id 
                    ? `2px solid ${colors.primary}` 
                    : `1px solid ${colors.border}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                  backgroundColor: selectedStrategy === strategy.id 
                    ? "rgba(255, 174, 0, 0.1)" 
                    : "transparent",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h4 style={{ color: colors.text, marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
                      {strategy.name}
                    </h4>
                    <p style={{ color: colors.secondaryText, fontSize: "12px", margin: 0 }}>
                      {strategy.desc}
                    </p>
                  </div>
                  {selectedStrategy === strategy.id && (
                    <span style={{ color: colors.primary, fontSize: "20px" }}>✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Management Section */}
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ color: colors.primary, marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>
            Risk Management
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ color: colors.text, display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Stop Loss (%)
              </label>
              <input
                type="number"
                min="0.1"
                max="50"
                step="0.1"
                placeholder="2"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "8px",
                  color: colors.text,
                  fontSize: "14px",
                }}
              />
            </div>

            <div>
              <label style={{ color: colors.text, display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Take Profit (%)
              </label>
              <input
                type="number"
                min="0.1"
                max="200"
                step="0.1"
                placeholder="5"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "8px",
                  color: colors.text,
                  fontSize: "14px",
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={paperTrading}
                onChange={(e) => setPaperTrading(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <span style={{ color: colors.text, fontSize: "14px" }}>Paper Trading (Demo Mode)</span>
            </label>
            <p style={{ color: colors.secondaryText, fontSize: "12px", marginTop: "4px", marginLeft: "26px" }}>
              Simulate trading without real money
            </p>
          </div>
        </div>

        {/* Duration Section */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={hasDuration}
              onChange={(e) => setHasDuration(e.target.checked)}
              style={{ width: "18px", height: "18px", cursor: "pointer" }}
            />
            <span style={{ color: colors.text, fontSize: "14px" }}>Set Duration</span>
          </label>

          {hasDuration && (
            <div style={{ marginTop: "12px" }}>
              <input
                type="number"
                min="1"
                placeholder="24"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                style={{
                  width: "200px",
                  padding: "10px 12px",
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "8px",
                  color: colors.text,
                  fontSize: "14px",
                }}
              />
              <span style={{ color: colors.secondaryText, marginLeft: "8px" }}>hours</span>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={formLoading}
            style={{
              padding: "10px 20px",
              backgroundColor: "transparent",
              border: `1px solid ${colors.border}`,
              borderRadius: "8px",
              color: colors.text,
              fontWeight: "500",
              cursor: formLoading ? "not-allowed" : "pointer",
              fontSize: "14px",
              opacity: formLoading ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={formLoading}
            style={{
              padding: "10px 20px",
              backgroundColor: colors.primary,
              border: "none",
              borderRadius: "8px",
              color: colors.background,
              fontWeight: "600",
              cursor: formLoading ? "not-allowed" : "pointer",
              fontSize: "14px",
              opacity: formLoading ? 0.6 : 1,
            }}
          >
            {formLoading ? "Updating..." : "Update Bot"}
          </button>
        </div>
      </div>
    </div>
  );
}


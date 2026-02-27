"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { BotTrade } from "./types";
import { colors, panelStyle } from "./constants";
import PositionCard from "./PositionCard";
import { getApiUrl } from "@/lib/apiBaseUrl";
import { getBotsApiBase } from "@/lib/botsEndpoints";
import { getMarketApiBase } from "@/lib/marketEndpoints";
import { getTradingApiBase } from "@/lib/tradingEndpoints";

interface BotPositionsListProps {
  positions: BotTrade[];
  loading?: boolean;
  exchangeAccountId?: number;
  onRefresh?: () => void;
}

interface PriceData {
  price: number;
  timestamp: number;
}

export default function BotPositionsList({ 
  positions, 
  loading, 
  exchangeAccountId,
  onRefresh,
}: BotPositionsListProps) {
  const [currentPrices, setCurrentPrices] = useState<Record<string, PriceData>>({});
  const [priceLoading, setPriceLoading] = useState<Record<string, boolean>>({});
  const [predictedPrices, setPredictedPrices] = useState<Record<string, number | null>>({});
  const [closingTradeId, setClosingTradeId] = useState<number | null>(null);
  const [exitOrders, setExitOrders] = useState<Record<number, boolean>>({});

  const openPositions = useMemo(() => {
    return positions.filter(p => p.status.toLowerCase() === "open");
  }, [positions]);

  // Get unique symbols from open positions
  const uniqueSymbols = useMemo(() => {
    return Array.from(new Set(openPositions.map(p => p.symbol)));
  }, [openPositions]);

  // Fetch current price for a symbol
  const fetchPrice = useCallback(async (symbol: string) => {
    if (!exchangeAccountId) return;

    setPriceLoading(prev => ({ ...prev, [symbol]: true }));
    try {
      const token = localStorage.getItem("auth_token") || "";
      if (!token) return;

      const marketBase = getMarketApiBase();
      const encodedSymbol = encodeURIComponent(symbol);

      const response = await fetch(`${marketBase}/price/${exchangeAccountId}/${encodedSymbol}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-cache",
      });

      if (response.ok) {
        const data = await response.json();
        const price = data.price || data.last || data.close || 0;
        
        if (price > 0) {
          setCurrentPrices(prev => ({
            ...prev,
            [symbol]: {
              price,
              timestamp: Date.now(),
            },
          }));
        }
      }
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
    } finally {
      setPriceLoading(prev => ({ ...prev, [symbol]: false }));
    }
  }, [exchangeAccountId]);

  // Fetch prices for all unique symbols
  const fetchAllPrices = useCallback(async () => {
    if (uniqueSymbols.length === 0 || !exchangeAccountId) return;
    
    // Fetch prices in parallel
    await Promise.all(uniqueSymbols.map(symbol => fetchPrice(symbol)));
  }, [uniqueSymbols, exchangeAccountId, fetchPrice]);

  // Fetch predicted price (1h) for each symbol
  const fetchPredictions = useCallback(async () => {
    if (uniqueSymbols.length === 0 || exchangeAccountId == null) return;
    const token = localStorage.getItem("auth_token") || "";
    if (!token) return;
    const apiUrl = getApiV1Base();
    const next: Record<string, number | null> = {};
    await Promise.all(
      uniqueSymbols.map(async (symbol) => {
        try {
          const encodedSymbol = encodeURIComponent(symbol);
          const res = await fetch(
            `${apiUrl}/predictions/symbol/${encodedSymbol}?horizons=1h&exchange_account_id=${exchangeAccountId}`,
            { headers: { Authorization: `Bearer ${token}` }, cache: "no-cache" }
          );
          if (!res.ok) {
            next[symbol] = null;
            return;
          }
          const data = await res.json();
          const pred = data.predictions?.["1h"];
          next[symbol] = pred?.predicted_price != null ? Number(pred.predicted_price) : null;
        } catch {
          next[symbol] = null;
        }
      })
    );
    setPredictedPrices((prev) => ({ ...prev, ...next }));
  }, [uniqueSymbols, exchangeAccountId]);

  // Initial price fetch
  useEffect(() => {
    if (openPositions.length > 0 && exchangeAccountId) {
      fetchAllPrices();
      fetchPredictions();
    }
  }, [openPositions.length, exchangeAccountId, fetchAllPrices, fetchPredictions]);

  // Fetch exit orders for open positions
  const fetchExitOrders = useCallback(async () => {
    if (openPositions.length === 0 || !exchangeAccountId) {
      setExitOrders({});
      return;
    }

    try {
      const token = localStorage.getItem("auth_token") || "";
      if (!token) return;

      // Use /orders/exchange so Demo (-999) and real accounts both return active orders (open/pending)
      const response = await fetch(`${getTradingApiBase()}/orders/exchange?exchange_account_id=${exchangeAccountId}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const orders = await response.json();
        const exitOrdersMap: Record<number, boolean> = {};
        
        // Check for each open position if there's a sell order (exit order)
        openPositions.forEach(position => {
          if (position.side === "buy") {
            // For buy positions, check if there's a sell order for the same symbol
            const hasExitOrder = orders.some((order: { symbol: string; side: string; status: string }) => 
              order.symbol === position.symbol && 
              order.side === "sell" && 
              (order.status === "open" || order.status === "pending" || order.status === "partially_filled")
            );
            exitOrdersMap[position.id] = hasExitOrder;
          }
        });
        
        setExitOrders(exitOrdersMap);
      }
    } catch (error) {
      console.error("Error fetching exit orders:", error);
    }
  }, [openPositions, exchangeAccountId]);

  // Fetch exit orders on mount and when positions change
  useEffect(() => {
    fetchExitOrders();
  }, [fetchExitOrders]);

  // Real-time price updates (every 5 seconds); refresh predictions every 60s
  useEffect(() => {
    if (openPositions.length === 0 || !exchangeAccountId) return;

    const interval = setInterval(() => {
      fetchAllPrices();
      fetchExitOrders(); // Also check exit orders periodically
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [openPositions.length, exchangeAccountId, fetchAllPrices, fetchExitOrders]);

  useEffect(() => {
    if (openPositions.length === 0 || exchangeAccountId == null) return;
    const interval = setInterval(() => fetchPredictions(), 60000); // Refresh predictions every 60s
    return () => clearInterval(interval);
  }, [openPositions.length, exchangeAccountId, fetchPredictions]);

  // Calculate unrealized P&L for a position
  const calculateUnrealizedPnl = useCallback((position: BotTrade): { pnl: number; pnlPercent: number } => {
    const entryPrice = parseFloat(position.entry_price);
    const quantity = parseFloat(position.quantity);
    const currentPrice = currentPrices[position.symbol]?.price;

    if (!currentPrice || entryPrice <= 0) {
      return { pnl: parseFloat(position.pnl || "0"), pnlPercent: parseFloat(position.pnl_percent || "0") };
    }

    let pnl: number;
    if (position.side === "buy") {
      // Long position: profit if current price > entry price
      pnl = (currentPrice - entryPrice) * quantity;
    } else {
      // Short position: profit if entry price > current price
      pnl = (entryPrice - currentPrice) * quantity;
    }

    const entryValue = entryPrice * quantity;
    const pnlPercent = entryValue > 0 ? (pnl / entryValue) * 100 : 0;

    return { pnl, pnlPercent };
  }, [currentPrices]);

  // Handle close position
  const handleClosePosition = useCallback(async (tradeId: number) => {
    if (!exchangeAccountId) {
      alert("Exchange account ID is required to close position");
      return;
    }

    setClosingTradeId(tradeId);
    try {
      const token = localStorage.getItem("auth_token") || "";
      if (!token) {
        alert("Please login to close position");
        return;
      }

      const response = await fetch(`${getBotsApiBase()}/trades/${tradeId}/close`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Position closed:", data);
        
        // Refresh positions
        if (onRefresh) {
          onRefresh();
        }
        
        // Refresh prices
        await fetchAllPrices();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to close position");
      }
    } catch (error) {
      console.error("Error closing position:", error);
      throw error;
    } finally {
      setClosingTradeId(null);
    }
  }, [exchangeAccountId, onRefresh, fetchAllPrices]);

  if (loading) {
    return (
      <div style={panelStyle}>
        <h3 style={{ color: colors.primary, marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>
          Open Positions
        </h3>
        <div style={{ color: colors.secondaryText, textAlign: "center", padding: "40px" }}>
          Loading...
        </div>
      </div>
    );
  }

  if (openPositions.length === 0) {
    return (
      <div style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ color: colors.primary, margin: 0, fontSize: "18px", fontWeight: "600" }}>
            Open Positions
          </h3>
          {onRefresh && (
            <button
              onClick={onRefresh}
              style={{
                padding: "6px 12px",
                backgroundColor: "transparent",
                border: `1px solid ${colors.border}`,
                borderRadius: "6px",
                color: colors.text,
                cursor: "pointer",
                fontSize: "12px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.background;
                e.currentTarget.style.borderColor = colors.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = colors.border;
              }}
            >
              🔄 Refresh
            </button>
          )}
        </div>
        <div style={{ color: colors.secondaryText, textAlign: "center", padding: "40px" }}>
          No open positions
        </div>
      </div>
    );
  }

  // Calculate total unrealized P&L
  const totalUnrealizedPnl = openPositions.reduce((sum, pos) => {
    const { pnl } = calculateUnrealizedPnl(pos);
    return sum + pnl;
  }, 0);

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <h3 style={{ color: colors.primary, margin: 0, fontSize: "18px", fontWeight: "600" }}>
            Open Positions ({openPositions.length})
          </h3>
          <div style={{ 
            marginTop: "4px", 
            fontSize: "12px", 
            color: colors.secondaryText,
          }}>
            Total Unrealized P&L:{" "}
            <span style={{
              color: totalUnrealizedPnl >= 0 ? colors.success : colors.error,
              fontWeight: "600",
            }}>
              {totalUnrealizedPnl >= 0 ? "+" : ""}{totalUnrealizedPnl.toFixed(2)} USDT
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {exchangeAccountId && (
            <button
              onClick={fetchAllPrices}
              disabled={Object.values(priceLoading).some(loading => loading)}
              style={{
                padding: "6px 12px",
                backgroundColor: "transparent",
                border: `1px solid ${colors.border}`,
                borderRadius: "6px",
                color: colors.text,
                cursor: Object.values(priceLoading).some(loading => loading) ? "not-allowed" : "pointer",
                fontSize: "12px",
                opacity: Object.values(priceLoading).some(loading => loading) ? 0.5 : 1,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!Object.values(priceLoading).some(loading => loading)) {
                  e.currentTarget.style.backgroundColor = colors.background;
                  e.currentTarget.style.borderColor = colors.primary;
                }
              }}
              onMouseLeave={(e) => {
                if (!Object.values(priceLoading).some(loading => loading)) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.borderColor = colors.border;
                }
              }}
            >
              {Object.values(priceLoading).some(loading => loading) ? "⏳ Updating..." : "🔄 Update Prices"}
            </button>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              style={{
                padding: "6px 12px",
                backgroundColor: "transparent",
                border: `1px solid ${colors.border}`,
                borderRadius: "6px",
                color: colors.text,
                cursor: "pointer",
                fontSize: "12px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.background;
                e.currentTarget.style.borderColor = colors.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = colors.border;
              }}
            >
              🔄 Refresh
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {openPositions.map((position) => {
          const { pnl, pnlPercent } = calculateUnrealizedPnl(position);
          const currentPrice = currentPrices[position.symbol]?.price || null;
          const isLoadingPrice = priceLoading[position.symbol] || false;

          return (
            <PositionCard
              key={position.id}
              position={position}
              currentPrice={currentPrice}
              unrealizedPnl={pnl}
              unrealizedPnlPercent={pnlPercent}
              onClose={exchangeAccountId ? handleClosePosition : undefined}
              exchangeAccountId={exchangeAccountId}
              hasExitOrder={exitOrders[position.id] || false}
              predictedPrice={predictedPrices[position.symbol] ?? null}
            />
          );
        })}
      </div>
    </div>
  );
}

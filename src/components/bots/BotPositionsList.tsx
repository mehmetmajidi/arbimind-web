"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { BotTrade } from "./types";
import { colors, panelStyle } from "./constants";
import PositionCard from "./PositionCard";

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
  const [closingTradeId, setClosingTradeId] = useState<number | null>(null);

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

      const apiUrl = typeof window !== "undefined" 
        ? "http://localhost:8000" 
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const encodedSymbol = encodeURIComponent(symbol);

      const response = await fetch(`${apiUrl}/market/price/${exchangeAccountId}/${encodedSymbol}`, {
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

  // Initial price fetch
  useEffect(() => {
    if (openPositions.length > 0 && exchangeAccountId) {
      fetchAllPrices();
    }
  }, [openPositions.length, exchangeAccountId, fetchAllPrices]);

  // Real-time price updates (every 5 seconds)
  useEffect(() => {
    if (openPositions.length === 0 || !exchangeAccountId) return;

    const interval = setInterval(() => {
      fetchAllPrices();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [openPositions.length, exchangeAccountId, fetchAllPrices]);

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

      const apiUrl = typeof window !== "undefined" 
        ? "http://localhost:8000" 
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${apiUrl}/bots/trades/${tradeId}/close`, {
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
            />
          );
        })}
      </div>
    </div>
  );
}

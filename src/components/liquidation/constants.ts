// Constants for Liquidation Map component

import { ExchangeColors } from "@/types/liquidation";

/**
 * Color scheme for exchanges in the liquidation map
 */
export const EXCHANGE_COLORS: ExchangeColors = {
    Binance: "#1E90FF",      // Blue
    Bybit: "#9370DB",        // Medium Purple
    Okex: "#FF8C00",         // Dark Orange
    Aster: "#00CED1",         // Dark Turquoise
    Hyperliquid: "#FF1493",  // Deep Pink
};

/**
 * Chart styling constants
 */
export const CHART_STYLES = {
    background: "#2a2a2a",
    gridColor: "#444",
    textColor: "#888",
    shortLiquidationColor: "#ef4444",
    longLiquidationColor: "#22c55e",
    currentPriceLineColor: "#ef4444",
    shortLiquidationOpacity: 0.3,
    longLiquidationOpacity: 0.3,
};

/**
 * Available symbols for liquidation map
 */
export const AVAILABLE_SYMBOLS = [
    "BTC",
    "ETH",
    "BNB",
    "SOL",
    "XRP",
    "ADA",
    "DOGE",
    "DOT",
    "MATIC",
    "AVAX",
];

/**
 * Available timeframes for liquidation map
 */
export const AVAILABLE_TIMEFRAMES = [
    { value: "1h", label: "1 Hour" },
    { value: "4h", label: "4 Hours" },
    { value: "1d", label: "1 Day" },
    { value: "1w", label: "1 Week" },
];


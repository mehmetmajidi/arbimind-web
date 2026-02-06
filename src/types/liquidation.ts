// TypeScript interfaces for Liquidation Map module

/**
 * Represents liquidation data at a specific price point
 */
export interface LiquidationData {
    /** Price level in USD */
    price: number;
    /** Total short liquidation amount in USD at this price */
    short_liquidation: number;
    /** Total long liquidation amount in USD at this price */
    long_liquidation: number;
    /** Breakdown of liquidations by exchange (exchange name -> amount in USD) */
    exchange_breakdown: Record<string, number>;
}

/**
 * Response from the liquidation map API endpoint
 */
export interface LiquidationMapResponse {
    /** Trading symbol (e.g., "BTC", "ETH") */
    symbol: string;
    /** Current market price */
    current_price: number;
    /** Timeframe for the data (e.g., "1w", "1d", "4h", "1h") */
    timeframe: string;
    /** Array of liquidation data points sorted by price */
    data: LiquidationData[];
    /** List of exchanges included in the data */
    exchanges: string[];
    /** Data source (optional) - e.g., "WebSocket", "Historical", "CryptoQuant", "Hybrid" */
    data_source?: string;
    /** Last update timestamp in milliseconds (optional) */
    last_updated?: number;
    /** Confidence score (0-1) indicating data quality/reliability (optional) */
    confidence_score?: number;
}

/**
 * Color mapping for exchanges in the liquidation map visualization
 */
export interface ExchangeColors {
    /** Exchange name -> hex color code */
    [exchange: string]: string;
}

/**
 * Default color scheme for major exchanges
 */
export const DEFAULT_EXCHANGE_COLORS: ExchangeColors = {
    Binance: "#1E90FF",      // Blue
    Bybit: "#9370DB",        // Medium Purple
    Okex: "#FF8C00",         // Dark Orange
    Aster: "#00CED1",         // Dark Turquoise
    Hyperliquid: "#FF1493",  // Deep Pink
};

/**
 * Supported timeframes for liquidation map
 */
export type LiquidationTimeframe = "1h" | "4h" | "1d" | "1w";

/**
 * Supported symbols for liquidation map
 */
export type LiquidationSymbol = "BTC" | "ETH" | string;


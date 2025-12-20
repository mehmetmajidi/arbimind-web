"use client";

import { useState, useEffect, useCallback } from "react";
import { useExchange } from "@/contexts/ExchangeContext";
import { MdRefresh, MdArrowDownward, MdArrowUpward, MdTrendingUp, MdTrendingDown, MdLanguage, MdExpandMore } from "react-icons/md";

interface TradingPanelProps {
    selectedSymbol: string;
    onSymbolChange: (symbol: string) => void;
    currentPrice: number | null;
    priceChange24h: number | null;
    predictions: Record<string, {
        predicted_price: number;
        current_price: number;
        horizon: string;
        confidence: number;
        price_change_percent: number;
    } | null>;
    onRefreshPredictions: () => void;
    predictionsLoading: boolean;
    connectionStatus?: "disconnected" | "connecting" | "connected";
}

interface TickerData {
    high: number;
    low: number;
    bid: number;
    ask: number;
}

// Smart number formatter - removes trailing zeros and adjusts precision
function formatPrice(price: number): string {
    if (price === 0 || !isFinite(price)) return "0.00000000";
    
    // For large numbers (>= 1), remove trailing zeros
    if (price >= 1) {
        // Convert to string with 8 decimals, then remove trailing zeros
        const formatted = price.toFixed(8);
        // Remove trailing zeros after decimal point
        const cleaned = formatted.replace(/\.?0+$/, '');
        // If no decimal part remains, return as integer
        return cleaned.includes('.') ? cleaned : `${cleaned}.0`;
    }
    
    // For small numbers (< 1), show up to 8 decimals but remove trailing zeros
    // Find first significant digit
    const formatted = price.toFixed(8);
    // Remove trailing zeros
    return formatted.replace(/\.?0+$/, '') || '0';
}

interface Balance {
    exchange: string;
    balances: Record<string, { free: number; used: number; total: number }>;
}

export default function TradingPanel({
    selectedSymbol,
    onSymbolChange,
    currentPrice,
    priceChange24h,
    predictions,
    onRefreshPredictions,
    predictionsLoading,
    connectionStatus = "disconnected",
}: TradingPanelProps) {
    const { selectedAccountId, accounts } = useExchange();
    const [balance, setBalance] = useState<Balance | null>(null);
    const [balanceLoading, setBalanceLoading] = useState(false);
    const [baseCurrencies, setBaseCurrencies] = useState<string[]>([]);
    const [quoteCurrencies, setQuoteCurrencies] = useState<string[]>([]);
    const [availableSymbols, setAvailableSymbols] = useState<string[]>([]); // For Kraken: full symbols like "AAVE/USD"
    const [currenciesLoading, setCurrenciesLoading] = useState(false);
    const [tickerData, setTickerData] = useState<TickerData | null>(null);
    const [tickerLoading, setTickerLoading] = useState(false);

    const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
    const isKraken = selectedAccount?.exchange_name?.toLowerCase() === "kraken";
    const [base, quote] = selectedSymbol ? selectedSymbol.split("/") : ["", ""];

    // Get balance for base coin (free)
    const getBaseBalance = useCallback(() => {
        if (!balance || !selectedSymbol) {
            return 0;
        }
        // Try multiple variations of currency name (case-insensitive)
        const baseUpper = base.toUpperCase();
        const baseLower = base.toLowerCase();
        const currencyBalance = 
            balance.balances?.[base] || 
            balance.balances?.[baseUpper] || 
            balance.balances?.[baseLower] ||
            // Try finding by case-insensitive match
            Object.keys(balance.balances || {}).find(key => key.toUpperCase() === baseUpper) 
                ? balance.balances[Object.keys(balance.balances || {}).find(key => key.toUpperCase() === baseUpper)!]
                : null;
        return currencyBalance?.free || 0;
    }, [balance, selectedSymbol, base]);

    // Get balance in orders (used)
    const getBaseBalanceUsed = useCallback(() => {
        if (!balance || !selectedSymbol) {
            return 0;
        }
        // Try multiple variations of currency name (case-insensitive)
        const baseUpper = base.toUpperCase();
        const baseLower = base.toLowerCase();
        const currencyBalance = 
            balance.balances?.[base] || 
            balance.balances?.[baseUpper] || 
            balance.balances?.[baseLower] ||
            // Try finding by case-insensitive match
            Object.keys(balance.balances || {}).find(key => key.toUpperCase() === baseUpper) 
                ? balance.balances[Object.keys(balance.balances || {}).find(key => key.toUpperCase() === baseUpper)!]
                : null;
        return currencyBalance?.used || 0;
    }, [balance, selectedSymbol, base]);

    // Calculate total value
    const getTotalValue = useCallback(() => {
        const baseBalance = getBaseBalance();
        if (currentPrice && baseBalance > 0) {
            return baseBalance * currentPrice;
        }
        return 0;
    }, [getBaseBalance, currentPrice]);

    // Fetch balance
    const fetchBalance = useCallback(async () => {
        if (!selectedAccountId || !selectedSymbol) {
            setBalance(null);
            return;
        }

        setBalanceLoading(true);
        try {
            const token = localStorage.getItem("auth_token") || "";
            if (!token) {
                setBalanceLoading(false);
                return;
            }

            const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

            const response = await fetch(`${apiUrl}/trading/balance/${selectedAccountId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Balance data received:", data);
                console.log("Base currency:", base);
                console.log("Available currencies:", Object.keys(data.balances || {}));
                setBalance(data);
            } else {
                console.error("Failed to fetch balance:", response.status, response.statusText);
                setBalance(null);
            }
        } catch (error) {
            console.error("Error fetching balance:", error);
            setBalance(null);
        } finally {
            setBalanceLoading(false);
        }
    }, [selectedAccountId, selectedSymbol]);

    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    // Fetch currencies from database - optimized for speed
    const fetchCurrencies = useCallback(async () => {
        if (!selectedAccountId) {
            console.log("⚠️ No selectedAccountId, clearing currencies");
            setBaseCurrencies([]);
            setQuoteCurrencies([]);
            setAvailableSymbols([]);
            return;
        }

        console.log("🔄 Fetching currencies for account:", selectedAccountId);
        setCurrenciesLoading(true);
        try {
            const token = localStorage.getItem("auth_token") || "";
            if (!token) {
                setCurrenciesLoading(false);
                return;
            }

            const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
            const exchangeId = selectedAccount?.exchange_id;
            const exchangeName = selectedAccount?.exchange_name?.toLowerCase();

            // Strategy 0: For Kraken, fetch markets directly from exchange API
            if (exchangeName === "kraken") {
                try {
                    const marketsResponse = await fetch(`${apiUrl}/market/pairs/${selectedAccountId}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });

                    if (marketsResponse.ok) {
                        const marketsData = await marketsResponse.json();
                        const markets = marketsData.markets || [];
                        
                        if (markets.length > 0) {
                            // Extract full symbols (e.g., "AAVE/USD") from active markets
                            const symbols = markets
                                .filter((market: { symbol: string; base: string; quote: string; active?: boolean }) => {
                                    // Only include active markets with valid base and quote
                                    return market.active !== false && market.base && market.quote && market.symbol;
                                })
                                .map((market: { symbol: string }) => market.symbol.toUpperCase())
                                .sort();
                        
                            console.log("✅ Fetched Kraken symbols:", { symbols: symbols.length, markets: markets.length });
                            setAvailableSymbols(symbols);
                            setBaseCurrencies([]); // Clear base/quote for Kraken
                            setQuoteCurrencies([]);
                            setCurrenciesLoading(false);
                            return;
                        }
                    }
                } catch (krakenError) {
                    console.warn("Error fetching Kraken markets:", krakenError);
                }
            }

            // Strategy 0.5: For all exchanges, fetch full symbols from database via /market/symbols/by-account
            // This ensures we only get symbols for the selected exchange
            try {
                const symbolsResponse = await fetch(`${apiUrl}/market/symbols/by-account/${selectedAccountId}?active_only=true`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                
                if (symbolsResponse.ok) {
                    const symbolsData = await symbolsResponse.json();
                    const symbols = symbolsData.symbols || [];
                    
                    if (symbols.length > 0) {
                        // Extract full symbols (e.g., "BTC/USDT") from symbols
                        // Use a Set to remove duplicates, then convert back to array
                        const symbolSet = new Set<string>();
                        
                        symbols
                            .filter((symbol: { base: string; quote: string; active?: boolean }) => {
                                // Only include active symbols with valid base and quote
                                return symbol.active !== false && symbol.base && symbol.quote;
                            })
                            .forEach((symbol: { base: string; quote: string }) => {
                                const fullSymbol = `${symbol.base}/${symbol.quote}`.toUpperCase();
                                symbolSet.add(fullSymbol); // Set automatically handles duplicates
                            });
                        
                        // Convert Set to sorted array
                        const fullSymbols = Array.from(symbolSet).sort();
                        
                        console.log("✅ Fetched symbols from database for exchange:", { 
                            symbols: fullSymbols.length, 
                            exchange: exchangeName,
                            accountId: selectedAccountId,
                            rawCount: symbols.length,
                            uniqueCount: fullSymbols.length
                        });
                        
                        setAvailableSymbols(fullSymbols);
                        setBaseCurrencies([]); // Clear base/quote
                        setQuoteCurrencies([]);
                        setCurrenciesLoading(false);
                        return;
                    } else {
                        console.warn("No symbols found in database for exchange:", { exchange: exchangeName, accountId: selectedAccountId });
                    }
                } else {
                    const errorData = await symbolsResponse.json().catch(() => ({}));
                    console.warn("Failed to fetch symbols from database:", { 
                        status: symbolsResponse.status, 
                        error: errorData,
                        accountId: selectedAccountId 
                    });
                }
            } catch (symbolsError) {
                console.error("Error fetching symbols from database:", symbolsError);
            }

            // Strategy 1: If we have exchange_id, use the new endpoint to get both assets and quote currencies
            if (exchangeId) {
                try {
                    const currenciesResponse = await fetch(`${apiUrl}/exchange/exchanges/${exchangeId}/currencies`, {
                            headers: { Authorization: `Bearer ${token}` },
                    });

                    if (currenciesResponse.ok) {
                        const currenciesData = await currenciesResponse.json();
                        
                        // Extract assets (base currencies)
                        const assets = currenciesData.assets?.map((asset: { asset_code: string }) => asset.asset_code) || [];
                        
                        // Extract quote currencies
                        const quotes = currenciesData.quote_currencies?.map((qc: { currency_code: string }) => qc.currency_code) || [];
                        
                        if (assets.length > 0 || quotes.length > 0) {
                            console.log("✅ Fetched currencies:", { bases: assets.length, quotes: quotes.length });
                            setBaseCurrencies(assets.sort());
                            setQuoteCurrencies(quotes.sort());
                            setCurrenciesLoading(false);
                        return;
                    }
                }
                } catch (exchangeError) {
                    console.warn("Error fetching currencies by exchange_id:", exchangeError);
                }
            }

            // Strategy 2: Fallback - extract base/quote from currencies (only if symbols failed)
            // This is now a fallback, as we prefer full symbols

            // Strategy 3: Try currencies from database (if symbols failed)
            try {
                const [baseResponse, quoteResponse] = await Promise.all([
                    fetch(`${apiUrl}/exchange/currencies?exchange_account_id=${selectedAccountId}&currency_type=base&active_only=true`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch(`${apiUrl}/exchange/currencies?exchange_account_id=${selectedAccountId}&currency_type=quote&active_only=true`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);

                if (baseResponse.ok && quoteResponse.ok) {
                    const baseData = await baseResponse.json();
                    const quoteData = await quoteResponse.json();
                    
                    const bases = baseData.currencies?.map((c: { currency_code: string }) => c.currency_code) || [];
                    const quotes = quoteData.currencies?.map((c: { currency_code: string }) => c.currency_code) || [];
                    
                    if (bases.length > 0 && quotes.length > 0) {
                        console.log("✅ Fetched currencies from database:", { bases: bases.length, quotes: quotes.length });
                        setBaseCurrencies(bases);
                        setQuoteCurrencies(quotes);
                        setCurrenciesLoading(false);
                        return;
                    }
                }
            } catch (currencyError) {
                console.warn("Error fetching currencies:", currencyError);
            }

            // If all failed, set empty arrays
            setBaseCurrencies([]);
            setQuoteCurrencies([]);
            setAvailableSymbols([]);
        } catch (error) {
            console.error("Error fetching currencies:", error);
            setBaseCurrencies([]);
            setQuoteCurrencies([]);
            setAvailableSymbols([]);
        } finally {
            setCurrenciesLoading(false);
        }
    }, [selectedAccountId, accounts]);

    useEffect(() => {
        fetchCurrencies();
    }, [fetchCurrencies]);

    // Auto-select first symbol when currencies/symbols are loaded and no symbol is selected
    // This ensures we wait for symbols to load before selecting
    useEffect(() => {
        // Only auto-select if:
        // 1. No symbol is currently selected
        // 2. Loading is complete
        // 3. We have symbols available
        if (!selectedSymbol && !currenciesLoading && selectedAccountId) {
            if (availableSymbols.length > 0) {
                // For all exchanges: select first available symbol
                const firstSymbol = availableSymbols[0];
                if (firstSymbol) {
                    console.log("🔄 Auto-selecting first symbol after exchange change:", firstSymbol);
                    onSymbolChange(firstSymbol);
                }
            } else if (baseCurrencies.length > 0 && quoteCurrencies.length > 0) {
                // Fallback: if no symbols available, use base/quote combination
                const firstBase = baseCurrencies[0];
                const firstQuote = quoteCurrencies[0];
                if (firstBase && firstQuote) {
                    const newSymbol = `${firstBase}/${firstQuote}`;
                    console.log("🔄 Auto-selecting first symbol (fallback):", newSymbol);
                    onSymbolChange(newSymbol);
                }
            }
        }
    }, [availableSymbols, baseCurrencies, quoteCurrencies, currenciesLoading, selectedSymbol, selectedAccountId, onSymbolChange]);

    // Fetch ticker data (24h High, Low, Bid, Ask)
    const fetchTickerData = useCallback(async () => {
        if (!selectedAccountId || !selectedSymbol) {
            // Only clear data if symbol/account changed, not during refresh
            return;
        }

        // Don't set loading to true if we already have data (prevent jumping)
        const hasExistingData = tickerData !== null;
        if (!hasExistingData) {
            setTickerLoading(true);
        }

        try {
            const token = localStorage.getItem("auth_token") || "";
            if (!token) {
                if (!hasExistingData) {
                    setTickerLoading(false);
                }
                return;
            }

            const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const encodedSymbol = encodeURIComponent(selectedSymbol);

            const response = await fetch(`${apiUrl}/market/price/${selectedAccountId}/${encodedSymbol}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Ticker data received:", data);
                
                // Extract ticker data - handle both direct values and nested structure
                let high = data.high || (data.info?.high_24h) || (data.info?.high) || 0;
                let low = data.low || (data.info?.low_24h) || (data.info?.low) || 0;
                let bid = data.bid || (data.info?.bid) || (data.info?.highest_bid) || 0;
                let ask = data.ask || (data.info?.ask) || (data.info?.lowest_ask) || 0;
                
                // Also check price field as fallback for bid/ask
                const price = data.price || data.last || 0;
                if (bid === 0 && price > 0) {
                    bid = price * 0.999; // Approximate bid
                }
                if (ask === 0 && price > 0) {
                    ask = price * 1.001; // Approximate ask
                }
                
                // If high/low are 0, try to calculate from OHLCV data
                if ((high === 0 || low === 0) && selectedSymbol) {
                    try {
                        const ohlcvResponse = await fetch(`${apiUrl}/market/ohlcv/${selectedAccountId}/${encodedSymbol}?timeframe=1h&limit=24`, {
                            headers: { Authorization: `Bearer ${token}` },
                        });
                        
                        if (ohlcvResponse.ok) {
                            const ohlcvData = await ohlcvResponse.json();
                            const candles = ohlcvData.candles || [];
                            
                            if (candles.length > 0) {
                                const highs = candles.map((c: { h: number }) => c.h || 0).filter((h: number) => h > 0);
                                const lows = candles.map((c: { l: number }) => c.l || 0).filter((l: number) => l > 0);
                                
                                if (high === 0 && highs.length > 0) {
                                    high = Math.max(...highs);
                                }
                                if (low === 0 && lows.length > 0) {
                                    low = Math.min(...lows);
                                }
                            }
                        }
                    } catch (ohlcvError) {
                        console.warn("Could not fetch OHLCV for 24h stats:", ohlcvError);
                    }
                }
                
                // Set ticker data even if some values are 0 (we'll display them)
                // Use previous values if new ones are 0 (to prevent jumping)
                setTickerData((prevData) => {
                    const newData = {
                        high: Number(high) || prevData?.high || 0,
                        low: Number(low) || prevData?.low || 0,
                        bid: Number(bid) || prevData?.bid || 0,
                        ask: Number(ask) || prevData?.ask || 0,
                    };
                    return newData;
                });
            } else {
                const errorText = await response.text().catch(() => "");
                console.error("Failed to fetch ticker data:", response.status, errorText);
                // Try to get bid/ask from current price if available, but keep previous data
                if (currentPrice) {
                    setTickerData((prevData) => ({
                        high: prevData?.high || 0,
                        low: prevData?.low || 0,
                        bid: currentPrice * 0.999, // Approximate bid (slightly lower)
                        ask: currentPrice * 1.001, // Approximate ask (slightly higher)
                    }));
                }
                // Don't clear data on error, keep previous values
            }
        } catch (error) {
            console.error("Error fetching ticker data:", error);
            // Don't clear data on error, keep previous values
        } finally {
            setTickerLoading(false);
        }
    }, [selectedAccountId, selectedSymbol, currentPrice]);

    useEffect(() => {
        // Reset ticker data when symbol or account changes
        if (!selectedAccountId || !selectedSymbol) {
            setTickerData(null);
            return;
        }
        
        setTickerData(null);
        setTickerLoading(true);
        fetchTickerData();
        
        // Refresh ticker data every 5 seconds
        const interval = setInterval(() => {
            fetchTickerData();
        }, 5000);
        
        return () => clearInterval(interval);
    }, [selectedAccountId, selectedSymbol]); // Only depend on account and symbol

    // Get system suggestion based on predictions
    const getSystemSuggestion = useCallback(() => {
        if (!predictions || Object.keys(predictions).length === 0) {
            console.log("System Suggestion: No predictions available");
            return null;
        }

        console.log("System Suggestion: Predictions available:", predictions);

        // Get predictions for analysis
        const horizons = ["10m", "20m", "30m", "1h", "4h", "24h"];
        let bestPrediction = null; // For suggestion (shortest horizon)
        let worstPrediction = null; // For loss calculation (lowest price)
        
        // Find best prediction (shortest horizon) for suggestion
        for (const horizon of horizons) {
            if (predictions[horizon]) {
                bestPrediction = predictions[horizon];
                console.log("System Suggestion: Using prediction for horizon", horizon, bestPrediction);
                break;
            }
        }

        // Find worst prediction (lowest predicted price) for loss calculation
        let lowestPrice = Infinity;
        let hasNegativePrediction = false;
        for (const horizon of horizons) {
            if (predictions[horizon]) {
                const pred = predictions[horizon];
                if (pred.predicted_price < lowestPrice) {
                    lowestPrice = pred.predicted_price;
                    worstPrediction = pred;
                }
                // Check if any prediction shows price going down
                if (pred.price_change_percent < 0) {
                    hasNegativePrediction = true;
                }
            }
        }

        if (!bestPrediction) {
            console.log("System Suggestion: No valid prediction found");
            return null;
        }

        // price_change_percent is already a percentage (e.g., 5.0 for 5%)
        // confidence is 0-1 (e.g., 0.85 for 85%)
        const priceChangePercent = bestPrediction.price_change_percent;
        const confidence = bestPrediction.confidence;
        const confidencePercent = confidence * 100; // Convert to percentage
        const predictionError = 100 - confidencePercent;
        const predictedPrice = bestPrediction.predicted_price; // Best predicted price for display
        const worstPredictedPrice = worstPrediction ? worstPrediction.predicted_price : predictedPrice; // Worst predicted price for loss calculation

        // Get user's balance
        const baseBalance = getBaseBalance();
        const hasBalance = baseBalance > 0;

        // Determine suggestion based on:
        // - If price goes up and user has balance → Sell (take profit)
        // - If price goes up and user has no balance → Buy (enter position)
        // - If price goes down and user has balance → Sell (cut losses)
        // - If price goes down and user has no balance → Don't buy (wait/hold)
        let suggestion: "Buy" | "Sell";
        if (priceChangePercent > 0) {
            // Price is going up (profit opportunity)
            suggestion = hasBalance ? "Sell" : "Buy";
        } else {
            // Price is going down
            suggestion = hasBalance ? "Sell" : "Buy"; // If has balance, sell to cut losses; if not, wait (but show Buy as default for UI)
        }

        // Calculate profit based on current position and predicted price
        // If user has balance and suggestion is Sell: profit = (predictedPrice - currentPrice) * totalBalance
        // If user has no balance and suggestion is Buy: profit = (predictedPrice - currentPrice) * hypotheticalBalance
        const freeBalance = getBaseBalance();
        const usedBalance = getBaseBalanceUsed();
        const totalBalance = freeBalance + usedBalance; // Free + In Order
        let profitAmount = 0;
        
        console.log("Profit calculation:", {
            currentPrice,
            predictedPrice,
            freeBalance,
            usedBalance,
            totalBalance,
            suggestion,
            priceChangePercent
        });
        
        let isLoss = false;
        if (currentPrice && currentPrice > 0) {
            if (suggestion === "Sell" && totalBalance > 0) {
                // For Sell suggestion:
                // - If any prediction shows price going down (hasNegativePrediction): show loss if doesn't sell
                // - Use worst predicted price (lowest) for loss calculation
                if (hasNegativePrediction && worstPredictedPrice < currentPrice) {
                    // Price will go down - loss if doesn't sell (use worst prediction for maximum loss)
                    profitAmount = (currentPrice - worstPredictedPrice) * totalBalance;
                    isLoss = true;
                    console.log("Sell loss (if doesn't sell):", profitAmount, "= (", currentPrice, "-", worstPredictedPrice, ") *", totalBalance, "worstPrediction:", worstPrediction, "hasNegativePrediction:", hasNegativePrediction);
                } else if (priceChangePercent > 0 && predictedPrice > currentPrice) {
                    // Price will go up - profit if sells now
                    profitAmount = (predictedPrice - currentPrice) * totalBalance;
                    isLoss = false;
                    console.log("Sell profit:", profitAmount, "= (", predictedPrice, "-", currentPrice, ") *", totalBalance);
                } else {
                    // No significant change or worst price is still higher
                    profitAmount = 0;
                    isLoss = false;
                }
            } else if (suggestion === "Buy" && totalBalance > 0) {
                // If buying with existing balance: profit = (predictedPrice - currentPrice) * totalBalance
                profitAmount = (predictedPrice - currentPrice) * totalBalance;
                isLoss = profitAmount < 0;
                console.log("Buy profit (with balance):", profitAmount);
            } else if (suggestion === "Buy" && totalBalance === 0) {
                // If buying with no balance: calculate hypothetical profit based on a reasonable amount
                // Use currentPrice * 1000 as hypothetical investment
                const hypotheticalBalance = 1000 / currentPrice;
                profitAmount = (predictedPrice - currentPrice) * hypotheticalBalance;
                isLoss = profitAmount < 0;
                console.log("Buy profit (hypothetical):", profitAmount);
            }
        } else {
            console.log("Profit calculation skipped - missing data:", { currentPrice, predictedPrice, totalBalance });
        }

        return {
            suggestion,
            predictionError: predictionError.toFixed(2),
            profit: profitAmount,
            isLoss, // Indicates if this is a loss (negative value)
            priceChange: priceChangePercent.toFixed(2),
            predictedPrice, // Best predicted price
        };
    }, [predictions, getBaseBalance, getBaseBalanceUsed, currentPrice]);

    const suggestion = getSystemSuggestion();

    return (
        <div
            style={{
                width: "380px",
                minWidth: "380px",
                height: "100%",
                backgroundColor: "#1a1a1a",
                borderRadius: "6px",
                border: "1px solid rgba(255, 174, 0, 0.2)",
                display: "flex",
                flexDirection: "column",
                padding: "20px",
                gap: "20px",
                overflowY: "hidden",
            }}
        >
            {/* Asset Selection and Current Price */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Symbol Selector - Single dropdown for all exchanges */}
                {availableSymbols.length > 0 ? (
                    <select
                        value={selectedSymbol || ""}
                        onChange={(e) => {
                            onSymbolChange(e.target.value);
                        }}
                        disabled={currenciesLoading || availableSymbols.length === 0}
                        style={{
                            width: "100%",
                            padding: "8px 12px",
                            backgroundColor: "#2a2a2a",
                            border: "1px solid rgba(255, 174, 0, 0.2)",
                            borderRadius: "6px",
                            color: "#ffffff",
                            fontSize: "14px",
                            fontWeight: "500",
                            outline: "none",
                            cursor: currenciesLoading || availableSymbols.length === 0 ? "not-allowed" : "pointer",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#FFAE00")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255, 174, 0, 0.2)")}
                    >
                        {currenciesLoading ? (
                            <option value="">Loading...</option>
                        ) : availableSymbols.length === 0 ? (
                            <option value="">No symbols available</option>
                        ) : (
                            <>
                                {!availableSymbols.includes(selectedSymbol) && selectedSymbol && (
                                    <option value={selectedSymbol} style={{ backgroundColor: "#1a1a1a", color: "#ffffff" }}>
                                        {selectedSymbol}
                                    </option>
                                )}
                                {availableSymbols.map((symbol) => (
                                    <option key={symbol} value={symbol} style={{ backgroundColor: "#1a1a1a", color: "#ffffff" }}>
                                        {symbol}
                                    </option>
                                ))}
                            </>
                        )}
                    </select>
                ) : (
                    // Fallback: Show two dropdowns only if symbols are not available
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <select
                        value={base || ""}
                        onChange={(e) => {
                            const newBase = e.target.value;
                            if (newBase && quote) {
                                onSymbolChange(`${newBase}/${quote}`);
                            }
                        }}
                        disabled={currenciesLoading || baseCurrencies.length === 0}
                        style={{
                            flex: 1,
                            padding: "8px 12px",
                            backgroundColor: "#2a2a2a",
                            border: "1px solid rgba(255, 174, 0, 0.2)",
                            borderRadius: "6px",
                            color: "#ffffff",
                            fontSize: "14px",
                            fontWeight: "500",
                            outline: "none",
                            cursor: currenciesLoading || baseCurrencies.length === 0 ? "not-allowed" : "pointer",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#FFAE00")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255, 174, 0, 0.2)")}
                    >
                        {currenciesLoading ? (
                            <option value="">Loading...</option>
                        ) : baseCurrencies.length === 0 ? (
                            <option value="">No currencies</option>
                        ) : (
                            <>
                                {!baseCurrencies.includes(base) && base && (
                                    <option value={base} style={{ backgroundColor: "#1a1a1a", color: "#ffffff" }}>
                                        {base}
                                    </option>
                                )}
                                {baseCurrencies.map((currency) => (
                                    <option key={currency} value={currency} style={{ backgroundColor: "#1a1a1a", color: "#ffffff" }}>
                                        {currency}
                                    </option>
                                ))}
                            </>
                        )}
                    </select>
                    <div style={{ color: "#888888", fontSize: "18px" }}>/</div>
                    <select
                        value={quote || ""}
                        onChange={(e) => {
                            const newQuote = e.target.value;
                            if (base && newQuote) {
                                onSymbolChange(`${base}/${newQuote}`);
                            }
                        }}
                        disabled={currenciesLoading || quoteCurrencies.length === 0}
                        style={{
                            flex: 1,
                            padding: "8px 12px",
                            backgroundColor: "#2a2a2a",
                            border: "1px solid rgba(255, 174, 0, 0.2)",
                            borderRadius: "6px",
                            color: "#ffffff",
                            fontSize: "14px",
                            fontWeight: "500",
                            outline: "none",
                            cursor: currenciesLoading || quoteCurrencies.length === 0 ? "not-allowed" : "pointer",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#FFAE00")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255, 174, 0, 0.2)")}
                    >
                        {currenciesLoading ? (
                            <option value="">Loading...</option>
                        ) : quoteCurrencies.length === 0 ? (
                            <option value="">No currencies</option>
                        ) : (
                            <>
                                {!quoteCurrencies.includes(quote) && quote && (
                                    <option value={quote} style={{ backgroundColor: "#1a1a1a", color: "#ffffff" }}>
                                        {quote}
                                    </option>
                                )}
                                {quoteCurrencies.map((currency) => (
                                    <option key={currency} value={currency} style={{ backgroundColor: "#1a1a1a", color: "#ffffff" }}>
                                        {currency}
                                    </option>
                                ))}
                            </>
                        )}
                    </select>
                </div>
                )}

                {/* Current Price Display */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    {/* Left side: Price and change */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ color: "#ffffff", fontSize: "24px", fontWeight: "bold" }}>
                            $ {currentPrice ? formatPrice(currentPrice) : "0.00000000"}
                        </span>
                        {priceChange24h !== null && (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <span
                                    style={{
                                        color: priceChange24h >= 0 ? "#22c55e" : "#ef4444",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                    }}
                                >
                                    {priceChange24h >= 0 ? "+" : ""}
                                    {priceChange24h.toFixed(2)}%
                                </span>
                                <span style={{ color: "#888888", fontSize: "12px" }}>24H</span>
                            </div>
                        )}
                    </div>
                    
                    {/* Right side: Real-time and Connected */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                        <span style={{ color: "#FFAE00", fontSize: "11px" }}>Real-time</span>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                color: connectionStatus === "connected" ? "#22c55e" : connectionStatus === "connecting" ? "#FFAE00" : "#ef4444",
                                fontSize: "11px",
                            }}
                        >
                            <div
                                style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    backgroundColor: connectionStatus === "connected" ? "#22c55e" : connectionStatus === "connecting" ? "#FFAE00" : "#ef4444",
                                    animation: connectionStatus === "connecting" ? "pulse 2s infinite" : "none",
                                }}
                            />
                            {connectionStatus === "connected" ? "Connected" : connectionStatus === "connecting" ? "Connecting..." : "Disconnected"}
                        </div>
                    </div>
                </div>

                {/* 24h High, Low, Bid, Ask */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr 1fr",
                        gap: "16px",
                        marginTop: "12px",
                    }}
                >
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ color: "#888888", fontSize: "10px", fontWeight: "500" }}>
                            24h High
                        </div>
                        <div style={{ color: "#ffffff", fontSize: "13px", fontWeight: "600" }}>
                            {tickerData ? `$ ${formatPrice(tickerData.high)}` : "..."}
                        </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ color: "#888888", fontSize: "10px", fontWeight: "500" }}>
                            24h Low
                        </div>
                        <div style={{ color: "#ffffff", fontSize: "13px", fontWeight: "600" }}>
                            {tickerData ? `$ ${formatPrice(tickerData.low)}` : "..."}
                        </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ color: "#888888", fontSize: "10px", fontWeight: "500" }}>
                            Bid
                        </div>
                        <div style={{ color: "#ffffff", fontSize: "13px", fontWeight: "600" }}>
                            {tickerData ? `$ ${formatPrice(tickerData.bid)}` : "..."}
                        </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ color: "#888888", fontSize: "10px", fontWeight: "500" }}>
                            Ask
                        </div>
                        <div style={{ color: "#ffffff", fontSize: "13px", fontWeight: "600" }}>
                            {tickerData ? `$ ${formatPrice(tickerData.ask)}` : "..."}
                        </div>
                    </div>
                </div>
            </div>

            {/* Balance Display Section */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ color: "#FFAE00", fontSize: "11px" }}>
                        Exist Coins
                    </label>
                    <div
                        style={{
                            color: "#ffffff",
                            fontSize: "13px",
                            fontWeight: "500",
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                        }}
                    >
                        {balanceLoading ? (
                            <span style={{ color: "#888888" }}>Loading...</span>
                        ) : (
                            <>
                                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <span style={{ color: "#22c55e" }}>Free:</span>
                                    <span>{getBaseBalance().toFixed(1)}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <span style={{ color: "#ef4444" }}>In Order:</span>
                                    <span>{getBaseBalanceUsed().toFixed(1)}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ color: "#FFAE00", fontSize: "11px" }}>
                        Price
                    </label>
                    <div
                        style={{
                            color: "#22c55e",
                            fontSize: "13px",
                            fontWeight: "500",
                        }}
                    >
                        {currentPrice ? (
                            <span>$ {formatPrice(currentPrice)}</span>
                        ) : (
                            <span style={{ color: "#888888" }}>$ 0.00000000</span>
                        )}
                    </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ color: "#FFAE00", fontSize: "11px" }}>
                        Total
                    </label>
                    <div
                        style={{
                            color: "#ffffff",
                            fontSize: "13px",
                            fontWeight: "500",
                        }}
                    >
                        <span>{getTotalValue().toFixed(1)}</span>
                    </div>
                </div>
            </div>

            {/* System Suggestion Section */}
            {suggestion && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ color: "#FFAE00", fontSize: "14px", fontWeight: "600" }}>
                        System Suggestion
                    </div>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "12px",
                            padding: "12px",
                            backgroundColor: "#2a2a2a",
                            borderRadius: "8px",
                            border: "1px solid rgba(255, 174, 0, 0.2)",
                        }}
                    >
                        <div>
                            <div style={{ color: "#888888", fontSize: "10px", marginBottom: "4px" }}>
                                Suggestion
                            </div>
                            <div style={{ color: "#22c55e", fontSize: "14px", fontWeight: "600" }}>
                                {suggestion.suggestion}
                            </div>
                        </div>
                        <div>
                            <div style={{ color: "#888888", fontSize: "10px", marginBottom: "4px" }}>
                                Prediction Error
                            </div>
                            <div style={{ color: "#ffffff", fontSize: "14px", fontWeight: "600" }}>
                                {suggestion.predictionError}%
                            </div>
                        </div>
                        <div>
                            <div style={{ color: "#888888", fontSize: "10px", marginBottom: "4px" }}>
                                {suggestion.isLoss && suggestion.suggestion === "Sell" 
                                    ? "Potential Loss (if doesn't sell)" 
                                    : "Your Profit"}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <span style={{ color: suggestion.isLoss ? "#ef4444" : "#22c55e", fontSize: "14px", fontWeight: "600" }}>
                                    {suggestion.isLoss ? "-" : ""}${Math.abs(suggestion.profit).toFixed(2)}
                                </span>
                                {suggestion.isLoss ? (
                                    <MdArrowDownward size={14} color="#ef4444" />
                                ) : (
                                    <MdArrowUpward size={14} color="#22c55e" />
                                )}
                            </div>
                        </div>
                        <div>
                            <div style={{ color: "#888888", fontSize: "10px", marginBottom: "4px" }}>
                                Best Predicted Price
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <span style={{ color: parseFloat(suggestion.priceChange) >= 0 ? "#22c55e" : "#ef4444", fontSize: "14px", fontWeight: "600" }}>
                                    ${suggestion.predictedPrice ? formatPrice(suggestion.predictedPrice) : "0.00000000"}
                                </span>
                                {parseFloat(suggestion.priceChange) >= 0 ? (
                                    <MdTrendingUp size={14} color="#22c55e" />
                                ) : (
                                    <MdTrendingDown size={14} color="#ef4444" />
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        style={{
                            width: "100%",
                            padding: "12px",
                            backgroundColor: suggestion.suggestion === "Buy" ? "#22c55e" : "#ef4444",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "16px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = suggestion.suggestion === "Buy" ? "#16a34a" : "#dc2626";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = suggestion.suggestion === "Buy" ? "#22c55e" : "#ef4444";
                        }}
                    >
                        {suggestion.suggestion.toUpperCase()}
                    </button>
                </div>
            )}

        </div>
    );
}

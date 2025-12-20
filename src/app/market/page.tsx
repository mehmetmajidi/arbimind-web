"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PriceWidget, MainChart, OrderPanel, TradingPanel, PricePredictionsPanel, ActiveOrders, ArbitragePanel } from "@/components/market";
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Area } from "recharts";
import { useExchange } from "@/contexts/ExchangeContext";

// Add pulse animation style
if (typeof document !== "undefined") {
    const style = document.createElement("style");
    style.textContent = `
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    `;
    if (!document.head.querySelector('style[data-pulse-animation]')) {
        style.setAttribute('data-pulse-animation', 'true');
        document.head.appendChild(style);
    }
}

interface OHLCVCandle {
    t: number; // timestamp
    o: number; // open
    h: number; // high
    l: number; // low
    c: number; // close
    v: number; // volume
}

interface PredictionData {
    predicted_price: number;
    current_price: number;
    horizon: string;
    confidence: number;
    uncertainty: number;
    price_change_percent: number;
    upper_bound: number;
    lower_bound: number;
}

export default function MarketPage() {
    const { selectedAccountId, accounts } = useExchange();
    
    // Load from localStorage on mount
    const [selectedSymbol, setSelectedSymbol] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("market_selectedSymbol") || "";
        }
        return "";
    });
    const [timeframe, setTimeframe] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("market_timeframe") || "1h";
        }
        return "1h";
    });
    const [selectedHorizons, setSelectedHorizons] = useState<string[]>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("market_selectedHorizons");
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch {
                    return ["10m", "30m", "1h"];
                }
            }
        }
        return ["10m", "30m", "1h"];
    });
    
    const [ohlcvData, setOhlcvData] = useState<OHLCVCandle[]>([]);
    const [ohlcvLoading, setOhlcvLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [currentPriceTime, setCurrentPriceTime] = useState<number | null>(null);
    const [priceChange24h, setPriceChange24h] = useState<number | null>(null);
    const [oldestTimestamp, setOldestTimestamp] = useState<number | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");

    // Prediction state
    const [predictions, setPredictions] = useState<Record<string, PredictionData | null>>({});
    const [predictionsLoading, setPredictionsLoading] = useState(false);
    const [showPredictions, setShowPredictions] = useState(true);
    const isCheckingRef = useRef(false);
    const [accuracyStats, setAccuracyStats] = useState<{
        total_predictions: number;
        avg_error_percent: number;
        accuracy_within_confidence: number;
        avg_confidence: number;
    } | null>(null);
    const [showAccuracyHistory, setShowAccuracyHistory] = useState(false);
    
    // Reset symbol and clear data when exchange account changes
    useEffect(() => {
        if (selectedAccountId) {
            // Clear symbol when exchange changes - wait for new symbols to load
            setSelectedSymbol("");
            setOhlcvData([]);
            setCurrentPrice(null);
            setCurrentPriceTime(null);
            setPriceChange24h(null);
            setPredictions({});
            if (typeof window !== "undefined") {
                localStorage.removeItem("market_selectedSymbol");
            }
        }
    }, [selectedAccountId]);
    
    // Save to localStorage when values change
    useEffect(() => {
        if (typeof window !== "undefined") {
            if (selectedSymbol) {
                localStorage.setItem("market_selectedSymbol", selectedSymbol);
            }
        }
    }, [selectedSymbol]);
    
    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("market_timeframe", timeframe);
        }
    }, [timeframe]);
    
    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("market_selectedHorizons", JSON.stringify(selectedHorizons));
        }
    }, [selectedHorizons]);

    // Fetch OHLCV data
    const fetchOHLCV = useCallback(async () => {
        if (!selectedAccountId || !selectedSymbol) return;

        setOhlcvLoading(true);
        try {
            const token = localStorage.getItem("auth_token") || "";
            if (!token) {
                setError("Please login to view market data");
                setOhlcvLoading(false);
                return;
            }

            const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const encodedSymbol = encodeURIComponent(selectedSymbol);

            // Load 500 candles total - make multiple requests if needed
            // Coinbase max is 300 per request, so we need multiple requests
            const targetCandles = 500;
            const maxPerRequest = 300;
            const allCandles: Array<{t: number; o: number; h: number; l: number; c: number; v: number}> = [];
            
            // Calculate timeframe duration in milliseconds
            const timeframeMs: Record<string, number> = {
                "1m": 60 * 1000,
                "5m": 5 * 60 * 1000,
                "15m": 15 * 60 * 1000,
                "1h": 60 * 60 * 1000,
                "4h": 4 * 60 * 60 * 1000,
                "1d": 24 * 60 * 60 * 1000,
            };
            const timeframeDuration = timeframeMs[timeframe] || 60 * 60 * 1000;
            
            // First request: get most recent candles
            let currentSince: number | null = null;
            let fetchedCount = 0;
            let attempts = 0;
            const maxAttempts = 5; // Prevent infinite loops
            
            while (fetchedCount < targetCandles && attempts < maxAttempts) {
                attempts++;
                const remaining = targetCandles - fetchedCount;
                const requestLimit = Math.min(remaining, maxPerRequest);
                
                const url: string = currentSince 
                    ? `${apiUrl}/market/ohlcv-from-exchange/${selectedAccountId}/${encodedSymbol}?timeframe=${timeframe}&limit=${requestLimit}&since=${currentSince}`
                    : `${apiUrl}/market/ohlcv-from-exchange/${selectedAccountId}/${encodedSymbol}?timeframe=${timeframe}&limit=${requestLimit}`;
                
                console.log(`Fetching batch ${attempts}: limit=${requestLimit}, since=${currentSince || 'null'}`);
                
                const response: Response = await fetch(url, {
                    headers: { Authorization: `Bearer ${token}` },
                    cache: "no-cache",
                });
                
                if (!response.ok) {
                    console.error(`Failed to fetch batch ${attempts}:`, response.status);
                    break;
                }
                
                const data: {candles?: Array<{t: number; o: number; h: number; l: number; c: number; v: number}>} = await response.json();
                const candles: Array<{t: number; o: number; h: number; l: number; c: number; v: number}> = data.candles || [];
                console.log(`Batch ${attempts} received:`, {
                    count: candles.length,
                    firstCandle: candles[0],
                    lastCandle: candles[candles.length - 1],
                });
                
                if (candles.length === 0) {
                    console.log("No more candles available");
                    break;
                }
                
                // Sort candles by timestamp
                const sortedCandles: Array<{t: number; o: number; h: number; l: number; c: number; v: number}> = [...candles].sort((a, b) => {
                    const timeA = a.t > 1000000000000 ? a.t / 1000 : a.t;
                    const timeB = b.t > 1000000000000 ? b.t / 1000 : b.t;
                    return timeA - timeB;
                });
                
                // Add to all candles (avoid duplicates)
                for (const candle of sortedCandles) {
                    const candleTime = candle.t > 1000000000000 ? candle.t / 1000 : candle.t;
                    const exists = allCandles.some(c => {
                        const cTime = c.t > 1000000000000 ? c.t / 1000 : c.t;
                        return cTime === candleTime;
                    });
                    if (!exists) {
                        allCandles.push(candle);
                    }
                }
                
                fetchedCount = allCandles.length;
                
                // If we got fewer candles than requested, we've reached the limit
                if (candles.length < requestLimit) {
                    console.log(`Received ${candles.length} candles (less than requested ${requestLimit}), stopping`);
                    break;
                }
                
                // Prepare for next request: go back from the oldest candle
                if (sortedCandles.length > 0) {
                    const oldest: number = sortedCandles[0].t;
                    const oldestTime: number = oldest > 1000000000000 ? oldest / 1000 : oldest;
                    const oldestTimestampMs: number = oldestTime * 1000;
                    currentSince = oldestTimestampMs - (requestLimit * timeframeDuration);
                } else {
                    break;
                }
            }
            
            // Final sort and deduplicate
            const finalCandles = allCandles.sort((a, b) => {
                const timeA = a.t > 1000000000000 ? a.t / 1000 : a.t;
                const timeB = b.t > 1000000000000 ? b.t / 1000 : b.t;
                return timeA - timeB;
            });
            
            // Remove duplicates
            const uniqueCandles = finalCandles.filter((candle, index, self) => {
                const time = candle.t > 1000000000000 ? candle.t / 1000 : candle.t;
                return index === self.findIndex((c) => {
                    const cTime = c.t > 1000000000000 ? c.t / 1000 : c.t;
                    return cTime === time;
                });
            });
            
            console.log("Total candles loaded:", {
                total: uniqueCandles.length,
                attempts: attempts,
            });
            
            setOhlcvData(uniqueCandles);
            
            // Store oldest timestamp for pagination
            if (uniqueCandles.length > 0) {
                const oldest = uniqueCandles[0].t;
                const oldestTime = oldest > 1000000000000 ? oldest / 1000 : oldest;
                setOldestTimestamp(oldestTime);
                console.log("Oldest timestamp set to:", oldestTime);
            }
            
            setError(null);
            
            // If we got no candles at all, show error
            if (uniqueCandles.length === 0) {
                setError(`No OHLCV data available for ${selectedSymbol}. The symbol may not be supported by this exchange.`);
            }
        } catch (error) {
            console.error("Error fetching OHLCV:", error);
            setError(`Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setOhlcvLoading(false);
        }
    }, [selectedAccountId, selectedSymbol, timeframe]);

    // Calculate 24h price change when ohlcvData or currentPrice changes
    useEffect(() => {
        if (ohlcvData.length > 0 && currentPrice) {
            const now = Date.now() / 1000;
            const twentyFourHoursAgo = now - (24 * 60 * 60);
            
            // Find the candle closest to 24 hours ago
            let closestCandle = ohlcvData[0];
            for (const candle of ohlcvData) {
                const candleTime = candle.t > 1000000000000 ? candle.t / 1000 : candle.t;
                if (candleTime <= twentyFourHoursAgo) {
                    closestCandle = candle;
                } else {
                    break;
                }
            }
            
            const price24hAgo = closestCandle.c;
            if (price24hAgo > 0) {
                const change = ((currentPrice - price24hAgo) / price24hAgo) * 100;
                setPriceChange24h(change);
            }
        }
    }, [ohlcvData, currentPrice]);

    // Fetch live price from exchange API
    const fetchLivePrice = useCallback(async () => {
        if (!selectedAccountId || !selectedSymbol) {
            setCurrentPrice(null);
            return;
        }

        try {
            const token = localStorage.getItem("auth_token") || "";
            if (!token) {
                return;
            }

            const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const encodedSymbol = encodeURIComponent(selectedSymbol);

            const response = await fetch(`${apiUrl}/market/price/${selectedAccountId}/${encodedSymbol}`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-cache",
            });

            if (response.ok) {
                const data = await response.json();
                // Try multiple fields for price
                const price = data.price || data.last || data.close || 0;
                
                if (price > 0) {
                    setCurrentPrice(price);
                    setCurrentPriceTime(Date.now());
                } else {
                    console.warn("Price is 0 or invalid:", data);
                    // Log full response for debugging
                    console.warn("Full price response:", JSON.stringify(data, null, 2));
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error("Failed to fetch live price:", response.status, errorData);
            }
        } catch (error) {
            console.error("Error fetching live price:", error);
        }
    }, [selectedAccountId, selectedSymbol]);

    // Fetch live price on mount and when symbol changes (NOT when account changes - wait for symbol)
    useEffect(() => {
        if (!selectedAccountId || !selectedSymbol) {
            // Clear current price if no account or symbol
            setCurrentPrice(null);
            setCurrentPriceTime(null);
            return;
        }
        
        // Clear current price when symbol changes
        setCurrentPrice(null);
        setCurrentPriceTime(null);
        
        // Fetch immediately
        fetchLivePrice();
        
        // Set up interval to fetch live price every 10 seconds (reduced frequency to save resources)
        const interval = setInterval(fetchLivePrice, 10000);
        
        return () => clearInterval(interval);
    }, [selectedAccountId, selectedSymbol, fetchLivePrice]);

    // Create new candle exactly when timer reaches 00:00
    useEffect(() => {
        if (!ohlcvData.length || !timeframe) return;
        
        // Calculate timeframe duration in seconds
        const timeframeSeconds: Record<string, number> = {
            "1m": 60,
            "5m": 300,
            "15m": 900,
            "1h": 3600,
            "4h": 14400,
            "1d": 86400,
        };
        const timeframeDuration = timeframeSeconds[timeframe] || 3600;
        
        // Get last candle
        const sortedData = [...ohlcvData].sort((a, b) => {
            const timeA = a.t > 1000000000000 ? a.t / 1000 : a.t;
            const timeB = b.t > 1000000000000 ? b.t / 1000 : b.t;
            return timeA - timeB;
        });
        const lastCandle = sortedData[sortedData.length - 1];
        const lastCandleTime = lastCandle.t > 1000000000000 ? lastCandle.t / 1000 : lastCandle.t;
        const lastCandleStartTime = Math.floor(lastCandleTime / timeframeDuration) * timeframeDuration;
        const lastCandleEndTime = lastCandleStartTime + timeframeDuration;
        
        // Calculate time until candle closes
        const now = Math.floor(Date.now() / 1000);
        const timeUntilClose = lastCandleEndTime - now;
        
        if (timeUntilClose <= 0) {
            // Candle should have already closed - create new one immediately if we have current price
            if (currentPrice) {
                const currentCandleStartTime = Math.floor(now / timeframeDuration) * timeframeDuration;
                if (currentCandleStartTime > lastCandleStartTime) {
                    // Create new candle immediately
                    setOhlcvData((prevData) => {
                        const sorted = [...prevData].sort((a, b) => {
                            const timeA = a.t > 1000000000000 ? a.t / 1000 : a.t;
                            const timeB = b.t > 1000000000000 ? b.t / 1000 : b.t;
                            return timeA - timeB;
                        });
                        const last = sorted[sorted.length - 1];
                        const newCandleTimestamp = currentCandleStartTime * 1000;
                        
                        // Check if candle already exists
                        const exists = sorted.some(c => {
                            const cTime = c.t > 1000000000000 ? c.t / 1000 : c.t;
                            const cStart = Math.floor(cTime / timeframeDuration) * timeframeDuration;
                            return cStart === currentCandleStartTime;
                        });
                        
                        if (!exists) {
                            const newCandle: OHLCVCandle = {
                                t: newCandleTimestamp,
                                o: last.c,
                                h: currentPrice,
                                l: currentPrice,
                                c: currentPrice,
                                v: 0,
                            };
                            return [...sorted, newCandle].sort((a, b) => {
                                const timeA = a.t > 1000000000000 ? a.t / 1000 : a.t;
                                const timeB = b.t > 1000000000000 ? b.t / 1000 : b.t;
                                return timeA - timeB;
                            });
                        }
                        return prevData;
                    });
                }
            }
            return;
        }
        
        // Set timeout to create new candle exactly when timer reaches 00:00
        const timeout = setTimeout(() => {
            if (currentPrice) {
                const nowAtClose = Math.floor(Date.now() / 1000);
                const currentCandleStartTime = Math.floor(nowAtClose / timeframeDuration) * timeframeDuration;
                
                setOhlcvData((prevData) => {
                    const sorted = [...prevData].sort((a, b) => {
                        const timeA = a.t > 1000000000000 ? a.t / 1000 : a.t;
                        const timeB = b.t > 1000000000000 ? b.t / 1000 : b.t;
                        return timeA - timeB;
                    });
                    const last = sorted[sorted.length - 1];
                    const lastTime = last.t > 1000000000000 ? last.t / 1000 : last.t;
                    const lastStart = Math.floor(lastTime / timeframeDuration) * timeframeDuration;
                    
                    if (currentCandleStartTime > lastStart) {
                        const newCandleTimestamp = currentCandleStartTime * 1000;
                        
                        // Check if candle already exists
                        const exists = sorted.some(c => {
                            const cTime = c.t > 1000000000000 ? c.t / 1000 : c.t;
                            const cStart = Math.floor(cTime / timeframeDuration) * timeframeDuration;
                            return cStart === currentCandleStartTime;
                        });
                        
                        if (!exists) {
                            const newCandle: OHLCVCandle = {
                                t: newCandleTimestamp,
                                o: last.c,
                                h: currentPrice,
                                l: currentPrice,
                                c: currentPrice,
                                v: 0,
                            };
                            console.log("⏰ Timer reached 00:00, creating new candle:", {
                                timestamp: new Date(newCandleTimestamp).toISOString(),
                                price: currentPrice,
                            });
                            return [...sorted, newCandle].sort((a, b) => {
                                const timeA = a.t > 1000000000000 ? a.t / 1000 : a.t;
                                const timeB = b.t > 1000000000000 ? b.t / 1000 : b.t;
                                return timeA - timeB;
                            });
                        }
                    }
                    return prevData;
                });
            }
        }, timeUntilClose * 1000);
        
        return () => clearTimeout(timeout);
    }, [ohlcvData, timeframe, currentPrice]);
    
    // Update last candle with current price (real-time update)
    // Use throttling to prevent excessive updates
    useEffect(() => {
        if (!currentPrice || !currentPriceTime) return;
        
        // Throttle updates to max once per second
        const updateTimeout = setTimeout(() => {
            setOhlcvData((prevData) => {
            if (prevData.length === 0) return prevData;
            
            const now = currentPriceTime > 1000000000000 ? currentPriceTime / 1000 : currentPriceTime;
            
            // Calculate timeframe duration in seconds
            const timeframeSeconds: Record<string, number> = {
                "1m": 60,
                "5m": 300,
                "15m": 900,
                "1h": 3600,
                "4h": 14400,
                "1d": 86400,
            };
            const timeframeDuration = timeframeSeconds[timeframe] || 3600;
            
            // Calculate the start time of the candle that should contain now
            const currentCandleStartTime = Math.floor(now / timeframeDuration) * timeframeDuration;
            const currentCandleEndTime = currentCandleStartTime + timeframeDuration;
            
            // Sort data to ensure last candle is actually the latest
            const sortedData = [...prevData].sort((a, b) => {
                const timeA = a.t > 1000000000000 ? a.t / 1000 : a.t;
                const timeB = b.t > 1000000000000 ? b.t / 1000 : b.t;
                return timeA - timeB;
            });
            
            const lastCandle = sortedData[sortedData.length - 1];
            const lastCandleTime = lastCandle.t > 1000000000000 ? lastCandle.t / 1000 : lastCandle.t;
            const lastCandleStartTime = Math.floor(lastCandleTime / timeframeDuration) * timeframeDuration;
            
            console.log("🕯️ Candle update check:", {
                now: new Date(now * 1000).toISOString(),
                lastCandleTime: new Date(lastCandleTime * 1000).toISOString(),
                lastCandleStartTime: new Date(lastCandleStartTime * 1000).toISOString(),
                currentCandleStartTime: new Date(currentCandleStartTime * 1000).toISOString(),
                timeframe,
                timeframeDuration,
                isNewTimeframe: currentCandleStartTime > lastCandleStartTime,
            });
            
            const updated = [...sortedData];
            
            // Check if we need to create a new candle for the current timeframe
            if (currentCandleStartTime > lastCandleStartTime) {
                console.log("🆕 Creating new candle for timeframe:", new Date(currentCandleStartTime * 1000).toISOString());
                // New timeframe started - create new candle with current price
                const newCandleTimestamp = currentCandleStartTime * 1000; // Convert to milliseconds
                
                // Check if candle for this timeframe already exists
                const existingIndex = updated.findIndex(c => {
                    const cTime = c.t > 1000000000000 ? c.t / 1000 : c.t;
                    const cStartTime = Math.floor(cTime / timeframeDuration) * timeframeDuration;
                    return cStartTime === currentCandleStartTime;
                });
                
                if (existingIndex >= 0) {
                    // Update existing candle for current timeframe
                    const existingCandle = updated[existingIndex];
                    updated[existingIndex] = {
                        ...existingCandle,
                        c: currentPrice,
                        h: Math.max(existingCandle.h, currentPrice),
                        l: Math.min(existingCandle.l, currentPrice),
                    };
                } else {
                    // Create new candle for current timeframe
                    // If there's a gap (e.g., overnight), use current price as open to avoid huge gaps
                    // Otherwise, use last candle's close as open
                    const timeGap = currentCandleStartTime - lastCandleStartTime;
                    const maxGapForContinuity = timeframeDuration * 2; // Allow up to 2 timeframes gap
                    
                    let openPrice: number;
                    if (timeGap > maxGapForContinuity) {
                        // Large gap (e.g., overnight, weekend) - use current price as open (gap up/down)
                        openPrice = currentPrice;
                        console.log("📊 Large time gap detected, using current price as open:", {
                            gap: timeGap,
                            maxGap: maxGapForContinuity,
                            lastClose: lastCandle.c,
                            currentPrice: currentPrice,
                        });
                    } else {
                        // Small gap - use last candle's close as open (continuous)
                        openPrice = lastCandle.c;
                    }
                    
                    const newCandle: OHLCVCandle = {
                        t: newCandleTimestamp,
                        o: openPrice,
                        h: Math.max(openPrice, currentPrice), // High should be >= open and close
                        l: Math.min(openPrice, currentPrice), // Low should be <= open and close
                        c: currentPrice,
                        v: 0, // Volume starts at 0
                    };
                    updated.push(newCandle);
                    console.log("✅ New candle created:", {
                        timestamp: new Date(newCandleTimestamp).toISOString(),
                        open: openPrice,
                        close: currentPrice,
                        high: newCandle.h,
                        low: newCandle.l,
                    });
                }
            } else if (lastCandleStartTime === currentCandleStartTime) {
                // Same timeframe - update the last candle
                console.log("🔄 Updating existing candle for timeframe:", new Date(lastCandleStartTime * 1000).toISOString());
                const lastCandleIndex = updated.length - 1;
                
                // Only update if price actually changed (avoid unnecessary updates)
                if (lastCandle.c !== currentPrice || 
                    lastCandle.h < currentPrice || 
                    lastCandle.l > currentPrice) {
                    // Update close, high, and low with current price
                    const updatedLastCandle: OHLCVCandle = {
                        ...lastCandle,
                        c: currentPrice, // Update close price (real-time)
                        h: Math.max(lastCandle.h, currentPrice), // Update high if needed
                        l: Math.min(lastCandle.l, currentPrice), // Update low if needed
                        // Open (o) remains unchanged - it's the opening price of the candle
                    };
                    
                    updated[lastCandleIndex] = updatedLastCandle;
                    console.log("✅ Candle updated:", {
                        old: { c: lastCandle.c, h: lastCandle.h, l: lastCandle.l },
                        new: { c: updatedLastCandle.c, h: updatedLastCandle.h, l: updatedLastCandle.l },
                    });
                }
            } else {
                // Current timeframe is before last candle - shouldn't happen, but log it
                console.warn("⚠️ Current timeframe is before last candle:", {
                    currentCandleStartTime: new Date(currentCandleStartTime * 1000).toISOString(),
                    lastCandleStartTime: new Date(lastCandleStartTime * 1000).toISOString(),
                });
            }
            // If currentCandleStartTime < lastCandleStartTime, it means we're updating an old candle
            // This shouldn't happen in normal flow, but we'll handle it by updating the last candle anyway
            
            // Sort by timestamp to ensure correct order
            return updated.sort((a, b) => {
                const timeA = a.t > 1000000000000 ? a.t / 1000 : a.t;
                const timeB = b.t > 1000000000000 ? b.t / 1000 : b.t;
                return timeA - timeB;
            });
        });
        }, 1000); // Throttle to max 1 update per second
        
        return () => clearTimeout(updateTimeout);
    }, [currentPrice, currentPriceTime, timeframe]);

    // Calculate 24h price change when currentPrice or ohlcvData changes
    useEffect(() => {
        if (ohlcvData.length > 0 && currentPrice) {
            const now = Date.now() / 1000;
            const twentyFourHoursAgo = now - (24 * 60 * 60);
            
            // Find the candle closest to 24 hours ago
            let closestCandle = ohlcvData[0];
            for (const candle of ohlcvData) {
                const candleTime = candle.t > 1000000000000 ? candle.t / 1000 : candle.t;
                if (candleTime <= twentyFourHoursAgo) {
                    closestCandle = candle;
                } else {
                    break;
                }
            }
            
            const price24hAgo = closestCandle.c;
            const change = ((currentPrice - price24hAgo) / price24hAgo) * 100;
            setPriceChange24h(change);
        }
    }, [ohlcvData, currentPrice]);

    // Removed auto-check to prevent rate limit issues
    // Users must click "Get Predict" button to fetch predictions

    // Fetch predictions (with loading state - called when "Get Predict" is clicked)
    const fetchPredictions = useCallback(async () => {
        if (!selectedAccountId || !selectedSymbol || selectedHorizons.length === 0) {
            setPredictions({});
            return;
        }

        // Prevent multiple simultaneous requests
        if (isCheckingRef.current) {
            return;
        }

        isCheckingRef.current = true;
        setPredictionsLoading(true);
        setError(null); // Clear any previous errors
        try {
            const token = localStorage.getItem("auth_token") || "";
            if (!token) return;

            const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const encodedSymbol = encodeURIComponent(selectedSymbol);
            const supportedHorizons = ["10m", "20m", "30m", "1h", "4h", "24h"];
            const validHorizons = selectedHorizons.filter((h) => supportedHorizons.includes(h));
            const horizonsParam = validHorizons.length > 0 ? validHorizons.join(",") : "10m,30m,1h";

            const response = await fetch(`${apiUrl}/predictions/symbol/${encodedSymbol}?horizons=${horizonsParam}&exchange_account_id=${selectedAccountId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                const predictionsData = data.predictions || {};

                const validPredictions: Record<string, PredictionData> = {};
                for (const [horizon, pred] of Object.entries(predictionsData)) {
                    if (pred !== null && pred !== undefined) {
                        validPredictions[horizon] = pred as PredictionData;
                    }
                }

                setPredictions(validPredictions);
                setError(null);
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.detail || `Failed to fetch predictions (${response.status})`;
                console.error("Failed to fetch predictions:", response.status, errorMsg);

                if (response.status === 400 || response.status === 503) {
                    setError(`Prediction error: ${errorMsg}`);
                } else if (response.status === 429) {
                    setError("Rate limit exceeded. Please wait a moment and try again.");
                }
            }
        } catch (error) {
            console.error("Error fetching predictions:", error);
            setError(`Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setPredictionsLoading(false);
            isCheckingRef.current = false;
        }
    }, [selectedAccountId, selectedSymbol, selectedHorizons]);

    // Fetch more historical data (pagination)
    const fetchMoreOHLCV = useCallback(async (beforeTimestamp: number) => {
        if (!selectedAccountId || !selectedSymbol || loadingMore) return;

        setLoadingMore(true);
        try {
            const token = localStorage.getItem("auth_token") || "";
            if (!token) {
                setLoadingMore(false);
                return;
            }

            const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const encodedSymbol = encodeURIComponent(selectedSymbol);
            
            // Convert to milliseconds if needed
            // Use 'since' parameter to fetch candles before the oldest timestamp
            // Calculate timeframe duration in milliseconds
            const timeframeMs: Record<string, number> = {
                "1m": 60 * 1000,
                "5m": 5 * 60 * 1000,
                "15m": 15 * 60 * 1000,
                "1h": 60 * 60 * 1000,
                "4h": 4 * 60 * 60 * 1000,
                "1d": 24 * 60 * 60 * 1000,
            };
            
            const timeframeDuration = timeframeMs[timeframe] || 60 * 60 * 1000;
            // Calculate start time: go back 100 candles from oldest timestamp
            // beforeTimestamp is in seconds, convert to milliseconds
            const beforeTimestampMs = beforeTimestamp > 1000000000000 ? beforeTimestamp : beforeTimestamp * 1000;
            // Go back 300 candles worth of time (Coinbase max per request)
            const sinceMs = beforeTimestampMs - (300 * timeframeDuration);
            
            console.log("FetchMore params:", {
                beforeTimestamp,
                beforeTimestampMs,
                timeframeDuration,
                sinceMs,
                timeframe,
            });

            // Use new endpoint that gets candles directly from selected exchange (no prioritization)
            const response = await fetch(`${apiUrl}/market/ohlcv-from-exchange/${selectedAccountId}/${encodedSymbol}?timeframe=${timeframe}&limit=300&since=${sinceMs}`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-cache",
            });

            if (response.ok) {
                const data = await response.json();
                const newCandles = data.candles || [];
                console.log("FetchMore response:", {
                    newCandlesCount: newCandles.length,
                    firstCandle: newCandles[0],
                    lastCandle: newCandles[newCandles.length - 1],
                });
                
                if (newCandles.length > 0) {
                    // Sort new candles by timestamp
                    const sortedNewCandles = [...newCandles].sort((a, b) => {
                        const timeA = a.t > 1000000000000 ? a.t / 1000 : a.t;
                        const timeB = b.t > 1000000000000 ? b.t / 1000 : b.t;
                        return timeA - timeB;
                    });
                    
                    // Prepend new candles to existing data (oldest first)
                    setOhlcvData((prevData) => {
                        // Merge and sort by timestamp
                        const merged = [...sortedNewCandles, ...prevData];
                        merged.sort((a, b) => {
                            const timeA = a.t > 1000000000000 ? a.t / 1000 : a.t;
                            const timeB = b.t > 1000000000000 ? b.t / 1000 : b.t;
                            return timeA - timeB;
                        });
                        // Remove duplicates based on timestamp
                        const unique = merged.filter((candle, index, self) => {
                            const time = candle.t > 1000000000000 ? candle.t / 1000 : candle.t;
                            return index === self.findIndex((c) => {
                                const cTime = c.t > 1000000000000 ? c.t / 1000 : c.t;
                                return cTime === time;
                            });
                        });
                        console.log("Merged candles:", {
                            before: prevData.length,
                            new: sortedNewCandles.length,
                            after: unique.length,
                        });
                        return unique;
                    });
                    // Update oldest timestamp to the oldest candle in new data
                    const oldest = sortedNewCandles[0].t;
                    const oldestTime = oldest > 1000000000000 ? oldest / 1000 : oldest;
                    setOldestTimestamp(oldestTime);
                    console.log("✅ Loaded more candles. New oldest timestamp:", oldestTime, "New candles:", sortedNewCandles.length);
                } else {
                    // No more data available
                    console.log("⚠️ No more historical data available");
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error("Failed to fetch more OHLCV:", response.status, errorData);
            }
        } catch (error) {
            console.error("Error fetching more OHLCV:", error);
        } finally {
            setLoadingMore(false);
        }
    }, [selectedAccountId, selectedSymbol, timeframe, loadingMore]);

    // Fetch data when symbol or timeframe changes (NOT when account changes - wait for symbol to be selected first)
    useEffect(() => {
        if (selectedAccountId && selectedSymbol) {
            // Clear all data when symbol or timeframe changes
            setOhlcvData([]);
            setCurrentPrice(null);
            setCurrentPriceTime(null);
            setPriceChange24h(null);
            setPredictions({});
            setError(null);
            setOldestTimestamp(null);
            
            // Fetch fresh data from the exchange
            fetchOHLCV();
        } else if (!selectedSymbol) {
            // Clear data if no symbol selected (waiting for symbol to load)
            setOhlcvData([]);
            setCurrentPrice(null);
            setCurrentPriceTime(null);
            setPriceChange24h(null);
            setPredictions({});
            setOldestTimestamp(null);
        }
    }, [selectedSymbol, timeframe, fetchOHLCV]); // Removed selectedAccountId - only fetch when symbol is selected

    // When horizons change, clear predictions if we have any
    useEffect(() => {
        if (selectedAccountId && selectedSymbol && Object.keys(predictions).length > 0) {
            setPredictions({});
        }
    }, [selectedHorizons]);

    // Fetch accuracy stats
    const fetchAccuracyStats = useCallback(async () => {
        try {
            const token = localStorage.getItem("auth_token") || "";
            if (!token) return;

            const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const encodedSymbol = selectedSymbol ? encodeURIComponent(selectedSymbol) : "";
            const response = await fetch(`${apiUrl}/predictions/accuracy/stats?symbol=${encodedSymbol}&days=30`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setAccuracyStats(data);
            }
        } catch (error) {
            console.error("Error fetching accuracy stats:", error);
        }
    }, [selectedSymbol]);

    useEffect(() => {
        if (selectedSymbol) {
            fetchAccuracyStats();
        }
    }, [selectedSymbol, fetchAccuracyStats]);

    if (accounts.length === 0) {
        return (
            <div style={{ padding: "24px", textAlign: "center" }}>
                <h1>Market Data</h1>
                <p style={{ color: "#666", marginTop: "16px" }}>No active exchange accounts found.</p>
                <p style={{ marginTop: "8px" }}>
                    <a href="/settings" style={{ color: "#0070f3", textDecoration: "underline" }}>
                        Add an exchange account
                    </a>{" "}
                    to view market data.
                </p>
            </div>
        );
    }

    return (
        <div style={{ padding: "0 16px", maxWidth: "1870px", margin: "0 auto", color: "#ededed" }}>

            {error && (
                <div
                    style={{
                        padding: "8px",
                        backgroundColor: "rgba(255, 68, 68, 0.15)",
                        border: "2px solid rgba(255, 68, 68, 0.5)",
                        borderRadius: "5px",
                        marginBottom: "8px",
                        color: "#ff4444",
                        fontSize: "14px",
                        fontWeight: "500",
                    }}
                >
                    <strong>⚠️ Error:</strong> {error}
                </div>
            )}

            {/* Price Widget */}
            {/* <div style={{ marginBottom: "8px", marginTop: "16px" }}>
                <PriceWidget
                    onSymbolChange={(symbol) => {
                        setSelectedSymbol(symbol);
                    }}
                    onChartClick={() => {
                        // Scroll to chart or focus on chart
                        const chartElement = document.getElementById("main-chart");
                        if (chartElement) {
                            chartElement.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                    }}
                    onConnectionStatusChange={(status) => {
                        setConnectionStatus(status);
                    }}
                    onPriceUpdate={(price, timestamp) => {
                        console.log("💰 Price update received:", { price, timestamp, ohlcvDataLength: ohlcvData.length });
                        setCurrentPrice(price);
                        setCurrentPriceTime(timestamp);
                        
                        // Update the last candle with the new live price, or create a new candle if timeframe changed
                        if (price && timestamp && ohlcvData.length > 0) {
                            console.log("📊 Updating candle with price:", price, "timestamp:", timestamp);
                            setOhlcvData((prevData) => {
                                const updated = [...prevData];
                                const lastCandle = updated[updated.length - 1];
                                
                                // Check if this price update is for the current candle timeframe
                                // lastCandle.t is the open time (start) of the candle in milliseconds
                                const candleOpenTime = lastCandle.t > 1000000000000 ? lastCandle.t / 1000 : lastCandle.t;
                                const updateTime = timestamp > 1000000000000 ? timestamp / 1000 : timestamp;
                                
                                // Calculate timeframe duration in seconds
                                const timeframeSeconds: Record<string, number> = {
                                    "1m": 60,
                                    "5m": 300,
                                    "15m": 900,
                                    "1h": 3600,
                                    "4h": 14400,
                                    "1d": 86400,
                                };
                                
                                const timeframeDuration = timeframeSeconds[timeframe] || 3600;
                                // Calculate the start time of the candle that contains candleOpenTime
                                const lastCandleStartTime = Math.floor(candleOpenTime / timeframeDuration) * timeframeDuration;
                                // Calculate the start time of the candle that should contain updateTime
                                const updateCandleStartTime = Math.floor(updateTime / timeframeDuration) * timeframeDuration;
                                
                                // If within the same candle timeframe, update the last candle
                                if (lastCandleStartTime === updateCandleStartTime) {
                                    // Real-time update: update close, high, and low without creating new candle
                                    // IMPORTANT: Create a new object to trigger React state update
                                    const updatedLastCandle: OHLCVCandle = {
                                        ...lastCandle,
                                        c: price, // Update close price (real-time)
                                        h: Math.max(lastCandle.h, price), // Update high if needed (real-time)
                                        l: Math.min(lastCandle.l, price), // Update low if needed (real-time)
                                        // Note: Open (o) remains unchanged - it's the opening price of the candle
                                    };
                                    
                                    // Replace the last candle with the updated one
                                    updated[updated.length - 1] = updatedLastCandle;
                                    console.log("✅ Last candle updated:", {
                                        old: { c: lastCandle.c, h: lastCandle.h, l: lastCandle.l },
                                        new: { c: updatedLastCandle.c, h: updatedLastCandle.h, l: updatedLastCandle.l }
                                    });
                                } else {
                                    console.log("🆕 New candle timeframe started, creating new candle");
                                    // New timeframe started - create missing candles for all timeframes between last and current
                                    // Start from the next timeframe after the last candle
                                    let currentCandleStartTime = lastCandleStartTime + timeframeDuration;
                                    
                                    // Use the last candle's close price as the starting price for intermediate candles
                                    let previousClosePrice = lastCandle.c;
                                    
                                    // Create all missing candles up to (but not including) the current timeframe
                                    while (currentCandleStartTime < updateCandleStartTime) {
                                        const intermediateCandleTimestamp = currentCandleStartTime * 1000; // Convert to milliseconds
                                        
                                        // Create intermediate candle with previous close as open/close (no price movement data)
                                        const intermediateCandle: OHLCVCandle = {
                                            t: intermediateCandleTimestamp,
                                            o: previousClosePrice, // Open = previous close
                                            h: previousClosePrice, // High = previous close (no data)
                                            l: previousClosePrice, // Low = previous close (no data)
                                            c: previousClosePrice, // Close = previous close
                                            v: 0, // Volume = 0
                                        };
                                        
                                        updated.push(intermediateCandle);
                                        previousClosePrice = intermediateCandle.c; // Use this candle's close for next
                                        currentCandleStartTime += timeframeDuration;
                                    }
                                    
                                    // Now create the current timeframe candle with live price
                                    const newCandleTimestamp = updateCandleStartTime * 1000; // Convert to milliseconds
                                    
                                    // Create new candle with current price as open, high, low, and close
                                    const newCandle: OHLCVCandle = {
                                        t: newCandleTimestamp,
                                        o: price, // Open price = current price
                                        h: price, // High = current price (will be updated as price changes)
                                        l: price, // Low = current price (will be updated as price changes)
                                        c: price, // Close = current price
                                        v: 0, // Volume starts at 0 (we don't have real-time volume)
                                    };
                                    
                                    updated.push(newCandle);
                                }
                                
                                return updated;
                            });
                        }
                    }}
                />
            </div> */}

            {/* Trading Panel, Main Chart and Predictions Side by Side */}
            <div id="main-chart" style={{marginTop: "8px", marginBottom: "8px", display: "flex", gap: "0.5rem", alignItems: "flex-start", height: "calc(100vh - 200px)", minHeight: "600px" }}>
                {/* Trading Panel - Left Side */}
                {/* Always render TradingPanel so it can fetch currencies and auto-select symbol */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <TradingPanel
                        selectedSymbol={selectedSymbol || ""}
                            onSymbolChange={setSelectedSymbol}
                            currentPrice={currentPrice}
                            priceChange24h={priceChange24h}
                            predictions={predictions}
                            onRefreshPredictions={fetchPredictions}
                            predictionsLoading={predictionsLoading}
                            connectionStatus={connectionStatus}
                        />
                        {/* Price Predictions Panel - Below TradingPanel */}
                    {selectedSymbol && showPredictions && (
                            <PricePredictionsPanel
                                predictions={predictions}
                                predictionsLoading={predictionsLoading}
                                onRefreshPredictions={fetchPredictions}
                            />
                        )}
                    </div>

                {/* Main Chart - Center */}
                <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px" }}>
                {selectedSymbol ? (
                    <MainChart
                        ohlcvData={ohlcvData}
                        predictions={predictions}
                        timeframe={timeframe}
                        onTimeframeChange={setTimeframe}
                        selectedHorizons={selectedHorizons}
                        onHorizonToggle={(horizon) => {
                            if (selectedHorizons.includes(horizon)) {
                                setSelectedHorizons(selectedHorizons.filter((h) => h !== horizon));
                            } else {
                                setSelectedHorizons([...selectedHorizons, horizon]);
                            }
                        }}
                        loading={ohlcvLoading}
                        currentPrice={currentPrice}
                        currentPriceTime={currentPriceTime}
                        onLoadMore={(beforeTimestamp) => fetchMoreOHLCV(beforeTimestamp)}
                        oldestTimestamp={oldestTimestamp}
                        loadingMore={loadingMore}
                    />
                ) : (
                    <div
                        style={{
                                width: "100%",
                            backgroundColor: "#1a1a1a",
                            borderRadius: "12px",
                            padding: "40px",
                            border: "1px solid rgba(255, 174, 0, 0.2)",
                            textAlign: "center",
                            color: "#888",
                        }}
                    >
                        <p>Select a trading pair from the widget above to view the chart.</p>
                    </div>
                )}
                {/* Arbitrage Panel - Always show when symbol is selected */}
                {selectedSymbol && (
                    <ArbitragePanel selectedSymbol={selectedSymbol} />
                )}
            </div>

                {/* Right Side Panel */}
                {selectedSymbol && (
                    <div style={{ width: "320px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                        {/* Order Panel */}
                        <OrderPanel 
                            selectedSymbol={selectedSymbol}
                            currentPrice={currentPrice}
                        />

                        {/* Active Orders */}
                        <ActiveOrders 
                            selectedSymbol={selectedSymbol}
                        />

                        {/* Accuracy Stats */}
                      {/*   {accuracyStats && accuracyStats.total_predictions > 0 && (
                            <div style={{ 
                                marginTop: "12px",
                                padding: "12px",
                                backgroundColor: "#1a1a1a",
                                borderRadius: "12px",
                                border: "1px solid rgba(255, 174, 0, 0.2)",
                            }}>
                                <h4 style={{ color: "#FFAE00", margin: "0 0 12px 0", fontSize: "12px", fontWeight: "600" }}>
                                    Accuracy Stats (30d)
                                </h4>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255, 174, 0, 0.1)" }}>
                                        <span style={{ fontSize: "10px", color: "#888" }}>Total</span>
                                        <span style={{ fontSize: "11px", fontWeight: "600", color: "#FFAE00" }}>{accuracyStats.total_predictions}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255, 174, 0, 0.1)" }}>
                                        <span style={{ fontSize: "10px", color: "#888" }}>Avg Error</span>
                                        <span
                                            style={{
                                                fontSize: "11px",
                                                fontWeight: "600",
                                                color: accuracyStats.avg_error_percent < 5 ? "#22c55e" : accuracyStats.avg_error_percent < 10 ? "#f59e0b" : "#ef4444",
                                            }}
                                        >
                                            {accuracyStats.avg_error_percent.toFixed(2)}%
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255, 174, 0, 0.1)" }}>
                                        <span style={{ fontSize: "10px", color: "#888" }}>In Confidence</span>
                                        <span
                                            style={{
                                                fontSize: "11px",
                                                fontWeight: "600",
                                                color: accuracyStats.accuracy_within_confidence > 70 ? "#22c55e" : accuracyStats.accuracy_within_confidence > 50 ? "#f59e0b" : "#ef4444",
                                            }}
                                        >
                                            {accuracyStats.accuracy_within_confidence.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
                                        <span style={{ fontSize: "10px", color: "#888" }}>Avg Conf</span>
                                        <span style={{ fontSize: "11px", fontWeight: "600", color: "#FFAE00" }}>
                                            {(accuracyStats.avg_confidence * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )} */}
                        </div>
                    )}
                </div>

            {!selectedSymbol && (
                <div style={{ padding: "24px", textAlign: "center", color: "#666" }}>
                    Select a trading pair from the widget above to view market data.
                </div>
            )}
        </div>
    );
}

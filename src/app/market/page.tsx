"use client";

/// <reference types="react" />
import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import TradingPanel from "@/components/market/TradingPanel";
import type { ActiveOrdersRef } from "@/components/market/ActiveOrders";
import type { TradingPanelRef } from "@/components/market/TradingPanel";
import type { OrderPanelRef } from "@/components/market/OrderPanel";
import { useExchange } from "@/contexts/ExchangeContext";
import type { OHLCVCandle, PredictionData } from "@/types/market";
import {
    fetchOHLCV as apiFetchOHLCV,
    fetchLivePrice as apiFetchLivePrice,
    fetchPredictions as apiFetchPredictions,
    fetchDemoWallet as apiFetchDemoWallet,
    fetchMoreOHLCV as apiFetchMoreOHLCV,
} from "@/lib/marketApi";
import {
    computePriceChange24h,
    sortCandlesByTime,
    deduplicateCandles,
} from "@/lib/ohlcvUtils";
import {
    getTimeUntilCandleClose,
    addNewCandleAtClose,
    applyRealtimeCandleUpdate,
} from "@/lib/ohlcvRealtime";

const MainChart = dynamic(() => import("@/components/market/MainChart").then((m) => m.default), {
    ssr: false,
    loading: () => (
        <div style={{ flex: 1, minHeight: 400, background: "#1a1a1a", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
            Loading chart...
        </div>
    ),
});
const OrderPanel = dynamic(() => import("@/components/market/OrderPanel").then((m) => m.default), { ssr: false });
const ActiveOrders = dynamic(() => import("@/components/market/ActiveOrders").then((m) => m.default), { ssr: false });
const ArbitragePanel = dynamic(() => import("@/components/market/ArbitragePanel").then((m) => m.default), { ssr: false });
const PricePredictionsPanel = dynamic(() => import("@/components/market/PricePredictionsPanel").then((m) => m.default), { ssr: false });
const DemoWallet = dynamic(() => import("@/components/market/DemoWallet").then((m) => m.default), { ssr: false });
const DemoPortfolioStats = dynamic(() => import("@/components/market/DemoPortfolioStats").then((m) => m.default), { ssr: false });

export default function MarketPage() {
    const { selectedAccountId, accounts } = useExchange();
    
    // Load from localStorage on mount - will be updated when accountId changes
    const [selectedSymbol, setSelectedSymbol] = useState<string>(() => {
        if (typeof window !== "undefined" && selectedAccountId) {
            return localStorage.getItem(`market_selectedSymbol_${selectedAccountId}`) || "";
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
    const connectionStatus: "disconnected" | "connecting" | "connected" =
        currentPrice !== null && currentPriceTime !== null
            ? (() => {
                  const ts = currentPriceTime > 1e12 ? currentPriceTime / 1000 : currentPriceTime;
                  return Date.now() / 1000 - ts < 120 ? "connected" : "disconnected";
              })()
            : ohlcvLoading ? "connecting" : "disconnected";

    // Prediction state
    const [predictions, setPredictions] = useState<Record<string, PredictionData | null>>({});
    const [predictionsLoading, setPredictionsLoading] = useState(false);
    const showPredictions = true;
    const isCheckingRef = useRef(false);
    const [deferSecondaryPanels, setDeferSecondaryPanels] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setDeferSecondaryPanels(true), 1800);
        return () => clearTimeout(t);
    }, []);
    // Refs for ActiveOrders, TradingPanel, OrderPanel to refresh after order placement/cancel
    const activeOrdersRef = useRef<ActiveOrdersRef | null>(null);
    const tradingPanelRef = useRef<TradingPanelRef | null>(null);
    const orderPanelRef = useRef<OrderPanelRef | null>(null);

    // Single fetch for Demo Wallet – shared by DemoWallet and DemoPortfolioStats (faster load)
    const [demoWallet, setDemoWallet] = useState<Record<string, unknown> | null>(null);
    const [demoWalletLoading, setDemoWalletLoading] = useState(false);
    const [demoWalletError, setDemoWalletError] = useState<string | null>(null);
    const fetchDemoWallet = useCallback(async () => {
        setDemoWalletLoading(true);
        setDemoWalletError(null);
        try {
            const data = await apiFetchDemoWallet();
            setDemoWallet(data);
        } catch (e) {
            setDemoWalletError(e instanceof Error ? e.message : "Failed to load wallet");
            setDemoWallet(null);
        } finally {
            setDemoWalletLoading(false);
        }
    }, []);
    useEffect(() => {
        if (selectedAccountId === -999) fetchDemoWallet();
        else { setDemoWallet(null); setDemoWalletError(null); }
    }, [selectedAccountId, fetchDemoWallet]);
    
    // Callback to refresh ActiveOrders and TradingPanel when order is placed
    const handleOrderPlaced = useCallback(() => {
        if (activeOrdersRef.current) {
            activeOrdersRef.current.refresh();
        }
        if (tradingPanelRef.current) {
            tradingPanelRef.current.refreshBalance();
        }
    }, []);

    // Callback to refresh balance when order is cancelled (so Available/In Orders update in market)
    const handleOrderCancelled = useCallback(() => {
        orderPanelRef.current?.refreshBalance();
        tradingPanelRef.current?.refreshBalance();
    }, []);
    
    // Load saved symbol when account changes (if account didn't change, keep current symbol)
    useEffect(() => {
        if (selectedAccountId && typeof window !== "undefined") {
            // Try to load saved symbol for this account
            const savedSymbol = localStorage.getItem(`market_selectedSymbol_${selectedAccountId}`);
            if (savedSymbol) {
                // Symbol will be validated by TradingPanel - if not available, it will select first one
                setSelectedSymbol(savedSymbol);
            } else {
                // No saved symbol for this account - clear and let TradingPanel select first one
            setSelectedSymbol("");
            }
            // Clear data when account changes
            setOhlcvData([]);
            setCurrentPrice(null);
            setCurrentPriceTime(null);
            setPriceChange24h(null);
            setPredictions({});
        }
    }, [selectedAccountId]);
    
    // Save to localStorage when symbol changes (per account)
    useEffect(() => {
        if (typeof window !== "undefined" && selectedAccountId && selectedSymbol) {
            localStorage.setItem(`market_selectedSymbol_${selectedAccountId}`, selectedSymbol);
            }
    }, [selectedSymbol, selectedAccountId]);
    
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
            const { candles: uniqueCandles, oldestTimestamp: oldest } = await apiFetchOHLCV(
                selectedAccountId,
                selectedSymbol,
                timeframe
            );
            setOhlcvData(uniqueCandles);
            setOldestTimestamp(oldest);
            setError(null);
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
        const change = currentPrice ? computePriceChange24h(ohlcvData, currentPrice) : null;
        setPriceChange24h(change);
    }, [ohlcvData, currentPrice]);

    // Fetch live price from exchange API
    const fetchLivePrice = useCallback(async () => {
        if (!selectedAccountId || !selectedSymbol) {
            setCurrentPrice(null);
            return;
        }
        try {
            const price = await apiFetchLivePrice(selectedAccountId, selectedSymbol);
            if (price !== null) {
                setCurrentPrice(price);
                setCurrentPriceTime(Date.now());
            }
        } catch (error) {
            console.error("Error fetching live price:", error);
        }
    }, [selectedAccountId, selectedSymbol]);

    // Fetch live price once when symbol is selected (so price appears quickly)
    useEffect(() => {
        if (!selectedAccountId || !selectedSymbol) {
            setCurrentPrice(null);
            setCurrentPriceTime(null);
            return;
        }
        setCurrentPrice(null);
        setCurrentPriceTime(null);
        fetchLivePrice();
    }, [selectedAccountId, selectedSymbol, fetchLivePrice]);

    // Start live price interval only after OHLCV has loaded (avoids request pile-up on first paint)
    useEffect(() => {
        if (!selectedAccountId || !selectedSymbol || ohlcvData.length === 0) return;
        const interval = setInterval(fetchLivePrice, 10000);
        return () => clearInterval(interval);
    }, [selectedAccountId, selectedSymbol, ohlcvData.length, fetchLivePrice]);

    // Create new candle exactly when timer reaches 00:00
    useEffect(() => {
        if (!ohlcvData.length || !timeframe) return;
        const timeUntilClose = getTimeUntilCandleClose(ohlcvData, timeframe);
        if (timeUntilClose <= 0) {
            if (currentPrice) {
                setOhlcvData((prev) => addNewCandleAtClose(prev, currentPrice, timeframe));
            }
            return;
        }
        const timeout = setTimeout(() => {
            if (currentPrice) {
                setOhlcvData((prev) => addNewCandleAtClose(prev, currentPrice, timeframe));
            }
        }, timeUntilClose * 1000);
        return () => clearTimeout(timeout);
    }, [ohlcvData, timeframe, currentPrice]);
    
    // Update last candle with current price (real-time update, throttled to 1/s)
    useEffect(() => {
        if (!currentPrice || !currentPriceTime) return;
        const updateTimeout = setTimeout(() => {
            setOhlcvData((prev) =>
                applyRealtimeCandleUpdate(prev, currentPrice, currentPriceTime, timeframe)
            );
        }, 1000);
        return () => clearTimeout(updateTimeout);
    }, [currentPrice, currentPriceTime, timeframe]);


    // Removed auto-check to prevent rate limit issues
    // Users must click "Get Predict" button to fetch predictions

    // Fetch predictions (with loading state - called when "Get Predict" is clicked)
    const fetchPredictions = useCallback(async () => {
        if (!selectedAccountId || !selectedSymbol) {
            setPredictions({});
            return;
        }
        if (isCheckingRef.current) return;
        isCheckingRef.current = true;
        setPredictionsLoading(true);
        setError(null);
        const supportedHorizons = ["10m", "20m", "30m", "1h", "4h", "24h"];
        const validHorizons =
            selectedHorizons.length > 0
                ? selectedHorizons.filter((h: string) => supportedHorizons.includes(h))
                : [];
        const horizonsParam = validHorizons.length > 0 ? validHorizons.join(",") : "10m,30m,1h,4h,24h";
        try {
            const validPredictions = await apiFetchPredictions(
                selectedAccountId,
                selectedSymbol,
                horizonsParam
            );
            setPredictions(validPredictions);
            setError(null);
        } catch (error) {
            console.error("❌ Error fetching predictions:", error);
            setError(error instanceof Error ? error.message : "Unknown error");
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
            const result = await apiFetchMoreOHLCV(
                selectedAccountId,
                selectedSymbol,
                timeframe,
                beforeTimestamp
            );
            if (!result) return;
            const { candles: sortedNewCandles, oldestTimestamp: oldestTime } = result;
            setOhlcvData((prevData) => {
                const merged = deduplicateCandles(
                    sortCandlesByTime([...sortedNewCandles, ...prevData])
                );
                return merged;
            });
            setOldestTimestamp(oldestTime);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally only refetch on symbol/timeframe change, not on selectedAccountId
    }, [selectedSymbol, timeframe, fetchOHLCV]);

    // When horizons change, clear predictions if we have any
    useEffect(() => {
        if (selectedAccountId && selectedSymbol && Object.keys(predictions).length > 0) {
            setPredictions({});
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Run only when user changes horizons, not when predictions/symbol/account change
    }, [selectedHorizons]);

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

    // Responsive layout - simple check without hooks to avoid React error #310
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const isDemoExchange = selectedAccountId === -999;

    return (
        <div style={{ padding: isMobile ? "8px" : "0 16px", maxWidth: "1870px", margin: "0 auto", color: "#ededed" }}>
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

            {/* Trading Panel, Main Chart and Predictions Side by Side */}
            <div id="main-chart" style={{marginTop: "8px", marginBottom: "8px", display: "flex", gap: "0.5rem", alignItems: "flex-start", height: isMobile ? "auto" : "calc(100vh - 200px)", minHeight: isMobile ? "auto" : "600px", flexDirection: isMobile ? "column" : "row" }}>
                {/* Trading Panel - Left Side */}
                {/* Always render TradingPanel so it can fetch currencies and auto-select symbol */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: isMobile ? "100%" : "auto" }}>
                        <TradingPanel
                            ref={tradingPanelRef}
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
                                error={error}
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
                        onHorizonToggle={(horizon: string) => {
                            if (selectedHorizons.includes(horizon)) {
                                setSelectedHorizons(selectedHorizons.filter((h: string) => h !== horizon));
                            } else {
                                setSelectedHorizons([...selectedHorizons, horizon]);
                            }
                        }}
                        loading={ohlcvLoading}
                        currentPrice={currentPrice}
                        currentPriceTime={currentPriceTime}
                        onLoadMore={(beforeTimestamp: number) => fetchMoreOHLCV(beforeTimestamp)}
                        oldestTimestamp={oldestTimestamp}
                        loadingMore={loadingMore}
                        selectedSymbol={selectedSymbol}
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
                {selectedSymbol && deferSecondaryPanels && (
                    <ArbitragePanel selectedSymbol={selectedSymbol} />
                )}
            </div>

                {/* Right Side Panel */}
                {selectedSymbol && (
                    <div style={{ width: isMobile ? "100%" : "320px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                        {/* Order Panel */}
                        <OrderPanel 
                            ref={orderPanelRef}
                            selectedSymbol={selectedSymbol}
                            currentPrice={currentPrice}
                            onOrderPlaced={handleOrderPlaced}
                        />

                        {/* Active Orders */}
                        <ActiveOrders 
                            ref={activeOrdersRef}
                            selectedSymbol={selectedSymbol}
                            onOrderCancelled={handleOrderCancelled}
                        />

                        {isDemoExchange && deferSecondaryPanels && (
                            <>
                                <DemoWallet
                                    wallet={demoWallet}
                                    loading={demoWalletLoading}
                                    error={demoWalletError}
                                    onRefetch={fetchDemoWallet}
                                    onWalletReset={() => { orderPanelRef.current?.refreshBalance(); tradingPanelRef.current?.refreshBalance(); }}
                                />
                                <DemoPortfolioStats wallet={demoWallet} loading={demoWalletLoading} error={demoWalletError} />
                            </>
                        )}

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

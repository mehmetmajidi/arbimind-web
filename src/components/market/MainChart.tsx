"use client";

import { useState, useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, LineData, CandlestickSeries, LineSeries, UTCTimestamp, IRange, BusinessDay } from "lightweight-charts";
import DrawingToolsToolbar, { DrawingTool } from "./DrawingToolsToolbar";

interface OHLCVCandle {
    t: number;
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
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

interface MainChartProps {
    ohlcvData: OHLCVCandle[];
    predictions: Record<string, PredictionData | null>;
    timeframe: string;
    onTimeframeChange: (timeframe: string) => void;
    selectedHorizons: string[];
    onHorizonToggle: (horizon: string) => void;
    loading?: boolean;
    currentPrice?: number | null;
    currentPriceTime?: number | null;
    onLoadMore?: (beforeTimestamp: number) => void;
    oldestTimestamp?: number | null;
    loadingMore?: boolean;
}

export default function MainChart({
    ohlcvData,
    predictions,
    timeframe,
    onTimeframeChange,
    selectedHorizons,
    onHorizonToggle,
    loading = false,
    currentPrice = null,
    currentPriceTime = null,
    onLoadMore,
    oldestTimestamp = null,
    loadingMore = false,
}: MainChartProps) {
    const [refreshInterval, setRefreshInterval] = useState(5);
    const [chartReady, setChartReady] = useState(false);
    const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingTool>(null);
    const [drawingsLocked, setDrawingsLocked] = useState(false);
    const [drawingsVisible, setDrawingsVisible] = useState(true);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const predictionSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
    const paginationListenerRef = useRef<(() => void) | null>(null);
    const previousDataRef = useRef<CandlestickData[]>([]);
    const currentPriceLineRef = useRef<ISeriesApi<"Line"> | null>(null);
    const previousPriceRef = useRef<number | null>(null);
    const drawingsRef = useRef<Array<{ id: string; primitive: unknown }>>([]);
    const oldestTimestampRef = useRef<number | null>(null);
    const isLoadingRef = useRef<boolean>(false);

    const timeframes = [
        { value: "1m", label: "1M" },
        { value: "5m", label: "5M" },
        { value: "15m", label: "15M" },
        { value: "1h", label: "1H" },
        { value: "4h", label: "4H" },
        { value: "1d", label: "1D" },
    ];

    const availableHorizons = ["10m", "30m", "1h", "4h", "24h"];

    // Handle drawing tool activation and mouse events
    useEffect(() => {
        if (!chartRef.current || !chartReady || !candlestickSeriesRef.current) {
            return;
        }

        if (!activeDrawingTool || (activeDrawingTool !== "trendline" && activeDrawingTool !== "horizontal" && activeDrawingTool !== "vertical" && activeDrawingTool !== "ray")) {
            return;
        }

        const chart = chartRef.current;
        const series = candlestickSeriesRef.current;
        const container = chartContainerRef.current;
        if (!container) return;

        let isDrawing = false;
        let startPoint: { time: Time; price: number } | null = null;
        let currentLine: ISeriesApi<"Line"> | null = null;

        const handleMouseDown = (event: MouseEvent) => {
            if (!activeDrawingTool) return;
            
            const rect = container.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // Get time from x coordinate
            const time = chart.timeScale().coordinateToTime(x);
            if (time === null) return;

            // Get price from y coordinate using series API
            const priceCoordinate = series.coordinateToPrice(y);
            if (priceCoordinate === null) return;

            isDrawing = true;
            startPoint = { time, price: Number(priceCoordinate) };

            // Create a line series for drawing
            currentLine = chart.addSeries(LineSeries, {
                color: "#FFAE00",
                lineWidth: 2,
                lineStyle: 0, // Solid
                priceLineVisible: false,
                lastValueVisible: false,
            }) as ISeriesApi<"Line">;

            // Set initial point
            currentLine.setData([{ time, value: Number(priceCoordinate) }]);
        };

        const handleMouseMove = (event: MouseEvent) => {
            if (!isDrawing || !startPoint || !currentLine) return;

            const rect = container.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // Get price from y coordinate using series API
            const priceCoordinate = series.coordinateToPrice(y);
            if (priceCoordinate === null) return;

            const time = chart.timeScale().coordinateToTime(x);
            if (time === null) return;

            let endTime: Time = time;
            let endPrice: number = Number(priceCoordinate);

            // Handle different line types
            const priceNum = Number(priceCoordinate);
            if (activeDrawingTool === "horizontal") {
                // Horizontal line: keep start time, use current price
                endTime = startPoint.time;
                endPrice = priceNum;
                // For horizontal, we need to extend the line across visible range
                const visibleRange = chart.timeScale().getVisibleRange();
                if (visibleRange) {
                    currentLine.setData([
                        { time: visibleRange.from, value: priceNum },
                        { time: visibleRange.to, value: priceNum }
                    ]);
                    return;
                }
            } else if (activeDrawingTool === "vertical") {
                // Vertical line: use current time, keep start price
                endTime = time;
                endPrice = startPoint.price;
                // For vertical, we need to extend the line across price range
                // Use series to get price range
                const priceRange = series.priceScale().getVisibleRange();
                if (priceRange) {
                    currentLine.setData([
                        { time: time, value: Number(priceRange.from) },
                        { time: time, value: Number(priceRange.to) }
                    ]);
                    return;
                }
            } else if (activeDrawingTool === "ray") {
                // Ray: extends from start point to right edge
                const visibleRange = chart.timeScale().getVisibleRange();
                if (visibleRange) {
                    endTime = visibleRange.to;
                    // Calculate price based on line slope
                    const timeDiff = Number(time) - Number(startPoint.time);
                    const priceDiff = priceNum - startPoint.price;
                    if (timeDiff !== 0) {
                        const slope = priceDiff / timeDiff;
                        const extendedTimeDiff = Number(endTime) - Number(startPoint.time);
                        endPrice = startPoint.price + (slope * extendedTimeDiff);
                    } else {
                        endPrice = priceNum;
                    }
                }
            }

            // Update line data for trendline
            currentLine.setData([
                { time: startPoint.time, value: startPoint.price },
                { time: endTime, value: endPrice }
            ]);
        };

        const handleMouseUp = () => {
            if (isDrawing && currentLine) {
                // Save the drawing
                drawingsRef.current.push({
                    id: `drawing-${Date.now()}`,
                    primitive: currentLine
                });
            }
            isDrawing = false;
            startPoint = null;
            currentLine = null;
            // Deactivate tool after drawing
            setActiveDrawingTool(null);
        };

        container.addEventListener("mousedown", handleMouseDown);
        container.addEventListener("mousemove", handleMouseMove);
        container.addEventListener("mouseup", handleMouseUp);

        // Change cursor when tool is active
        container.style.cursor = "crosshair";

        return () => {
            container.removeEventListener("mousedown", handleMouseDown);
            container.removeEventListener("mousemove", handleMouseMove);
            container.removeEventListener("mouseup", handleMouseUp);
            container.style.cursor = "default";
        };
    }, [activeDrawingTool, chartReady]);

    // Initialize chart when container becomes available
    useEffect(() => {
        // Ensure we're on the client side
        if (typeof window === "undefined") return;
        
        // Don't initialize if loading (container won't be rendered)
        if (loading) {
            console.log("Chart init: Skipping - still loading");
            return;
        }
        
        if (chartRef.current) {
            console.log("Chart init: Chart already exists");
            return;
        }
        
        if (!chartContainerRef.current) {
            console.log("Chart init: Container ref not available yet");
            // Retry after a short delay
            const retryTimeout = setTimeout(() => {
                if (chartContainerRef.current && !chartRef.current && !loading) {
                    console.log("Chart init: Retrying after delay");
                }
            }, 100);
            return () => clearTimeout(retryTimeout);
        }

        const initializeChart = () => {
            const container = chartContainerRef.current;
            if (!container) {
                console.warn("Chart init: Container ref is null");
                return;
            }
            
            if (chartRef.current) {
                console.log("Chart init: Chart already initialized");
                return;
            }
            
            // Check if container is in the DOM
            if (!container.isConnected) {
                console.warn("Chart init: Container is not in the DOM yet");
                return;
            }
            
            try {
                const width = container.clientWidth || container.offsetWidth || 800;
                const height = container.clientHeight || 400;
                
                console.log("✅ Initializing chart with dimensions:", width, "x", height);
                console.log("Container element:", container);
                console.log("Container style:", window.getComputedStyle(container));
                
                // Create chart
                const chart = createChart(container, {
                    width: width,
                    height: height,
                    autoSize: false, // Disable auto-size to have more control
                    layout: {
                        background: { color: "#2a2a2a" },
                        textColor: "#888",
                    },
                    grid: {
                        vertLines: { color: "#444" },
                        horzLines: { color: "#444" },
                    },
                    timeScale: {
                        timeVisible: true,
                        secondsVisible: false,
                        rightOffset: 12,
                        barSpacing: 3,
                        allowBoldLabels: true,
                        rightBarStaysOnScroll: false, // Disable - prevents last candle from sticking to right
                        fixLeftEdge: false, // Allow scrolling left
                        fixRightEdge: false, // Allow scrolling right
                        lockVisibleTimeRangeOnResize: true, // Lock visible range when chart resizes
                    },
                    rightPriceScale: {
                        borderColor: "#888",
                        visible: true,
                        scaleMargins: {
                            top: 0.1,
                            bottom: 0.1,
                        },
                        autoScale: false, // Disable auto-scaling - user controls zoom
                    },
                });
                
                chartRef.current = chart;
                previousDataRef.current = []; // Reset previous data when chart is initialized
                
                // Note: Pagination listener is set up in a separate useEffect
                // to ensure it updates when oldestTimestamp changes
                
                // Check if canvas was created
                setTimeout(() => {
                    const canvas = container.querySelector('canvas');
                    if (canvas) {
                        console.log("✅ Canvas created during initialization:", canvas.width, "x", canvas.height);
                    } else {
                        console.error("❌ Canvas not created during initialization!");
                        console.log("Container after chart creation:", container.innerHTML.substring(0, 200));
                    }
                }, 50);

                // Create candlestick series
                // In lightweight-charts v5, we use addSeries with CandlestickSeries
                const candlestick = chart.addSeries(CandlestickSeries, {
                    upColor: "#22c55e",
                    downColor: "#ef4444",
                    borderVisible: false,
                    wickUpColor: "#22c55e",
                    wickDownColor: "#ef4444",
                    priceFormat: {
                        type: 'price',
                        precision: 4,
                        minMove: 0.0001,
                    },
                    lastValueVisible: false, // Disabled - current price line will show the price instead
                }) as ISeriesApi<"Candlestick">;
                candlestickSeriesRef.current = candlestick;
                
                // Helper function to calculate remaining time until candle closes
                const getCandleRemainingTime = (timeframe: string, candleTimestamp: number): string => {
                    // Parse timeframe to seconds
                    let timeframeSeconds = 60; // Default 1 minute
                    if (timeframe.endsWith('m')) {
                        timeframeSeconds = parseInt(timeframe.replace('m', '')) * 60;
                    } else if (timeframe.endsWith('h')) {
                        timeframeSeconds = parseInt(timeframe.replace('h', '')) * 3600;
                    } else if (timeframe.endsWith('d')) {
                        timeframeSeconds = parseInt(timeframe.replace('d', '')) * 86400;
                    } else if (timeframe.endsWith('w')) {
                        timeframeSeconds = parseInt(timeframe.replace('w', '')) * 604800;
                    }
                    
                    // Get current time and candle start time
                    const now = Math.floor(Date.now() / 1000);
                    const candleStart = candleTimestamp > 1000000000000 ? Math.floor(candleTimestamp / 1000) : candleTimestamp;
                    
                    // Calculate elapsed time
                    const elapsed = now - candleStart;
                    
                    // Calculate remaining time
                    const remaining = Math.max(0, timeframeSeconds - elapsed);
                    
                    // Format as MM:SS
                    const minutes = Math.floor(remaining / 60);
                    const seconds = Math.floor(remaining % 60);
                    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                };
                
                // Create current price line (color will be updated based on price changes)
                // Initial color: compare with last candle's close price if available
                let initialColor = "#ef4444"; // Default red
                let candleTimeTitle = "Current Price"; // Default title
                if (ohlcvData && ohlcvData.length > 0 && currentPrice !== null) {
                    const lastCandle = ohlcvData[ohlcvData.length - 1];
                    if (lastCandle && typeof lastCandle.c === 'number' && isFinite(lastCandle.c)) {
                        if (currentPrice > lastCandle.c) {
                            initialColor = "#22c55e"; // Green if current price is higher than last close
                        } else if (currentPrice < lastCandle.c) {
                            initialColor = "#ef4444"; // Red if current price is lower than last close
                        }
                    }
                    // Calculate remaining time until candle closes
                    if (lastCandle && lastCandle.t) {
                        const remainingTime = getCandleRemainingTime(timeframe, lastCandle.t);
                        // Format: Price on first line, timer on second line
                        candleTimeTitle = `${currentPrice.toFixed(4)}\n${remainingTime}`;
                    } else {
                        candleTimeTitle = currentPrice.toFixed(4);
                    }
                }
                
                const currentPriceLine = chart.addSeries(LineSeries, {
                    color: initialColor,
                    lineWidth: 2,
                    lineStyle: 1, // Dashed
                    title: candleTimeTitle,
                    priceLineVisible: true,
                    lastValueVisible: false,
                }) as ISeriesApi<"Line">;
                currentPriceLineRef.current = currentPriceLine;
                
                // Initialize previous price reference
                if (currentPrice !== null) {
                    previousPriceRef.current = currentPrice;
                }
                
                console.log("Chart and candlestick series initialized successfully");
                console.log("Chart container dimensions:", container.clientWidth, "x", container.clientHeight);
                console.log("Candlestick series:", candlestick);
                
                // Mark chart as ready
                setChartReady(true);
                
                // Force a resize after initialization to ensure proper rendering
                setTimeout(() => {
                    if (chartRef.current && chartContainerRef.current) {
                        const finalWidth = chartContainerRef.current.clientWidth || container.offsetWidth || 800;
                        const finalHeight = chartContainerRef.current.clientHeight || 400;
                        if (finalWidth > 0 && finalHeight > 0) {
                            chartRef.current.applyOptions({ width: finalWidth, height: finalHeight });
                            console.log("Chart resized to:", finalWidth, "x", finalHeight);
                        }
                    }
                }, 50);
            } catch (error) {
                console.error("❌ Error initializing chart:", error);
                console.error("Error details:", error instanceof Error ? error.stack : String(error));
                setChartReady(false);
            }
        };

        // Try to initialize immediately - be more aggressive about initialization
        const tryInitialize = () => {
            if (!chartContainerRef.current) {
                console.log("Chart init: Container ref not available");
                return false;
            }
            
            if (chartRef.current) {
                console.log("Chart init: Chart already exists");
                return true;
            }
            
            const container = chartContainerRef.current;
            const width = container.clientWidth || container.offsetWidth || 800;
            const height = container.clientHeight || 400;
            
            console.log("Chart init: Attempting initialization", {
                clientWidth: container.clientWidth,
                offsetWidth: container.offsetWidth,
                clientHeight: container.clientHeight,
                width,
                height
            });
            
            // Always initialize, even with fallback dimensions
            initializeChart();
            return true;
        };
        
        // Try immediately - use a small delay to ensure DOM is ready
        const initTimeout = setTimeout(() => {
            if (!chartRef.current && chartContainerRef.current && !loading) {
                console.log("Chart init: Attempting initialization after timeout");
                tryInitialize();
            }
        }, 50); // Small delay to ensure DOM is fully rendered
        
        // Also set up ResizeObserver to handle container size changes
        let resizeObserver: ResizeObserver | null = null;
        if (chartContainerRef.current && typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const { width: observedWidth, height: observedHeight } = entry.contentRect;
                    if (observedWidth > 0 && observedHeight > 0 && chartRef.current) {
                        // Resize existing chart
                        chartRef.current.applyOptions({
                            width: observedWidth,
                            height: observedHeight,
                        });
                    } else if (observedWidth > 0 && observedHeight > 0 && !chartRef.current) {
                        // Initialize if chart doesn't exist yet
                        tryInitialize();
                    }
                }
            });
            
            resizeObserver.observe(chartContainerRef.current);
        }
        
        return () => {
            clearTimeout(initTimeout);
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
        };

        // Handle resize
        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                const width = chartContainerRef.current.clientWidth;
                const height = chartContainerRef.current.clientHeight;
                if (width > 0 && height > 0) {
                    chartRef.current.applyOptions({
                        width: width,
                        height: height,
                    });
                }
            }
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            if (chartRef.current) {
                try {
                    chartRef.current.remove();
                } catch (e) {
                    console.error("Error removing chart:", e);
                }
                chartRef.current = null;
            }
            candlestickSeriesRef.current = null;
            currentPriceLineRef.current = null;
            setChartReady(false);
        };
    }, [loading]); // Re-run when loading state changes

    // Update candlestick data
    useEffect(() => {
        if (!chartContainerRef.current) {
            console.log("Skipping data update - container not ready");
            return;
        }
        
        if (!chartRef.current || !chartReady) {
            console.log("Skipping data update - chart not initialized yet (chartReady:", chartReady, ")");
            return;
        }
        
        // Verify container still exists and has canvas
        const canvas = chartContainerRef.current.querySelector('canvas');
        if (!canvas) {
            console.warn("❌ Canvas not found in container! Attempting to reinitialize chart...");
            // Try to reinitialize if canvas is missing
            if (chartRef.current) {
                try {
                    // Clear prediction series before removing chart to avoid "Value is undefined" error
                    predictionSeriesRef.current.forEach((series) => {
                        try {
                            if (chartRef.current) {
                                chartRef.current.removeSeries(series);
                            }
                        } catch (e) {
                            // Series might already be removed or chart is invalid
                            console.warn("Error removing prediction series:", e);
                        }
                    });
                    predictionSeriesRef.current.clear();
                    
                    // Note: We no longer use livePriceLineRef - we use lastValueVisible instead
                    
                    chartRef.current.remove();
                } catch (e) {
                    console.error("Error removing old chart:", e);
                }
                chartRef.current = null;
                candlestickSeriesRef.current = null;
                currentPriceLineRef.current = null;
                
                // Reinitialize chart
                const container = chartContainerRef.current;
                if (container) {
                    const width = container.clientWidth || container.offsetWidth || 800;
                    const height = container.clientHeight || 400;
                    
                    try {
                        const chart = createChart(container, {
                            width: width,
                            height: height,
                            autoSize: false,
                            layout: {
                                background: { color: "#2a2a2a" },
                                textColor: "#888",
                            },
                            grid: {
                                vertLines: { color: "#444" },
                                horzLines: { color: "#444" },
                            },
                            timeScale: {
                                timeVisible: true,
                                secondsVisible: false,
                                rightOffset: 12,
                                barSpacing: 3,
                                rightBarStaysOnScroll: false, // Disable - prevents last candle from sticking to right
                                lockVisibleTimeRangeOnResize: true, // Lock visible range when chart resizes
                            },
                            rightPriceScale: {
                                borderColor: "#888",
                                visible: true,
                                scaleMargins: {
                                    top: 0.1,
                                    bottom: 0.1,
                                },
                            },
                        });
                        
                        chartRef.current = chart;
                        const candlestick = chart.addSeries(CandlestickSeries, {
                            upColor: "#22c55e",
                            downColor: "#ef4444",
                            borderVisible: false,
                            wickUpColor: "#22c55e",
                            wickDownColor: "#ef4444",
                            priceFormat: {
                                type: 'price',
                                precision: 4,
                                minMove: 0.0001,
                            },
                            lastValueVisible: false, // Disabled - current price line will show the price instead
                        }) as ISeriesApi<"Candlestick">;
                        candlestickSeriesRef.current = candlestick;
                        
                        // Helper function to calculate remaining time until candle closes
                        const getCandleRemainingTime = (timeframe: string, candleTimestamp: number): string => {
                            // Parse timeframe to seconds
                            let timeframeSeconds = 60; // Default 1 minute
                            if (timeframe.endsWith('m')) {
                                timeframeSeconds = parseInt(timeframe.replace('m', '')) * 60;
                            } else if (timeframe.endsWith('h')) {
                                timeframeSeconds = parseInt(timeframe.replace('h', '')) * 3600;
                            } else if (timeframe.endsWith('d')) {
                                timeframeSeconds = parseInt(timeframe.replace('d', '')) * 86400;
                            } else if (timeframe.endsWith('w')) {
                                timeframeSeconds = parseInt(timeframe.replace('w', '')) * 604800;
                            }
                            
                            // Get current time and candle start time
                            const now = Math.floor(Date.now() / 1000);
                            const candleStart = candleTimestamp > 1000000000000 ? Math.floor(candleTimestamp / 1000) : candleTimestamp;
                            
                            // Calculate elapsed time
                            const elapsed = now - candleStart;
                            
                            // Calculate remaining time
                            const remaining = Math.max(0, timeframeSeconds - elapsed);
                            
                            // Format as MM:SS
                            const minutes = Math.floor(remaining / 60);
                            const seconds = Math.floor(remaining % 60);
                            return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                        };
                        
                        // Recreate current price line (color will be updated based on price changes)
                        // Initial color: compare with last candle's close price if available
                        let initialColor = "#ef4444"; // Default red
                        let candleTimeTitle = "Current Price"; // Default title
                        if (ohlcvData && ohlcvData.length > 0 && currentPrice !== null) {
                            const lastCandle = ohlcvData[ohlcvData.length - 1];
                            if (lastCandle && typeof lastCandle.c === 'number' && isFinite(lastCandle.c)) {
                                if (currentPrice > lastCandle.c) {
                                    initialColor = "#22c55e"; // Green if current price is higher than last close
                                } else if (currentPrice < lastCandle.c) {
                                    initialColor = "#ef4444"; // Red if current price is lower than last close
                                }
                            }
                            // Calculate remaining time until candle closes
                            if (lastCandle && lastCandle.t) {
                                const remainingTime = getCandleRemainingTime(timeframe, lastCandle.t);
                                // Format: Price on first line, timer on second line
                                candleTimeTitle = `${currentPrice.toFixed(4)}\n${remainingTime}`;
                            } else {
                                candleTimeTitle = currentPrice.toFixed(4);
                            }
                        }
                        
                        const currentPriceLine = chart.addSeries(LineSeries, {
                            color: initialColor,
                            lineWidth: 2,
                            lineStyle: 1, // Dashed
                            title: candleTimeTitle,
                            priceLineVisible: true,
                            lastValueVisible: false,
                        }) as ISeriesApi<"Line">;
                        currentPriceLineRef.current = currentPriceLine;
                        
                        // Initialize previous price reference
                        if (currentPrice !== null) {
                            previousPriceRef.current = currentPrice;
                        }
                        
                        previousDataRef.current = []; // Reset previous data when chart is reinitialized
                        setChartReady(true); // Mark chart as ready after reinitialization
                        
                        // Note: Pagination listener is set up in a separate useEffect
                        
                        console.log("✅ Chart reinitialized successfully");
                    } catch (error) {
                        console.error("Error reinitializing chart:", error);
                        return;
                    }
                } else {
                    return;
                }
            } else {
                return;
            }
        }
        
        if (!candlestickSeriesRef.current) {
            console.log("Skipping data update - series not ready");
            return;
        }
        
        if (ohlcvData.length === 0) {
            // Clear data if empty
            console.log("OHLCV data is empty, clearing chart");
            candlestickSeriesRef.current.setData([]);
            previousDataRef.current = []; // Reset previous data reference
            return;
        }

        console.log("Updating chart with", ohlcvData.length, "candles");

        try {
            // Optimized validation - single pass with minimal checks
            const validatedData: CandlestickData[] = [];
            
            for (let i = 0; i < ohlcvData.length; i++) {
                const candle = ohlcvData[i];
                if (!candle || typeof candle !== "object") continue;
                
                // Quick validation - check if values exist and are numbers
                const t = candle.t;
                const o = candle.o;
                let h = candle.h;
                let l = candle.l;
                const c = candle.c;
                
                // Single validation check
                if (typeof t !== "number" || typeof o !== "number" || typeof h !== "number" || 
                    typeof l !== "number" || typeof c !== "number" ||
                    !isFinite(t) || !isFinite(o) || !isFinite(h) || !isFinite(l) || !isFinite(c)) {
                    continue;
                }
                
                // Basic logical check - ensure high >= low
                if (h < l) {
                    console.warn("Invalid candle: high < low, fixing...", { t, o, h, l, c });
                    // Fix invalid candle by swapping if needed
                    const temp = h;
                    h = l;
                    l = temp;
                }
                
                // Ensure high >= open and close, low <= open and close
                // For real-time candles, high/low might not be fully formed yet, so be lenient
                if (h < Math.max(o, c)) {
                    h = Math.max(o, c, h);
                }
                if (l > Math.min(o, c)) {
                    l = Math.min(o, c, l);
                }
                
                // Convert timestamp to seconds if needed
                let timestamp = t;
                if (timestamp > 1000000000000) {
                    timestamp = Math.floor(timestamp / 1000);
                }
                
                if (timestamp <= 0 || !isFinite(timestamp)) {
                    continue;
                }
                
                // Create clean candle object with corrected values
                validatedData.push({
                    time: timestamp as UTCTimestamp,
                    open: o,
                    high: h, // Already corrected above
                    low: l,  // Already corrected above
                    close: c,
                });
            }

            // CRITICAL: Sort by time (oldest to newest) - lightweight-charts requires sorted data
            validatedData.sort((a, b) => Number(a.time) - Number(b.time));
            
            console.log("Validated data count:", validatedData.length, "First:", validatedData[0], "Last:", validatedData[validatedData.length - 1]);
            
            if (validatedData.length > 0) {
                try {
                    if (!candlestickSeriesRef.current) {
                        console.error("Candlestick series not available");
                        return;
                    }
                    
                    // Check if only the last candle was updated (real-time update)
                    const previousData = previousDataRef.current;
                    const hasPreviousData = previousData.length > 0;
                    const hasData = validatedData.length > 0;
                    
                    // Determine update strategy
                    let isRealTimeUpdate = false;
                    let isNewCandle = false;
                    
                    if (hasPreviousData && hasData) {
                        const sameLength = validatedData.length === previousData.length;
                        const lastPrev = previousData[previousData.length - 1];
                        const lastCurr = validatedData[validatedData.length - 1];
                        const sameTime = Number(lastCurr.time) === Number(lastPrev.time);
                        
                        // Check if a new candle was added (different time or different length)
                        if (!sameTime || !sameLength) {
                            // Different time = new candle added OR length changed
                            isNewCandle = true;
                            isRealTimeUpdate = false; // Force full update when new candle exists
                        } else if (sameLength && sameTime) {
                            // Same candle, check if price changed
                            const priceChanged = 
                                lastCurr.close !== lastPrev.close ||
                                lastCurr.high !== lastPrev.high ||
                                lastCurr.low !== lastPrev.low ||
                                lastCurr.open !== lastPrev.open;
                            
                            isRealTimeUpdate = priceChanged;
                        }
                        
                        console.log("Update strategy check:", {
                            sameLength,
                            sameTime,
                            isRealTimeUpdate,
                            isNewCandle,
                            prevTime: lastPrev.time,
                            currTime: lastCurr.time,
                            prevClose: lastPrev.close,
                            currClose: lastCurr.close,
                            prevLength: previousData.length,
                            currLength: validatedData.length,
                        });
                    } else if (!hasPreviousData && hasData) {
                        // First time loading data
                        console.log("First time loading data");
                    }
                    
                    // Always ensure the last candle is rendered
                    // IMPORTANT: If new candle exists, use setData() to add it properly
                    if (isRealTimeUpdate && !isNewCandle) {
                        // Real-time update: only update the last candle using update() method
                        // This is more efficient and doesn't require re-rendering the entire chart
                        const lastCandle = validatedData[validatedData.length - 1];
                        console.log("🔄 Real-time update: updating last candle", {
                            time: lastCandle.time,
                            open: lastCandle.open,
                            high: lastCandle.high,
                            low: lastCandle.low,
                            close: lastCandle.close
                        });
                        
                        // Ensure we have all required fields for the update
                        const updateData: CandlestickData = {
                            time: lastCandle.time,
                            open: lastCandle.open,
                            high: lastCandle.high,
                            low: lastCandle.low,
                            close: lastCandle.close,
                        };
                        
                        try {
                            // Get current visible range BEFORE update to preserve scroll position
                            // Even though update() shouldn't change position, lightweight-charts may auto-scroll
                            let savedVisibleRange: IRange<Time> | null = null;
                            
                            if (chartRef.current) {
                                const visibleRange = chartRef.current.timeScale().getVisibleRange();
                                if (visibleRange) {
                                    // Save the current visible range to restore after update
                                    savedVisibleRange = {
                                        from: visibleRange.from,
                                        to: visibleRange.to,
                                    };
                                }
                            }
                            
                            // Use update() method for real-time updates - this is more efficient
                            // The time must exactly match an existing candle in the series
                            candlestickSeriesRef.current.update(updateData);
                            console.log("✅ Real-time candle updated successfully via update()");
                            
                            // Store current data for next comparison
                            previousDataRef.current = validatedData;
                            
                            // IMPORTANT: Do NOT restore position after update() - it may cause the chart to stick to right
                            // update() should NOT change scroll position with rightBarStaysOnScroll: false
                            // Restoring position with setVisibleRange() may actually cause the problem
                        } catch (updateError) {
                            console.error("❌ Error updating real-time candle:", updateError);
                            console.log("Error details:", updateError instanceof Error ? updateError.message : String(updateError));
                            // Fallback: preserve position and use setData() with saved range
                            console.log("Falling back to setData() with position preservation");
                            try {
                                // Get current visible range before setData()
                                let savedRange: IRange<Time> | null = null;
                                if (chartRef.current) {
                                    const currentRange = chartRef.current.timeScale().getVisibleRange();
                                    if (currentRange) {
                                        savedRange = {
                                            from: currentRange.from,
                                            to: currentRange.to,
                                        };
                                    }
                                }
                                
                                // Use setData() as fallback
                                candlestickSeriesRef.current.setData(validatedData);
                                previousDataRef.current = validatedData;
                                
                                // IMPORTANT: Do NOT restore position after setData() - it may cause the chart to stick to right
                                // With rightBarStaysOnScroll: false, the chart should NOT auto-scroll
                                console.log("✅ Fallback update successful");
                            } catch (fallbackError) {
                                console.error("Fallback update also failed:", fallbackError);
                                // Last resort: just set data without position preservation
                                try {
                                    candlestickSeriesRef.current.setData(validatedData);
                                    previousDataRef.current = validatedData;
                                } catch (finalError) {
                                    console.error("Final fallback also failed:", finalError);
                                }
                            }
                        }
                    } else {
                        // Full data update: new candles added, structure changed, or first load
                        console.log("📊 Full data update: setting all candles", {
                            isNewCandle,
                            hasPreviousData,
                            dataLength: validatedData.length,
                        });
                        
                        // Ensure chart is properly sized before setting data
                        if (chartRef.current && chartContainerRef.current) {
                            const width = chartContainerRef.current.clientWidth;
                            const height = chartContainerRef.current.clientHeight;
                            if (width > 0 && height > 0) {
                                chartRef.current.applyOptions({ width: width, height: height });
                            }
                        }
                        
                        // Get current visible time range BEFORE setting data to preserve scroll position
                        let savedVisibleRange: IRange<Time> | null = null;
                        
                        if (chartRef.current) {
                            const currentRange = chartRef.current.timeScale().getVisibleRange();
                            if (currentRange) {
                                // Save the current visible range to restore it after setData()
                                savedVisibleRange = {
                                    from: currentRange.from,
                                    to: currentRange.to,
                                };
                            }
                        }
                        
                        candlestickSeriesRef.current.setData(validatedData);
                        
                        // Store current data for next comparison
                        previousDataRef.current = validatedData;
                        
                        // Keep lastValueVisible false - current price line will show the price instead
                        candlestickSeriesRef.current.applyOptions({
                            lastValueVisible: false,
                        });
                        
                        // IMPORTANT: Do NOT restore position after setData() - it may cause the chart to stick to right
                        // With rightBarStaysOnScroll: false, the chart should NOT auto-scroll
                        // Restoring position with setVisibleRange() may actually cause the problem
                    }
                    
                    console.log("✅ Chart data updated successfully");
                } catch (setError) {
                    console.error("Error setting chart data:", setError);
                    if (candlestickSeriesRef.current) {
                        candlestickSeriesRef.current.setData([]);
                    }
                }
            } else {
                if (candlestickSeriesRef.current) {
                    candlestickSeriesRef.current.setData([]);
                }
            }
        } catch (error) {
            console.error("Error setting candlestick data:", error);
            try {
                candlestickSeriesRef.current.setData([]);
            } catch (e) {
                console.error("Error clearing chart data:", e);
            }
        }
    }, [ohlcvData, chartReady]);

    // Update prediction lines
    useEffect(() => {
        if (!chartRef.current) return;

        const chart = chartRef.current;

        // Remove old prediction series
        predictionSeriesRef.current.forEach((series) => {
            chart.removeSeries(series);
        });
        predictionSeriesRef.current.clear();

        // Add new prediction series for selected horizons
        selectedHorizons.forEach((horizon) => {
            const pred = predictions[horizon];
            if (!pred) return;

            const predictionLine = chart.addSeries(LineSeries, {
                color: "#8b5cf6",
                lineWidth: 2,
                lineStyle: 1, // Dashed
                title: `${horizon} Target`,
            }) as ISeriesApi<"Line">;

            // Create prediction data points (extend to future)
            if (ohlcvData.length > 0) {
                const lastCandle = ohlcvData[0]; // Most recent
                // Convert timestamp to seconds (if in milliseconds) or use as is
                const lastTime = lastCandle.t > 1000000000000 ? Math.floor(lastCandle.t / 1000) : lastCandle.t;
                
                // Add prediction point at the end
                predictionLine.setData([
                    {
                        time: lastTime as Time,
                        value: pred.predicted_price,
                    },
                ]);
            }

            predictionSeriesRef.current.set(horizon, predictionLine);
        });
    }, [selectedHorizons, predictions, ohlcvData]);

    // Update ref when oldestTimestamp changes
    useEffect(() => {
        oldestTimestampRef.current = oldestTimestamp;
    }, [oldestTimestamp]);

    // Update pagination listener when oldestTimestamp changes
    useEffect(() => {
        if (!chartRef.current || !onLoadMore) {
            return;
        }
        
        const chart = chartRef.current;
        let lastLoadTime = 0;
        const loadCooldown = 1000; // 1 second cooldown
        
        if (!oldestTimestamp) {
            console.log("Pagination listener: No oldestTimestamp yet");
            return;
        }
        
        console.log("Setting up pagination listener with oldestTimestamp:", oldestTimestamp);
        
        // Helper function to convert Time to number
        const timeToNumber = (time: Time): number => {
            if (typeof time === 'number') {
                return time;
            }
            if (typeof time === 'string') {
                // If it's a string, parse it as a timestamp
                return new Date(time).getTime() / 1000;
            }
            // If it's a BusinessDay object, convert it to a timestamp
            const businessDay = time as BusinessDay;
            const date = new Date(businessDay.year, businessDay.month - 1, businessDay.day);
            return Math.floor(date.getTime() / 1000);
        };
        
        // Create the listener function
        const listener = (timeRange: IRange<Time> | null) => {
            if (!timeRange || !timeRange.from || !timeRange.to) {
                return;
            }
            
            if (loadingMore || isLoadingRef.current) {
                return;
            }
            
            // Get current oldestTimestamp from ref to ensure we have the latest value
            // This avoids closure issues when oldestTimestamp changes
            const currentOldest = oldestTimestampRef.current;
            if (!currentOldest) {
                return;
            }
            
            const now = Date.now();
            if (now - lastLoadTime < loadCooldown) {
                return;
            }
            
            const visibleStart = timeToNumber(timeRange.from);
            const visibleEnd = timeToNumber(timeRange.to);
            const oldestVisible = currentOldest;
            const visibleRange = visibleEnd - visibleStart;
            
            // Normalize all timestamps to seconds
            const oldestVisibleSeconds = oldestVisible > 1000000000000 ? oldestVisible / 1000 : oldestVisible;
            const visibleStartSeconds = visibleStart > 1000000000000 ? visibleStart / 1000 : visibleStart;
            const visibleRangeSeconds = visibleRange > 1000000000000 ? visibleRange / 1000 : visibleRange;
            
            // Calculate threshold: trigger when user scrolls within 90% of the visible range from oldest data
            // Very sensitive threshold to trigger loading early
            const thresholdPercent = 0.9;
            const thresholdSeconds = oldestVisibleSeconds - (visibleRangeSeconds * thresholdPercent);
            
            // Also trigger if user is very close to the oldest data (within 30% of range)
            const closeThresholdPercent = 0.3;
            const closeThresholdSeconds = oldestVisibleSeconds - (visibleRangeSeconds * closeThresholdPercent);
            
            // Debug logging
            const distanceFromOldest = oldestVisibleSeconds - visibleStartSeconds;
            const percentFromOldest = visibleRangeSeconds > 0 ? (distanceFromOldest / visibleRangeSeconds) * 100 : 0;
            const shouldTrigger = visibleStartSeconds <= thresholdSeconds || visibleStartSeconds <= closeThresholdSeconds;
            
            // Only log when close to threshold to reduce console spam
            if (percentFromOldest < 100 || shouldTrigger) {
                console.log("Pagination check:", {
                    visibleStart: visibleStartSeconds,
                    oldest: oldestVisibleSeconds,
                    distance: distanceFromOldest,
                    percent: percentFromOldest.toFixed(1) + "%",
                    threshold: thresholdSeconds,
                    closeThreshold: closeThresholdSeconds,
                    shouldTrigger: shouldTrigger,
                    loadingMore: loadingMore,
                    isLoading: isLoadingRef.current
                });
            }
            
            // Trigger loading when visible start is at or before the threshold
            // This will trigger when user scrolls left or zooms out
            if (shouldTrigger) {
                isLoadingRef.current = true;
                lastLoadTime = now;
                console.log("🚀 Triggering load more. Visible start:", visibleStartSeconds, "Oldest:", oldestVisibleSeconds, "Threshold:", thresholdSeconds, "Close threshold:", closeThresholdSeconds, "Range:", visibleRangeSeconds);
                // onLoadMore expects milliseconds
                onLoadMore(Math.floor(oldestVisibleSeconds * 1000));
                setTimeout(() => {
                    isLoadingRef.current = false;
                }, 2000);
            }
        };
        
        // Subscribe to time range changes
        // Note: subscribeVisibleTimeRangeChange returns void, not an unsubscribe function
        // The listener will be cleaned up when the chart is destroyed or the effect re-runs
        chart.timeScale().subscribeVisibleTimeRangeChange(listener);
        
        // Also set up a periodic check as fallback (every 1 second for better responsiveness)
        const intervalId = setInterval(() => {
            if (!chartRef.current || loadingMore || isLoadingRef.current) return;
            
            try {
                const timeRange = chartRef.current.timeScale().getVisibleRange();
                // Use ref to get latest oldestTimestamp
                if (timeRange && timeRange.from && timeRange.to && oldestTimestampRef.current) {
                    listener(timeRange);
                }
            } catch (e) {
                // Chart might be destroyed
                clearInterval(intervalId);
            }
        }, 1000); // Increased frequency to 1 second for better responsiveness
        
        // Store cleanup function
        paginationListenerRef.current = () => {
            clearInterval(intervalId);
        };
        
        // Cleanup on unmount or when dependencies change
        return () => {
            clearInterval(intervalId);
            paginationListenerRef.current = null;
            // Note: subscribeVisibleTimeRangeChange doesn't return an unsubscribe function
            // The listener will be cleaned up when the chart is destroyed
        };
    }, [oldestTimestamp, onLoadMore, loadingMore]);

    // Update current price line when currentPrice changes
    useEffect(() => {
        if (!chartRef.current || !currentPriceLineRef.current || !currentPrice || ohlcvData.length === 0) {
            return;
        }
        
        const currentPriceLine = currentPriceLineRef.current;
        const previousPrice = previousPriceRef.current;
        
        // Determine color based on price change
        let lineColor = "#ef4444"; // Default red
        if (previousPrice !== null) {
            if (currentPrice > previousPrice) {
                lineColor = "#22c55e"; // Green for price increase
            } else if (currentPrice < previousPrice) {
                lineColor = "#ef4444"; // Red for price decrease
            }
            // If price is the same, keep previous color
        }
        
        // Update line color if price changed
        if (previousPrice !== null && currentPrice !== previousPrice) {
            try {
                currentPriceLine.applyOptions({
                    color: lineColor,
                });
            } catch (error) {
                console.error("Error updating current price line color:", error);
            }
        }
        
        // Helper function to calculate remaining time until candle closes
        const getCandleRemainingTime = (timeframe: string, candleTimestamp: number): string => {
            // Parse timeframe to seconds
            let timeframeSeconds = 60; // Default 1 minute
            if (timeframe.endsWith('m')) {
                timeframeSeconds = parseInt(timeframe.replace('m', '')) * 60;
            } else if (timeframe.endsWith('h')) {
                timeframeSeconds = parseInt(timeframe.replace('h', '')) * 3600;
            } else if (timeframe.endsWith('d')) {
                timeframeSeconds = parseInt(timeframe.replace('d', '')) * 86400;
            } else if (timeframe.endsWith('w')) {
                timeframeSeconds = parseInt(timeframe.replace('w', '')) * 604800;
            }
            
            // Get current time and candle start time
            const now = Math.floor(Date.now() / 1000);
            const candleStart = candleTimestamp > 1000000000000 ? Math.floor(candleTimestamp / 1000) : candleTimestamp;
            
            // Calculate elapsed time
            const elapsed = now - candleStart;
            
            // Calculate remaining time
            const remaining = Math.max(0, timeframeSeconds - elapsed);
            
            // Format as MM:SS
            const minutes = Math.floor(remaining / 60);
            const seconds = Math.floor(remaining % 60);
            return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        };
        
        // Get the first and last timestamps from ohlcvData to create a horizontal line across the entire chart
        const firstCandle = ohlcvData[0];
        const lastCandle = ohlcvData[ohlcvData.length - 1];
        
        const firstTimestamp = firstCandle.t > 1000000000000 ? Math.floor(firstCandle.t / 1000) : firstCandle.t;
        const lastTimestamp = lastCandle.t > 1000000000000 ? Math.floor(lastCandle.t / 1000) : lastCandle.t;
        
        // Calculate remaining time until candle closes for title
        let candleTimeTitle = "Current Price";
        if (lastCandle && lastCandle.t && currentPrice !== null) {
            const remainingTime = getCandleRemainingTime(timeframe, lastCandle.t);
            // Format: Price on first line, timer on second line
            candleTimeTitle = `${currentPrice.toFixed(4)}\n${remainingTime}`;
        } else if (currentPrice !== null) {
            candleTimeTitle = currentPrice.toFixed(8);
        }
        
        // Update title with candle time - put timer under price using newline
        try {
            currentPriceLine.applyOptions({
                title: candleTimeTitle,
            });
        } catch (error) {
            console.error("Error updating current price line title:", error);
        }
        
        // Get current visible range BEFORE updating price line to preserve scroll position
        let savedVisibleRange: IRange<Time> | null = null;
        if (chartRef.current) {
            const visibleRange = chartRef.current.timeScale().getVisibleRange();
            if (visibleRange) {
                savedVisibleRange = {
                    from: visibleRange.from,
                    to: visibleRange.to,
                };
            }
        }
        
        // Create a horizontal line by setting the same price at both start and end timestamps
        try {
            currentPriceLine.setData([
                {
                    time: firstTimestamp as UTCTimestamp,
                    value: currentPrice,
                },
                {
                    time: lastTimestamp as UTCTimestamp,
                    value: currentPrice,
                },
            ]);
            console.log("✅ Current price line updated:", { 
                price: currentPrice, 
                previousPrice: previousPrice,
                color: lineColor,
                title: candleTimeTitle,
                from: firstTimestamp, 
                to: lastTimestamp 
            });
            
            // IMPORTANT: Do NOT restore position after currentPriceLine.setData() - it may cause the chart to stick to right
            // Restoring position with setVisibleRange() may actually cause the problem
            // With rightBarStaysOnScroll: false, the chart should NOT auto-scroll
        } catch (error) {
            console.error("Error updating current price line:", error);
        }
        
        // Update previous price reference
        previousPriceRef.current = currentPrice;
    }, [currentPrice, currentPriceTime, ohlcvData, timeframe]);
    
    // Update candle remaining time every second
    useEffect(() => {
        if (!chartRef.current || !currentPriceLineRef.current || ohlcvData.length === 0) {
            return;
        }
        
        const currentPriceLine = currentPriceLineRef.current;
        const lastCandle = ohlcvData[ohlcvData.length - 1];
        
        if (!lastCandle || !lastCandle.t) {
            return;
        }
        
        // Helper function to calculate remaining time
        const getCandleRemainingTime = (timeframe: string, candleTimestamp: number): string => {
            let timeframeSeconds = 60;
            if (timeframe.endsWith('m')) {
                timeframeSeconds = parseInt(timeframe.replace('m', '')) * 60;
            } else if (timeframe.endsWith('h')) {
                timeframeSeconds = parseInt(timeframe.replace('h', '')) * 3600;
            } else if (timeframe.endsWith('d')) {
                timeframeSeconds = parseInt(timeframe.replace('d', '')) * 86400;
            } else if (timeframe.endsWith('w')) {
                timeframeSeconds = parseInt(timeframe.replace('w', '')) * 604800;
            }
            
            const now = Math.floor(Date.now() / 1000);
            const candleStart = candleTimestamp > 1000000000000 ? Math.floor(candleTimestamp / 1000) : candleTimestamp;
            const elapsed = now - candleStart;
            const remaining = Math.max(0, timeframeSeconds - elapsed);
            
            const minutes = Math.floor(remaining / 60);
            const seconds = Math.floor(remaining % 60);
            return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        };
        
        // Update title every second - put timer under price using newline
        const interval = setInterval(() => {
            try {
                const remainingTime = getCandleRemainingTime(timeframe, lastCandle.t);
                // Get current price from the line data
                const lineData = currentPriceLine.data();
                const currentPriceValue = lineData && lineData.length > 0 
                    ? (lineData[lineData.length - 1] as LineData).value 
                    : null;
                
                // Format: Price on first line, timer on second line
                const priceFormatted = currentPriceValue !== null 
                    ? currentPriceValue.toFixed(4) 
                    : "";
                const titleWithTimer = priceFormatted 
                    ? `${priceFormatted}\n${remainingTime}`
                    : remainingTime;
                
                currentPriceLine.applyOptions({
                    title: titleWithTimer,
                });
            } catch (error) {
                console.error("Error updating candle remaining time:", error);
            }
        }, 1000);
        
        return () => clearInterval(interval);
    }, [ohlcvData, timeframe]);
    
    // REMOVED: Auto-scroll to new candle - user should control chart position manually
    // This was causing the chart to jump around when candles were updated

    // Get prediction labels for display
    const predictionLabels = selectedHorizons
        .map((horizon) => {
            const pred = predictions[horizon];
            if (!pred) return null;
            return {
                horizon,
                price: pred.predicted_price,
                change: pred.price_change_percent * 100,
            };
        })
        .filter(Boolean) as Array<{ horizon: string; price: number; change: number }>;

    return (
        <div
            style={{
                width: "100%",
                backgroundColor: "#1a1a1a",
                borderRadius: "12px",
                padding: "13px",
                border: "1px solid rgba(255, 174, 0, 0.2)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
            }}
        >
            {/* Top Control Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                {/* Left Side: Timeframe Selection and AI Horizons */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                {/* Timeframe Selection */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {timeframes.map((tf) => (
                        <button
                            key={tf.value}
                            onClick={() => onTimeframeChange(tf.value)}
                            style={{
                                padding: "2px 4px",
                                fontSize: "8px",
                                backgroundColor: timeframe === tf.value ? "#FFAE00" : "#2a2a2a",
                                color: timeframe === tf.value ? "#1a1a1a" : "#ffffff",
                                border: `1px solid ${timeframe === tf.value ? "#FFAE00" : "rgba(255, 174, 0, 0.3)"}`,
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontWeight: timeframe === tf.value ? "600" : "400",
                                transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                                if (timeframe !== tf.value) {
                                    e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.1)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (timeframe !== tf.value) {
                                    e.currentTarget.style.backgroundColor = "#2a2a2a";
                                }
                            }}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>

                    {/* AI Horizons Selection */}
                    <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "12px",
                        padding: "4px 8px",
                        backgroundColor: "#1a1a1a",
                       /*  borderRadius: "6px",
                        border: "1px solid rgba(255, 174, 0, 0.2)" */
                    }}>
                        <span style={{ color: "#ffffff", fontSize: "12px", fontWeight: "500" }}>AI Horizons:</span>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                            {availableHorizons.map((horizon) => (
                                <label
                                    key={horizon}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        cursor: "pointer",
                                        color: "#ffffff",
                                        fontSize: "11px",
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedHorizons.includes(horizon)}
                                        onChange={() => onHorizonToggle(horizon)}
                                        style={{
                                            width: "14px",
                                            height: "14px",
                                            cursor: "pointer",
                                            accentColor: "#8b5cf6",
                                        }}
                                    />
                                    <span>[{horizon}]</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Side: Refresh Timer */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#888", fontSize: "13px" }}>
                    <span>🕐</span>
                    <span>{refreshInterval}s</span>
                </div>
            </div>

            {/* Main Chart Area with Toolbar */}
            <div
                style={{
                    display: "flex",
                    gap: "4px",
                    backgroundColor: "#2a2a2a",
                    borderRadius: "8px",
                    padding: "16px 16px 16px 8px",
                    minHeight: "450px",
                    alignItems: "flex-start",
                }}
            >
                {/* Drawing Tools Toolbar - Left Side */}
                {chartReady && (
                    <div style={{ display: "flex", flexDirection: "column", height: "100%", alignItems: "flex-start" }}>
                        <DrawingToolsToolbar
                            activeTool={activeDrawingTool}
                            onToolChange={setActiveDrawingTool}
                            onLockAll={() => setDrawingsLocked(true)}
                            onUnlockAll={() => setDrawingsLocked(false)}
                            onToggleVisibility={() => setDrawingsVisible(!drawingsVisible)}
                            onDeleteAll={() => {
                                // Clear all drawings
                                if (chartRef.current && candlestickSeriesRef.current) {
                                    drawingsRef.current.forEach((drawing) => {
                                        try {
                                            candlestickSeriesRef.current?.detachPrimitive(drawing.primitive as any);
                                        } catch (e) {
                                            console.warn("Error removing drawing:", e);
                                        }
                                    });
                                    drawingsRef.current = [];
                                }
                            }}
                            isLocked={drawingsLocked}
                            isVisible={drawingsVisible}
                        />
                    </div>
                )}

                {/* Chart Container - Right Side */}
                <div style={{
                    flex: "1",
                    position: "relative",
                    minWidth: "600px",
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                }}>
                    <div style={{ color: "#ffffff", fontSize: "14px", marginBottom: "8px", fontWeight: "500" }}>
                    Main Chart Area
                </div>
                {loading ? (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: "1", minHeight: "450px", color: "#888" }}>
                        Loading chart data...
                    </div>
                ) : (
                    <>
                        <div 
                            ref={chartContainerRef} 
                            style={{ 
                                width: "100%", 
                                    flex: "1",
                                    minHeight: "450px",
                                minWidth: "600px",
                                position: "relative",
                                zIndex: 1,
                                display: "block",
                                visibility: "visible",
                            }} 
                        />
                        {loadingMore && (
                            <div style={{ 
                                position: "absolute", 
                                top: "10px", 
                                left: "50%", 
                                transform: "translateX(-50%)",
                                backgroundColor: "rgba(255, 174, 0, 0.9)",
                                color: "#1a1a1a",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "600",
                                zIndex: 10,
                                pointerEvents: "none",
                            }}>
                                Loading more data...
                            </div>
                        )}
                        {ohlcvData.length === 0 && !loading && (
                            <div style={{ 
                                position: "absolute", 
                                top: "50%", 
                                left: "50%", 
                                transform: "translate(-50%, -50%)",
                                color: "#888",
                                fontSize: "14px",
                                pointerEvents: "none",
                            }}>
                                No chart data available
                            </div>
                        )}
                    </>
                )}

                {/* Prediction Labels */}
                {predictionLabels.length > 0 && (
                    <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {predictionLabels.map((label) => {
                            const isPositive = label.change >= 0;
                            return (
                                <div
                                    key={label.horizon}
                                    style={{
                                        backgroundColor: "#8b5cf6",
                                        color: "#ffffff",
                                        padding: "4px 8px",
                                        borderRadius: "4px",
                                        fontSize: "11px",
                                        fontWeight: "500",
                                    }}
                                >
                                    {label.horizon.toUpperCase()} Target: ${label.price.toFixed(4)} ({isPositive ? "+" : ""}
                                    {label.change.toFixed(1)}%)
                                </div>
                            );
                        })}
                    </div>
                )}
                </div>
            </div>
        </div>
    );
}

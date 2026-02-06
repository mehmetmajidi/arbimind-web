"use client";

import { useMemo, useState, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import {
    ComposedChart,
    Bar,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
    Cell,
    Brush,
} from "recharts";
import { LiquidationMapResponse, DEFAULT_EXCHANGE_COLORS } from "@/types/liquidation";

interface LiquidationMapProps {
    data: LiquidationMapResponse | null;
    loading?: boolean;
    error?: string | null;
    enableZoom?: boolean; // Enable zoom and pan
    enableAnimation?: boolean; // Enable animation
    showWatermark?: boolean; // Show watermark
    onExport?: () => void; // Export callback
}

// Custom Tooltip for dark theme
interface TooltipPayloadItem {
    name: string;
    value: number;
    color: string;
    dataKey: string;
    payload?: Record<string, unknown>;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) => {
    if (active && payload && payload.length > 0) {
        const data = payload[0].payload as Record<string, unknown>;
        const price = typeof data.price === "number" ? data.price : 0;
        const shortLiquidation = typeof data.short_liquidation === "number" ? data.short_liquidation : 0;
        const longLiquidation = typeof data.long_liquidation === "number" ? data.long_liquidation : 0;
        const exchangeBreakdown = data.exchange_breakdown as Record<string, number> | undefined;
        
        return (
            <div
                style={{
                    backgroundColor: "#202020",
                    border: "1px solid #2a2a2a",
                    borderRadius: "6px",
                    padding: "12px",
                    color: "#ededed",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
                }}
            >
                <div style={{ marginBottom: "8px", fontWeight: "600", color: "#FFAE00" }}>
                    Price: ${price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div style={{ marginBottom: "4px" }}>
                    <span style={{ color: "#ef4444" }}>Short:</span>{" "}
                    ${(shortLiquidation / 1e9).toFixed(2)}B
                </div>
                <div style={{ marginBottom: "4px" }}>
                    <span style={{ color: "#22c55e" }}>Long:</span>{" "}
                    ${(longLiquidation / 1e9).toFixed(2)}B
                </div>
                {exchangeBreakdown && Object.keys(exchangeBreakdown).length > 0 && (
                    <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #2a2a2a" }}>
                        <div style={{ fontWeight: "600", marginBottom: "4px" }}>By Exchange:</div>
                        {Object.entries(exchangeBreakdown).map(([exchange, amount]) => (
                            <div key={exchange} style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                                <span>{exchange}:</span>
                                <span>${(amount / 1e9).toFixed(2)}B</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }
    return null;
};

const LiquidationMap = forwardRef<{ handleExport: () => void }, LiquidationMapProps>(({ 
    data, 
    loading = false, 
    error = null,
    enableZoom = true,
    enableAnimation = true,
    showWatermark = false,
    onExport,
}, ref) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [zoomDomain, setZoomDomain] = useState<[number, number] | undefined>(undefined);
    
    // Transform data for Recharts
    const chartData = useMemo(() => {
        if (!data || !data.data || data.data.length === 0) return [];

        return data.data.map((item) => {
            const result: Record<string, number | string> = {
                price: item.price,
                short_liquidation: item.short_liquidation / 1e9, // Convert to billions
                long_liquidation: item.long_liquidation / 1e9, // Convert to billions
            };

            // Add exchange breakdown for stacked bars
            // Note: exchange_breakdown contains total liquidation per exchange
            // We need to split it proportionally between short and long
            if (item.exchange_breakdown) {
                const totalLiquidation = item.short_liquidation + item.long_liquidation;
                Object.entries(item.exchange_breakdown).forEach(([exchange, amount]) => {
                    // Calculate proportion of this exchange's liquidation
                    const exchangeProportion = totalLiquidation > 0 ? amount / totalLiquidation : 0;
                    // Split proportionally between short and long
                    result[`${exchange}_short`] = totalLiquidation > 0
                        ? (exchangeProportion * item.short_liquidation) / 1e9
                        : 0;
                    result[`${exchange}_long`] = totalLiquidation > 0
                        ? (exchangeProportion * item.long_liquidation) / 1e9
                        : 0;
                });
            }

            return result;
        });
    }, [data]);

    // Get unique exchanges from data
    const exchanges = useMemo(() => {
        if (!data || !data.exchanges) return [];
        return data.exchanges;
    }, [data]);

    // Format price for X-axis (memoized)
    const formatPrice = useMemo(() => {
        return (value: number) => {
            return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        };
    }, []);

    // Format liquidation amount for Y-axis (memoized)
    const formatLiquidation = useMemo(() => {
        return (value: number) => {
            return `${value.toFixed(2)}B`;
        };
    }, []);

    // Handle brush change for zoom (memoized)
    const handleBrushChange = useCallback((domain: { startIndex?: number; endIndex?: number } | null) => {
        if (domain && domain.startIndex !== undefined && domain.endIndex !== undefined && chartData.length > 0) {
            const startPrice = chartData[domain.startIndex]?.price as number;
            const endPrice = chartData[domain.endIndex]?.price as number;
            if (startPrice && endPrice) {
                setZoomDomain([startPrice, endPrice]);
            }
        } else {
            setZoomDomain(undefined);
        }
    }, [chartData]);

    // Export chart as image (using SVG to canvas) - memoized
    const handleExport = useCallback(async () => {
        if (!chartContainerRef.current || !data) return;
        
        try {
            // Find SVG element
            const svgElement = chartContainerRef.current.querySelector("svg");
            if (!svgElement) return;

            // Clone SVG
            const clonedSvg = svgElement.cloneNode(true) as SVGElement;
            
            // Set background
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("width", "100%");
            rect.setAttribute("height", "100%");
            rect.setAttribute("fill", "#2a2a2a");
            clonedSvg.insertBefore(rect, clonedSvg.firstChild);

            // Convert SVG to data URL
            const svgData = new XMLSerializer().serializeToString(clonedSvg);
            const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
            const svgUrl = URL.createObjectURL(svgBlob);

            // Create image
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.fillStyle = "#2a2a2a";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    
                    // Add watermark if enabled
                    if (showWatermark) {
                        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
                        ctx.font = "16px Arial";
                        ctx.fillText("ArbiMind", canvas.width - 100, canvas.height - 20);
                    }

                    // Download
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = `liquidation_map_${data.symbol}_${data.timeframe}_${new Date().toISOString().split("T")[0]}.png`;
                            link.click();
                            URL.revokeObjectURL(url);
                        }
                    });
                }
                URL.revokeObjectURL(svgUrl);
            };
            img.src = svgUrl;
            
            if (onExport) {
                onExport();
            }
        } catch (err) {
            console.error("Failed to export chart:", err);
        }
    }, [data, showWatermark, onExport]);

    // Expose handleExport via ref
    useImperativeHandle(ref, () => ({
        handleExport,
    }));

    if (loading) {
        return (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#888",
                    fontSize: "14px",
                }}
            >
                Loading liquidation map...
            </div>
        );
    }

    if (error) {
        // Improved error detection
        const is404Error = error.includes("404") || error.includes("not found") || error.includes("not implemented");
        const isNetworkError = error.includes("network") || error.includes("connection") || error.includes("timeout");
        const isRateLimitError = error.includes("rate limit") || error.includes("429");
        const isServerError = error.includes("500") || error.includes("server error");
        
        // Determine error type and message
        let errorTitle = "❌ Error";
        let errorColor = "#ef4444";
        let errorDescription = null;
        
        if (is404Error) {
            errorTitle = "⚠️ Endpoint Not Available";
            errorColor = "#f59e0b";
            errorDescription = "The liquidation map API endpoint needs to be implemented in the backend.";
        } else if (isNetworkError) {
            errorTitle = "🌐 Network Error";
            errorColor = "#f59e0b";
            errorDescription = "Please check your internet connection and try again.";
        } else if (isRateLimitError) {
            errorTitle = "⏱️ Rate Limit Exceeded";
            errorColor = "#f59e0b";
            errorDescription = "Too many requests. Please wait a moment and try again.";
        } else if (isServerError) {
            errorTitle = "🔧 Server Error";
            errorColor = "#ef4444";
            errorDescription = "The server encountered an error. Please try again later.";
        }
        
        return (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: errorColor,
                    fontSize: "14px",
                    padding: "20px",
                    textAlign: "center",
                    gap: "8px",
                }}
            >
                <div style={{ fontWeight: "600", marginBottom: "4px", fontSize: "16px" }}>
                    {errorTitle}
                </div>
                <div style={{ color: "#888", fontSize: "12px", maxWidth: "500px" }}>
                    {error}
                </div>
                {errorDescription && (
                    <div style={{ color: "#666", fontSize: "11px", marginTop: "8px", maxWidth: "400px" }}>
                        {errorDescription}
                    </div>
                )}
            </div>
        );
    }

    if (!data || chartData.length === 0) {
        return (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#888",
                    fontSize: "14px",
                }}
            >
                No liquidation data available
            </div>
        );
    }

    // Format last updated time
    const formatLastUpdated = useCallback((timestamp?: number): string => {
        if (!timestamp) return "";
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }, []);

    // Get data source display text
    const getDataSourceText = useCallback((source?: string): string => {
        if (!source) return "";
        const sourceMap: Record<string, string> = {
            "WebSocket": "Real-time",
            "Historical": "Historical",
            "CryptoQuant": "CryptoQuant",
            "Hybrid": "Hybrid",
        };
        return sourceMap[source] || source;
    }, []);

    // Get confidence indicator
    const getConfidenceIndicator = useCallback((score?: number): { text: string; color: string } => {
        if (score === undefined || score === null) return { text: "", color: "" };
        if (score >= 0.8) return { text: "High", color: "#22c55e" };
        if (score >= 0.5) return { text: "Medium", color: "#f59e0b" };
        return { text: "Low", color: "#ef4444" };
    }, []);

    return (
        <div 
            ref={chartContainerRef}
            style={{ width: "100%", height: "100%", padding: "16px", position: "relative" }}
        >
            {/* Current Price Label */}
            {data.current_price && (
                <div
                    style={{
                        position: "absolute",
                        top: "16px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: "rgba(239, 68, 68, 0.2)",
                        border: "1px solid rgba(239, 68, 68, 0.5)",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        color: "#ef4444",
                        fontSize: "12px",
                        fontWeight: "600",
                        zIndex: 10,
                    }}
                >
                    Current Price: ${data.current_price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
            )}

            {/* Metadata Info (optional) */}
            {(data.data_source || data.last_updated || data.confidence_score !== undefined) && (
                <div
                    style={{
                        position: "absolute",
                        top: "16px",
                        right: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        backgroundColor: "rgba(0, 0, 0, 0.6)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "6px",
                        padding: "8px 12px",
                        fontSize: "10px",
                        color: "#888",
                        zIndex: 10,
                        maxWidth: "200px",
                    }}
                >
                    {data.data_source && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ color: "#666" }}>Source:</span>
                            <span style={{ color: "#22c55e", fontWeight: "500" }}>
                                {getDataSourceText(data.data_source)}
                            </span>
                        </div>
                    )}
                    {data.last_updated && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ color: "#666" }}>Updated:</span>
                            <span style={{ color: "#888" }}>
                                {formatLastUpdated(data.last_updated)}
                            </span>
                        </div>
                    )}
                    {data.confidence_score !== undefined && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ color: "#666" }}>Confidence:</span>
                            <span style={{ 
                                color: getConfidenceIndicator(data.confidence_score).color,
                                fontWeight: "500"
                            }}>
                                {getConfidenceIndicator(data.confidence_score).text}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Watermark */}
            {showWatermark && (
                <div
                    style={{
                        position: "absolute",
                        bottom: "20px",
                        right: "20px",
                        color: "rgba(255, 255, 255, 0.1)",
                        fontSize: "14px",
                        fontWeight: "500",
                        pointerEvents: "none",
                        zIndex: 5,
                    }}
                >
                    ArbiMind
                </div>
            )}

            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={chartData}
                    margin={{ top: 40, right: 30, left: 20, bottom: enableZoom ? 100 : 60 }}
                >
                    <defs>
                        {/* Gradient for short liquidations (red) */}
                        <linearGradient id="shortGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                        </linearGradient>
                        {/* Gradient for long liquidations (green) */}
                        <linearGradient id="longGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis
                        dataKey="price"
                        type="number"
                        scale="linear"
                        stroke="#888"
                        tick={{ fill: "#888", fontSize: 11 }}
                        tickFormatter={formatPrice}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        domain={zoomDomain || ["dataMin", "dataMax"]}
                        allowDataOverflow={!!zoomDomain}
                    />
                    <YAxis
                        stroke="#888"
                        tick={{ fill: "#888", fontSize: 11 }}
                        tickFormatter={formatLiquidation}
                        label={{ value: "Liquidation (Billions USD)", angle: -90, position: "insideLeft", style: { fill: "#888", fontSize: 12 } }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        wrapperStyle={{ paddingTop: "20px" }}
                        iconType="square"
                        formatter={(value) => {
                            // Only show main categories in legend, not individual exchange stacks
                            if (value === "Short Liquidations" || value === "Long Liquidations") {
                                return value;
                            }
                            // Show exchanges only once (not for both short and long)
                            if (value.includes("_short") || value.includes("_long")) {
                                return null;
                            }
                            return value;
                        }}
                    />

                    {/* Short Liquidations Area (left side - red) */}
                    <Area
                        type="monotone"
                        dataKey="short_liquidation"
                        fill="url(#shortGradient)"
                        stroke="#ef4444"
                        strokeWidth={1}
                        name="Short Liquidations"
                        isAnimationActive={enableAnimation}
                        animationDuration={enableAnimation ? 1000 : 0}
                        animationEasing="ease-out"
                    />

                    {/* Long Liquidations Area (right side - green) */}
                    <Area
                        type="monotone"
                        dataKey="long_liquidation"
                        fill="url(#longGradient)"
                        stroke="#22c55e"
                        strokeWidth={1}
                        name="Long Liquidations"
                        isAnimationActive={enableAnimation}
                        animationDuration={enableAnimation ? 1000 : 0}
                        animationEasing="ease-out"
                    />

                    {/* Stacked Bars for Exchange Breakdown - Short */}
                    {exchanges.map((exchange) => {
                        const color = DEFAULT_EXCHANGE_COLORS[exchange] || "#888";
                        return (
                            <Bar
                                key={`${exchange}_short`}
                                dataKey={`${exchange}_short`}
                                stackId="short"
                                fill={color}
                                opacity={0.7}
                                isAnimationActive={enableAnimation}
                                animationDuration={enableAnimation ? 1000 : 0}
                                animationEasing="ease-out"
                                name={exchange}
                            />
                        );
                    })}

                    {/* Stacked Bars for Exchange Breakdown - Long */}
                    {exchanges.map((exchange) => {
                        const color = DEFAULT_EXCHANGE_COLORS[exchange] || "#888";
                        return (
                            <Bar
                                key={`${exchange}_long`}
                                dataKey={`${exchange}_long`}
                                stackId="long"
                                fill={color}
                                opacity={0.7}
                                isAnimationActive={enableAnimation}
                                animationDuration={enableAnimation ? 1000 : 0}
                                animationEasing="ease-out"
                            />
                        );
                    })}

                    {/* Current Price Reference Line */}
                    {data.current_price && (
                        <ReferenceLine
                            x={data.current_price}
                            stroke="#ef4444"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            label={{
                                value: "Current Price",
                                position: "top",
                                fill: "#ef4444",
                                fontSize: 11,
                                fontWeight: "600",
                            }}
                        />
                    )}

                    {/* Zoom Brush */}
                    {enableZoom && chartData.length > 0 && (
                        <Brush
                            dataKey="price"
                            height={30}
                            stroke="#888"
                            fill="rgba(255, 174, 0, 0.1)"
                            onChange={handleBrushChange}
                            tickFormatter={formatPrice}
                        />
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
});

LiquidationMap.displayName = "LiquidationMap";

export default LiquidationMap;


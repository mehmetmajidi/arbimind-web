"use client";

import { MdRefresh } from "react-icons/md";

interface PricePredictionsPanelProps {
    predictions: Record<string, {
        predicted_price: number;
        current_price: number;
        horizon: string;
        confidence: number;
        price_change_percent: number;
    } | null>;
    predictionsLoading: boolean;
    onRefreshPredictions: () => void;
}

export default function PricePredictionsPanel({
    predictions,
    predictionsLoading,
    onRefreshPredictions,
}: PricePredictionsPanelProps) {
    const hasPredictions = Object.keys(predictions).length > 0;

    return (
        <div style={{ 
            backgroundColor: "#1a1a1a", 
            borderRadius: "12px", 
            padding: "12px",
            border: "1px solid rgba(255, 174, 0, 0.2)",
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ color: "#FFAE00", margin: 0, fontSize: "14px", fontWeight: "600" }}>
                    Price Predictions
                </h3>
                <button
                    onClick={onRefreshPredictions}
                    disabled={predictionsLoading}
                    title="Refresh predictions"
                    style={{
                        padding: "4px 8px",
                        backgroundColor: "transparent",
                        color: "#FFAE00",
                        border: "1px solid rgba(255, 174, 0, 0.3)",
                        borderRadius: "6px",
                        fontSize: "12px",
                        cursor: predictionsLoading ? "not-allowed" : "pointer",
                        opacity: predictionsLoading ? 0.5 : 1,
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                    }}
                    onMouseEnter={(e) => {
                        if (!predictionsLoading) {
                            e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.1)";
                            e.currentTarget.style.borderColor = "#FFAE00";
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!predictionsLoading) {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.3)";
                        }
                    }}
                >
                    <MdRefresh size={14} />
                </button>
            </div>

            {predictionsLoading ? (
                <div style={{ padding: "16px", textAlign: "center", color: "#888", fontSize: "12px" }}>
                    Loading...
                </div>
            ) : hasPredictions ? (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid rgba(255, 174, 0, 0.2)" }}>
                                <th style={{ padding: "6px 4px", textAlign: "left", color: "#888", fontWeight: "600", fontSize: "10px" }}>Horizon</th>
                                <th style={{ padding: "6px 4px", textAlign: "right", color: "#888", fontWeight: "600", fontSize: "10px" }}>Price</th>
                                <th style={{ padding: "6px 4px", textAlign: "right", color: "#888", fontWeight: "600", fontSize: "10px" }}>Change</th>
                                <th style={{ padding: "6px 4px", textAlign: "right", color: "#888", fontWeight: "600", fontSize: "10px" }}>Conf</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(predictions)
                                .sort(([a], [b]) => {
                                    const order: Record<string, number> = { "10m": 1, "20m": 2, "30m": 3, "1h": 4, "4h": 5, "24h": 6 };
                                    return (order[a] || 99) - (order[b] || 99);
                                })
                                .map(([horizon, pred]) => {
                                    if (!pred) return null;
                                    const changePercent = pred.price_change_percent * 100;
                                    const changeColor = changePercent >= 0 ? "#22c55e" : "#ef4444";

                                    return (
                                        <tr 
                                            key={horizon}
                                            style={{ 
                                                borderBottom: "1px solid rgba(255, 174, 0, 0.1)",
                                                transition: "background-color 0.2s",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.05)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = "transparent";
                                            }}
                                        >
                                            <td style={{ padding: "8px 4px", color: "#FFAE00", fontWeight: "600", fontSize: "10px" }}>
                                                {horizon.toUpperCase()}
                                            </td>
                                            <td style={{ padding: "8px 4px", textAlign: "right", color: "#ededed", fontSize: "11px" }}>
                                                ${pred.predicted_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 10 })}
                                            </td>
                                            <td style={{ padding: "8px 4px", textAlign: "right", color: changeColor, fontWeight: "600", fontSize: "11px" }}>
                                                {changePercent >= 0 ? "↑" : "↓"} {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(2)}%
                                            </td>
                                            <td style={{ padding: "8px 4px", textAlign: "right", color: "#888", fontSize: "10px" }}>
                                                {(pred.confidence * 100).toFixed(0)}%
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{ padding: "20px", textAlign: "center" }}>
                    <div style={{ color: "#888", fontSize: "12px", marginBottom: "12px" }}>
                        No predictions
                    </div>
                    <button
                        onClick={onRefreshPredictions}
                        disabled={predictionsLoading}
                        style={{
                            padding: "10px 20px",
                            backgroundColor: "#FFAE00",
                            color: "#1a1a1a",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: predictionsLoading ? "not-allowed" : "pointer",
                            opacity: predictionsLoading ? 0.5 : 1,
                            transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                            if (!predictionsLoading) {
                                e.currentTarget.style.backgroundColor = "#ffb733";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!predictionsLoading) {
                                e.currentTarget.style.backgroundColor = "#FFAE00";
                            }
                        }}
                    >
                        Get Predict
                    </button>
                </div>
            )}
        </div>
    );
}

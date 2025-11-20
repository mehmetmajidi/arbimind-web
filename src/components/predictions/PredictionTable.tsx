import PredictionStatusBadge from "./PredictionStatusBadge";

interface Prediction {
    id: number;
    symbol: string;
    horizon: string;
    predicted_price: string;
    current_price_at_prediction: string;
    actual_price: string | null;
    confidence: string;
    upper_bound: string;
    lower_bound: string;
    price_error_percent: string | null;
    is_verified: boolean;
    within_confidence: boolean | null;
    predicted_at: string;
    exchange_name: string | null;
}

interface PredictionTableProps {
    predictions: Prediction[];
    formatDate: (dateString: string) => string;
    formatPrice: (price: string | null) => string;
    formatPercent: (percent: string | null) => string;
    parseSymbol: (symbol: string) => { coin: string; currency: string };
}

export default function PredictionTable({
    predictions,
    formatDate,
    formatPrice,
    formatPercent,
    parseSymbol,
}: PredictionTableProps) {
    return (
        <div
            style={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: "12px",
                overflow: "hidden",
            }}
        >
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ backgroundColor: "#0f0f0f", borderBottom: "1px solid #2a2a2a" }}>
                            <th style={{ padding: "16px", textAlign: "left", color: "#888", fontSize: "14px", fontWeight: "600" }}>
                                Time
                            </th>
                            <th style={{ padding: "16px", textAlign: "left", color: "#888", fontSize: "14px", fontWeight: "600" }}>
                                Symbol
                            </th>
                            <th style={{ padding: "16px", textAlign: "left", color: "#888", fontSize: "14px", fontWeight: "600" }}>
                                Exchange
                            </th>
                            <th style={{ padding: "16px", textAlign: "left", color: "#888", fontSize: "14px", fontWeight: "600" }}>
                                Horizon
                            </th>
                            <th style={{ padding: "16px", textAlign: "left", color: "#888", fontSize: "14px", fontWeight: "600" }}>
                                Current Price
                            </th>
                            <th style={{ padding: "16px", textAlign: "left", color: "#888", fontSize: "14px", fontWeight: "600" }}>
                                Predicted
                            </th>
                            <th style={{ padding: "16px", textAlign: "left", color: "#888", fontSize: "14px", fontWeight: "600" }}>
                                Actual
                            </th>
                            <th style={{ padding: "16px", textAlign: "left", color: "#888", fontSize: "14px", fontWeight: "600" }}>
                                Error
                            </th>
                            <th style={{ padding: "16px", textAlign: "left", color: "#888", fontSize: "14px", fontWeight: "600" }}>
                                Confidence
                            </th>
                            <th style={{ padding: "16px", textAlign: "left", color: "#888", fontSize: "14px", fontWeight: "600" }}>
                                Range
                            </th>
                            <th style={{ padding: "16px", textAlign: "left", color: "#888", fontSize: "14px", fontWeight: "600" }}>
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {predictions.length === 0 ? (
                            <tr>
                                <td colSpan={11} style={{ padding: "40px", textAlign: "center", color: "#888" }}>
                                    No predictions found
                                </td>
                            </tr>
                        ) : (
                            predictions.map((prediction) => {
                                const { coin, currency } = parseSymbol(prediction.symbol);
                                return (
                                    <tr
                                        key={prediction.id}
                                        style={{
                                            borderBottom: "1px solid #2a2a2a",
                                            transition: "background-color 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = "#0f0f0f";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = "transparent";
                                        }}
                                    >
                                        <td style={{ padding: "16px", color: "#fff", fontSize: "14px" }}>
                                            {formatDate(prediction.predicted_at)}
                                        </td>
                                        <td style={{ padding: "16px" }}>
                                            <div>
                                                <div style={{ color: "#fff", fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
                                                    {coin}
                                                </div>
                                                {currency && (
                                                    <div style={{ color: "#888", fontSize: "12px" }}>
                                                        {currency}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: "16px", color: "#888", fontSize: "14px" }}>
                                            {prediction.exchange_name ? prediction.exchange_name.toUpperCase() : "N/A"}
                                        </td>
                                        <td style={{ padding: "16px", color: "#fff", fontSize: "14px" }}>{prediction.horizon}</td>
                                        <td style={{ padding: "16px", color: "#fff", fontSize: "14px" }}>
                                            {formatPrice(prediction.current_price_at_prediction)}
                                        </td>
                                        <td style={{ padding: "16px", color: "#FFAE00", fontSize: "14px", fontWeight: "600" }}>
                                            {formatPrice(prediction.predicted_price)}
                                        </td>
                                        <td style={{ padding: "16px", color: prediction.actual_price ? "#fff" : "#888", fontSize: "14px" }}>
                                            {prediction.actual_price ? formatPrice(prediction.actual_price) : "N/A"}
                                        </td>
                                        <td style={{ padding: "16px", color: "#fff", fontSize: "14px" }}>
                                            {formatPercent(prediction.price_error_percent)}
                                        </td>
                                        <td style={{ padding: "16px", color: "#fff", fontSize: "14px" }}>
                                            {formatPercent(prediction.confidence)}
                                        </td>
                                        <td style={{ padding: "16px", color: "#888", fontSize: "14px" }}>
                                            {(() => {
                                                const upper = parseFloat(prediction.upper_bound);
                                                const lower = parseFloat(prediction.lower_bound);
                                                const range = upper - lower;
                                                return formatPrice(range.toString());
                                            })()}
                                        </td>
                                        <td style={{ padding: "16px" }}>
                                            <PredictionStatusBadge
                                                isVerified={prediction.is_verified}
                                                withinConfidence={prediction.within_confidence}
                                            />
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}


interface Prediction {
    is_verified: boolean;
    within_confidence: boolean | null;
}

interface PredictionStatsProps {
    total: number;
    predictions: Prediction[];
}

export default function PredictionStats({ total, predictions }: PredictionStatsProps) {
    const verified = predictions.filter((p) => p.is_verified).length;
    const pending = predictions.filter((p) => !p.is_verified).length;
    const accurate = predictions.filter((p) => p.within_confidence === true).length;

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div
                style={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "12px",
                    padding: "20px",
                }}
            >
                <div style={{ color: "#888", fontSize: "14px", marginBottom: "8px" }}>Total Predictions</div>
                <div style={{ color: "#fff", fontSize: "24px", fontWeight: "700" }}>{total}</div>
            </div>
            <div
                style={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "12px",
                    padding: "20px",
                }}
            >
                <div style={{ color: "#888", fontSize: "14px", marginBottom: "8px" }}>Verified</div>
                <div style={{ color: "#10b981", fontSize: "24px", fontWeight: "700" }}>{verified}</div>
            </div>
            <div
                style={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "12px",
                    padding: "20px",
                }}
            >
                <div style={{ color: "#888", fontSize: "14px", marginBottom: "8px" }}>Pending</div>
                <div style={{ color: "#FFAE00", fontSize: "24px", fontWeight: "700" }}>{pending}</div>
            </div>
            <div
                style={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "12px",
                    padding: "20px",
                }}
            >
                <div style={{ color: "#888", fontSize: "14px", marginBottom: "8px" }}>Accurate</div>
                <div style={{ color: "#10b981", fontSize: "24px", fontWeight: "700" }}>{accurate}</div>
            </div>
        </div>
    );
}


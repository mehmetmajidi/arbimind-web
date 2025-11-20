interface PredictionStatusBadgeProps {
    isVerified: boolean;
    withinConfidence: boolean | null;
}

export default function PredictionStatusBadge({ isVerified, withinConfidence }: PredictionStatusBadgeProps) {
    if (!isVerified) {
        return (
            <span
                style={{
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    backgroundColor: "rgba(255, 174, 0, 0.2)",
                    color: "#FFAE00",
                    border: "1px solid rgba(255, 174, 0, 0.4)",
                }}
            >
                Pending
            </span>
        );
    }

    if (withinConfidence) {
        return (
            <span
                style={{
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    backgroundColor: "rgba(16, 185, 129, 0.2)",
                    color: "#10b981",
                    border: "1px solid rgba(16, 185, 129, 0.4)",
                }}
            >
                Accurate
            </span>
        );
    } else {
        return (
            <span
                style={{
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    backgroundColor: "rgba(239, 68, 68, 0.2)",
                    color: "#ef4444",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                }}
            >
                Inaccurate
            </span>
        );
    }
}


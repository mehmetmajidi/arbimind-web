interface PredictionPaginationProps {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
    onPrevious: () => void;
    onNext: () => void;
}

export default function PredictionPagination({
    offset,
    limit,
    total,
    hasMore,
    onPrevious,
    onNext,
}: PredictionPaginationProps) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "24px",
                padding: "16px",
                backgroundColor: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: "12px",
            }}
        >
            <div style={{ color: "#888", fontSize: "14px" }}>
                Showing {offset + 1} to {Math.min(offset + limit, total)} of {total}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
                <button
                    onClick={onPrevious}
                    disabled={offset === 0}
                    style={{
                        padding: "8px 16px",
                        backgroundColor: offset === 0 ? "#0f0f0f" : "#FFAE00",
                        color: offset === 0 ? "#888" : "#000",
                        border: "none",
                        borderRadius: "6px",
                        cursor: offset === 0 ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                        opacity: offset === 0 ? 0.5 : 1,
                    }}
                >
                    Previous
                </button>
                <button
                    onClick={onNext}
                    disabled={!hasMore}
                    style={{
                        padding: "8px 16px",
                        backgroundColor: !hasMore ? "#0f0f0f" : "#FFAE00",
                        color: !hasMore ? "#888" : "#000",
                        border: "none",
                        borderRadius: "6px",
                        cursor: !hasMore ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                        opacity: !hasMore ? 0.5 : 1,
                    }}
                >
                    Next
                </button>
            </div>
        </div>
    );
}


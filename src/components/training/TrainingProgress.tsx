"use client";

interface TrainingProgressProps {
    progress?: number; // 0-100
    status: "running" | "completed" | "failed" | "pending";
    stage?: string; // e.g., "Data Loading", "Training", "Evaluation"
    eta?: string; // Estimated time remaining
    duration?: number; // Duration in seconds
}

export default function TrainingProgress({
    progress,
    status,
    stage,
    eta,
    duration,
}: TrainingProgressProps) {
    const getStatusColor = () => {
        switch (status) {
            case "running":
                return "#FFAE00";
            case "completed":
                return "#22c55e";
            case "failed":
                return "#ef4444";
            case "pending":
                return "#888";
            default:
                return "#888";
        }
    };

    const color = getStatusColor();
    const displayProgress = progress !== undefined ? Math.min(Math.max(progress, 0), 100) : undefined;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
            {stage && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "9px", color: "#888" }}>
                    <span>{stage}</span>
                    {eta && <span style={{ color: "#FFAE00" }}>ETA: {eta}</span>}
                </div>
            )}

            {displayProgress !== undefined && (
                <div style={{ position: "relative", width: "100%", height: "6px", backgroundColor: "#1a1a1a", borderRadius: "3px", overflow: "hidden" }}>
                    <div
                        style={{
                            width: `${displayProgress}%`,
                            height: "100%",
                            backgroundColor: color,
                            borderRadius: "3px",
                            transition: "width 0.3s ease",
                            animation: status === "running" ? "pulse 2s infinite" : "none",
                        }}
                    />
                </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "9px", color: "#888" }}>
                {displayProgress !== undefined && (
                    <span>{displayProgress.toFixed(0)}%</span>
                )}
                {duration !== undefined && (
                    <span>
                        {duration < 60 
                            ? `${duration}s` 
                            : duration < 3600 
                                ? `${Math.floor(duration / 60)}m ${duration % 60}s`
                                : `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`}
                    </span>
                )}
            </div>
        </div>
    );
}


// Shared utilities for training components

export const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const getAuthToken = () => {
    return localStorage.getItem("auth_token") || "";
};

export const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "N/A";
    try {
        const date = new Date(timestamp);
        return date.toLocaleString("en-US", { 
            month: "short", 
            day: "numeric", 
            hour: "2-digit", 
            minute: "2-digit" 
        });
    } catch {
        return "N/A";
    }
};

export const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A";
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

export const getStatusColor = (status: string) => {
    switch (status) {
        case "running":
            return "#FFAE00";
        case "completed":
            return "#22c55e";
        case "failed":
            return "#ef4444";
        case "rejected":
            return "#f59e0b";
        default:
            return "#888";
    }
};


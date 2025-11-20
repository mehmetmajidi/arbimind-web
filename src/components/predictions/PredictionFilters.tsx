interface PredictionFiltersProps {
    isOpen: boolean;
    onClose: () => void;
    symbolFilter: string;
    setSymbolFilter: (value: string) => void;
    horizonFilter: string;
    setHorizonFilter: (value: string) => void;
    verifiedFilter: string;
    setVerifiedFilter: (value: string) => void;
    limit: number;
    setLimit: (value: number) => void;
    autoRefresh: boolean;
    setAutoRefresh: (value: boolean) => void;
    refreshInterval: number;
    setRefreshInterval: (value: number) => void;
    onRefresh: () => void;
    onFilterChange: () => void;
}

export default function PredictionFilters({
    isOpen,
    onClose,
    symbolFilter,
    setSymbolFilter,
    horizonFilter,
    setHorizonFilter,
    verifiedFilter,
    setVerifiedFilter,
    limit,
    setLimit,
    autoRefresh,
    setAutoRefresh,
    refreshInterval,
    setRefreshInterval,
    onRefresh,
    onFilterChange,
}: PredictionFiltersProps) {
    if (!isOpen) return null;

    return (
        <>
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    zIndex: 1000,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
                onClick={onClose}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        backgroundColor: "#1a1a1a",
                        border: "1px solid rgba(255, 174, 0, 0.3)",
                        borderRadius: "12px",
                        padding: "32px",
                        maxWidth: "800px",
                        width: "90%",
                        maxHeight: "90vh",
                        overflowY: "auto",
                        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                        <h2 style={{ color: "#FFAE00", margin: 0, fontSize: "24px", fontWeight: "bold" }}>Filters</h2>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#888",
                                fontSize: "24px",
                                cursor: "pointer",
                                padding: "0",
                                width: "32px",
                                height: "32px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            ×
                        </button>
                    </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" }}>
                <div>
                    <label style={{ display: "block", color: "#888", fontSize: "14px", marginBottom: "8px" }}>
                        Symbol
                    </label>
                    <input
                        type="text"
                        value={symbolFilter}
                        onChange={(e) => {
                            setSymbolFilter(e.target.value);
                            onFilterChange();
                        }}
                        placeholder="e.g., BTCUSDT"
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            backgroundColor: "#0f0f0f",
                            border: "1px solid #2a2a2a",
                            borderRadius: "8px",
                            color: "#fff",
                            fontSize: "14px",
                        }}
                    />
                </div>

                <div>
                    <label style={{ display: "block", color: "#888", fontSize: "14px", marginBottom: "8px" }}>
                        Horizon
                    </label>
                    <select
                        value={horizonFilter}
                        onChange={(e) => {
                            setHorizonFilter(e.target.value);
                            onFilterChange();
                        }}
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            backgroundColor: "#0f0f0f",
                            border: "1px solid #2a2a2a",
                            borderRadius: "8px",
                            color: "#fff",
                            fontSize: "14px",
                        }}
                    >
                        <option value="">All</option>
                        <option value="10m">10m</option>
                        <option value="20m">20m</option>
                        <option value="30m">30m</option>
                        <option value="1h">1h</option>
                        <option value="4h">4h</option>
                        <option value="24h">24h</option>
                    </select>
                </div>

                <div>
                    <label style={{ display: "block", color: "#888", fontSize: "14px", marginBottom: "8px" }}>
                        Status
                    </label>
                    <select
                        value={verifiedFilter}
                        onChange={(e) => {
                            setVerifiedFilter(e.target.value);
                            onFilterChange();
                        }}
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            backgroundColor: "#0f0f0f",
                            border: "1px solid #2a2a2a",
                            borderRadius: "8px",
                            color: "#fff",
                            fontSize: "14px",
                        }}
                    >
                        <option value="all">All</option>
                        <option value="verified">Verified</option>
                        <option value="unverified">Unverified</option>
                    </select>
                </div>

                <div>
                    <label style={{ display: "block", color: "#888", fontSize: "14px", marginBottom: "8px" }}>
                        Limit
                    </label>
                    <select
                        value={limit}
                        onChange={(e) => {
                            setLimit(Number(e.target.value));
                            onFilterChange();
                        }}
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            backgroundColor: "#0f0f0f",
                            border: "1px solid #2a2a2a",
                            borderRadius: "8px",
                            color: "#fff",
                            fontSize: "14px",
                        }}
                    >
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="200">200</option>
                    </select>
                </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#888", fontSize: "14px", cursor: "pointer" }}>
                    <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        style={{ cursor: "pointer" }}
                    />
                    <span>Auto-refresh</span>
                </label>
                {autoRefresh && (
                    <select
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(Number(e.target.value))}
                        style={{
                            padding: "6px 12px",
                            backgroundColor: "#0f0f0f",
                            border: "1px solid #2a2a2a",
                            borderRadius: "6px",
                            color: "#fff",
                            fontSize: "14px",
                        }}
                    >
                        <option value="10">10s</option>
                        <option value="30">30s</option>
                        <option value="60">1m</option>
                        <option value="300">5m</option>
                    </select>
                )}
                <button
                    onClick={onRefresh}
                    style={{
                        padding: "8px 16px",
                        backgroundColor: "#FFAE00",
                        color: "#000",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                    }}
                >
                    Refresh
                </button>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        padding: "12px 24px",
                        backgroundColor: "#2a2a2a",
                        color: "#ededed",
                        border: "1px solid #2a2a2a",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "14px",
                    }}
                >
                    Close
                </button>
                <button
                    type="button"
                    onClick={() => {
                        onFilterChange();
                        onRefresh();
                        onClose();
                    }}
                    style={{
                        padding: "12px 24px",
                        backgroundColor: "#FFAE00",
                        color: "#1a1a1a",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "14px",
                    }}
                >
                    Apply Filters
                </button>
            </div>
                </div>
            </div>
        </>
    );
}


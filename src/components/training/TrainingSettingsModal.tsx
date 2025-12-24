"use client";

import { useState, useEffect, useCallback } from "react";
import { getFilterStatus } from "@/lib/trainingApi";
import type { FilterConfig } from "@/types/training";

function TrainingSettingsModal({ 
    isOpen, 
    onClose 
}: { 
    isOpen: boolean;
    onClose: () => void;
}) {
    const [filterConfig, setFilterConfig] = useState<FilterConfig | null>(null);
    const [tier1Symbols, setTier1Symbols] = useState<string[]>([]);
    const [tier2Symbols, setTier2Symbols] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState<FilterConfig>({
        volatility: {
            min_volatility: 0.005,
            min_price_range: 0.01,
            min_volume_volatility: 0.3,
            min_movement_frequency: 0.5,
            window_days: 30,
        },
        data_freshness: {
            max_data_age_hours: 24.0,
            min_completeness: 0.95,
            max_gap_candles: 2,
            check_window_days: 7,
        },
        enabled: {
            volatility: true,
            data_freshness: true,
        },
        behavior: {
            block_on_failure: true,
        },
    });

    const fetchConfig = useCallback(async () => {
        try {
            // Fetch filter config
            const filterData = await getFilterStatus("BTC/USDT", "1h");
            if (filterData.filter_config) {
                setFilterConfig(filterData.filter_config);
                setFormData({
                    volatility: filterData.filter_config.volatility || {},
                    data_freshness: filterData.filter_config.data_freshness || {},
                    enabled: filterData.filter_config.enabled || {},
                    behavior: filterData.filter_config.behavior || {},
                });
            }

            // Fetch priority symbols (from periodic-status or separate endpoint)
            // For now, use hardcoded list - in future, can add API endpoint
            setTier1Symbols([
                "BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "XRP/USDT", "USDC/USDT",
                "ADA/USDT", "DOGE/USDT", "TRX/USDT", "AVAX/USDT", "SHIB/USDT", "DOT/USDT",
                "MATIC/USDT", "LTC/USDT", "UNI/USDT", "ATOM/USDT", "LINK/USDT", "XLM/USDT",
                "ETC/USDT", "FIL/USDT"
            ]);
            setTier2Symbols([]); // Can be populated from API if available

            setError(null);
        } catch (err) {
            setError("Error fetching configuration");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchConfig();
        }
    }, [isOpen, fetchConfig]);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            // Note: Filter configuration is managed via environment variables on the backend
            // and requires server restart to take effect. Priority configuration is hardcoded
            // in the backend code. These settings are shown for reference only.
            
            // In the future, we could add API endpoints to update these settings dynamically
            // For now, users need to modify environment variables and restart the server
            
            setSuccess("Settings configuration displayed. Note: Filter settings require environment variable changes and server restart. Priority symbols are configured in backend code.");
            setTimeout(() => {
                onClose();
            }, 3000);
        } catch (err) {
            setError("Error processing settings");
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: "#202020",
                    border: "1px solid #2a2a2a",
                    borderRadius: "16px",
                    padding: "32px",
                    maxWidth: "800px",
                    width: "90%",
                    maxHeight: "90vh",
                    overflowY: "auto",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#FFAE00", margin: 0 }}>
                        Training Settings
                    </h2>
                    <button
                        onClick={onClose}
                        aria-label="Close settings modal"
                        style={{
                            background: "none",
                            border: "none",
                            color: "#888888",
                            fontSize: "24px",
                            cursor: "pointer",
                            padding: "0",
                            width: "32px",
                            height: "32px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "4px",
                            transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                            e.currentTarget.style.color = "#ededed";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.color = "#888888";
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.outline = "2px solid rgba(255, 174, 0, 0.5)";
                            e.currentTarget.style.outlineOffset = "2px";
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.outline = "none";
                        }}
                    >
                        ×
                    </button>
                </div>

                {error && (
                    <div style={{
                        padding: "12px",
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        borderRadius: "6px",
                        color: "#ef4444",
                        fontSize: "12px",
                        marginBottom: "16px",
                    }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{
                        padding: "12px",
                        backgroundColor: "rgba(34, 197, 94, 0.1)",
                        border: "1px solid rgba(34, 197, 94, 0.3)",
                        borderRadius: "6px",
                        color: "#22c55e",
                        fontSize: "12px",
                        marginBottom: "16px",
                    }}>
                        {success}
                    </div>
                )}

                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#888", fontSize: "12px" }}>
                        Loading settings...
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                        {/* Filter Configuration Section */}
                        <div>
                            <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#FFAE00", marginBottom: "16px" }}>
                                Filter Configuration
                            </h3>
                            
                            {/* Volatility Settings */}
                            <div style={{ marginBottom: "20px", padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#ededed", marginBottom: "12px" }}>
                                    Volatility Filter
                                </h4>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "#888" }}>
                                            Min Volatility (%)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            value={formData.volatility?.min_volatility || 0.005}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                volatility: { ...formData.volatility, min_volatility: parseFloat(e.target.value) || 0 }
                                            })}
                                            style={{
                                                width: "100%",
                                                padding: "8px",
                                                backgroundColor: "#202020",
                                                border: "1px solid #2a2a2a",
                                                borderRadius: "6px",
                                                color: "#ededed",
                                                fontSize: "12px",
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "#888" }}>
                                            Min Price Range (%)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            value={formData.volatility?.min_price_range || 0.01}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                volatility: { ...formData.volatility, min_price_range: parseFloat(e.target.value) || 0 }
                                            })}
                                            style={{
                                                width: "100%",
                                                padding: "8px",
                                                backgroundColor: "#202020",
                                                border: "1px solid #2a2a2a",
                                                borderRadius: "6px",
                                                color: "#ededed",
                                                fontSize: "12px",
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "#888" }}>
                                            Min Volume Volatility
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.volatility?.min_volume_volatility || 0.3}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                volatility: { ...formData.volatility, min_volume_volatility: parseFloat(e.target.value) || 0 }
                                            })}
                                            style={{
                                                width: "100%",
                                                padding: "8px",
                                                backgroundColor: "#202020",
                                                border: "1px solid #2a2a2a",
                                                borderRadius: "6px",
                                                color: "#ededed",
                                                fontSize: "12px",
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "#888" }}>
                                            Min Movement Frequency
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.volatility?.min_movement_frequency || 0.5}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                volatility: { ...formData.volatility, min_movement_frequency: parseFloat(e.target.value) || 0 }
                                            })}
                                            style={{
                                                width: "100%",
                                                padding: "8px",
                                                backgroundColor: "#202020",
                                                border: "1px solid #2a2a2a",
                                                borderRadius: "6px",
                                                color: "#ededed",
                                                fontSize: "12px",
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "#888" }}>
                                            Window Days
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.volatility?.window_days || 30}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                volatility: { ...formData.volatility, window_days: parseInt(e.target.value) || 30 }
                                            })}
                                            style={{
                                                width: "100%",
                                                padding: "8px",
                                                backgroundColor: "#202020",
                                                border: "1px solid #2a2a2a",
                                                borderRadius: "6px",
                                                color: "#ededed",
                                                fontSize: "12px",
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Data Freshness Settings */}
                            <div style={{ marginBottom: "20px", padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#ededed", marginBottom: "12px" }}>
                                    Data Freshness Filter
                                </h4>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "#888" }}>
                                            Max Data Age (hours)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.data_freshness?.max_data_age_hours || 24.0}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                data_freshness: { ...formData.data_freshness, max_data_age_hours: parseFloat(e.target.value) || 0 }
                                            })}
                                            style={{
                                                width: "100%",
                                                padding: "8px",
                                                backgroundColor: "#202020",
                                                border: "1px solid #2a2a2a",
                                                borderRadius: "6px",
                                                color: "#ededed",
                                                fontSize: "12px",
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "#888" }}>
                                            Min Completeness (%)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="1"
                                            value={formData.data_freshness?.min_completeness || 0.95}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                data_freshness: { ...formData.data_freshness, min_completeness: parseFloat(e.target.value) || 0 }
                                            })}
                                            style={{
                                                width: "100%",
                                                padding: "8px",
                                                backgroundColor: "#202020",
                                                border: "1px solid #2a2a2a",
                                                borderRadius: "6px",
                                                color: "#ededed",
                                                fontSize: "12px",
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "#888" }}>
                                            Max Gap Candles
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.data_freshness?.max_gap_candles || 2}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                data_freshness: { ...formData.data_freshness, max_gap_candles: parseInt(e.target.value) || 0 }
                                            })}
                                            style={{
                                                width: "100%",
                                                padding: "8px",
                                                backgroundColor: "#202020",
                                                border: "1px solid #2a2a2a",
                                                borderRadius: "6px",
                                                color: "#ededed",
                                                fontSize: "12px",
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "#888" }}>
                                            Check Window Days
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.data_freshness?.check_window_days || 7}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                data_freshness: { ...formData.data_freshness, check_window_days: parseInt(e.target.value) || 7 }
                                            })}
                                            style={{
                                                width: "100%",
                                                padding: "8px",
                                                backgroundColor: "#202020",
                                                border: "1px solid #2a2a2a",
                                                borderRadius: "6px",
                                                color: "#ededed",
                                                fontSize: "12px",
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Filter Toggles */}
                            <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#ededed", marginBottom: "12px" }}>
                                    Filter Behavior
                                </h4>
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.enabled?.volatility || false}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                enabled: { ...formData.enabled, volatility: e.target.checked }
                                            })}
                                            style={{ cursor: "pointer" }}
                                        />
                                        <span style={{ fontSize: "12px", color: "#ededed" }}>Enable Volatility Filter</span>
                                    </label>
                                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.enabled?.data_freshness || false}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                enabled: { ...formData.enabled, data_freshness: e.target.checked }
                                            })}
                                            style={{ cursor: "pointer" }}
                                        />
                                        <span style={{ fontSize: "12px", color: "#ededed" }}>Enable Data Freshness Filter</span>
                                    </label>
                                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.behavior?.block_on_failure || false}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                behavior: { ...formData.behavior, block_on_failure: e.target.checked }
                                            })}
                                            style={{ cursor: "pointer" }}
                                        />
                                        <span style={{ fontSize: "12px", color: "#ededed" }}>Block Training/Prediction on Filter Failure</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Retraining Configuration Section */}
                        <div>
                            <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#FFAE00", marginBottom: "16px" }}>
                                Retraining Configuration
                            </h3>
                            <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "#888" }}>
                                            Periodic Interval (hours)
                                        </label>
                                        <select
                                            defaultValue="6"
                                            style={{
                                                width: "100%",
                                                padding: "8px",
                                                backgroundColor: "#202020",
                                                border: "1px solid #2a2a2a",
                                                borderRadius: "6px",
                                                color: "#ededed",
                                                fontSize: "12px",
                                            }}
                                        >
                                            <option value="1">1 hour</option>
                                            <option value="3">3 hours</option>
                                            <option value="6">6 hours</option>
                                            <option value="12">12 hours</option>
                                            <option value="24">24 hours</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "#888" }}>
                                            Cooldown Period (hours)
                                        </label>
                                        <input
                                            type="number"
                                            defaultValue="24"
                                            style={{
                                                width: "100%",
                                                padding: "8px",
                                                backgroundColor: "#202020",
                                                border: "1px solid #2a2a2a",
                                                borderRadius: "6px",
                                                color: "#ededed",
                                                fontSize: "12px",
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "#888" }}>
                                            Max Concurrent Jobs
                                        </label>
                                        <input
                                            type="number"
                                            defaultValue="3"
                                            min="1"
                                            max="10"
                                            style={{
                                                width: "100%",
                                                padding: "8px",
                                                backgroundColor: "#202020",
                                                border: "1px solid #2a2a2a",
                                                borderRadius: "6px",
                                                color: "#ededed",
                                                fontSize: "12px",
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Priority Configuration Section */}
                        <div>
                            <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#FFAE00", marginBottom: "16px" }}>
                                Priority Configuration
                            </h3>
                            <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                                <div style={{ marginBottom: "16px" }}>
                                    <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "#888", fontWeight: "600" }}>
                                        Tier 1 Symbols (Top 20)
                                    </label>
                                    <div style={{
                                        padding: "12px",
                                        backgroundColor: "#202020",
                                        borderRadius: "6px",
                                        maxHeight: "150px",
                                        overflowY: "auto",
                                        fontSize: "11px",
                                        color: "#ededed",
                                    }}>
                                        {tier1Symbols.map((symbol, idx) => (
                                            <div key={idx} style={{ marginBottom: "4px" }}>
                                                {symbol}
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ marginTop: "8px", fontSize: "10px", color: "#888" }}>
                                        Note: Tier symbols are configured on the server. Contact admin to modify.
                                    </div>
                                </div>
                                {tier2Symbols.length > 0 && (
                                    <div>
                                        <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "#888", fontWeight: "600" }}>
                                            Tier 2 Symbols
                                        </label>
                                        <div style={{
                                            padding: "12px",
                                            backgroundColor: "#202020",
                                            borderRadius: "6px",
                                            maxHeight: "150px",
                                            overflowY: "auto",
                                            fontSize: "11px",
                                            color: "#ededed",
                                        }}>
                                            {tier2Symbols.map((symbol, idx) => (
                                                <div key={idx} style={{ marginBottom: "4px" }}>
                                                    {symbol}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                            <button
                                onClick={onClose}
                                aria-label="Cancel and close settings"
                                style={{
                                    padding: "10px 20px",
                                    backgroundColor: "transparent",
                                    color: "#888888",
                                    border: "1px solid #2a2a2a",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = "#666";
                                    e.currentTarget.style.color = "#ededed";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = "#2a2a2a";
                                    e.currentTarget.style.color = "#888888";
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.outline = "2px solid rgba(255, 174, 0, 0.5)";
                                    e.currentTarget.style.outlineOffset = "2px";
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.outline = "none";
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                aria-label="Save training settings"
                                style={{
                                    padding: "10px 20px",
                                    backgroundColor: saving ? "#666" : "#FFAE00",
                                    color: "#1a1a1a",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: saving ? "not-allowed" : "pointer",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                    if (!saving) {
                                        e.currentTarget.style.backgroundColor = "#ffb733";
                                        e.currentTarget.style.transform = "scale(1.02)";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!saving) {
                                        e.currentTarget.style.backgroundColor = "#FFAE00";
                                        e.currentTarget.style.transform = "scale(1)";
                                    }
                                }}
                                onFocus={(e) => {
                                    if (!saving) {
                                        e.currentTarget.style.outline = "2px solid rgba(255, 174, 0, 0.5)";
                                        e.currentTarget.style.outlineOffset = "2px";
                                    }
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.outline = "none";
                                }}
                            >
                                {saving ? "Saving..." : "Save Settings"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TrainingSettingsModal;

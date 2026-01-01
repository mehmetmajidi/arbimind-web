"use client";

import { useEffect } from "react";
import { colors } from "./constants";

interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusFilter: string;
  strategyFilter: string;
  symbolFilter: string;
  onStatusFilterChange: (value: string) => void;
  onStrategyFilterChange: (value: string) => void;
  onSymbolFilterChange: (value: string) => void;
  onClearFilters: () => void;
}

export default function FiltersModal({
  isOpen,
  onClose,
  statusFilter,
  strategyFilter,
  symbolFilter,
  onStatusFilterChange,
  onStrategyFilterChange,
  onSymbolFilterChange,
  onClearFilters,
}: FiltersModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasActiveFilters = statusFilter !== "all" || strategyFilter !== "all" || symbolFilter;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        animation: "fadeIn 0.2s ease-in-out",
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
      <div
        style={{
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: "12px",
          padding: "24px",
          maxWidth: "450px",
          width: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
          animation: "slideUp 0.3s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ color: colors.primary, margin: 0, fontSize: "20px", fontWeight: "600" }}>
            Filters
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: colors.secondaryText,
              cursor: "pointer",
              fontSize: "24px",
              padding: "0",
              width: "30px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.panelBackground;
              e.currentTarget.style.color = colors.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = colors.secondaryText;
            }}
          >
            ×
          </button>
        </div>

        {/* Status Filter */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ 
            color: colors.secondaryText, 
            fontSize: "12px", 
            display: "block",
            marginBottom: "6px",
            fontWeight: "500",
          }}>
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              backgroundColor: colors.panelBackground,
              border: `1px solid ${colors.border}`,
              borderRadius: "8px",
              color: colors.text,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="stopped">Stopped</option>
            <option value="inactive">Inactive</option>
            <option value="error">Error</option>
          </select>
        </div>
        
        {/* Strategy Filter */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ 
            color: colors.secondaryText, 
            fontSize: "12px", 
            display: "block",
            marginBottom: "6px",
            fontWeight: "500",
          }}>
            Strategy
          </label>
          <select
            value={strategyFilter}
            onChange={(e) => onStrategyFilterChange(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              backgroundColor: colors.panelBackground,
              border: `1px solid ${colors.border}`,
              borderRadius: "8px",
              color: colors.text,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            <option value="all">All</option>
            <option value="prediction_based">Prediction Based</option>
            <option value="confidence_weighted">Confidence Weighted</option>
            <option value="multi_model_voting">Multi-Model Voting</option>
            <option value="jump_enhanced">Jump Enhanced</option>
            <option value="regime_adaptive">Regime Adaptive</option>
            <option value="multi_timeframe_fusion">Multi-Timeframe Fusion</option>
            <option value="mean_reversion">Mean Reversion</option>
            <option value="trend_following">Trend Following</option>
          </select>
        </div>
        
        {/* Symbol Filter */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ 
            color: colors.secondaryText, 
            fontSize: "12px", 
            display: "block",
            marginBottom: "6px",
            fontWeight: "500",
          }}>
            Symbol
          </label>
          <input
            type="text"
            placeholder="BTC/USDT, ETH/USDT..."
            value={symbolFilter}
            onChange={(e) => onSymbolFilterChange(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              backgroundColor: colors.panelBackground,
              border: `1px solid ${colors.border}`,
              borderRadius: "8px",
              color: colors.text,
              fontSize: "14px",
            }}
          />
        </div>
        
        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "12px" }}>
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              style={{
                flex: 1,
                padding: "10px 16px",
                backgroundColor: "transparent",
                border: `1px solid ${colors.border}`,
                borderRadius: "6px",
                color: colors.secondaryText,
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.panelBackground;
                e.currentTarget.style.borderColor = colors.primary;
                e.currentTarget.style.color = colors.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = colors.border;
                e.currentTarget.style.color = colors.secondaryText;
              }}
            >
              Clear Filters
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px 16px",
              backgroundColor: colors.primary,
              border: "none",
              borderRadius: "6px",
              color: colors.background,
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}


"use client";

import { colors, panelStyle } from "./constants";

interface BotFiltersPanelProps {
  statusFilter: string;
  strategyFilter: string;
  symbolFilter: string;
  searchQuery: string;
  onStatusFilterChange: (value: string) => void;
  onStrategyFilterChange: (value: string) => void;
  onSymbolFilterChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
  onClearFilters: () => void;
}

export default function BotFiltersPanel({
  statusFilter,
  strategyFilter,
  symbolFilter,
  searchQuery,
  onStatusFilterChange,
  onStrategyFilterChange,
  onSymbolFilterChange,
  onSearchQueryChange,
  onClearFilters,
}: BotFiltersPanelProps) {
  const hasActiveFilters = statusFilter !== "all" || strategyFilter !== "all" || symbolFilter || searchQuery;

  return (
    <div style={panelStyle}>
      <h3 style={{ color: colors.primary, marginBottom: "12px", fontSize: "18px", fontWeight: "600" }}>
        Filters
      </h3>
      
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
            backgroundColor: colors.background,
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
            backgroundColor: colors.background,
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
      <div style={{ marginBottom: "16px" }}>
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
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: "8px",
            color: colors.text,
            fontSize: "14px",
          }}
        />
      </div>
      
      {/* Search */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ 
          color: colors.secondaryText, 
          fontSize: "12px", 
          display: "block",
          marginBottom: "6px",
          fontWeight: "500",
        }}>
          Search
        </label>
        <input
          type="text"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: "8px",
            color: colors.text,
            fontSize: "14px",
          }}
        />
      </div>
      
      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          style={{
            width: "100%",
            padding: "8px 12px",
            backgroundColor: "transparent",
            border: `1px solid ${colors.border}`,
            borderRadius: "8px",
            color: colors.secondaryText,
            fontSize: "12px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.background;
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
    </div>
  );
}


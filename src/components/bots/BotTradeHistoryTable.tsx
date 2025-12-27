"use client";

import { useState, useMemo } from "react";
import { BotTrade } from "./types";
import { colors, panelStyle } from "./constants";
import TradeTableRow from "./TradeTableRow";

interface BotTradeHistoryTableProps {
  trades: BotTrade[];
  loading?: boolean;
  onRefresh?: () => void;
}

type SortField = "symbol" | "side" | "entry_price" | "exit_price" | "quantity" | "pnl" | "status" | "entry_time";
type SortDirection = "asc" | "desc";

export default function BotTradeHistoryTable({ trades, loading, onRefresh }: BotTradeHistoryTableProps) {
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "closed">("all");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filter trades
  const filteredTrades = useMemo(() => {
    let result = trades;
    
    if (filterStatus !== "all") {
      result = result.filter(t => t.status.toLowerCase() === filterStatus);
    }
    
    return result;
  }, [trades, filterStatus]);

  // Sort trades
  const sortedTrades = useMemo(() => {
    if (!sortField) return filteredTrades;

    return [...filteredTrades].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "symbol":
          aValue = a.symbol.toLowerCase();
          bValue = b.symbol.toLowerCase();
          break;
        case "side":
          aValue = a.side.toLowerCase();
          bValue = b.side.toLowerCase();
          break;
        case "entry_price":
          aValue = parseFloat(a.entry_price);
          bValue = parseFloat(b.entry_price);
          break;
        case "exit_price":
          aValue = a.exit_price ? parseFloat(a.exit_price) : 0;
          bValue = b.exit_price ? parseFloat(b.exit_price) : 0;
          break;
        case "quantity":
          aValue = parseFloat(a.quantity);
          bValue = parseFloat(b.quantity);
          break;
        case "pnl":
          aValue = parseFloat(a.pnl || "0");
          bValue = parseFloat(b.pnl || "0");
          break;
        case "status":
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        case "entry_time":
          aValue = new Date(a.entry_time).getTime();
          bValue = new Date(b.entry_time).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredTrades, sortField, sortDirection]);

  // Paginate trades
  const paginatedTrades = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTrades.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTrades, currentPage]);

  const totalPages = Math.ceil(sortedTrades.length / itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? "↑" : "↓";
  };

  if (loading) {
    return (
      <div style={panelStyle}>
        <h3 style={{ color: colors.primary, marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>
          Trade History
        </h3>
        <div style={{ color: colors.secondaryText, textAlign: "center", padding: "40px" }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ color: colors.primary, margin: 0, fontSize: "18px", fontWeight: "600" }}>
          Trade History
        </h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            style={{
              padding: "6px 12px",
              backgroundColor: "transparent",
              border: `1px solid ${colors.border}`,
              borderRadius: "6px",
              color: colors.text,
              cursor: "pointer",
              fontSize: "12px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.background;
              e.currentTarget.style.borderColor = colors.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.borderColor = colors.border;
            }}
          >
            🔄 Refresh
          </button>
        )}
      </div>

      {/* Filter Buttons */}
      <div style={{ marginBottom: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          onClick={() => {
            setFilterStatus("all");
            setCurrentPage(1);
          }}
          style={{
            padding: "6px 12px",
            backgroundColor: filterStatus === "all" ? colors.primary : "transparent",
            border: `1px solid ${colors.border}`,
            borderRadius: "6px",
            color: filterStatus === "all" ? colors.background : colors.text,
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "500",
            transition: "all 0.2s",
          }}
        >
          All ({trades.length})
        </button>
        <button
          onClick={() => {
            setFilterStatus("open");
            setCurrentPage(1);
          }}
          style={{
            padding: "6px 12px",
            backgroundColor: filterStatus === "open" ? colors.primary : "transparent",
            border: `1px solid ${colors.border}`,
            borderRadius: "6px",
            color: filterStatus === "open" ? colors.background : colors.text,
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "500",
            transition: "all 0.2s",
          }}
        >
          Open ({trades.filter(t => t.status.toLowerCase() === "open").length})
        </button>
        <button
          onClick={() => {
            setFilterStatus("closed");
            setCurrentPage(1);
          }}
          style={{
            padding: "6px 12px",
            backgroundColor: filterStatus === "closed" ? colors.primary : "transparent",
            border: `1px solid ${colors.border}`,
            borderRadius: "6px",
            color: filterStatus === "closed" ? colors.background : colors.text,
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "500",
            transition: "all 0.2s",
          }}
        >
          Closed ({trades.filter(t => t.status.toLowerCase() === "closed").length})
        </button>
      </div>

      {/* Table */}
      {sortedTrades.length === 0 ? (
        <div style={{ color: colors.secondaryText, textAlign: "center", padding: "40px" }}>
          No trades found
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      color: colors.secondaryText,
                      fontSize: "12px",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleSort("symbol")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Symbol
                      {getSortIcon("symbol")}
                    </div>
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      color: colors.secondaryText,
                      fontSize: "12px",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleSort("side")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Side
                      {getSortIcon("side")}
                    </div>
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      color: colors.secondaryText,
                      fontSize: "12px",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleSort("entry_price")}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                      Entry Price
                      {getSortIcon("entry_price")}
                    </div>
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      color: colors.secondaryText,
                      fontSize: "12px",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleSort("exit_price")}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                      Exit Price
                      {getSortIcon("exit_price")}
                    </div>
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      color: colors.secondaryText,
                      fontSize: "12px",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleSort("quantity")}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                      Quantity
                      {getSortIcon("quantity")}
                    </div>
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      color: colors.secondaryText,
                      fontSize: "12px",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleSort("pnl")}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                      P&L
                      {getSortIcon("pnl")}
                    </div>
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      color: colors.secondaryText,
                      fontSize: "12px",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleSort("status")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Status
                      {getSortIcon("status")}
                    </div>
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      color: colors.secondaryText,
                      fontSize: "12px",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleSort("entry_time")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Time
                      {getSortIcon("entry_time")}
                    </div>
                  </th>
                  <th style={{ padding: "12px", textAlign: "center", color: colors.secondaryText, fontSize: "12px", width: "30px" }}>
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedTrades.map((trade) => (
                  <TradeTableRow key={trade.id} trade={trade} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "16px",
              paddingTop: "16px",
              borderTop: `1px solid ${colors.border}`,
            }}>
              <div style={{ color: colors.secondaryText, fontSize: "12px" }}>
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedTrades.length)} of {sortedTrades.length} trades
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: currentPage === 1 ? "transparent" : colors.background,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "6px",
                    color: currentPage === 1 ? colors.secondaryText : colors.text,
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    fontSize: "12px",
                    opacity: currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  Previous
                </button>
                <div style={{ color: colors.text, fontSize: "12px", minWidth: "60px", textAlign: "center" }}>
                  Page {currentPage} / {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: currentPage === totalPages ? "transparent" : colors.background,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "6px",
                    color: currentPage === totalPages ? colors.secondaryText : colors.text,
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    fontSize: "12px",
                    opacity: currentPage === totalPages ? 0.5 : 1,
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

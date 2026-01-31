"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BotStatsPanel,
  BotListTable,
  BotDetailsPanel,
  CreateBotForm,
  EditBotForm,
  TradingBot,
  BotStatus,
  BotTrade,
  SortField,
  SortDirection,
  colors,
  layoutStyle,
  mainLayoutStyle,
  panelStyle,
  getResponsiveLayoutStyle,
  getResponsivePanelStyle,
  SkeletonLoader,
  ErrorBoundary,
} from "@/components/bots";
import FiltersModal from "@/components/bots/FiltersModal";
import { useResponsive } from "@/hooks/useResponsive";

/**
 * Trading Bots Management Page
 * 
 * Built according to BOT_PAGE_UI_DESIGN.md
 * Uses exact same styling as Market Page
 */

// Add pulse animation style
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;
  if (!document.head.querySelector('style[data-pulse-animation]')) {
    style.setAttribute('data-pulse-animation', 'true');
    document.head.appendChild(style);
  }
}

function BotsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  const [bots, setBots] = useState<TradingBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  
  // Bot details state
  const [selectedBot, setSelectedBot] = useState<TradingBot | null>(null);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [botTrades, setBotTrades] = useState<BotTrade[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [tradesLoading, setTradesLoading] = useState(false);
  
  // Sorting state - initialize from URL
  const [sortField, setSortField] = useState<SortField | null>(
    (searchParams.get("sort") as SortField) || null
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    (searchParams.get("direction") as SortDirection) || "asc"
  );
  
  // Action loading states
  const [actionLoading, setActionLoading] = useState<Record<number, string>>({});
  
  // Filter states - initialize from URL
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get("status") || "all"
  );
  const [strategyFilter, setStrategyFilter] = useState<string>(
    searchParams.get("strategy") || "all"
  );
  const [symbolFilter, setSymbolFilter] = useState<string>(
    searchParams.get("symbol") || ""
  );
  const [searchQuery, setSearchQuery] = useState<string>(
    searchParams.get("search") || ""
  );
  
  // Pagination state - initialize from URL
  const [currentPage, setCurrentPage] = useState<number>(
    parseInt(searchParams.get("page") || "1", 10)
  );
  const [pageSize, setPageSize] = useState<number>(
    parseInt(searchParams.get("pageSize") || "10", 10)
  );
  
  // Create Bot Form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Edit Bot Form state
  const [editingBot, setEditingBot] = useState<TradingBot | null>(null);
  
  // Filters Modal state
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  
  // Update URL when filters/sort/pagination change
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (strategyFilter !== "all") params.set("strategy", strategyFilter);
    if (symbolFilter) params.set("symbol", symbolFilter);
    if (searchQuery) params.set("search", searchQuery);
    if (sortField) {
      params.set("sort", sortField);
      params.set("direction", sortDirection);
    }
    if (currentPage > 1) params.set("page", currentPage.toString());
    if (pageSize !== 10) params.set("pageSize", pageSize.toString());
    
    const newUrl = params.toString() ? `?${params.toString()}` : "";
    router.replace(`/bots${newUrl}`, { scroll: false });
  }, [statusFilter, strategyFilter, symbolFilter, searchQuery, sortField, sortDirection, currentPage, pageSize, router]);

  // Fetch bots with retry functionality
  const fetchBots = useCallback(async (retryAttempt = 0): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem("auth_token") || "";
      if (!token) {
        setError("Please login to view bots");
        setLoading(false);
        return;
      }

      const apiUrl = typeof window !== "undefined" 
        ? "http://localhost:8000" 
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${apiUrl}/bots`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setBots(Array.isArray(data) ? data : []);
        setError(null);
        retryCountRef.current = 0; // Reset retry count on success
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || "Failed to load bots";
        setError(errorMessage);
        
        // Retry on network errors or 5xx errors
        if (retryAttempt < maxRetries && (response.status >= 500 || response.status === 0)) {
          retryCountRef.current = retryAttempt + 1;
          const delay = Math.min(1000 * Math.pow(2, retryAttempt), 5000); // Exponential backoff
          setTimeout(() => {
            fetchBots(retryAttempt + 1);
          }, delay);
          return;
        }
      }
    } catch (err) {
      console.error("Error fetching bots:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load bots";
      setError(errorMessage);
      
      // Retry on network errors
      if (retryAttempt < maxRetries) {
        retryCountRef.current = retryAttempt + 1;
        const delay = Math.min(1000 * Math.pow(2, retryAttempt), 5000); // Exponential backoff
        setTimeout(() => {
          fetchBots(retryAttempt + 1);
        }, delay);
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [maxRetries]);
  
  // Manual retry function
  const retryFetch = useCallback(() => {
    retryCountRef.current = 0;
    fetchBots(0);
  }, [fetchBots]);

  useEffect(() => {
    fetchBots();
  }, [fetchBots]);

  // Fetch bot status when selected
  const fetchBotStatus = useCallback(async (botId: number) => {
    setStatusLoading(true);
    try {
      const token = localStorage.getItem("auth_token") || "";
      if (!token) return;

      const apiUrl = typeof window !== "undefined" 
        ? "http://localhost:8000" 
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${apiUrl}/bots/${botId}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setBotStatus(data);
      }
    } catch (err) {
      console.error("Error fetching bot status:", err);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  // Fetch bot trades when selected
  const fetchBotTrades = useCallback(async (botId: number) => {
    setTradesLoading(true);
    try {
      const token = localStorage.getItem("auth_token") || "";
      if (!token) return;

      const apiUrl = typeof window !== "undefined" 
        ? "http://localhost:8000" 
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${apiUrl}/bots/${botId}/trades?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setBotTrades(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching bot trades:", err);
    } finally {
      setTradesLoading(false);
    }
  }, []);

  // Fetch bot details when selected
  useEffect(() => {
    if (selectedBot) {
      fetchBotStatus(selectedBot.id);
      fetchBotTrades(selectedBot.id);
    } else {
      setBotStatus(null);
      setBotTrades([]);
    }
  }, [selectedBot, fetchBotStatus, fetchBotTrades]);

  // Filter and sort bots
  const filteredAndSortedBots = useMemo(() => {
    // Apply filters
    let filtered = bots.filter((bot) => {
      // Status filter
      if (statusFilter !== "all" && bot.status !== statusFilter) {
        return false;
      }
      
      // Strategy filter
      if (strategyFilter !== "all" && bot.strategy_type !== strategyFilter) {
        return false;
      }
      
      // Symbol filter
      if (symbolFilter && !bot.symbols.some(symbol => 
        symbol.toLowerCase().includes(symbolFilter.toLowerCase())
      )) {
        return false;
      }
      
      // Search query (by name)
      if (searchQuery && !bot.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      return true;
    });
    
    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;
        
        switch (sortField) {
          case "name":
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case "status":
            aValue = a.status;
            bValue = b.status;
            break;
          case "strategy_type":
            aValue = a.strategy_type;
            bValue = b.strategy_type;
            break;
          case "capital":
            aValue = parseFloat(a.capital);
            bValue = parseFloat(b.capital);
            break;
          case "total_pnl":
            aValue = parseFloat(a.total_pnl);
            bValue = parseFloat(b.total_pnl);
            break;
          case "win_rate":
            aValue = a.total_trades > 0 ? (a.winning_trades / a.total_trades) * 100 : 0;
            bValue = b.total_trades > 0 ? (b.winning_trades / b.total_trades) * 100 : 0;
            break;
          case "total_trades":
            aValue = a.total_trades;
            bValue = b.total_trades;
            break;
          default:
            return 0;
        }
        
        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [bots, statusFilter, strategyFilter, symbolFilter, searchQuery, sortField, sortDirection]);
  
  // Paginated bots
  const paginatedBots = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedBots.slice(startIndex, endIndex);
  }, [filteredAndSortedBots, currentPage, pageSize]);
  
  // Pagination info
  const totalPages = Math.ceil(filteredAndSortedBots.length / pageSize);
  const totalItems = filteredAndSortedBots.length;
  
  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Handle bot actions
  const handleStartBot = async (botId: number) => {
    setActionLoading(prev => ({ ...prev, [botId]: "start" }));
    try {
      const token = localStorage.getItem("auth_token") || "";
      if (!token) return;

      const apiUrl = typeof window !== "undefined" 
        ? "http://localhost:8000" 
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${apiUrl}/bots/${botId}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchBots();
        if (selectedBot?.id === botId) {
          await fetchBotStatus(botId);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || "Failed to start bot");
      }
    } catch (err) {
      console.error("Error starting bot:", err);
      setError("Failed to start bot");
    } finally {
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState[botId];
        return newState;
      });
    }
  };

  const handleStopBot = async (botId: number) => {
    setActionLoading(prev => ({ ...prev, [botId]: "stop" }));
    try {
      const token = localStorage.getItem("auth_token") || "";
      if (!token) return;

      const apiUrl = typeof window !== "undefined" 
        ? "http://localhost:8000" 
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${apiUrl}/bots/${botId}/stop`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchBots();
        if (selectedBot?.id === botId) {
          await fetchBotStatus(botId);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || "Failed to stop bot");
      }
    } catch (err) {
      console.error("Error stopping bot:", err);
      setError("Failed to stop bot");
    } finally {
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState[botId];
        return newState;
      });
    }
  };

  const handleEditBot = (bot: TradingBot) => {
    setEditingBot(bot);
  };
  
  const handleEditSuccess = () => {
    setEditingBot(null);
    fetchBots(); // Refresh bot list
    if (selectedBot) {
      // Refresh selected bot if it was edited
      const token = localStorage.getItem("auth_token") || "";
      if (token) {
        const apiUrl = typeof window !== "undefined" 
          ? "http://localhost:8000" 
          : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        fetch(`${apiUrl}/bots/${selectedBot.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(res => res.json())
          .then(data => setSelectedBot(data))
          .catch(console.error);
      }
    }
  };

  const handleDeleteBot = async (botId: number) => {
    if (!confirm("Are you sure you want to delete this bot?")) return;
    
    setActionLoading(prev => ({ ...prev, [botId]: "delete" }));
    try {
      const token = localStorage.getItem("auth_token") || "";
      if (!token) return;

      const apiUrl = typeof window !== "undefined" 
        ? "http://localhost:8000" 
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${apiUrl}/bots/${botId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchBots();
        if (selectedBot?.id === botId) {
          setSelectedBot(null);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || "Failed to delete bot");
      }
    } catch (err) {
      console.error("Error deleting bot:", err);
      setError("Failed to delete bot");
    } finally {
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState[botId];
        return newState;
      });
    }
  };

  if (loading && bots.length === 0) {
    return (
      <ErrorBoundary>
        <div style={layoutStyle}>
          {/* Header */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}>
            <h1 style={{ 
              color: colors.primary, 
              fontSize: "32px", 
              fontWeight: "bold",
              margin: 0,
            }}>
              Trading Bots Management
            </h1>
          </div>
          
          {/* Loading State with Skeleton */}
          <div style={mainLayoutStyle}>
            <div style={{ width: "320px", flexShrink: 0 }}>
              <div style={panelStyle}>
                <SkeletonLoader type="card" />
              </div>
            </div>
            <div style={{ flex: "1", minWidth: "0" }}>
              <div style={panelStyle}>
                <SkeletonLoader type="table" lines={5} />
              </div>
            </div>
            <div style={{ width: "320px", flexShrink: 0 }}>
              <div style={panelStyle}>
                <SkeletonLoader type="card" />
              </div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div style={layoutStyle}>
      {/* Header with Title and Action Buttons */}
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between",
        alignItems: isMobile ? "flex-start" : "center",
        gap: isMobile ? "16px" : "0",
        marginBottom: "24px",
      }}>
        <h1 style={{ 
          color: colors.primary, 
          fontSize: isMobile ? "24px" : isTablet ? "28px" : "32px", 
          fontWeight: "bold",
          margin: 0,
        }}>
          Trading Bots Management
        </h1>
        
        <div style={{ 
          display: "flex", 
          gap: "12px", 
          alignItems: "center",
          flexWrap: isMobile ? "wrap" : "nowrap",
          width: isMobile ? "100%" : "auto",
        }}>
          {/* Refresh Button */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "8px 12px",
                backgroundColor: colors.panelBackground,
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                color: colors.text,
                fontSize: "14px",
                minWidth: isMobile ? "100%" : "200px",
                width: isMobile ? "100%" : "auto",
              }}
            />
            
            {/* Filters Button */}
            <button
              onClick={() => setShowFiltersModal(true)}
              style={{
                padding: "8px 16px",
                backgroundColor: colors.panelBackground,
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                color: colors.text,
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.1)";
                e.currentTarget.style.borderColor = colors.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.panelBackground;
                e.currentTarget.style.borderColor = colors.border;
              }}
            >
              <span>🔍</span>
              Filters
            </button>
            
          {/* Refresh Button */}
          <button
            onClick={() => {
              fetchBots();
              if (selectedBot) {
                fetchBotStatus(selectedBot.id);
                fetchBotTrades(selectedBot.id);
              }
            }}
            style={{
                padding: "8px 16px",
              backgroundColor: colors.panelBackground,
              border: `1px solid ${colors.border}`,
              borderRadius: "8px",
              color: colors.text,
              fontWeight: "500",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.1)";
              e.currentTarget.style.borderColor = colors.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.panelBackground;
              e.currentTarget.style.borderColor = colors.border;
            }}
          >
            <span>🔄</span>
            Refresh
          </button>
          </div>
          
          {/* Create Bot Button */}
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              padding: "10px 20px",
              backgroundColor: colors.primary,
              border: "none",
              borderRadius: "8px",
              color: colors.background,
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "14px",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            + Create New Bot
          </button>
        </div>
      </div>

      {/* Error Message with Retry */}
      {error && (
        <div style={{
          padding: "16px",
          backgroundColor: "rgba(239, 68, 68, 0.15)",
          border: "2px solid rgba(239, 68, 68, 0.5)",
          borderRadius: "8px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
        }}>
          <div style={{ color: colors.error, fontSize: "14px", fontWeight: "500", flex: 1 }}>
            <strong>⚠️ Error:</strong> {error}
            {retryCountRef.current > 0 && (
              <span style={{ color: colors.secondaryText, fontSize: "12px", marginLeft: "8px" }}>
                (Retry attempt {retryCountRef.current}/{maxRetries})
              </span>
            )}
          </div>
          <button
            onClick={retryFetch}
            style={{
              padding: "6px 12px",
              backgroundColor: colors.error,
              border: "none",
              borderRadius: "6px",
              color: colors.text,
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Layout - Responsive Layout Pattern */}
      <div style={getResponsiveLayoutStyle(isMobile, isTablet)}>
        {/* Left Panel - Stats */}
        <div style={{
          ...(isMobile ? { width: "100%" } : isTablet ? { width: "100%", order: 1 } : { width: "320px", flexShrink: 0 }),
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}>
          {/* Stats Panel */}
          <BotStatsPanel bots={bots} filteredBots={filteredAndSortedBots} />
        </div>

        {/* Center Panel - Bot List */}
        <div style={{
          ...(isMobile ? { width: "100%", order: 2 } : isTablet ? { width: "100%", order: 2 } : { flex: "1", minWidth: "0" }),
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}>
          {/* Bot List Panel */}
          <ErrorBoundary>
            {loading ? (
              <div style={getResponsivePanelStyle(isMobile, isTablet)}>
                <h3 style={{ color: colors.primary, marginBottom: "12px", fontSize: isMobile ? "16px" : "18px", fontWeight: "600" }}>
                  Bot List
                </h3>
                <SkeletonLoader type="table" lines={5} />
              </div>
            ) : (
              <BotListTable
                bots={paginatedBots}
                selectedBot={selectedBot}
                sortField={sortField}
                sortDirection={sortDirection}
                actionLoading={actionLoading}
                onBotSelect={setSelectedBot}
                onSort={handleSort}
                onStartBot={handleStartBot}
                onStopBot={handleStopBot}
                onEditBot={handleEditBot}
                onDeleteBot={handleDeleteBot}
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                showPagination={totalItems > pageSize}
                isMobile={isMobile}
                isTablet={isTablet}
              />
            )}
          </ErrorBoundary>
        </div>

        {/* Right Panel - Bot Details Panel */}
        <div style={{
          ...(isMobile ? { width: "100%", order: 3 } : isTablet ? { width: "100%", order: 3 } : { width: "320px", flexShrink: 0 }),
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}>
          <BotDetailsPanel
            selectedBot={selectedBot}
            botStatus={botStatus}
            botTrades={botTrades}
            statusLoading={statusLoading}
            tradesLoading={tradesLoading}
            onStartBot={handleStartBot}
            onStopBot={handleStopBot}
            onEditBot={handleEditBot}
            onDeleteBot={handleDeleteBot}
            isMobile={isMobile}
            isTablet={isTablet}
          />
        </div>
      </div>

      {/* Filters Modal */}
      <FiltersModal
        isOpen={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        statusFilter={statusFilter}
        strategyFilter={strategyFilter}
        symbolFilter={symbolFilter}
        onStatusFilterChange={setStatusFilter}
        onStrategyFilterChange={setStrategyFilter}
        onSymbolFilterChange={setSymbolFilter}
        onClearFilters={() => {
          setStatusFilter("all");
          setStrategyFilter("all");
          setSymbolFilter("");
        }}
      />

      {/* Create Bot Form Modal */}
      <CreateBotForm
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSubmit={async (data) => {
          const token = localStorage.getItem("auth_token") || "";
          if (!token) {
            throw new Error("Please login to create bot");
          }

          const apiUrl = typeof window !== "undefined" 
            ? "http://localhost:8000" 
            : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

          const response = await fetch(`${apiUrl}/bots/create`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Bot creation error:", errorData);
            const errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData) || "Failed to create bot";
            throw new Error(errorMessage);
          }

          await fetchBots();
        }}
      />
      
      {/* Edit Bot Form Modal */}
      <EditBotForm
        isOpen={!!editingBot}
        bot={editingBot}
        onClose={() => setEditingBot(null)}
        onSuccess={handleEditSuccess}
      />
      </div>
    </ErrorBoundary>
  );
}

export default function BotsPage() {
  return (
    <Suspense fallback={
      <div style={layoutStyle}>
        <div style={{ textAlign: "center", padding: "40px", color: colors.secondaryText }}>
          Loading...
        </div>
      </div>
    }>
      <BotsPageContent />
    </Suspense>
  );
}

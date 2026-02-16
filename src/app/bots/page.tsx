"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { TradingBot, BotStatus, BotTrade, SortField, SortDirection } from "@/components/bots/types";
import {
  colors,
  layoutStyle,
  panelStyle,
  getResponsiveLayoutStyle,
  getResponsivePanelStyle,
} from "@/components/bots/constants";
import SkeletonLoader from "@/components/bots/SkeletonLoader";
import ErrorBoundary from "@/components/bots/ErrorBoundary";
import { useResponsive } from "@/hooks/useResponsive";
import {
  fetchBots as apiFetchBots,
  fetchBotStatus as apiFetchBotStatus,
  fetchBotTrades as apiFetchBotTrades,
  fetchBot,
  startBot as apiStartBot,
  stopBot as apiStopBot,
  deleteBot as apiDeleteBot,
  createBot as apiCreateBot,
} from "@/lib/botsApi";
import { filterAndSortBots, paginateBots } from "@/lib/botsUtils";

const BotStatsPanel = dynamic(
  () => import("@/components/bots/BotStatsPanel").then((m) => m.default),
  { ssr: false, loading: () => <div style={{ ...panelStyle, minHeight: 120 }} /> }
);
const BotListTable = dynamic(
  () => import("@/components/bots/BotListTable").then((m) => m.default),
  { ssr: false, loading: () => <div style={{ ...panelStyle, minHeight: 300 }} /> }
);
const BotDetailsPanel = dynamic(
  () => import("@/components/bots/BotDetailsPanel").then((m) => m.default),
  { ssr: false, loading: () => <div style={{ ...panelStyle, minHeight: 200 }} /> }
);
const CreateBotForm = dynamic(
  () => import("@/components/bots/CreateBotForm").then((m) => m.default),
  { ssr: false }
);
const EditBotForm = dynamic(
  () => import("@/components/bots/EditBotForm").then((m) => m.default),
  { ssr: false }
);
const FiltersModal = dynamic(
  () => import("@/components/bots/FiltersModal").then((m) => m.default),
  { ssr: false }
);

/**
 * Trading Bots Management Page
 * Built according to BOT_PAGE_UI_DESIGN.md. Uses same styling as Market Page.
 */

function BotsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isMobile, isTablet } = useResponsive();
  
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

  const FETCH_TIMEOUT_MS = 30000;

  const fetchBots = useCallback(async (retryAttempt = 0): Promise<void> => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const data = await apiFetchBots(controller.signal);
      setBots(data);
      setError(null);
      retryCountRef.current = 0;
    } catch (err) {
      const msg =
        err instanceof Error
          ? (err.name === "AbortError" ? "Request timed out. Please try again." : err.message)
          : "Failed to load bots";
      console.error("Error fetching bots:", err);
      setError(msg);
      const isAuthError = msg.includes("login") || msg.includes("Please login");
      const isAbort = err instanceof Error && err.name === "AbortError";
      if (retryAttempt < maxRetries && !isAuthError && !isAbort) {
        retryCountRef.current = retryAttempt + 1;
        const delay = Math.min(1000 * Math.pow(2, retryAttempt), 5000);
        setTimeout(() => fetchBots(retryAttempt + 1), delay);
        return;
      }
    } finally {
      clearTimeout(timeoutId);
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

  const fetchBotStatus = useCallback(async (botId: number) => {
    setStatusLoading(true);
    try {
      const data = await apiFetchBotStatus(botId);
      setBotStatus(data);
    } catch (err) {
      console.error("Error fetching bot status:", err);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const fetchBotTrades = useCallback(async (botId: number) => {
    setTradesLoading(true);
    try {
      const data = await apiFetchBotTrades(botId);
      setBotTrades(data);
    } catch (err) {
      console.error("Error fetching bot trades:", err);
    } finally {
      setTradesLoading(false);
    }
  }, []);

  // Fetch bot details when selected (status + trades in parallel)
  useEffect(() => {
    if (selectedBot) {
      void Promise.all([
        fetchBotStatus(selectedBot.id),
        fetchBotTrades(selectedBot.id),
      ]);
    } else {
      setBotStatus(null);
      setBotTrades([]);
    }
  }, [selectedBot, fetchBotStatus, fetchBotTrades]);

  // When status says there are open positions but the trades list doesn't show them, refetch trades (keeps Current Positions in sync)
  useEffect(() => {
    if (!selectedBot || !botStatus || botStatus.open_positions <= 0) return;
    const openCount = botTrades.filter(t => String(t.status || "").toLowerCase() === "open").length;
    if (openCount < botStatus.open_positions) {
      fetchBotTrades(selectedBot.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Only refetch trades when open_positions count suggests we're missing data
  }, [selectedBot, botStatus?.open_positions, botTrades, fetchBotTrades]);

  const filteredAndSortedBots = useMemo(
    () =>
      filterAndSortBots(
        bots,
        { statusFilter, strategyFilter, symbolFilter, searchQuery },
        sortField,
        sortDirection
      ),
    [bots, statusFilter, strategyFilter, symbolFilter, searchQuery, sortField, sortDirection]
  );

  const paginatedBots = useMemo(
    () => paginateBots(filteredAndSortedBots, currentPage, pageSize),
    [filteredAndSortedBots, currentPage, pageSize]
  );
  
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

  const handleStartBot = async (botId: number) => {
    setActionLoading((prev) => ({ ...prev, [botId]: "start" }));
    try {
      await apiStartBot(botId);
      await fetchBots();
      if (selectedBot?.id === botId) await fetchBotStatus(botId);
    } catch (err) {
      console.error("Error starting bot:", err);
      setError(err instanceof Error ? err.message : "Failed to start bot");
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[botId];
        return next;
      });
    }
  };

  const handleStopBot = async (botId: number) => {
    setActionLoading((prev) => ({ ...prev, [botId]: "stop" }));
    try {
      await apiStopBot(botId);
      await fetchBots();
      if (selectedBot?.id === botId) await fetchBotStatus(botId);
    } catch (err) {
      console.error("Error stopping bot:", err);
      setError(err instanceof Error ? err.message : "Failed to stop bot");
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[botId];
        return next;
      });
    }
  };

  const handleEditBot = (bot: TradingBot) => {
    setEditingBot(bot);
  };
  
  const handleEditSuccess = () => {
    setEditingBot(null);
    fetchBots();
    if (selectedBot) {
      fetchBot(selectedBot.id)
        .then(setSelectedBot)
        .catch(console.error);
    }
  };

  const handleDeleteBot = async (botId: number) => {
    if (!confirm("Are you sure you want to delete this bot?")) return;
    setActionLoading((prev) => ({ ...prev, [botId]: "delete" }));
    try {
      await apiDeleteBot(botId);
      await fetchBots();
      if (selectedBot?.id === botId) setSelectedBot(null);
    } catch (err) {
      console.error("Error deleting bot:", err);
      setError(err instanceof Error ? err.message : "Failed to delete bot");
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[botId];
        return next;
      });
    }
  };

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
                <h3 style={{ color: colors.primary, marginBottom: "4px", fontSize: isMobile ? "16px" : "18px", fontWeight: "600" }}>
                  Bot List
                </h3>
                <p style={{ color: colors.secondaryText, fontSize: "12px", marginBottom: "12px" }}>
                  Loading bots…
                </p>
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

      {showFiltersModal && (
        <FiltersModal
          isOpen={true}
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
      )}

      {showCreateForm && (
        <CreateBotForm
          isOpen={true}
          onClose={() => setShowCreateForm(false)}
          onSubmit={async (data) => {
            await apiCreateBot(data);
            await fetchBots();
          }}
        />
      )}

      {editingBot && (
        <EditBotForm
          isOpen={true}
          bot={editingBot}
          onClose={() => setEditingBot(null)}
          onSuccess={handleEditSuccess}
        />
      )}
      </div>
    </ErrorBoundary>
  );
}

function BotsPageSkeleton() {
  return (
    <div style={layoutStyle}>
      <div style={{ marginBottom: "24px", height: 32, width: 280, backgroundColor: colors.panelBackground, borderRadius: 8 }} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ width: 320, height: 140, backgroundColor: colors.panelBackground, borderRadius: 12 }} />
        <div style={{ flex: 1, minWidth: 300, height: 320, backgroundColor: colors.panelBackground, borderRadius: 12 }} />
        <div style={{ width: 320, height: 200, backgroundColor: colors.panelBackground, borderRadius: 12 }} />
      </div>
    </div>
  );
}

export default function BotsPage() {
  return (
    <Suspense fallback={<BotsPageSkeleton />}>
      <BotsPageContent />
    </Suspense>
  );
}

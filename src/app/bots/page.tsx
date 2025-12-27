"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BotFiltersPanel,
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
} from "@/components/bots";

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

export default function BotsPage() {
  const [bots, setBots] = useState<TradingBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Bot details state
  const [selectedBot, setSelectedBot] = useState<TradingBot | null>(null);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [botTrades, setBotTrades] = useState<BotTrade[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [tradesLoading, setTradesLoading] = useState(false);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  
  // Action loading states
  const [actionLoading, setActionLoading] = useState<Record<number, string>>({});
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [strategyFilter, setStrategyFilter] = useState<string>("all");
  const [symbolFilter, setSymbolFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Create Bot Form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Edit Bot Form state
  const [editingBot, setEditingBot] = useState<TradingBot | null>(null);

  // Fetch bots
  const fetchBots = useCallback(async () => {
    setLoading(true);
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
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || "Failed to load bots");
      }
    } catch (err) {
      console.error("Error fetching bots:", err);
      setError("Failed to load bots");
    } finally {
      setLoading(false);
    }
  }, []);

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

  if (loading) {
    return (
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
        
        {/* Loading State */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 20px",
          color: colors.secondaryText,
        }}>
          <div style={{
            width: "40px",
            height: "40px",
            border: `4px solid ${colors.border}`,
            borderTopColor: colors.primary,
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            marginBottom: "16px",
          }}></div>
          <div style={{ fontSize: "16px", fontWeight: "500" }}>Loading bots...</div>
        </div>
        
        {/* Add spin animation */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={layoutStyle}>
      {/* Header with Title and Action Buttons */}
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
        
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
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
              padding: "10px 16px",
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
          
          {/* Create Bot Button */}
          <button
            onClick={() => {
              // TODO: Open create bot form
              console.log("Create bot clicked");
            }}
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

      {/* Error Message */}
      {error && (
        <div style={{
          padding: "16px",
          backgroundColor: "rgba(239, 68, 68, 0.15)",
          border: "2px solid rgba(239, 68, 68, 0.5)",
          borderRadius: "8px",
          marginBottom: "24px",
          color: colors.error,
          fontSize: "14px",
          fontWeight: "500",
        }}>
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      {/* Main Layout - Full Width Layout Pattern */}
      <div style={mainLayoutStyle}>
        {/* Left Panel - Filters & Stats */}
        <div style={{
          width: "320px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}>
          {/* Filters Panel */}
          <BotFiltersPanel
            statusFilter={statusFilter}
            strategyFilter={strategyFilter}
            symbolFilter={symbolFilter}
            searchQuery={searchQuery}
            onStatusFilterChange={setStatusFilter}
            onStrategyFilterChange={setStrategyFilter}
            onSymbolFilterChange={setSymbolFilter}
            onSearchQueryChange={setSearchQuery}
            onClearFilters={() => {
              setStatusFilter("all");
              setStrategyFilter("all");
              setSymbolFilter("");
              setSearchQuery("");
            }}
          />

          {/* Stats Panel */}
          <BotStatsPanel bots={bots} filteredBots={filteredAndSortedBots} />

          {/* Create Bot Button */}
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              padding: "12px 20px",
              backgroundColor: colors.primary,
              border: "none",
              borderRadius: "8px",
              color: colors.background,
              fontWeight: "600",
              cursor: "pointer",
              transition: "opacity 0.2s",
              fontSize: "14px",
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

        {/* Center Panel - Bot List */}
        <div style={{
          flex: "1",
          minWidth: "0",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}>
          {/* Bot List Panel */}
          <BotListTable
            bots={filteredAndSortedBots}
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
          />
        </div>

        {/* Right Panel - Bot Details Panel */}
        <div style={{
          width: "320px",
          flexShrink: 0,
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
          />
        </div>
      </div>

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
  );
}

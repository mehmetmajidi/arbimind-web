import type { TradingBot, SortField, SortDirection } from "@/components/bots/types";

export interface BotFilters {
  statusFilter: string;
  strategyFilter: string;
  symbolFilter: string;
  searchQuery: string;
}

export function filterBots(bots: TradingBot[], filters: BotFilters): TradingBot[] {
  return bots.filter((bot) => {
    if (filters.statusFilter !== "all" && bot.status !== filters.statusFilter) return false;
    if (filters.strategyFilter !== "all" && bot.strategy_type !== filters.strategyFilter) return false;
    if (
      filters.symbolFilter &&
      !bot.symbols.some((s) => s.toLowerCase().includes(filters.symbolFilter.toLowerCase()))
    )
      return false;
    if (
      filters.searchQuery &&
      !bot.name.toLowerCase().includes(filters.searchQuery.toLowerCase())
    )
      return false;
    return true;
  });
}

function getSortValue(bot: TradingBot, field: SortField): string | number {
  switch (field) {
    case "name":
      return bot.name.toLowerCase();
    case "status":
      return bot.status;
    case "strategy_type":
      return bot.strategy_type;
    case "capital":
      return parseFloat(bot.capital);
    case "total_pnl":
      return parseFloat(bot.total_pnl);
    case "win_rate":
      return bot.total_trades > 0 ? (bot.winning_trades / bot.total_trades) * 100 : 0;
    case "total_trades":
      return bot.total_trades;
    default:
      return 0;
  }
}

export function sortBots(
  bots: TradingBot[],
  sortField: SortField | null,
  sortDirection: SortDirection
): TradingBot[] {
  if (!sortField) return bots;
  return [...bots].sort((a, b) => {
    const aValue = getSortValue(a, sortField);
    const bValue = getSortValue(b, sortField);
    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });
}

export function filterAndSortBots(
  bots: TradingBot[],
  filters: BotFilters,
  sortField: SortField | null,
  sortDirection: SortDirection
): TradingBot[] {
  const filtered = filterBots(bots, filters);
  return sortBots(filtered, sortField, sortDirection);
}

export function paginateBots(
  bots: TradingBot[],
  page: number,
  pageSize: number
): TradingBot[] {
  const start = (page - 1) * pageSize;
  return bots.slice(start, start + pageSize);
}

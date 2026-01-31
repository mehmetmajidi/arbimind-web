// Types for Trading Bots

export interface TradingBot {
  id: number;
  name: string;
  status: string;
  strategy_type: string;
  capital: string;
  current_capital: string;
  risk_per_trade: string;
  symbols: string[];
  exchange_account_id: number;
  max_position_size: string | null;
  stop_loss_percent: string | null;
  take_profit_percent: string | null;
  duration_hours: number | null;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  total_pnl: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  stopped_at: string | null;
  last_error: string | null;
  paper_trading: boolean;
  strategy_params?: Record<string, unknown> | null;
}

export interface SymbolStats {
  total_quantity: number;  // Total quantity bought for this symbol
  total_cost_at_entry: number;  // Total value when purchased (entry_price * quantity)
  current_value: number;  // Current total value of all positions (open + closed)
  realized_pnl: number;  // Realized PnL from closed trades
  unrealized_pnl: number;  // Unrealized PnL from open positions
  total_pnl: number;  // Total PnL (realized + unrealized)
}

export interface BotStatus {
  id: number;
  name: string;
  status: string;
  strategy_type: string;
  capital: number;
  current_capital: number;
  available_balance: number;  // Available balance for new trades
  locked_capital: number;  // Capital locked in open positions
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
  open_positions: number;
  symbol_stats?: Record<string, SymbolStats>;  // Statistics per symbol
  started_at: string | null;
  stopped_at: string | null;
  last_error: string | null;
}

export interface BotTrade {
  id: number;
  bot_id: number;
  order_id: number | null;
  symbol: string;
  side: string;
  quantity: string;
  entry_price: string;
  exit_price: string | null;
  pnl: string;
  pnl_percent: string | null;
  status: string;
  entry_time: string;
  exit_time: string | null;
  entry_reason: string | null;
  exit_reason: string | null;
  prediction_confidence: string | null;
  prediction_horizon: string | null;
}

export type SortField = "name" | "status" | "strategy_type" | "capital" | "total_pnl" | "win_rate" | "total_trades";
export type SortDirection = "asc" | "desc";


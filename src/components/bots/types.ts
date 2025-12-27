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

export interface BotStatus {
  id: number;
  name: string;
  status: string;
  strategy_type: string;
  capital: number;
  current_capital: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
  open_positions: number;
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


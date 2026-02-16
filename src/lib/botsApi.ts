import { getApiUrl } from "@/lib/apiBaseUrl";
import type { TradingBot, BotStatus, BotTrade } from "@/components/bots/types";

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("auth_token") || "";
}

export async function fetchBots(signal?: AbortSignal): Promise<TradingBot[]> {
  const token = getToken();
  if (!token) throw new Error("Please login to view bots");
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/bots`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail ?? "Failed to load bots");
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchBot(botId: number): Promise<TradingBot> {
  const token = getToken();
  if (!token) throw new Error("Please login to view bot details");
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/bots/${botId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) throw new Error("Bot not found");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail ?? "Failed to load bot");
  }
  return response.json();
}

export async function fetchBotStatus(botId: number): Promise<BotStatus | null> {
  const token = getToken();
  if (!token) return null;
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/bots/${botId}/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data && typeof data === "object" ? data : null;
}

export async function fetchBotTrades(
  botId: number,
  limit = 10
): Promise<BotTrade[]> {
  const token = getToken();
  if (!token) return [];
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/bots/${botId}/trades?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function startBot(botId: number): Promise<void> {
  const token = getToken();
  if (!token) throw new Error("Please login");
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/bots/${botId}/start`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail ?? "Failed to start bot");
  }
}

export async function stopBot(botId: number): Promise<void> {
  const token = getToken();
  if (!token) throw new Error("Please login");
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/bots/${botId}/stop`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail ?? "Failed to stop bot");
  }
}

export async function deleteBot(botId: number): Promise<void> {
  const token = getToken();
  if (!token) throw new Error("Please login");
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/bots/${botId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail ?? "Failed to delete bot");
  }
}

export interface CreateBotPayload {
  name: string;
  exchange_account_id: number;
  capital: number;
  risk_per_trade: number;
  symbols: string[];
  strategy_type: string;
  stop_loss_percent: number | null;
  take_profit_percent: number | null;
  duration_hours: number | null;
  paper_trading: boolean;
  source_currency?: string | null;
  source_amount?: number | null;
}

export async function createBot(data: CreateBotPayload): Promise<void> {
  const token = getToken();
  if (!token) throw new Error("Please login to create bot");
  const apiUrl = getApiUrl();
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
    const msg =
      errorData.detail ??
      errorData.message ??
      JSON.stringify(errorData) ??
      "Failed to create bot";
    throw new Error(msg);
  }
}

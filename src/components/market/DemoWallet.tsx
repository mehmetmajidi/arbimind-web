"use client";

import { useState, useEffect } from "react";
import { colors, panelStyle, typography, spacing } from "@/components/shared/designSystem";
import { useExchange } from "@/contexts/ExchangeContext";

interface WalletData {
  id: number;
  user_id: number;
  balance_usdt: string;
  initial_balance: string;
  total_pnl: string;
  total_pnl_percent: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  coin_balances?: Record<string, string>;
}

interface DemoWalletProps {
  onWalletReset?: () => void;
  wallet?: Record<string, unknown> | WalletData | null;
  loading?: boolean;
  error?: string | null;
  onRefetch?: () => void;
}

/** Demo Wallet. When wallet/loading/error/onRefetch are passed, uses them (shared fetch with Portfolio Stats). */
export default function DemoWallet({ onWalletReset, wallet: walletProp, loading: loadingProp, error: errorProp, onRefetch }: DemoWalletProps = {}) {
  const { selectedAccountId } = useExchange();
  const [walletInternal, setWalletInternal] = useState<WalletData | null>(null);
  const [loadingInternal, setLoadingInternal] = useState(false);
  const [errorInternal, setErrorInternal] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const isControlled = walletProp !== undefined;
  const wallet = isControlled ? (walletProp as WalletData | null) : walletInternal;
  const loading = isControlled ? (loadingProp ?? false) : loadingInternal;
  const error = isControlled ? (errorProp ?? null) : errorInternal;

  const isDemoExchange = selectedAccountId === -999;

  const fetchWallet = async () => {
    if (isControlled && onRefetch) { onRefetch(); return; }
    setLoadingInternal(true);
    setErrorInternal(null);
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const apiUrl = typeof window !== "undefined" 
        ? "http://localhost:8000" 
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${apiUrl}/demo/wallet`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to fetch wallet");
      }

      const walletData = await response.json();
      setWalletInternal(walletData);
    } catch (err) {
      setErrorInternal(err instanceof Error ? err.message : "Failed to load wallet");
    } finally {
      setLoadingInternal(false);
    }
  };

  useEffect(() => {
    if (!isDemoExchange) {
      if (!isControlled) setWalletInternal(null);
      return;
    }
    if (!isControlled) fetchWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoExchange, isControlled]);

  const handleResetWallet = async () => {
    if (!confirm("Are you sure you want to reset your wallet? This will reset your balance to 1000 USDT and clear all coin balances.")) {
      return;
    }

    setResetting(true);
    if (!isControlled) setErrorInternal(null);
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const apiUrl = typeof window !== "undefined" 
        ? "http://localhost:8000" 
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${apiUrl}/demo/wallet/reset`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to reset wallet");
      }

      if (onRefetch) await onRefetch(); else await fetchWallet();
      onWalletReset?.();
    } catch (err) {
      if (!isControlled) setErrorInternal(err instanceof Error ? err.message : "Failed to reset wallet");
    } finally {
      setResetting(false);
    }
  };

  if (!isDemoExchange) {
    return null;
  }

  if (loading && !wallet) {
    return (
      <div style={panelStyle}>
        <div style={{ ...typography.h3, marginBottom: spacing.md, color: colors.primary }}>
          Demo Wallet
        </div>
        <div style={{ ...typography.body, color: colors.secondaryText }}>
          Loading wallet...
        </div>
      </div>
    );
  }

  if (error && !wallet) {
    return (
      <div style={panelStyle}>
        <div style={{ ...typography.h3, marginBottom: spacing.md, color: colors.primary }}>
          Demo Wallet
        </div>
        <div style={{ 
          ...typography.body, 
          color: colors.error,
          padding: spacing.sm,
          backgroundColor: "rgba(255, 68, 68, 0.1)",
          borderRadius: "4px",
          marginBottom: spacing.sm,
        }}>
          {error}
        </div>
        <button
          onClick={fetchWallet}
          style={{
            padding: `${spacing.xs} ${spacing.md}`,
            backgroundColor: colors.primary,
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div style={panelStyle}>
        <div style={{ ...typography.h3, marginBottom: spacing.md, color: colors.primary }}>
          Demo Wallet
        </div>
        <div style={{ ...typography.body, color: colors.secondaryText, marginBottom: spacing.md }}>
          No wallet found. Click below to create one.
        </div>
        <button
          onClick={fetchWallet}
          style={{
            padding: `${spacing.sm} ${spacing.md}`,
            backgroundColor: colors.primary,
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          Create Wallet
        </button>
      </div>
    );
  }

  const balanceUsdt = parseFloat(wallet.balance_usdt);
  const initialBalance = parseFloat(wallet.initial_balance);
  const totalPnl = parseFloat(wallet.total_pnl);
  const totalPnlPercent = parseFloat(wallet.total_pnl_percent);
  const coinBalances = wallet.coin_balances || {};

  return (
    <div style={panelStyle}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: spacing.md 
      }}>
        <div style={{ ...typography.h3, color: colors.primary }}>
          Demo Wallet
        </div>
        <button
          onClick={fetchWallet}
          disabled={loading}
          style={{
            padding: `${spacing.xs} ${spacing.sm}`,
            backgroundColor: "transparent",
            color: colors.primary,
            border: `1px solid ${colors.primary}`,
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "12px",
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div style={{ 
          ...typography.small, 
          color: colors.error,
          padding: spacing.sm,
          backgroundColor: "rgba(255, 68, 68, 0.1)",
          borderRadius: "4px",
          marginBottom: spacing.sm,
        }}>
          {error}
        </div>
      )}

      {/* USDT Balance */}
      <div style={{ marginBottom: spacing.md }}>
        <div style={{ ...typography.small, color: colors.secondaryText, marginBottom: spacing.xs }}>
          USDT Balance
        </div>
        <div style={{ ...typography.h2, color: colors.primary }}>
          {balanceUsdt.toLocaleString("en-US", { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          })} USDT
        </div>
        <div style={{ ...typography.small, color: colors.secondaryText, marginTop: spacing.xs }}>
          Initial: {initialBalance.toLocaleString("en-US", { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          })} USDT
        </div>
      </div>

      {/* P&L */}
      <div style={{ 
        marginBottom: spacing.md,
        padding: spacing.sm,
        backgroundColor: totalPnl >= 0 ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
        borderRadius: "4px",
      }}>
        <div style={{ ...typography.small, color: colors.secondaryText, marginBottom: spacing.xs }}>
          Total P&L
        </div>
        <div style={{ 
          ...typography.h3, 
          color: totalPnl >= 0 ? "#22c55e" : "#ef4444",
        }}>
          {totalPnl >= 0 ? "+" : ""}{totalPnl.toLocaleString("en-US", { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          })} USDT
        </div>
        <div style={{ 
          ...typography.small, 
          color: totalPnl >= 0 ? "#22c55e" : "#ef4444",
          marginTop: spacing.xs,
        }}>
          {totalPnlPercent >= 0 ? "+" : ""}{totalPnlPercent.toFixed(2)}%
        </div>
      </div>

      {/* Coin Balances */}
      {Object.keys(coinBalances).length > 0 && (
        <div style={{ marginBottom: spacing.md }}>
          <div style={{ ...typography.small, color: colors.secondaryText, marginBottom: spacing.xs }}>
            Coin Balances
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
            {Object.entries(coinBalances).map(([coin, balance]) => (
              <div 
                key={coin}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: spacing.xs,
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "4px",
                }}
              >
                <span style={{ ...typography.body, color: colors.text }}>{coin}</span>
                <span style={{ ...typography.body, color: colors.primary }}>
                  {parseFloat(balance).toLocaleString("en-US", { 
                    minimumFractionDigits: 4, 
                    maximumFractionDigits: 8 
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reset Button */}
      <button
        onClick={handleResetWallet}
        disabled={resetting}
        style={{
          width: "100%",
          padding: spacing.sm,
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          color: "#ef4444",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "4px",
          cursor: resetting ? "not-allowed" : "pointer",
          fontSize: "14px",
          fontWeight: "500",
          opacity: resetting ? 0.5 : 1,
        }}
      >
        {resetting ? "Resetting..." : "Reset Wallet"}
      </button>
    </div>
  );
}


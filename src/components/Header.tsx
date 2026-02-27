"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useExchange } from "@/contexts/ExchangeContext";
import { usePathname, useRouter } from "next/navigation";
import { MdMenuOpen, MdExpandMore, MdAccountBalanceWallet, MdList } from "react-icons/md";
import { useState, useRef, useEffect, useCallback } from "react";
import HealthCheck from "./HealthCheck";
import { getApiV1Base } from "@/lib/apiBaseUrl";
import { getTradingApiBase } from "@/lib/tradingEndpoints";

const DemoWallet = dynamic(() => import("@/components/market/DemoWallet").then((m) => m.default), { ssr: false });
const DemoPortfolioStats = dynamic(() => import("@/components/market/DemoPortfolioStats").then((m) => m.default), { ssr: false });
const ActiveOrders = dynamic(() => import("@/components/market/ActiveOrders").then((m) => m.default), { ssr: false });

interface HeaderProps {
    sidebarWidth: string;
    onToggleSidebar?: () => void;
    isSidebarCollapsed?: boolean;
}

export default function Header({ sidebarWidth, onToggleSidebar, isSidebarCollapsed }: HeaderProps) {
    const { accounts, selectedAccountId, setSelectedAccountId, loading } = useExchange();
    const pathname = usePathname();
    const router = useRouter();
    const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/forgot-password" || pathname === "/reset-password";
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    /** 'wallet' | 'orders' | null - which right panel is open */
    const [rightPanel, setRightPanel] = useState<"wallet" | "orders" | null>(null);
    const panelWidth = "min(400px, 20vw)";

    /** Pre-load demo wallet in background when Demo is selected so panel opens instantly */
    const [demoWallet, setDemoWallet] = useState<Record<string, unknown> | null>(null);
    const [demoWalletLoading, setDemoWalletLoading] = useState(false);
    const [demoWalletError, setDemoWalletError] = useState<string | null>(null);
    const fetchDemoWallet = useCallback(async () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
        if (!token) {
            setDemoWallet(null);
            setDemoWalletError("Please login");
            return;
        }
        setDemoWalletLoading(true);
        setDemoWalletError(null);
        try {
            const res = await fetch(`${getApiV1Base()}/demo/wallet`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error((err as { detail?: string }).detail || "Failed to fetch wallet");
            }
            const data = await res.json();
            setDemoWallet(data);
        } catch (e) {
            setDemoWalletError(e instanceof Error ? e.message : "Failed to load wallet");
            setDemoWallet(null);
        } finally {
            setDemoWalletLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedAccountId === -999) {
            fetchDemoWallet();
        } else {
            setDemoWallet(null);
            setDemoWalletError(null);
        }
    }, [selectedAccountId, fetchDemoWallet]);

    // Don't show header on auth pages
    if (isAuthPage) {
        return null;
    }

    // Pages that need exchange selector
    const needsExchangeSelector = [
        "/market",
        "/trading",
        "/bots",
        "/performance",
    ].some(path => pathname === path || pathname?.startsWith(path + "/"));

    // Check if Demo Exchange is selected (ID = -999)
    const isDemoMode = selectedAccountId === -999;

    // Get selected account or demo mode
    const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
    const exchangeName = isDemoMode ? "DEMO EXCHANGE" : (selectedAccount?.exchange_name || "");

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isDropdownOpen]);

    const closeRightPanel = useCallback(() => setRightPanel(null), []);

    return (
        <>
        <header
            style={{
                position: "fixed",
                top: 0,
                left: sidebarWidth,
                right: 0,
                height: "60px",
                backgroundColor: "#1a1a1a",
                borderBottom: "1px solid rgba(255, 174, 0, 0.2)",
                display: "flex",
                alignItems: "center",
                gap: "24px",
                padding: "0 32px",
                zIndex: 999,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                transition: "left 0.3s ease",
            }}
        >
            {/* Menu Icon */}
            {onToggleSidebar && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                    }}
                    onClick={onToggleSidebar}
                >
                    <MdMenuOpen size={24} color="#FFAE00" />
                </div>
            )}

            {/* ArbiMind Logo */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                }}
            >
                <Image
                    src="/brandlogo/Logo_dark_mode.svg"
                    alt="ArbiMind Logo"
                    width={140}
                    height={40}
                    priority
                    unoptimized
                    style={{
                        maxWidth: "100%",
                        height: "auto",
                    }}
                />
            </div>

            {/* Vertical Separator */}
            <div
                style={{
                    width: "1px",
                    height: "40px",
                    backgroundColor: "#FFAE00",
                    margin: "0 8px",
                }}
            />

            {/* Selected Wallet Section */}
            {needsExchangeSelector && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                        }}
                    >
                        <span
                            style={{
                                color: "#888",
                                fontSize: "11px",
                                fontWeight: "400",
                            }}
                        >
                            Selected Wallet
                        </span>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                            }}
                        >
                            {/* Exchange Logo/Icon */}
                            <div
                                style={{
                                    width: "24px",
                                    height: "24px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    {/* Diamond/Exchange icon */}
                                    <path
                                        d="M12 2 L20 8 L12 14 L4 8 Z"
                                        fill="#FFAE00"
                                        stroke="#FFAE00"
                                        strokeWidth="1"
                                    />
                                    <circle cx="12" cy="8" r="2" fill="#1a1a1a" />
                                </svg>
                            </div>
                            
                            {/* Exchange Name */}
                            <span
                                style={{
                                    color: "#FFAE00",
                                    fontSize: "14px",
                                    fontWeight: "bold",
                                    fontFamily: "sans-serif",
                                    textTransform: "uppercase",
                                }}
                            >
                                {loading ? "Loading..." : exchangeName || "Select Exchange"}
                            </span>
                        </div>
                    </div>

                    {/* Dropdown Arrow with Menu */}
                    <div
                        ref={dropdownRef}
                        style={{
                            position: "relative",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                        }}
                    >
                        <div
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <MdExpandMore 
                                size={28} 
                                color="#FFAE00"
                                style={{
                                    transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                                    transition: "transform 0.3s ease",
                                }}
                            />
                        </div>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: "100%",
                                    right: 0,
                                    marginTop: "8px",
                                    backgroundColor: "#2a2a2a",
                                    border: "1px solid rgba(255, 174, 0, 0.3)",
                                    borderRadius: "8px",
                                    minWidth: "200px",
                                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
                                    zIndex: 1000,
                                    overflow: "hidden",
                                }}
                            >
                                {loading ? (
                                    <div
                                        style={{
                                            padding: "12px 16px",
                                            color: "#888",
                                            fontSize: "14px",
                                        }}
                                    >
                                        Loading...
                                    </div>
                                ) : accounts.length === 0 ? (
                                    <div
                                        style={{
                                            padding: "12px 16px",
                                            color: "#888",
                                            fontSize: "14px",
                                        }}
                                    >
                                        No accounts available
                                    </div>
                                ) : (
                                    <>
                                        {/* Demo Exchange Option */}
                                        <div
                                            onClick={() => {
                                                setSelectedAccountId(-999); // Demo Exchange ID
                                                setIsDropdownOpen(false);
                                                // Navigate to market page if not already there
                                                if (!pathname?.startsWith("/market") && !pathname?.startsWith("/trading")) {
                                                    router.push("/market");
                                                }
                                            }}
                                            style={{
                                                padding: "12px 16px",
                                                color: isDemoMode ? "#FFAE00" : "#ededed",
                                                fontSize: "14px",
                                                cursor: "pointer",
                                                backgroundColor: isDemoMode ? "rgba(255, 174, 0, 0.1)" : "transparent",
                                                fontWeight: isDemoMode ? "600" : "400",
                                                transition: "all 0.2s ease",
                                                borderBottom: accounts.length > 0 ? "1px solid rgba(255, 174, 0, 0.2)" : "none",
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isDemoMode) {
                                                    e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.05)";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isDemoMode) {
                                                    e.currentTarget.style.backgroundColor = "transparent";
                                                }
                                            }}
                                        >
                                            DEMO EXCHANGE
                                        </div>
                                        
                                        {/* Regular Exchange Accounts */}
                                        {accounts.map((acc) => (
                                            <div
                                                key={acc.id}
                                                onClick={() => {
                                                    setSelectedAccountId(acc.id);
                                                    setIsDropdownOpen(false);
                                                }}
                                                style={{
                                                    padding: "12px 16px",
                                                    color: !isDemoMode && selectedAccountId === acc.id ? "#FFAE00" : "#ededed",
                                                    fontSize: "14px",
                                                    cursor: "pointer",
                                                    backgroundColor: !isDemoMode && selectedAccountId === acc.id ? "rgba(255, 174, 0, 0.1)" : "transparent",
                                                    fontWeight: !isDemoMode && selectedAccountId === acc.id ? "600" : "400",
                                                    transition: "all 0.2s ease",
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isDemoMode && selectedAccountId !== acc.id) {
                                                        e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.05)";
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isDemoMode && selectedAccountId !== acc.id) {
                                                        e.currentTarget.style.backgroundColor = "transparent";
                                                    }
                                                }}
                                            >
                                                {(acc.exchange_name || "Unknown").toUpperCase()}
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Wallet & Active Orders icons + Health Check - Right side */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "16px" }}>
                <button
                    type="button"
                    onClick={() => setRightPanel((p) => (p === "wallet" ? null : "wallet"))}
                    title="Wallet"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255, 174, 0, 0.3)",
                        backgroundColor: rightPanel === "wallet" ? "rgba(255, 174, 0, 0.15)" : "transparent",
                        color: "#FFAE00",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                    }}
                >
                    <MdAccountBalanceWallet size={22} />
                </button>
                <button
                    type="button"
                    onClick={() => setRightPanel((p) => (p === "orders" ? null : "orders"))}
                    title="Active Orders"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255, 174, 0, 0.3)",
                        backgroundColor: rightPanel === "orders" ? "rgba(255, 174, 0, 0.15)" : "transparent",
                        color: "#FFAE00",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                    }}
                >
                    <MdList size={22} />
                </button>
                <HealthCheck 
                    apiUrl={getApiV1Base()} 
                    compact={true} 
                />
            </div>
        </header>

        {/* Right slide-out panel (Wallet or Active Orders) - max 20% screen */}
        {rightPanel && (
            <>
                <div
                    role="button"
                    tabIndex={0}
                    onClick={closeRightPanel}
                    onKeyDown={(e) => e.key === "Escape" && closeRightPanel()}
                    style={{
                        position: "fixed",
                        inset: 0,
                        top: 60,
                        backgroundColor: "rgba(0,0,0,0.4)",
                        zIndex: 997,
                        transition: "opacity 0.2s ease",
                    }}
                    aria-label="Close panel"
                />
                <div
                    style={{
                        position: "fixed",
                        top: 60,
                        right: 0,
                        width: panelWidth,
                        maxWidth: "100%",
                        height: "calc(100vh - 60px)",
                        backgroundColor: "#1a1a1a",
                        borderLeft: "1px solid rgba(255, 174, 0, 0.2)",
                        boxShadow: "-4px 0 20px rgba(0,0,0,0.3)",
                        zIndex: 998,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        animation: "slideInRight 0.25s ease",
                    }}
                >
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                        borderBottom: "1px solid rgba(255, 174, 0, 0.2)",
                        flexShrink: 0,
                    }}>
                        <span style={{ color: "#FFAE00", fontWeight: 600, fontSize: "14px" }}>
                            {rightPanel === "wallet" ? "Wallet" : "Active Orders"}
                        </span>
                        <button
                            type="button"
                            onClick={closeRightPanel}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#888",
                                cursor: "pointer",
                                fontSize: "20px",
                                lineHeight: 1,
                                padding: "4px",
                            }}
                            aria-label="Close"
                        >
                            ×
                        </button>
                    </div>
                    <div style={{ flex: 1, overflow: "auto", padding: "12px" }}>
                        {rightPanel === "wallet" && (
                            isDemoMode ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                    <DemoWallet
                                        wallet={demoWallet}
                                        loading={demoWalletLoading}
                                        error={demoWalletError}
                                        onRefetch={fetchDemoWallet}
                                        onWalletReset={fetchDemoWallet}
                                    />
                                    <DemoPortfolioStats
                                        wallet={demoWallet}
                                        loading={demoWalletLoading}
                                        error={demoWalletError}
                                    />
                                </div>
                            ) : (
                                <HeaderBalancePanel selectedAccountId={selectedAccountId} />
                            )
                        )}
                        {rightPanel === "orders" && (
                            <ActiveOrders selectedSymbol={undefined} />
                        )}
                    </div>
                </div>
            </>
        )}
        </>
    );
}

/** Simple balance summary for non-demo accounts in header panel */
function HeaderBalancePanel({ selectedAccountId }: { selectedAccountId: number | null }) {
    const [balance, setBalance] = useState<Record<string, { free?: number; used?: number; total?: number }> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedAccountId || selectedAccountId === -999) {
            setBalance(null);
            setError(null);
            return;
        }
        setLoading(true);
        setError(null);
        const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
        if (!token) {
            setError("Please login");
            setLoading(false);
            return;
        }
        fetch(`${getTradingApiBase()}/balance/${selectedAccountId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load"))))
            .then((data) => {
                setBalance(data?.balances ?? null);
                setError(null);
            })
            .catch(() => setError("Failed to load balance"))
            .finally(() => setLoading(false));
    }, [selectedAccountId]);

    if (!selectedAccountId || selectedAccountId === -999) {
        return <div style={{ color: "#888", fontSize: "12px" }}>Select an exchange account</div>;
    }
    if (loading) return <div style={{ color: "#888", fontSize: "12px" }}>Loading balance...</div>;
    if (error) return <div style={{ color: "#ef4444", fontSize: "12px" }}>{error}</div>;
    if (!balance || typeof balance !== "object") return <div style={{ color: "#888", fontSize: "12px" }}>No balance data</div>;

    const usdt = balance?.USDT ?? balance?.usdt ?? {};
    const totalUsdt = usdt.total ?? usdt.free ?? 0;
    const usedUsdt = usdt.used ?? 0;
    const freeUsdt = usdt.free ?? totalUsdt - usedUsdt;

    return (
        <div style={{ color: "#ededed", fontSize: "13px" }}>
            <div style={{ marginBottom: "12px" }}>
                <div style={{ color: "#888", fontSize: "11px", marginBottom: "4px" }}>USDT</div>
                <div style={{ fontWeight: 600, color: "#FFAE00" }}>{Number(totalUsdt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</div>
                <div style={{ color: "#888", fontSize: "11px", marginTop: "4px" }}>Available: {Number(freeUsdt).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                {usedUsdt > 0 && <div style={{ color: "#888", fontSize: "11px" }}>In orders: {Number(usedUsdt).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>}
            </div>
        </div>
    );
}

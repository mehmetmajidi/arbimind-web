"use client";

import { useExchange } from "@/contexts/ExchangeContext";
import { usePathname } from "next/navigation";

export default function Header() {
    const { accounts, selectedAccountId, setSelectedAccountId, loading } = useExchange();
    const pathname = usePathname();
    const isAuthPage = pathname === "/login" || pathname === "/register";

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

    if (!needsExchangeSelector) {
        return null;
    }

    return (
        <header
            style={{
                position: "sticky",
                top: 0,
                left: "250px",
                right: 0,
                height: "70px",
                backgroundColor: "#1a1a1a",
                borderBottom: "1px solid rgba(255, 174, 0, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 32px",
                zIndex: 999,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
            }}
        >
            {/* Logo/Title */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                }}
            >
                <h1
                    style={{
                        fontSize: "24px",
                        fontWeight: "700",
                        color: "#FFAE00",
                        margin: 0,
                        textShadow: "0 0 10px rgba(255, 174, 0, 0.5)",
                    }}
                >
                    ArbiMind
                </h1>
            </div>

            {/* Exchange Selector */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                }}
            >
                <div>
                    <label
                        style={{
                            display: "block",
                            marginBottom: "6px",
                            fontWeight: "600",
                            color: "#FFAE00",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                        }}
                    >
                        Exchange Account
                    </label>
                    <select
                        value={selectedAccountId !== null ? String(selectedAccountId) : ""}
                        onChange={(e) => {
                            const newValue = e.target.value;
                            setSelectedAccountId(newValue ? Number(newValue) : null);
                        }}
                        disabled={loading || accounts.length === 0}
                        style={{
                            minWidth: "200px",
                            padding: "10px 16px",
                            borderRadius: "8px",
                            border: "2px solid rgba(255, 174, 0, 0.3)",
                            backgroundColor: "#2a2a2a",
                            color: "#ededed",
                            fontSize: "14px",
                            cursor: loading || accounts.length === 0 ? "not-allowed" : "pointer",
                            outline: "none",
                            transition: "all 0.2s ease",
                            opacity: loading || accounts.length === 0 ? 0.6 : 1,
                        }}
                        onFocus={(e) => {
                            if (!loading && accounts.length > 0) {
                                e.target.style.borderColor = "#FFAE00";
                                e.target.style.boxShadow = "0 0 8px rgba(255, 174, 0, 0.3)";
                            }
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = "rgba(255, 174, 0, 0.3)";
                            e.target.style.boxShadow = "none";
                        }}
                    >
                        <option value="" style={{ backgroundColor: "#1a1a1a", color: "#888" }}>
                            {loading ? "Loading..." : accounts.length === 0 ? "No accounts" : "Select Exchange"}
                        </option>
                        {accounts.map((acc) => (
                            <option
                                key={acc.id}
                                value={String(acc.id)}
                                style={{ backgroundColor: "#1a1a1a", color: "#ededed" }}
                            >
                                {(acc.exchange_name || "Unknown").toUpperCase()}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </header>
    );
}


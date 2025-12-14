"use client";

import { useState, useEffect } from "react";

interface Symbol {
    symbol: string;
    base: string;
    quote: string;
    active: boolean;
    type?: string; // Optional - only included if not null
}

interface SymbolSelectorProps {
    exchangeId?: number | null;
    accountId?: number | null; // Alternative: get exchange_id from account_id
    selectedSymbol: string;
    onSymbolChange: (symbol: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export default function SymbolSelector({
    exchangeId,
    accountId,
    selectedSymbol,
    onSymbolChange,
    disabled = false,
    placeholder = "Select symbol...",
}: SymbolSelectorProps) {
    const [symbols, setSymbols] = useState<Symbol[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currencyFilter, setCurrencyFilter] = useState<string>("");

    // Fetch symbols from database
    useEffect(() => {
        // Use accountId if provided, otherwise use exchangeId
        const id = accountId || exchangeId;
        if (!id) {
            setSymbols([]);
            setError(null);
            return;
        }

        const fetchSymbols = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem("auth_token") || "";
                if (!token) {
                    setError("Please login to view symbols");
                    setLoading(false);
                    return;
                }

                const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                // Use account_id endpoint if accountId is provided, otherwise use exchange_id endpoint
                const endpoint = accountId 
                    ? `${apiUrl}/market/symbols/by-account/${accountId}?active_only=true`
                    : `${apiUrl}/market/symbols/by-exchange-id/${exchangeId}?active_only=true`;
                const response = await fetch(endpoint, {
                    headers: { Authorization: `Bearer ${token}` },
                    // Use cache for faster loading - cache for 30 seconds
                    cache: "default",
                });

                if (response.ok) {
                    const data = await response.json();
                    const symbolsList = data.symbols || [];
                    
                    // Filter out invalid pairs:
                    // 1. Where base === quote (e.g., USDT:USDT)
                    // 2. Where symbol contains :QUOTE (e.g., 0G/USDT:USDT, 0G/USDC:USDC)
                    const validSymbols = symbolsList.filter((symbol: Symbol) => {
                        // Check if base and quote are different
                        if (symbol.base === symbol.quote) {
                            return false;
                        }
                        // Check if symbol contains :QUOTE pattern
                        if (symbol.symbol.includes(':')) {
                            const parts = symbol.symbol.split(':');
                            if (parts.length > 1) {
                                const afterColon = parts[parts.length - 1];
                                // If the part after colon matches the quote currency, it's invalid
                                if (afterColon === symbol.quote) {
                                    return false;
                                }
                            }
                        }
                        return true;
                    });
                    
                    setSymbols(validSymbols);
                    setError(null);

                    // Auto-select first symbol if available and no symbol is selected
                    if (validSymbols.length > 0 && !selectedSymbol) {
                        const firstSymbol = validSymbols[0].symbol;
                        onSymbolChange(firstSymbol);
                    }
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || `Failed to load symbols (${response.status})`);
                    setSymbols([]);
                }
            } catch (error) {
                console.error("Error fetching symbols:", error);
                setError(`Failed to load symbols: ${error instanceof Error ? error.message : "Unknown error"}`);
                setSymbols([]);
            } finally {
                setLoading(false);
            }
        };

        fetchSymbols();
        // Only re-fetch when exchangeId or accountId changes, not when selectedSymbol changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exchangeId, accountId]);

    // Get unique quote currencies from symbols
    const validSymbols = symbols.filter((s) => s.base !== s.quote);
    const uniqueCurrencies = Array.from(new Set(validSymbols.map((s) => s.quote).filter(Boolean))).sort();

    // Filter symbols by currency (quote currency)
    const filteredSymbols = currencyFilter
        ? validSymbols.filter((symbol) => symbol.quote.toLowerCase() === currencyFilter.toLowerCase())
        : validSymbols;

    // Reset selected symbol if it's not in filtered list
    useEffect(() => {
        if (selectedSymbol && !filteredSymbols.find((s) => s.symbol === selectedSymbol)) {
            onSymbolChange("");
            // Auto-select first symbol if available
            if (filteredSymbols.length > 0) {
                onSymbolChange(filteredSymbols[0].symbol);
            }
        }
    }, [currencyFilter, filteredSymbols, selectedSymbol, onSymbolChange]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "250px" }}>
            {/* Symbol Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <select
                    value={selectedSymbol}
                    onChange={(e) => onSymbolChange(e.target.value)}
                    disabled={disabled || (!exchangeId && !accountId) || filteredSymbols.length === 0 || loading}
                    style={{
                        backgroundColor: "transparent",
                        border: "none",
                        color: "#ffffff",
                        fontSize: "20px",
                        fontWeight: "600",
                        cursor: disabled || !exchangeId || filteredSymbols.length === 0 || loading ? "not-allowed" : "pointer",
                        outline: "none",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        flex: 1,
                        opacity: disabled || loading ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                        if (!disabled && (exchangeId || accountId) && filteredSymbols.length > 0 && !loading) {
                            e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.1)";
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                    }}
                >
                    {loading ? (
                        <option value="" style={{ backgroundColor: "#1a1a1a", color: "#888" }}>
                            Loading...
                        </option>
                    ) : filteredSymbols.length === 0 ? (
                        <option value="" style={{ backgroundColor: "#1a1a1a", color: "#888" }}>
                            {error || "No symbols found"}
                        </option>
                    ) : (
                        filteredSymbols.map((symbol) => (
                            <option key={symbol.symbol} value={symbol.symbol} style={{ backgroundColor: "#1a1a1a", color: "#ffffff" }}>
                                {symbol.symbol}
                            </option>
                        ))
                    )}
                </select>
                <span style={{ color: "#888", fontSize: "14px" }}>▼</span>
            </div>

            {/* Currency Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <select
                    value={currencyFilter}
                    onChange={(e) => {
                        setCurrencyFilter(e.target.value);
                    }}
                    disabled={disabled || loading || uniqueCurrencies.length === 0}
                    style={{
                        backgroundColor: "#2a2a2a",
                        border: "1px solid rgba(255, 174, 0, 0.3)",
                        color: "#ffffff",
                        fontSize: "14px",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        outline: "none",
                        cursor: disabled || loading ? "not-allowed" : "pointer",
                        flex: 1,
                        opacity: disabled || loading ? 0.5 : 1,
                    }}
                    onFocus={(e) => {
                        if (!disabled && !loading) {
                            e.currentTarget.style.borderColor = "#FFAE00";
                        }
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.3)";
                    }}
                >
                    <option value="" style={{ backgroundColor: "#1a1a1a", color: "#ffffff" }}>
                        All Currencies
                    </option>
                    {uniqueCurrencies.map((currency) => (
                        <option key={currency} value={currency} style={{ backgroundColor: "#1a1a1a", color: "#ffffff" }}>
                            {currency}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}


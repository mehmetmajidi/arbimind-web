"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ExchangeAccount {
    id: number;
    exchange_name: string;
    is_active: boolean;
}

interface ExchangeContextType {
    accounts: ExchangeAccount[];
    selectedAccountId: number | null;
    setSelectedAccountId: (id: number | null) => void;
    loading: boolean;
    error: string | null;
    refreshAccounts: () => Promise<void>;
}

const ExchangeContext = createContext<ExchangeContextType | undefined>(undefined);

export function ExchangeProvider({ children }: { children: ReactNode }) {
    const [accounts, setAccounts] = useState<ExchangeAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAccounts = async () => {
        try {
            const token = localStorage.getItem("auth_token") || "";
            if (!token) {
                setError("Please login to view exchange accounts");
                setLoading(false);
                return;
            }

            const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

            const response = await fetch(`${apiUrl}/exchange/accounts`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    setError("Please login to view exchange accounts");
                    setLoading(false);
                    return;
                }
                throw new Error(`Failed to fetch accounts: ${response.statusText}`);
            }

            const data = await response.json();
            console.log("ExchangeContext: Received accounts data:", data);
            
            // Handle both array response and object with accounts property
            const accountsList = Array.isArray(data) ? data : (data.accounts || []);
            console.log("ExchangeContext: Parsed accounts list:", accountsList);
            
            const activeAccounts = accountsList.filter((acc: ExchangeAccount) => acc.is_active);
            console.log("ExchangeContext: Active accounts:", activeAccounts);
            
            setAccounts(activeAccounts);

            // Auto-select first account if none selected
            if (!selectedAccountId && activeAccounts.length > 0) {
                setSelectedAccountId(activeAccounts[0].id);
            }

            setError(null);
        } catch (err) {
            console.error("Error fetching accounts:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch exchange accounts");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    // Load selected account from localStorage on mount
    useEffect(() => {
        const savedAccountId = localStorage.getItem("selectedAccountId");
        if (savedAccountId) {
            setSelectedAccountId(Number(savedAccountId));
        }
    }, []);

    // Save selected account to localStorage when it changes
    useEffect(() => {
        if (selectedAccountId) {
            localStorage.setItem("selectedAccountId", selectedAccountId.toString());
        } else {
            localStorage.removeItem("selectedAccountId");
        }
    }, [selectedAccountId]);

    return (
        <ExchangeContext.Provider
            value={{
                accounts,
                selectedAccountId,
                setSelectedAccountId,
                loading,
                error,
                refreshAccounts: fetchAccounts,
            }}
        >
            {children}
        </ExchangeContext.Provider>
    );
}

export function useExchange() {
    const context = useContext(ExchangeContext);
    if (context === undefined) {
        throw new Error("useExchange must be used within an ExchangeProvider");
    }
    return context;
}


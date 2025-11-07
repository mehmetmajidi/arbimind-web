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
            setLoading(true);
            setError(null);
            
            const token = localStorage.getItem("auth_token") || "";
            if (!token) {
                console.warn("ExchangeContext: No auth token found");
                setError("Please login to view exchange accounts");
                setLoading(false);
                return;
            }

            const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const url = `${apiUrl}/exchange/accounts`;
            
            console.log("ExchangeContext: Fetching accounts from:", url);

            const response = await fetch(url, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            console.log("ExchangeContext: Response status:", response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("ExchangeContext: API error response:", errorText);
                
                if (response.status === 401) {
                    setError("Please login to view exchange accounts");
                    setLoading(false);
                    return;
                }
                throw new Error(`Failed to fetch accounts: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log("ExchangeContext: Received accounts data:", data);
            console.log("ExchangeContext: Data type:", Array.isArray(data) ? "array" : typeof data);
            
            // Handle both array response and object with accounts property
            const accountsList = Array.isArray(data) ? data : (data.accounts || []);
            console.log("ExchangeContext: Parsed accounts list:", accountsList);
            console.log("ExchangeContext: Total accounts:", accountsList.length);
            
            // Show ALL accounts (both active and inactive) - let user see all their accounts
            // The backend returns all accounts, we should show them all
            console.log("ExchangeContext: All accounts:", accountsList);
            console.log("ExchangeContext: Account details:", accountsList.map((acc: ExchangeAccount) => ({
                id: acc.id,
                exchange_name: acc.exchange_name,
                is_active: acc.is_active
            })));
            
            // Show all accounts regardless of active status
            setAccounts(accountsList);

            // Auto-select first account if none selected AND no saved account in localStorage
            // Check localStorage directly to avoid race condition
            const savedAccountId = localStorage.getItem("selectedAccountId");
            const currentSelectedId = savedAccountId ? Number(savedAccountId) : selectedAccountId;
            
            if (currentSelectedId === null && accountsList.length > 0) {
                console.log("ExchangeContext: Auto-selecting first account:", accountsList[0].id);
                setSelectedAccountId(accountsList[0].id);
            } else if (currentSelectedId !== null && accountsList.length > 0) {
                // Verify the saved account still exists in the list
                const accountExists = accountsList.some((acc: ExchangeAccount) => acc.id === currentSelectedId);
                if (!accountExists) {
                    console.warn(`ExchangeContext: Saved account ${currentSelectedId} not found, selecting first available`);
                    setSelectedAccountId(accountsList[0].id);
                } else if (selectedAccountId !== currentSelectedId) {
                    // Sync selectedAccountId with saved value
                    setSelectedAccountId(currentSelectedId);
                }
            } else if (accountsList.length === 0) {
                console.warn("ExchangeContext: No accounts found at all");
                setError("No exchange accounts found. Please create an exchange account first.");
            }

            setError(null);
        } catch (err) {
            console.error("ExchangeContext: Error fetching accounts:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch exchange accounts");
            setAccounts([]);
        } finally {
            setLoading(false);
        }
    };

    // Load selected account from localStorage on mount (before fetching accounts)
    useEffect(() => {
        const savedAccountId = localStorage.getItem("selectedAccountId");
        if (savedAccountId) {
            const accountId = Number(savedAccountId);
            if (!isNaN(accountId)) {
                setSelectedAccountId(accountId);
            }
        }
    }, []);

    useEffect(() => {
        fetchAccounts();
    }, []);

    // Save selected account to localStorage when it changes
    useEffect(() => {
        if (selectedAccountId !== null) {
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


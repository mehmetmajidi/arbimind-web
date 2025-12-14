"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";

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
    const fetchingRef = useRef(false); // Prevent multiple simultaneous fetches

    const fetchAccounts = useCallback(async () => {
        // Prevent multiple simultaneous fetches
        if (fetchingRef.current) {
            console.log("ExchangeContext: Fetch already in progress, skipping...");
            return;
        }

        try {
            fetchingRef.current = true;
            setLoading(true);
            setError(null);
            
            const token = localStorage.getItem("auth_token") || "";
            if (!token) {
                console.warn("ExchangeContext: No auth token found");
                setError("Please login to view exchange accounts");
                setLoading(false);
                fetchingRef.current = false;
                return;
            }

            const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const url = `${apiUrl}/exchange/accounts`;
            
            console.log("ExchangeContext: Fetching accounts from:", url);

            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(url, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            console.log("ExchangeContext: Response status:", response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("ExchangeContext: API error response:", errorText);
                
                if (response.status === 401) {
                    setError("Please login to view exchange accounts");
                    setLoading(false);
                    fetchingRef.current = false;
                    return;
                }
                throw new Error(`Failed to fetch accounts: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log("ExchangeContext: Received accounts data:", data);
            
            // Handle both array response and object with accounts property
            const accountsList = Array.isArray(data) ? data : (data.accounts || []);
            console.log("ExchangeContext: Total accounts:", accountsList.length);
            
            // Show all accounts regardless of active status
            setAccounts(accountsList);

            // Handle empty accounts list
            if (accountsList.length === 0) {
                console.warn("ExchangeContext: No accounts found at all");
                setError("No exchange accounts found. Please create an exchange account first.");
            } else {
                setError(null);
            }

            // Auto-select first account if none selected AND no saved account in localStorage
            // Check localStorage directly to avoid race condition
            const savedAccountId = localStorage.getItem("selectedAccountId");
            // Use functional update to get current state
            setSelectedAccountId((currentSelectedId) => {
                const finalSelectedId = savedAccountId ? Number(savedAccountId) : currentSelectedId;
                
                if (finalSelectedId === null && accountsList.length > 0) {
                    console.log("ExchangeContext: Auto-selecting first account:", accountsList[0].id);
                    return accountsList[0].id;
                } else if (finalSelectedId !== null && accountsList.length > 0) {
                    // Verify the saved account still exists in the list
                    const accountExists = accountsList.some((acc: ExchangeAccount) => acc.id === finalSelectedId);
                    if (!accountExists) {
                        console.warn(`ExchangeContext: Saved account ${finalSelectedId} not found, selecting first available`);
                        return accountsList[0].id;
                    }
                    return finalSelectedId;
                }
                return finalSelectedId;
            });
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                console.error("ExchangeContext: Request timeout");
                setError("Request timeout. Please check your connection and try again.");
            } else {
                console.error("ExchangeContext: Error fetching accounts:", err);
                setError(err instanceof Error ? err.message : "Failed to fetch exchange accounts");
            }
            setAccounts([]);
        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    }, []);

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

    // Initial fetch on mount - only once
    useEffect(() => {
        const token = localStorage.getItem("auth_token");
        if (token && accounts.length === 0 && !fetchingRef.current) {
            fetchAccounts();
        } else if (!token) {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

    // Listen for auth token changes and refetch accounts
    useEffect(() => {
        // Check if token exists, if not, set up a retry mechanism
        const token = localStorage.getItem("auth_token");
        if (!token && accounts.length === 0 && !fetchingRef.current) {
            // If no token and no accounts, set up a short polling interval to check for token
            // This handles the case where login happens after context mounts
            const checkInterval = setInterval(() => {
                const currentToken = localStorage.getItem("auth_token");
                if (currentToken && !fetchingRef.current) {
                    console.log("ExchangeContext: Token detected, fetching accounts");
                    fetchAccounts();
                    clearInterval(checkInterval);
                }
            }, 1000); // Check every 1 second (reduced frequency)

            // Clear interval after 10 seconds to avoid infinite polling
            const timeout = setTimeout(() => {
                clearInterval(checkInterval);
            }, 10000);

            return () => {
                clearInterval(checkInterval);
                clearTimeout(timeout);
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accounts.length]); // Remove fetchAccounts from dependencies

    // Listen for storage events (works across tabs/windows)
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "auth_token") {
                if (e.newValue && !fetchingRef.current) {
                    console.log("ExchangeContext: Auth token set, refetching accounts");
                    fetchAccounts();
                } else if (!e.newValue) {
                    // Token was removed (logout)
                    console.log("ExchangeContext: Auth token removed, clearing accounts");
                    setAccounts([]);
                    setSelectedAccountId(null);
                    setError(null);
                    setLoading(false);
                }
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only set up listener once

    // Listen for custom auth events (for same-tab login/logout)
    useEffect(() => {
        const handleAuthTokenSet = () => {
            if (!fetchingRef.current) {
                console.log("ExchangeContext: Auth token set event received, refetching accounts");
                fetchAccounts();
            }
        };

        const handleAuthTokenRemoved = () => {
            console.log("ExchangeContext: Auth token removed event received, clearing accounts");
            setAccounts([]);
            setSelectedAccountId(null);
            setError(null);
            setLoading(false);
        };

        window.addEventListener("authTokenSet", handleAuthTokenSet);
        window.addEventListener("authTokenRemoved", handleAuthTokenRemoved);
        return () => {
            window.removeEventListener("authTokenSet", handleAuthTokenSet);
            window.removeEventListener("authTokenRemoved", handleAuthTokenRemoved);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only set up listener once

    // Refetch on window focus (in case user logged in in another tab)
    useEffect(() => {
        const handleFocus = () => {
            const token = localStorage.getItem("auth_token");
            if (token && accounts.length === 0 && !fetchingRef.current) {
                console.log("ExchangeContext: Window focused with token, refetching accounts");
                fetchAccounts();
            }
        };

        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accounts.length]); // Remove fetchAccounts from dependencies

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


"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { colors } from "./constants";

interface CreateBotFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
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
  }) => Promise<void>;
}

export default function CreateBotForm({ isOpen, onClose, onSubmit }: CreateBotFormProps) {
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [exchangeAccounts, setExchangeAccounts] = useState<Array<{id: number; exchange_name: string}>>([]);
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [isDesktop, setIsDesktop] = useState(false);
  
  // Quote currency and balance states
  const [quoteCurrencies, setQuoteCurrencies] = useState<Array<{currency_code: string; currency_name?: string}>>([]);
  const [selectedQuoteCurrency, setSelectedQuoteCurrency] = useState<string>("");
  const [balance, setBalance] = useState<{free: number; used: number; total: number} | null>(null);
  const [allBalances, setAllBalances] = useState<Record<string, {free: number; used: number; total: number}>>({});
  const [allExchangeCurrencies, setAllExchangeCurrencies] = useState<Array<{currency_code: string}>>([]);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [currenciesLoading, setCurrenciesLoading] = useState(false);
  const [investmentMode, setInvestmentMode] = useState<"amount" | "percentage">("amount");
  const lastChangedField = useRef<"amount" | "percentage" | null>(null);
  
  // Source currency states (for selling other currencies)
  const [useSourceCurrency, setUseSourceCurrency] = useState(false);
  const [sourceCurrency, setSourceCurrency] = useState<string>("");
  const [sourceAmount, setSourceAmount] = useState("");
  const [sourceAmountMode, setSourceAmountMode] = useState<"amount" | "percentage">("amount");
  const sourceLastChangedField = useRef<"amount" | "percentage" | null>(null);
  
  // Form fields
  const [botName, setBotName] = useState("");
  const [exchangeAccountId, setExchangeAccountId] = useState<string>("");
  const [capital, setCapital] = useState("");
  const [capitalPercentage, setCapitalPercentage] = useState("");
  const [riskPerTrade, setRiskPerTrade] = useState("2");
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState("prediction_based");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [paperTrading, setPaperTrading] = useState(true);
  const [hasDuration, setHasDuration] = useState(false);
  const [durationHours, setDurationHours] = useState("");

  // Fetch exchange accounts
  const fetchExchangeAccounts = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token") || "";
      if (!token) return;

      const apiUrl = typeof window !== "undefined" 
        ? "http://localhost:8000" 
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${apiUrl}/exchange/accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setExchangeAccounts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching exchange accounts:", err);
    }
  }, []);

  // Fetch available symbols (top filtered symbols by volatility and data freshness)
  const fetchAvailableSymbols = useCallback(async (accountId?: string) => {
    if (!accountId) {
      // Fallback to common symbols if no account selected
      const commonSymbols = [
        "BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "ADA/USDT",
        "XRP/USDT", "DOT/USDT", "DOGE/USDT", "AVAX/USDT", "MATIC/USDT",
        "LINK/USDT", "UNI/USDT", "LTC/USDT", "ATOM/USDT", "ETC/USDT",
      ];
      setAvailableSymbols(commonSymbols);
      return;
    }

    try {
      const token = localStorage.getItem("auth_token") || "";
      if (!token) {
        // Fallback to common symbols if no token
        const commonSymbols = [
          "BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "ADA/USDT",
          "XRP/USDT", "DOT/USDT", "DOGE/USDT", "AVAX/USDT", "MATIC/USDT",
          "LINK/USDT", "UNI/USDT", "LTC/USDT", "ATOM/USDT", "ETC/USDT",
        ];
        setAvailableSymbols(commonSymbols);
        return;
      }

      const apiUrl = typeof window !== "undefined" 
        ? "http://localhost:8000" 
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      // Fetch all filtered symbols from exchange account (by volatility and data freshness)
      // Filter by selected quote currency if available
      // Use a high limit to get all symbols (max 1000)
      const quoteParam = selectedQuoteCurrency ? `&quote_currency=${encodeURIComponent(selectedQuoteCurrency)}` : "";
      const response = await fetch(
        `${apiUrl}/train/top-filtered-symbols?exchange_account_id=${accountId}&limit=1000&interval=1h&check_volatility=true&check_data_freshness=true${quoteParam}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const symbols = data.symbols || [];
        setAvailableSymbols(symbols);
        console.log(`Loaded ${symbols.length} filtered symbols from exchange (${data.passed} passed filters out of ${data.total_checked} total)`);
      } else {
        console.warn("Failed to fetch filtered symbols, using fallback");
        // Fallback to common symbols
        const commonSymbols = [
          "BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "ADA/USDT",
          "XRP/USDT", "DOT/USDT", "DOGE/USDT", "AVAX/USDT", "MATIC/USDT",
          "LINK/USDT", "UNI/USDT", "LTC/USDT", "ATOM/USDT", "ETC/USDT",
        ];
        setAvailableSymbols(commonSymbols);
      }
    } catch (err) {
      console.error("Error fetching available symbols:", err);
      // Fallback to common symbols
      const commonSymbols = [
        "BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "ADA/USDT",
        "XRP/USDT", "DOT/USDT", "DOGE/USDT", "AVAX/USDT", "MATIC/USDT",
        "LINK/USDT", "UNI/USDT", "LTC/USDT", "ATOM/USDT", "ETC/USDT",
      ];
      setAvailableSymbols(commonSymbols);
    }
  }, [selectedQuoteCurrency]);

  // Fetch quote currencies for selected exchange account
  const fetchQuoteCurrencies = useCallback(async (accountId: string) => {
    if (!accountId) {
      setQuoteCurrencies([]);
      setAllExchangeCurrencies([]);
      setSelectedQuoteCurrency("");
      setBalance(null);
      return;
    }

    try {
      setCurrenciesLoading(true);
      const token = localStorage.getItem("auth_token") || "";
      if (!token) return;

      const apiUrl = typeof window !== "undefined" 
        ? "http://localhost:8000" 
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      // Fetch quote currencies
      const quoteResponse = await fetch(
        `${apiUrl}/exchange/currencies?exchange_account_id=${accountId}&currency_type=quote&active_only=true`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Fetch ALL currencies (base currencies) for source currency selection
      // Use currency_type=base to get base currencies, or no filter to get all
      const allCurrenciesResponse = await fetch(
        `${apiUrl}/exchange/currencies?exchange_account_id=${accountId}&currency_type=base&active_only=true`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (quoteResponse.ok) {
        const data = await quoteResponse.json();
        const currencies = data.currencies || [];
        setQuoteCurrencies(currencies);
        // Reset selected currency when exchange changes
        setSelectedQuoteCurrency("");
        setBalance(null);
      }

      if (allCurrenciesResponse.ok) {
        const data = await allCurrenciesResponse.json();
        const allCurrencies = data.currencies || [];
        setAllExchangeCurrencies(allCurrencies);
        console.log("All exchange currencies (base):", allCurrencies.map((c: {currency_code: string}) => c.currency_code));
        console.log("Total base currencies:", allCurrencies.length);
        
        // Check if FLOKI is in the list
        const flokiInExchange = allCurrencies.find((c: {currency_code: string}) => c.currency_code.toUpperCase() === "FLOKI");
        console.log("FLOKI in exchange currencies:", flokiInExchange ? `Yes - ${flokiInExchange.currency_code}` : "No");
      } else {
        console.warn("Failed to fetch all exchange currencies:", allCurrenciesResponse.status);
        const errorText = await allCurrenciesResponse.text().catch(() => "");
        console.warn("Error details:", errorText);
      }
    } catch (err) {
      console.error("Error fetching currencies:", err);
      setQuoteCurrencies([]);
      setAllExchangeCurrencies([]);
    } finally {
      setCurrenciesLoading(false);
    }
  }, []);

  // Fetch all balances for the account
  const fetchAllBalances = useCallback(async (accountId: string) => {
    if (!accountId) {
      setAllBalances({});
      setBalance(null);
      return;
    }

    try {
      setBalanceLoading(true);
      const token = localStorage.getItem("auth_token") || "";
      if (!token) {
        console.error("No auth token found");
        return;
      }

      const apiUrl = typeof window !== "undefined" 
        ? "http://localhost:8000" 
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      console.log(`Fetching balance for account ${accountId}...`);
      const response = await fetch(
        `${apiUrl}/trading/balance/${accountId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Balance fetch failed: ${response.status} ${response.statusText}`, errorText);
        setAllBalances({});
        setBalance(null);
        return;
      }

      const data = await response.json();
      console.log("Balance response:", data);
      
      const balances = data.balances || {};
      console.log("Parsed balances:", balances);
      console.log("Available currencies:", Object.keys(balances));
      
      // Check specifically for FLOKI
      const flokiKeys = Object.keys(balances).filter(key => key.toUpperCase() === "FLOKI");
      console.log("FLOKI keys found:", flokiKeys);
      if (flokiKeys.length > 0) {
        flokiKeys.forEach(key => {
          const flokiBalance = balances[key] as {free: number; used: number; total: number} | undefined;
          console.log(`FLOKI balance (key: ${key}):`, {
            free: flokiBalance?.free,
            used: flokiBalance?.used,
            total: flokiBalance?.total,
            freeString: flokiBalance?.free?.toString(),
            totalString: flokiBalance?.total?.toString()
          });
        });
      } else {
        console.warn("⚠️ FLOKI not found in balances!");
      }
      
      // Show currencies with non-zero balance
      const currenciesWithBalance = Object.entries(balances)
        .filter(([key, val]) => {
          const balance = val as {free: number; used: number; total: number} | undefined;
          return balance && (balance.free > 0 || balance.used > 0 || balance.total > 0);
        })
        .map(([key, val]) => {
          const balance = val as {free: number; used: number; total: number} | undefined;
          return {
            currency: key,
            free: balance?.free,
            used: balance?.used,
            total: balance?.total
          };
        });
      console.log("Currencies with non-zero balance:", currenciesWithBalance.length);
      console.log("Sample currencies with balance:", currenciesWithBalance.slice(0, 10));
      
      // Show all balance details
      console.log("All balance details:", Object.entries(balances).map(([key, val]) => {
        const balance = val as {free: number; used: number; total: number} | undefined;
        return {
          currency: key,
          free: balance?.free,
          used: balance?.used,
          total: balance?.total
        };
      }).filter(b => {
        const free = b.free ?? 0;
        const used = b.used ?? 0;
        const total = b.total ?? 0;
        return b.currency.toUpperCase() === "FLOKI" || free > 0 || used > 0 || total > 0;
      }).slice(0, 20));
      
      setAllBalances(balances);
      
      // Set balance for selected quote currency
      if (selectedQuoteCurrency) {
        const currencyUpper = selectedQuoteCurrency.toUpperCase();
        const currencyKey = Object.keys(balances).find(
          key => key.toUpperCase() === currencyUpper
        );
        
        if (currencyKey && balances[currencyKey]) {
          setBalance(balances[currencyKey]);
        } else {
          setBalance({ free: 0, used: 0, total: 0 });
        }
      }
    } catch (err) {
      console.error("Error fetching balance:", err);
      setAllBalances({});
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, [selectedQuoteCurrency]);

  // State for filtered symbols (by volatility and data freshness)
  const [filteredSymbols, setFilteredSymbols] = useState<Set<string>>(new Set());
  const [filteringSymbols, setFilteringSymbols] = useState(false);

  // Filter symbols by volatility and data freshness
  const filterSymbolsByQuality = useCallback(async (currencies: string[]) => {
    if (currencies.length === 0) {
      setFilteredSymbols(new Set());
      return;
    }

    try {
      setFilteringSymbols(true);
      const token = localStorage.getItem("auth_token") || "";
      if (!token) return;

      const apiUrl = typeof window !== "undefined" 
        ? "http://localhost:8000" 
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      // Convert currencies to symbols (e.g., "FLOKI" -> "FLOKI/USDT")
      // First, get quote currency to build proper symbol
      const quoteCurrency = selectedQuoteCurrency || "USDT";
      const symbols = currencies.map(c => `${c}/${quoteCurrency}`);

      const response = await fetch(
        `${apiUrl}/train/filter-symbols?interval=1h&check_volatility=true&check_data_freshness=true`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(symbols),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const filtered = new Set<string>(data.filtered_symbols.map((s: string) => {
          // Extract base currency from symbol (e.g., "FLOKI/USDT" -> "FLOKI")
          return s.split("/")[0];
        }));
        setFilteredSymbols(filtered);
        console.log(`Filtered symbols: ${data.passed} passed, ${data.rejected} rejected`);
      } else {
        console.warn("Failed to filter symbols, showing all currencies");
        // If filtering fails, show all currencies
        setFilteredSymbols(new Set(currencies));
      }
    } catch (err) {
      console.error("Error filtering symbols:", err);
      // If filtering fails, show all currencies
      setFilteredSymbols(new Set(currencies));
    } finally {
      setFilteringSymbols(false);
    }
  }, [selectedQuoteCurrency]);

  // Get available currencies with balance (for source currency selection)
  // Prioritizes currencies from balance (those that user actually has), but also includes all exchange currencies
  const getAvailableCurrencies = useCallback(() => {
    // Use a Map to ensure no duplicates (case-insensitive)
    const uniqueCurrencies = new Map<string, {currency: string; balance: {free: number; used: number; total: number}}>();
    
    // First, add all currencies from exchange (all available currencies on BTCTurk)
    // This ensures we show ALL currencies, even if user doesn't have balance for them
    allExchangeCurrencies.forEach(exchangeCurrency => {
      const currencyCode = exchangeCurrency.currency_code.toUpperCase();
      const originalCode = exchangeCurrency.currency_code;
      
      // Find matching balance from allBalances (case-insensitive)
      const balanceKey = Object.keys(allBalances).find(key => key.toUpperCase() === currencyCode);
      const balance = balanceKey ? allBalances[balanceKey] : { free: 0, used: 0, total: 0 };
      
      uniqueCurrencies.set(currencyCode, {
        currency: originalCode, // Keep original case from exchange
        balance: balance,
      });
    });
    
    // Then, add any currencies from balance that might not be in exchange currencies list
    // This handles edge cases where balance has currencies not in exchange list
    Object.keys(allBalances).forEach(currencyKey => {
      const key = currencyKey.toUpperCase();
      if (!uniqueCurrencies.has(key)) {
        uniqueCurrencies.set(key, {
          currency: currencyKey, // Keep original case
          balance: allBalances[currencyKey],
        });
      } else {
        // Update existing entry with actual balance data
        const existing = uniqueCurrencies.get(key)!;
        existing.balance = allBalances[currencyKey];
      }
    });
    
    const result = Array.from(uniqueCurrencies.values());
    
    // Filter out currencies with zero balance (only show currencies with balance > 0)
    const currenciesWithBalance = result.filter(item => {
      const bal = item.balance;
      return bal.free > 0 || bal.used > 0 || bal.total > 0;
    });
    
    // Filter by volatility and data freshness (only show quality currencies)
    const qualityCurrencies = currenciesWithBalance.filter(item => {
      // If filtering is in progress or no filtered symbols yet, show all
      if (filteringSymbols || filteredSymbols.size === 0) {
        return true;
      }
      // Only show currencies that passed volatility and data freshness filters
      return filteredSymbols.has(item.currency.toUpperCase());
    });
    
    // Sort by free balance first, then by total, then alphabetically
    qualityCurrencies.sort((a, b) => {
      if (b.balance.free !== a.balance.free) {
        return b.balance.free - a.balance.free;
      }
      if (b.balance.total !== a.balance.total) {
        return b.balance.total - a.balance.total;
      }
      return a.currency.localeCompare(b.currency);
    });
    
    console.log("Available currencies for selection:", qualityCurrencies.length, "(filtered from", currenciesWithBalance.length, "with balance,", result.length, "total)");
    const flokiEntry = qualityCurrencies.find(c => c.currency.toUpperCase() === "FLOKI");
    console.log("FLOKI in list:", flokiEntry ? `Yes - ${flokiEntry.currency}, balance: ${flokiEntry.balance.free}` : "No");
    
    return qualityCurrencies;
  }, [allBalances, allExchangeCurrencies, filteredSymbols, filteringSymbols]);

  // Detect desktop screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Fetch quote currencies when exchange account changes
  useEffect(() => {
    if (exchangeAccountId) {
      fetchQuoteCurrencies(exchangeAccountId);
    } else {
      setQuoteCurrencies([]);
      setSelectedQuoteCurrency("");
      setBalance(null);
    }
  }, [exchangeAccountId, fetchQuoteCurrencies]);

  // Fetch all balances when exchange account changes
  useEffect(() => {
    if (exchangeAccountId) {
      fetchAllBalances(exchangeAccountId);
    } else {
      setAllBalances({});
      setBalance(null);
    }
  }, [exchangeAccountId, fetchAllBalances]);

  // Update balance for selected quote currency when it changes
  useEffect(() => {
    if (selectedQuoteCurrency && allBalances) {
      const currencyUpper = selectedQuoteCurrency.toUpperCase();
      const currencyKey = Object.keys(allBalances).find(
        key => key.toUpperCase() === currencyUpper
      );
      
      if (currencyKey && allBalances[currencyKey]) {
        setBalance(allBalances[currencyKey]);
      } else {
        setBalance({ free: 0, used: 0, total: 0 });
      }
    }
  }, [selectedQuoteCurrency, allBalances]);

  // Update source amount when percentage changes
  useEffect(() => {
    if (sourceAmountMode === "percentage" && sourceCurrency && allBalances[sourceCurrency]) {
      const sourceBal = allBalances[sourceCurrency];
      if (sourceAmount && sourceLastChangedField.current === "percentage") {
        const percentage = parseFloat(sourceAmount);
        if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
          const calculatedAmount = (sourceBal.free * percentage) / 100;
          // This will be handled in the input field
          sourceLastChangedField.current = null;
        }
      }
    }
  }, [sourceAmount, sourceCurrency, sourceAmountMode, allBalances]);

  // Update capital when percentage changes (only in percentage mode)
  useEffect(() => {
    if (investmentMode === "percentage" && balance && capitalPercentage && lastChangedField.current === "percentage") {
      const percentage = parseFloat(capitalPercentage);
      if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
        const calculatedAmount = (balance.free * percentage) / 100;
        setCapital(calculatedAmount.toFixed(8));
        lastChangedField.current = null;
      } else if (capitalPercentage === "") {
        setCapital("");
        lastChangedField.current = null;
      }
    }
  }, [capitalPercentage, balance, investmentMode]);

  // Update percentage when amount changes (only in amount mode)
  useEffect(() => {
    if (investmentMode === "amount" && balance && capital && lastChangedField.current === "amount") {
      const amount = parseFloat(capital);
      if (!isNaN(amount) && balance.free > 0) {
        const calculatedPercentage = (amount / balance.free) * 100;
        setCapitalPercentage(calculatedPercentage.toFixed(2));
        lastChangedField.current = null;
      } else if (capital === "") {
        setCapitalPercentage("");
        lastChangedField.current = null;
      }
    }
  }, [capital, balance, investmentMode]);

  useEffect(() => {
    if (isOpen) {
      fetchExchangeAccounts();
      // Don't fetch symbols until account is selected
      // Reset form
      setBotName("");
      setExchangeAccountId("");
      setCapital("");
      setCapitalPercentage("");
      setRiskPerTrade("2");
      setSelectedSymbols([]);
      setSelectedStrategy("prediction_based");
      setStopLoss("");
      setTakeProfit("");
      setPaperTrading(true);
      setHasDuration(false);
      setDurationHours("");
      setSelectedQuoteCurrency("");
      setBalance(null);
      setAllBalances({});
      setAllExchangeCurrencies([]);
      setInvestmentMode("amount");
      setUseSourceCurrency(false);
      setSourceCurrency("");
      setSourceAmount("");
      setSourceAmountMode("amount");
      setFormError(null);
    }
  }, [isOpen, fetchExchangeAccounts]);

  // Fetch symbols when exchange account or quote currency is selected
  useEffect(() => {
    if (exchangeAccountId && selectedQuoteCurrency) {
      fetchAvailableSymbols(exchangeAccountId);
    } else {
      // Reset to empty when no account or quote currency selected
      setAvailableSymbols([]);
    }
  }, [exchangeAccountId, selectedQuoteCurrency, fetchAvailableSymbols]);

  const handleSubmit = async () => {
    // Validation
    if (!botName.trim()) {
      setFormError("Bot name is required");
      return;
    }
    if (!exchangeAccountId) {
      setFormError("Exchange account is required");
      return;
    }
    if (!selectedQuoteCurrency) {
      setFormError("Quote currency is required");
      return;
    }
    // Validate based on investment method
    if (useSourceCurrency) {
      // Using source currency - validate source currency fields
      if (!sourceCurrency) {
        setFormError("Source currency is required when using source currency option");
        return;
      }
      if (!sourceAmount || parseFloat(sourceAmount) <= 0) {
        setFormError("Valid source amount is required");
        return;
      }
      const sourceBal = allBalances[sourceCurrency];
      if (sourceBal) {
        const amount = sourceAmountMode === "percentage" 
          ? (sourceBal.free * parseFloat(sourceAmount) / 100)
          : parseFloat(sourceAmount);
        if (amount > sourceBal.free) {
          setFormError(`Insufficient source currency balance. Available: ${sourceBal.free.toFixed(8)} ${sourceCurrency}`);
          return;
        }
      }
      // Set capital to 0 or a placeholder - backend will calculate from source currency
      // But we still need a capital value for the API, so we'll use a minimal value
      if (!capital || parseFloat(capital) <= 0) {
        setCapital("0"); // Will be calculated by backend from source currency
      }
    } else {
      // Using quote currency directly - validate quote currency balance
      if (!capital || parseFloat(capital) <= 0) {
        setFormError("Valid initial capital is required");
        return;
      }
      if (balance && parseFloat(capital) > balance.free) {
        setFormError(`Insufficient balance. Available: ${balance.free.toFixed(8)} ${selectedQuoteCurrency}`);
        return;
      }
    }
    if (selectedSymbols.length === 0) {
      setFormError("At least one trading symbol is required");
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      const sourceAmountValue = useSourceCurrency && sourceCurrency && sourceAmount
        ? (sourceAmountMode === "percentage" && allBalances[sourceCurrency]
          ? (allBalances[sourceCurrency].free * parseFloat(sourceAmount) / 100)
          : parseFloat(sourceAmount))
        : null;

      const submitData = {
        name: botName.trim(),
        exchange_account_id: parseInt(exchangeAccountId),
        capital: useSourceCurrency ? 0 : parseFloat(capital), // If using source currency, capital will be calculated from source
        risk_per_trade: parseFloat(riskPerTrade) / 100,
        symbols: selectedSymbols,
        strategy_type: selectedStrategy,
        stop_loss_percent: stopLoss ? parseFloat(stopLoss) / 100 : null,
        take_profit_percent: takeProfit ? parseFloat(takeProfit) / 100 : null,
        duration_hours: hasDuration && durationHours ? parseInt(durationHours) : null,
        paper_trading: paperTrading,
        source_currency: useSourceCurrency ? sourceCurrency : null,
        source_amount: sourceAmountValue,
      };
      
      console.log("Submitting bot data:", submitData);
      
      await onSubmit(submitData);
      
      // Reset form on success
      setBotName("");
      setExchangeAccountId("");
      setCapital("");
      setCapitalPercentage("");
      setRiskPerTrade("2");
      setSelectedSymbols([]);
      setSelectedStrategy("prediction_based");
      setStopLoss("");
      setTakeProfit("");
      setPaperTrading(true);
      setHasDuration(false);
      setDurationHours("");
      setSelectedQuoteCurrency("");
      setBalance(null);
      setAllBalances({});
      setAllExchangeCurrencies([]);
      setInvestmentMode("amount");
      setUseSourceCurrency(false);
      setSourceCurrency("");
      setSourceAmount("");
      setSourceAmountMode("amount");
      onClose();
    } catch (err) {
      console.error("Error creating bot:", err);
      setFormError("Failed to create bot. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: colors.panelBackground,
          border: `1px solid ${colors.border}`,
          borderRadius: "12px",
          width: isDesktop ? "80%" : "90%",
          maxWidth: "1400px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Form Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          padding: "24px 24px 16px 24px",
          flexShrink: 0,
        }}>
          <h2 style={{ color: colors.primary, margin: 0, fontSize: "24px", fontWeight: "bold" }}>
            Create Trading Bot
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: colors.secondaryText,
              fontSize: "24px",
              cursor: "pointer",
              padding: "0",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {/* Form Error */}
        {formError && (
          <div style={{
            padding: "12px",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            border: `1px solid rgba(239, 68, 68, 0.5)`,
            borderRadius: "8px",
            margin: "0 24px 16px 24px",
            color: colors.error,
            fontSize: "14px",
            flexShrink: 0,
          }}>
            {formError}
          </div>
        )}

        {/* Scrollable Content */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 24px",
        }}>
        {/* Two Column Layout */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", 
          gap: "24px",
            paddingBottom: "24px",
            alignItems: "start",
        }}>
          {/* Left Column */}
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "24px",
            height: "calc(90vh - 250px)",
            overflowY: "auto",
            paddingRight: "8px",
          }}>
            {/* Basic Info Section */}
            <div>
              <h3 style={{ color: colors.primary, marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>
                Basic Info
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ color: colors.text, display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                    Bot Name *
                  </label>
                  <input
                    type="text"
                    placeholder="My Trading Bot"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      backgroundColor: colors.background,
                      border: `1px solid ${colors.border}`,
                      borderRadius: "8px",
                      color: colors.text,
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ color: colors.text, display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                    Exchange Account *
                  </label>
                  <select
                    value={exchangeAccountId}
                    onChange={(e) => setExchangeAccountId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      backgroundColor: colors.background,
                      border: `1px solid ${colors.border}`,
                      borderRadius: "8px",
                      color: colors.text,
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    <option value="">Select Exchange</option>
                    {exchangeAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.exchange_name}</option>
                    ))}
                  </select>
                  {exchangeAccounts.length === 0 && (
                    <p style={{ color: colors.warning, fontSize: "12px", marginTop: "4px" }}>
                      No exchange accounts found. Please create an exchange account first.
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ color: colors.text, display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                    Quote Currency (Base Currency) *
                  </label>
                  <select
                    value={selectedQuoteCurrency}
                    onChange={(e) => setSelectedQuoteCurrency(e.target.value)}
                    disabled={!exchangeAccountId || currenciesLoading}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      backgroundColor: colors.background,
                      border: `1px solid ${colors.border}`,
                      borderRadius: "8px",
                      color: colors.text,
                      fontSize: "14px",
                      cursor: exchangeAccountId && !currenciesLoading ? "pointer" : "not-allowed",
                      opacity: exchangeAccountId && !currenciesLoading ? 1 : 0.6,
                    }}
                  >
                    <option value="">{currenciesLoading ? "Loading..." : "Select Quote Currency"}</option>
                    {quoteCurrencies.map(currency => (
                      <option key={currency.currency_code} value={currency.currency_code}>
                        {currency.currency_code} {currency.currency_name ? `(${currency.currency_name})` : ""}
                      </option>
                    ))}
                  </select>
                  {exchangeAccountId && !currenciesLoading && quoteCurrencies.length === 0 && (
                    <p style={{ color: colors.warning, fontSize: "12px", marginTop: "4px" }}>
                      No quote currencies found for this exchange account.
                    </p>
                  )}
                </div>

                {/* Balance Display */}
                {selectedQuoteCurrency && balance !== null && (
                  <div style={{
                    padding: "12px",
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "8px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ color: colors.secondaryText, fontSize: "12px" }}>Available Balance:</span>
                      <span style={{ color: colors.text, fontSize: "14px", fontWeight: "600" }}>
                        {balanceLoading ? "Loading..." : `${balance.free.toFixed(8)} ${selectedQuoteCurrency}`}
                      </span>
                    </div>
                    {balance.used > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: colors.secondaryText, fontSize: "12px" }}>In Orders:</span>
                        <span style={{ color: colors.secondaryText, fontSize: "12px" }}>
                          {balance.used.toFixed(8)} {selectedQuoteCurrency}
                        </span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                      <span style={{ color: colors.secondaryText, fontSize: "12px" }}>Total Balance:</span>
                      <span style={{ color: colors.text, fontSize: "12px" }}>
                        {balance.total.toFixed(8)} {selectedQuoteCurrency}
                      </span>
                    </div>
                  </div>
                )}

                {/* Source Currency Option */}
                <div style={{ marginTop: "16px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "12px" }}>
                    <input
                      type="checkbox"
                      checked={useSourceCurrency}
                      onChange={(e) => {
                        setUseSourceCurrency(e.target.checked);
                        if (!e.target.checked) {
                          setSourceCurrency("");
                          setSourceAmount("");
                        }
                      }}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <span style={{ color: colors.text, fontSize: "14px", fontWeight: "500" }}>
                      Sell another currency to invest
                    </span>
                  </label>
                  <p style={{ color: colors.secondaryText, fontSize: "12px", marginTop: "4px", marginLeft: "26px" }}>
                    If you don't have enough {selectedQuoteCurrency || "quote currency"}, you can sell another currency you own
                  </p>

                  {useSourceCurrency && (
                    <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div>
                        <label style={{ color: colors.text, display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                          Source Currency *
                        </label>
                        <select
                          value={sourceCurrency}
                          onChange={(e) => setSourceCurrency(e.target.value)}
                          disabled={!exchangeAccountId || balanceLoading || Object.keys(allBalances).length === 0}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            backgroundColor: colors.background,
                            border: `1px solid ${colors.border}`,
                            borderRadius: "8px",
                            color: colors.text,
                            fontSize: "14px",
                            cursor: exchangeAccountId && !balanceLoading ? "pointer" : "not-allowed",
                            opacity: exchangeAccountId && !balanceLoading ? 1 : 0.6,
                          }}
                        >
                          <option value="">{balanceLoading ? "Loading..." : "Select Currency to Sell"}</option>
                          {getAvailableCurrencies()
                            .filter(item => item.currency !== selectedQuoteCurrency) // Don't show quote currency as source
                            .map(item => {
                              const bal = item.balance;
                              // Show balance more clearly - if it's very small, show more decimals
                              const freeDisplay = bal.free > 0 
                                ? (bal.free < 0.0001 ? bal.free.toFixed(12).replace(/\.?0+$/, '') : bal.free.toFixed(8))
                                : "0.00000000";
                              const totalDisplay = bal.total > 0 
                                ? (bal.total < 0.0001 ? bal.total.toFixed(12).replace(/\.?0+$/, '') : bal.total.toFixed(8))
                                : "0.00000000";
                              return (
                                <option key={item.currency} value={item.currency}>
                                  {item.currency} - Available: {freeDisplay} {bal.total > bal.free && `(Total: ${totalDisplay})`}
                                </option>
                              );
                            })}
                          {/* Show all currencies even with zero balance for debugging */}
                          {Object.keys(allBalances).length > 0 && getAvailableCurrencies().length === 0 && (
                            <option disabled style={{ color: colors.secondaryText }}>
                              --- All currencies have zero balance ---
                            </option>
                          )}
                        </select>
                        {exchangeAccountId && !balanceLoading && getAvailableCurrencies().length === 0 && (
                          <div style={{ marginTop: "8px" }}>
                            <p style={{ color: colors.warning, fontSize: "12px", marginBottom: "4px" }}>
                              No currencies with balance found.
                            </p>
                            {Object.keys(allBalances).length > 0 && (
                              <p style={{ color: colors.secondaryText, fontSize: "11px" }}>
                                Found {Object.keys(allBalances).length} currencies but all have zero balance.
                              </p>
                            )}
                            {Object.keys(allBalances).length === 0 && (
                              <p style={{ color: colors.error, fontSize: "11px" }}>
                                Failed to fetch balances. Please check your exchange account connection.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {sourceCurrency && allBalances[sourceCurrency] && (
                        <>
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                              <label style={{ color: colors.text, fontSize: "14px", fontWeight: "500" }}>
                                Amount to Sell ({sourceCurrency}) *
                              </label>
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  type="button"
                                  onClick={() => setSourceAmountMode("amount")}
                                  style={{
                                    padding: "4px 12px",
                                    backgroundColor: sourceAmountMode === "amount" ? colors.primary : "transparent",
                                    border: `1px solid ${sourceAmountMode === "amount" ? colors.primary : colors.border}`,
                                    borderRadius: "6px",
                                    color: sourceAmountMode === "amount" ? colors.background : colors.text,
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                  }}
                                >
                                  Amount
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSourceAmountMode("percentage")}
                                  style={{
                                    padding: "4px 12px",
                                    backgroundColor: sourceAmountMode === "percentage" ? colors.primary : "transparent",
                                    border: `1px solid ${sourceAmountMode === "percentage" ? colors.primary : colors.border}`,
                                    borderRadius: "6px",
                                    color: sourceAmountMode === "percentage" ? colors.background : colors.text,
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                  }}
                                >
                                  Percentage
                                </button>
                              </div>
                            </div>
                            
                            {sourceAmountMode === "amount" ? (
                              <input
                                type="number"
                                min="0"
                                step="0.00000001"
                                placeholder="0.00000000"
                                value={sourceAmount}
                                onChange={(e) => {
                                  sourceLastChangedField.current = "amount";
                                  setSourceAmount(e.target.value);
                                }}
                                style={{
                                  width: "100%",
                                  padding: "10px 12px",
                                  backgroundColor: colors.background,
                                  border: `1px solid ${colors.border}`,
                                  borderRadius: "8px",
                                  color: colors.text,
                                  fontSize: "14px",
                                }}
                              />
                            ) : (
                              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={sourceAmount}
                                  onChange={(e) => {
                                    sourceLastChangedField.current = "percentage";
                                    setSourceAmount(e.target.value);
                                  }}
                                  style={{
                                    flex: 1,
                                    padding: "10px 12px",
                                    backgroundColor: colors.background,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: "8px",
                                    color: colors.text,
                                    fontSize: "14px",
                                  }}
                                />
                                <span style={{ color: colors.secondaryText, fontSize: "14px" }}>%</span>
                                {sourceAmount && !isNaN(parseFloat(sourceAmount)) && allBalances[sourceCurrency] && (
                                  <span style={{ color: colors.text, fontSize: "12px", minWidth: "100px" }}>
                                    = {(allBalances[sourceCurrency].free * parseFloat(sourceAmount) / 100).toFixed(8)} {sourceCurrency}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            <p style={{ color: colors.secondaryText, fontSize: "12px", marginTop: "4px" }}>
                              Available: {allBalances[sourceCurrency].free.toFixed(8)} {sourceCurrency}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Trading Settings Section */}
            <div>
              <h3 style={{ color: colors.primary, marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>
                Trading Settings
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Initial Capital - Only show if NOT using source currency */}
                {!useSourceCurrency && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <label style={{ color: colors.text, fontSize: "14px", fontWeight: "500" }}>
                        Initial Capital {selectedQuoteCurrency ? `(${selectedQuoteCurrency})` : ""} *
                      </label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={() => setInvestmentMode("amount")}
                          style={{
                            padding: "4px 12px",
                            backgroundColor: investmentMode === "amount" ? colors.primary : "transparent",
                            border: `1px solid ${investmentMode === "amount" ? colors.primary : colors.border}`,
                            borderRadius: "6px",
                            color: investmentMode === "amount" ? colors.background : colors.text,
                            fontSize: "12px",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                        >
                          Amount
                        </button>
                        <button
                          type="button"
                          onClick={() => setInvestmentMode("percentage")}
                          style={{
                            padding: "4px 12px",
                            backgroundColor: investmentMode === "percentage" ? colors.primary : "transparent",
                            border: `1px solid ${investmentMode === "percentage" ? colors.primary : colors.border}`,
                            borderRadius: "6px",
                            color: investmentMode === "percentage" ? colors.background : colors.text,
                            fontSize: "12px",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                        >
                          Percentage
                        </button>
                      </div>
                    </div>
                    
                    {investmentMode === "amount" ? (
                      <input
                        type="number"
                        min="0"
                        step="0.00000001"
                        placeholder="0.00000000"
                        value={capital}
                        onChange={(e) => {
                          lastChangedField.current = "amount";
                          setCapital(e.target.value);
                        }}
                        disabled={!selectedQuoteCurrency}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          backgroundColor: colors.background,
                          border: `1px solid ${colors.border}`,
                          borderRadius: "8px",
                          color: colors.text,
                          fontSize: "14px",
                          opacity: selectedQuoteCurrency ? 1 : 0.6,
                        }}
                      />
                    ) : (
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="0.00"
                          value={capitalPercentage}
                          onChange={(e) => {
                            lastChangedField.current = "percentage";
                            setCapitalPercentage(e.target.value);
                          }}
                          disabled={!selectedQuoteCurrency || !balance}
                          style={{
                            flex: 1,
                            padding: "10px 12px",
                            backgroundColor: colors.background,
                            border: `1px solid ${colors.border}`,
                            borderRadius: "8px",
                            color: colors.text,
                            fontSize: "14px",
                            opacity: selectedQuoteCurrency && balance ? 1 : 0.6,
                          }}
                        />
                        <span style={{ color: colors.secondaryText, fontSize: "14px" }}>%</span>
                        {balance && capitalPercentage && !isNaN(parseFloat(capitalPercentage)) && (
                          <span style={{ color: colors.text, fontSize: "12px", minWidth: "100px" }}>
                            = {(balance.free * parseFloat(capitalPercentage) / 100).toFixed(8)} {selectedQuoteCurrency}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {selectedQuoteCurrency && balance && (
                      <p style={{ color: colors.secondaryText, fontSize: "12px", marginTop: "4px" }}>
                        Available: {balance.free.toFixed(8)} {selectedQuoteCurrency}
                      </p>
                    )}
                  </div>
                )}

                {/* Show info when using source currency */}
                {useSourceCurrency && sourceCurrency && (
                  <div style={{
                    padding: "12px",
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "8px",
                  }}>
                    <p style={{ color: colors.text, fontSize: "14px", marginBottom: "4px" }}>
                      <strong>Investment Source:</strong>
                    </p>
                    <p style={{ color: colors.secondaryText, fontSize: "12px", margin: 0 }}>
                      The bot will sell {sourceAmount || "0"} {sourceCurrency} and convert it to {selectedQuoteCurrency || "quote currency"} for trading.
                    </p>
                    <p style={{ color: colors.secondaryText, fontSize: "11px", marginTop: "8px", fontStyle: "italic" }}>
                      The initial capital will be calculated automatically after the conversion.
                    </p>
                  </div>
                )}

                <div>
                  <label style={{ color: colors.text, display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                    Risk Per Trade (%)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    placeholder="2"
                    value={riskPerTrade}
                    onChange={(e) => setRiskPerTrade(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      backgroundColor: colors.background,
                      border: `1px solid ${colors.border}`,
                      borderRadius: "8px",
                      color: colors.text,
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ color: colors.text, display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                    Trading Symbols *
                  </label>
                  
                  {/* Dropdown to add symbols */}
                  <div style={{ marginBottom: "12px" }}>
                    <select
                      value=""
                      onChange={(e) => {
                        const symbol = e.target.value;
                        if (symbol && !selectedSymbols.includes(symbol)) {
                          setSelectedSymbols([...selectedSymbols, symbol]);
                        }
                        e.target.value = ""; // Reset dropdown
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        backgroundColor: colors.background,
                        border: `1px solid ${colors.border}`,
                        borderRadius: "8px",
                        color: colors.text,
                        fontSize: "14px",
                        cursor: "pointer",
                      }}
                    >
                      <option value="">Select a symbol to add...</option>
                      {availableSymbols
                        .filter(symbol => !selectedSymbols.includes(symbol))
                        .map(symbol => (
                          <option key={symbol} value={symbol}>
                            {symbol}
                          </option>
                        ))}
                    </select>
                    <p style={{ color: colors.secondaryText, fontSize: "11px", marginTop: "4px", marginBottom: 0 }}>
                      Select from top 20 filtered symbols (volatile & fresh data)
                    </p>
                  </div>

                  {/* Selected symbols display */}
                  <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    padding: "12px",
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "8px",
                    minHeight: "60px",
                    maxHeight: "200px",
                    overflowY: "auto",
                    marginBottom: "12px",
                  }}>
                    {selectedSymbols.length === 0 ? (
                      <p style={{ color: colors.secondaryText, fontSize: "13px", width: "100%", textAlign: "center", margin: 0 }}>
                        No symbols selected. Use the dropdown above to add symbols.
                      </p>
                    ) : (
                      selectedSymbols.map(symbol => (
                        <button
                          key={symbol}
                          type="button"
                          onClick={() => {
                            setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
                          }}
                          style={{
                            padding: "8px 16px",
                            backgroundColor: colors.primary,
                            border: `1px solid ${colors.primary}`,
                            borderRadius: "6px",
                            color: "#fff",
                            fontSize: "13px",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span>{symbol}</span>
                          <span style={{ fontSize: "16px", lineHeight: 1 }}>×</span>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Quick select grid from top 20 popular symbols */}
                  {availableSymbols.length > 0 && (() => {
                    // Use only commonSymbols for quick select
                    const commonSymbolsList = [
                      "BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "ADA/USDT",
                      "XRP/USDT", "DOT/USDT", "DOGE/USDT", "AVAX/USDT", "MATIC/USDT",
                      "LINK/USDT", "UNI/USDT", "LTC/USDT", "ATOM/USDT", "ETC/USDT",
                    ];
                    
                    // Filter to only show symbols that are available in availableSymbols
                    const top20 = commonSymbolsList.filter((symbol: string) => 
                      availableSymbols.includes(symbol)
                    );
                    
                    return (
                      <div>
                        <p style={{ color: colors.secondaryText, fontSize: "12px", marginBottom: "8px" }}>
                          Quick select from top popular symbols:
                        </p>
                        <div style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "8px",
                          padding: "12px",
                          backgroundColor: colors.background,
                          border: `1px solid ${colors.border}`,
                          borderRadius: "8px",
                          maxHeight: "150px",
                          overflowY: "auto",
                        }}>
                          {top20.map((symbol: string) => (
                            <button
                              key={symbol}
                              type="button"
                              onClick={() => {
                                if (selectedSymbols.includes(symbol)) {
                                  setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
                                } else {
                                  setSelectedSymbols([...selectedSymbols, symbol]);
                                }
                              }}
                              style={{
                                padding: "6px 12px",
                                backgroundColor: selectedSymbols.includes(symbol) 
                                  ? colors.primary 
                                  : "transparent",
                                border: `1px solid ${selectedSymbols.includes(symbol) ? colors.primary : colors.border}`,
                                borderRadius: "6px",
                                color: selectedSymbols.includes(symbol) 
                                  ? colors.background 
                                  : colors.text,
                                fontSize: "12px",
                                cursor: "pointer",
                                transition: "all 0.2s",
                              }}
                            >
                              {symbol}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  
                  {selectedSymbols.length === 0 && (
                    <p style={{ color: colors.warning, fontSize: "12px", marginTop: "4px" }}>
                      Please select at least one symbol
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Risk Management Section */}
            <div>
              <h3 style={{ color: colors.primary, marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>
                Risk Management
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ color: colors.text, display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                      Stop Loss (%)
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      max="50"
                      step="0.1"
                      placeholder="2"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        backgroundColor: colors.background,
                        border: `1px solid ${colors.border}`,
                        borderRadius: "8px",
                        color: colors.text,
                        fontSize: "14px",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ color: colors.text, display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                      Take Profit (%)
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      max="200"
                      step="0.1"
                      placeholder="5"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        backgroundColor: colors.background,
                        border: `1px solid ${colors.border}`,
                        borderRadius: "8px",
                        color: colors.text,
                        fontSize: "14px",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={paperTrading}
                      onChange={(e) => setPaperTrading(e.target.checked)}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <span style={{ color: colors.text, fontSize: "14px" }}>Paper Trading (Demo Mode)</span>
                  </label>
                  <p style={{ color: colors.secondaryText, fontSize: "12px", marginTop: "4px", marginLeft: "26px" }}>
                    Simulate trading without real money
                  </p>
                </div>
              </div>
            </div>

            {/* Duration Section */}
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={hasDuration}
                  onChange={(e) => setHasDuration(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <span style={{ color: colors.text, fontSize: "14px" }}>Set Duration</span>
              </label>

              {hasDuration && (
                <div style={{ marginTop: "12px" }}>
                  <input
                    type="number"
                    min="1"
                    placeholder="24"
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    style={{
                      width: "200px",
                      padding: "10px 12px",
                      backgroundColor: colors.background,
                      border: `1px solid ${colors.border}`,
                      borderRadius: "8px",
                      color: colors.text,
                      fontSize: "14px",
                    }}
                  />
                  <span style={{ color: colors.secondaryText, marginLeft: "8px" }}>hours</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "24px",
            height: "calc(90vh - 250px)",
            overflowY: "auto",
            paddingRight: "8px",
          }}>
            {/* Strategy Selection Section */}
            <div>
              <h3 style={{ color: colors.primary, marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>
                Strategy
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  { id: "prediction_based", name: "Prediction Based", desc: "Uses ML predictions for trading decisions" },
                  { id: "confidence_weighted", name: "Confidence Weighted", desc: "Weights trades by prediction confidence" },
                  { id: "multi_model_voting", name: "Multi-Model Voting", desc: "Combines multiple model predictions" },
                  { id: "jump_enhanced", name: "Jump Enhanced", desc: "Optimized for price jumps and volatility" },
                  { id: "regime_adaptive", name: "Regime Adaptive", desc: "Adapts to market conditions" },
                  { id: "multi_timeframe_fusion", name: "Multi-Timeframe Fusion", desc: "Analyzes multiple timeframes" },
                  { id: "mean_reversion", name: "Mean Reversion", desc: "Trades on price reversions" },
                  { id: "trend_following", name: "Trend Following", desc: "Follows market trends" },
                ].map(strategy => (
                  <div
                    key={strategy.id}
                    onClick={() => setSelectedStrategy(strategy.id)}
                    style={{
                      padding: "16px",
                      border: selectedStrategy === strategy.id 
                        ? `2px solid ${colors.primary}` 
                        : `1px solid ${colors.border}`,
                      borderRadius: "8px",
                      cursor: "pointer",
                      backgroundColor: selectedStrategy === strategy.id 
                        ? "rgba(255, 174, 0, 0.1)" 
                        : "transparent",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h4 style={{ color: colors.text, marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
                          {strategy.name}
                        </h4>
                        <p style={{ color: colors.secondaryText, fontSize: "12px", margin: 0 }}>
                          {strategy.desc}
                        </p>
                      </div>
                      {selectedStrategy === strategy.id && (
                        <span style={{ color: colors.primary, fontSize: "20px" }}>✓</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions - Fixed at bottom */}
        <div style={{ 
          display: "flex", 
          gap: "12px", 
          justifyContent: "flex-end",
          padding: "16px 24px",
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.panelBackground,
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            disabled={formLoading}
            style={{
              padding: "10px 20px",
              backgroundColor: "transparent",
              border: `1px solid ${colors.border}`,
              borderRadius: "8px",
              color: colors.text,
              fontWeight: "500",
              cursor: formLoading ? "not-allowed" : "pointer",
              fontSize: "14px",
              opacity: formLoading ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={formLoading}
            style={{
              padding: "10px 20px",
              backgroundColor: colors.primary,
              border: "none",
              borderRadius: "8px",
              color: colors.background,
              fontWeight: "600",
              cursor: formLoading ? "not-allowed" : "pointer",
              fontSize: "14px",
              opacity: formLoading ? 0.6 : 1,
            }}
          >
            {formLoading ? "Creating..." : "Create Bot"}
          </button>
        </div>
      </div>
    </div>
  );
}


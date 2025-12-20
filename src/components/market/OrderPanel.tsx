"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useExchange } from "@/contexts/ExchangeContext";

interface OrderPanelProps {
    selectedSymbol: string;
    currentPrice: number | null;
    onOrderPlaced?: () => void;
}

interface Balance {
    exchange: string;
    balances: Record<string, { free: number; used: number; total: number }>;
}

export default function OrderPanel({ selectedSymbol, currentPrice, onOrderPlaced }: OrderPanelProps) {
    const { selectedAccountId } = useExchange();
    const [orderType, setOrderType] = useState<"market" | "limit" | "stop">("limit");
    const [side, setSide] = useState<"buy" | "sell">("buy");
    const [price, setPrice] = useState<string>("");
    const [amount, setAmount] = useState<string>("");
    const [total, setTotal] = useState<string>("");
    const [percentage, setPercentage] = useState<number>(0);
    const [fee, setFee] = useState<number>(0);
    const [placingOrder, setPlacingOrder] = useState(false);
    const [balance, setBalance] = useState<Balance | null>(null);
    const [balanceLoading, setBalanceLoading] = useState(false);
    const userEditedPriceRef = useRef(false);

    // Update price when currentPrice or selectedSymbol changes
    useEffect(() => {
        if (currentPrice) {
            // Always update price when currentPrice changes, unless user manually edited it
            // Reset the flag when symbol changes
            if (!userEditedPriceRef.current) {
                setPrice(currentPrice.toFixed(2));
            }
        } else {
            setPrice("");
        }
    }, [currentPrice, selectedSymbol]);

    // Reset user edited flag when symbol changes
    useEffect(() => {
        userEditedPriceRef.current = false;
        if (currentPrice) {
            setPrice(currentPrice.toFixed(2));
        } else {
            setPrice("");
        }
    }, [selectedSymbol, currentPrice]);

    // Reset percentage when side changes
    useEffect(() => {
        setPercentage(0);
        setAmount("");
        setTotal("");
    }, [side, selectedSymbol]);

    // Calculate total when price or amount changes
    useEffect(() => {
        if (price && amount) {
            const totalValue = parseFloat(price) * parseFloat(amount);
            setTotal(totalValue.toFixed(2));
            // Calculate fee (assuming 0.1% fee)
            setFee(totalValue * 0.001);
        } else {
            setTotal("");
            setFee(0);
        }
    }, [price, amount]);

    // Calculate amount from total
    useEffect(() => {
        if (price && total && !amount) {
            const amountValue = parseFloat(total) / parseFloat(price);
            setAmount(amountValue.toFixed(6));
        }
    }, [price, total]);

    // Fetch balance
    const fetchBalance = useCallback(async () => {
        if (!selectedAccountId) {
            setBalance(null);
            return;
        }

        setBalanceLoading(true);
        try {
            const token = localStorage.getItem("auth_token") || "";
            if (!token) {
                setBalanceLoading(false);
                return;
            }

            const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

            // Fetch balance from the selected account
            const response = await fetch(`${apiUrl}/trading/balance/${selectedAccountId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setBalance(data);
            } else {
                const errorText = await response.text().catch(() => "");
                console.error("Failed to fetch balance:", response.status, errorText);
                setBalance(null);
            }
        } catch (error) {
            console.error("Error fetching balance:", error);
            setBalance(null);
        } finally {
            setBalanceLoading(false);
        }
    }, [selectedAccountId]);

    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    // Re-fetch balance when symbol changes
    useEffect(() => {
        if (selectedSymbol && selectedAccountId) {
            fetchBalance();
        }
    }, [selectedSymbol, selectedAccountId, fetchBalance]);

    // Get available balance for current symbol
    const getAvailableBalance = useCallback(() => {
        if (!balance || !selectedSymbol || !balance.balances) {
            return 0;
        }
        
        const [base, quote] = selectedSymbol.split("/");
        const currency = side === "buy" ? quote : base;
        
        // Try exact match first
        let currencyBalance = balance.balances[currency];
        
        // If not found, try case-insensitive match
        if (!currencyBalance) {
            const currencyUpper = currency.toUpperCase();
            const foundKey = Object.keys(balance.balances).find(
                key => key.toUpperCase() === currencyUpper
            );
            if (foundKey) {
                currencyBalance = balance.balances[foundKey];
            }
        }
        
        // If still not found, the currency might not be in balance response
        // This can happen if BTCTurk API doesn't return currencies with 0 balance
        // In this case, return 0
        return currencyBalance?.free || 0;
    }, [balance, selectedSymbol, side]);
    
    // Get total balance for current symbol
    const getTotalBalance = useCallback(() => {
        if (!balance || !selectedSymbol || !balance.balances) return 0;
        
        const [base, quote] = selectedSymbol.split("/");
        const currency = side === "buy" ? quote : base;
        
        // Try exact match first
        let currencyBalance = balance.balances[currency];
        
        // If not found, try case-insensitive match
        if (!currencyBalance) {
            const currencyUpper = currency.toUpperCase();
            const foundKey = Object.keys(balance.balances).find(
                key => key.toUpperCase() === currencyUpper
            );
            if (foundKey) {
                currencyBalance = balance.balances[foundKey];
            }
        }
        
        return currencyBalance?.total || 0;
    }, [balance, selectedSymbol, side]);

    // Handle percentage slider
    const handlePercentageChange = useCallback((value: number) => {
        setPercentage(value);
        const availableBalance = getAvailableBalance();
        
        if (side === "buy" && price) {
            // For buy: calculate amount based on percentage of quote currency
            const totalValue = (availableBalance * value) / 100;
            setTotal(totalValue.toFixed(2));
            const amountValue = totalValue / parseFloat(price);
            setAmount(amountValue.toFixed(6));
        } else if (side === "sell" && price) {
            // For sell: calculate amount based on percentage of base currency
            const amountValue = (availableBalance * value) / 100;
            setAmount(amountValue.toFixed(6));
            const totalValue = amountValue * parseFloat(price);
            setTotal(totalValue.toFixed(2));
        }
    }, [getAvailableBalance, side, price]);

    // Place order
    const handlePlaceOrder = async () => {
        if (!selectedAccountId || !selectedSymbol || !amount) {
            alert("Please fill in all required fields");
            return;
        }

        if (orderType === "limit" && !price) {
            alert("Limit orders require a price");
            return;
        }

        if (orderType === "stop" && !price) {
            alert("Stop orders require a stop price");
            return;
        }

        setPlacingOrder(true);

        try {
            const token = localStorage.getItem("auth_token") || "";
            if (!token) {
                alert("Please login");
                setPlacingOrder(false);
                return;
            }

            const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

            const response = await fetch(`${apiUrl}/trading/orders/place`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    exchange_account_id: selectedAccountId,
                    symbol: selectedSymbol,
                    side: side,
                    order_type: orderType,
                    quantity: parseFloat(amount),
                    price: price ? parseFloat(price) : null,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Order placed:", data);
                // Reset form
                setAmount("");
                setTotal("");
                setPercentage(0);
                if (onOrderPlaced) {
                    onOrderPlaced();
                }
                alert("Order placed successfully!");
            } else {
                const errorData = await response.json().catch(() => ({}));
                alert(errorData.detail || "Failed to place order");
            }
        } catch (error) {
            console.error("Error placing order:", error);
            alert("Network error. Please check your connection.");
        } finally {
            setPlacingOrder(false);
        }
    };

    // Refresh price button
    const handleRefreshPrice = () => {
        if (currentPrice) {
            userEditedPriceRef.current = false; // Reset flag when user clicks refresh
            setPrice(currentPrice.toFixed(2));
        }
    };

    // Adjust price/amount/total with arrows
    const adjustValue = (field: "price" | "amount" | "total", direction: "up" | "down") => {
        const step = field === "price" ? 0.01 : field === "amount" ? 0.001 : 1;
        const current = field === "price" ? price : field === "amount" ? amount : total;
        const currentValue = parseFloat(current) || 0;
        const newValue = direction === "up" ? currentValue + step : Math.max(0, currentValue - step);
        
        if (field === "price") {
            setPrice(newValue.toFixed(2));
        } else if (field === "amount") {
            setAmount(newValue.toFixed(6));
        } else {
            setTotal(newValue.toFixed(2));
        }
    };

    if (!selectedSymbol) {
        return null;
    }

    const [base, quote] = selectedSymbol.split("/");

    return (
        <div style={{
            padding: "12px",
            backgroundColor: "#1a1a1a",
            borderRadius: "10px",
            border: "1px solid rgba(255, 174, 0, 0.2)",
        }}>
            {/* Order Type Tabs */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "12px", borderBottom: "1px solid rgba(255, 174, 0, 0.2)" }}>
                {(["market", "limit", "stop"] as const).map((type) => (
                    <button
                        key={type}
                        onClick={() => setOrderType(type)}
                        style={{
                            flex: 1,
                            padding: "6px 10px",
                            backgroundColor: orderType === type ? "rgba(255, 174, 0, 0.15)" : "transparent",
                            color: orderType === type ? "#FFAE00" : "#888",
                            border: "none",
                            borderBottom: orderType === type ? "2px solid #FFAE00" : "2px solid transparent",
                            borderRadius: "4px 4px 0 0",
                            cursor: "pointer",
                            fontSize: "11px",
                            fontWeight: orderType === type ? "600" : "400",
                            textTransform: "capitalize",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
                            transition: "all 0.2s ease",
                        }}
                    >
                        {type}
                        <span style={{ fontSize: "9px", opacity: 0.7 }}>ⓘ</span>
                    </button>
                ))}
            </div>

            {/* Buy/Sell Buttons */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
                <button
                    onClick={() => setSide("buy")}
                    style={{
                        flex: 1,
                        padding: "8px",
                        backgroundColor: side === "buy" ? "#22c55e" : "#2a2a2a",
                        color: side === "buy" ? "#1a1a1a" : "#888",
                        border: `1.5px solid ${side === "buy" ? "#22c55e" : "rgba(255, 174, 0, 0.2)"}`,
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "600",
                        transition: "all 0.2s ease",
                    }}
                >
                    BUY
                </button>
                <button
                    onClick={() => setSide("sell")}
                    style={{
                        flex: 1,
                        padding: "8px",
                        backgroundColor: side === "sell" ? "#ef4444" : "#2a2a2a",
                        color: side === "sell" ? "#ffffff" : "#888",
                        border: `1.5px solid ${side === "sell" ? "#ef4444" : "rgba(255, 174, 0, 0.2)"}`,
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "600",
                        transition: "all 0.2s ease",
                    }}
                >
                    SELL
                </button>
            </div>

            {/* Price Field */}
            {orderType !== "market" && (
                <div style={{ marginBottom: "10px" }}>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "10px", color: "#888", fontWeight: "500" }}>
                        Price
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <button
                            onClick={handleRefreshPrice}
                            style={{
                                padding: "4px 6px",
                                backgroundColor: "transparent",
                                border: "1px solid rgba(255, 174, 0, 0.3)",
                                borderRadius: "4px",
                                color: "#FFAE00",
                                cursor: "pointer",
                                fontSize: "11px",
                                transition: "all 0.2s ease",
                            }}
                            title="Refresh price"
                        >
                            ↻
                        </button>
                        <input
                            type="number"
                            value={price}
                            onChange={(e) => {
                                userEditedPriceRef.current = true;
                                setPrice(e.target.value);
                            }}
                            placeholder="0.00"
                            style={{
                                flex: 1,
                                padding: "7px 10px",
                                backgroundColor: "#2a2a2a",
                                border: "1px solid rgba(255, 174, 0, 0.2)",
                                borderRadius: "5px",
                                color: "#ededed",
                                fontSize: "12px",
                                outline: "none",
                                transition: "border-color 0.2s ease",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "#FFAE00")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255, 174, 0, 0.2)")}
                        />
                        <span style={{ fontSize: "11px", color: "#888", minWidth: "45px" }}>{quote}</span>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                            <button
                                onClick={() => adjustValue("price", "up")}
                                style={{
                                    padding: "1px 5px",
                                    backgroundColor: "#2a2a2a",
                                    border: "1px solid rgba(255, 174, 0, 0.2)",
                                    borderRadius: "3px",
                                    color: "#FFAE00",
                                    cursor: "pointer",
                                    fontSize: "9px",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                ↑
                            </button>
                            <button
                                onClick={() => adjustValue("price", "down")}
                                style={{
                                    padding: "1px 5px",
                                    backgroundColor: "#2a2a2a",
                                    border: "1px solid rgba(255, 174, 0, 0.2)",
                                    borderRadius: "3px",
                                    color: "#FFAE00",
                                    cursor: "pointer",
                                    fontSize: "9px",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                ↓
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Amount Field */}
            <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "10px", color: "#888", fontWeight: "500" }}>
                    Amount
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        style={{
                            flex: 1,
                            padding: "7px 10px",
                            backgroundColor: "#2a2a2a",
                            border: "1px solid rgba(255, 174, 0, 0.2)",
                            borderRadius: "5px",
                            color: "#ededed",
                            fontSize: "12px",
                            outline: "none",
                            transition: "border-color 0.2s ease",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#FFAE00")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255, 174, 0, 0.2)")}
                    />
                    <span style={{ fontSize: "11px", color: "#888", minWidth: "45px" }}>{base}</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                        <button
                            onClick={() => adjustValue("amount", "up")}
                            style={{
                                padding: "1px 5px",
                                backgroundColor: "#2a2a2a",
                                border: "1px solid rgba(255, 174, 0, 0.2)",
                                borderRadius: "3px",
                                color: "#FFAE00",
                                cursor: "pointer",
                                fontSize: "9px",
                                transition: "all 0.2s ease",
                            }}
                        >
                            ↑
                        </button>
                        <button
                            onClick={() => adjustValue("amount", "down")}
                            style={{
                                padding: "1px 5px",
                                backgroundColor: "#2a2a2a",
                                border: "1px solid rgba(255, 174, 0, 0.2)",
                                borderRadius: "3px",
                                color: "#FFAE00",
                                cursor: "pointer",
                                fontSize: "9px",
                                transition: "all 0.2s ease",
                            }}
                        >
                            ↓
                        </button>
                    </div>
                </div>
            </div>

            {/* Total Field */}
            <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "10px", color: "#888", fontWeight: "500" }}>
                    Total
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input
                        type="number"
                        value={total}
                        onChange={(e) => setTotal(e.target.value)}
                        placeholder="0.00"
                        style={{
                            flex: 1,
                            padding: "7px 10px",
                            backgroundColor: "#2a2a2a",
                            border: "1px solid rgba(255, 174, 0, 0.2)",
                            borderRadius: "5px",
                            color: "#ededed",
                            fontSize: "12px",
                            outline: "none",
                            transition: "border-color 0.2s ease",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#FFAE00")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255, 174, 0, 0.2)")}
                    />
                    <span style={{ fontSize: "11px", color: "#888", minWidth: "45px" }}>{quote}</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                        <button
                            onClick={() => adjustValue("total", "up")}
                            style={{
                                padding: "1px 5px",
                                backgroundColor: "#2a2a2a",
                                border: "1px solid rgba(255, 174, 0, 0.2)",
                                borderRadius: "3px",
                                color: "#FFAE00",
                                cursor: "pointer",
                                fontSize: "9px",
                                transition: "all 0.2s ease",
                            }}
                        >
                            ↑
                        </button>
                        <button
                            onClick={() => adjustValue("total", "down")}
                            style={{
                                padding: "1px 5px",
                                backgroundColor: "#2a2a2a",
                                border: "1px solid rgba(255, 174, 0, 0.2)",
                                borderRadius: "3px",
                                color: "#FFAE00",
                                cursor: "pointer",
                                fontSize: "9px",
                                transition: "all 0.2s ease",
                            }}
                        >
                            ↓
                        </button>
                    </div>
                </div>
            </div>

            {/* Available Balance Display */}
            {selectedSymbol && (
                <div style={{ marginBottom: "8px", padding: "6px 8px", backgroundColor: "#2a2a2a", borderRadius: "5px", border: "1px solid rgba(255, 174, 0, 0.1)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "9px", color: "#888" }}>
                            Available {side === "buy" ? selectedSymbol.split("/")[1] : selectedSymbol.split("/")[0]}:
                        </span>
                        <span style={{ fontSize: "10px", fontWeight: "600", color: "#FFAE00" }}>
                            {balanceLoading ? "Loading..." : balance ? (
                                getAvailableBalance() > 0 ? 
                                    getAvailableBalance().toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : 
                                    "0.0000"
                            ) : "N/A"}
                        </span>
                    </div>
                    {balance && (
                        <div style={{ marginTop: "3px", fontSize: "8px", color: "#666" }}>
                            Total: {getTotalBalance() > 0 ? getTotalBalance().toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : "0.0000"}
                        </div>
                    )}
                </div>
            )}

            {/* Percentage Slider */}
            <div style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "9px", color: "#888" }}>%0</span>
                    <span style={{ fontSize: "9px", color: "#888" }}>%100</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={percentage}
                    onChange={(e) => handlePercentageChange(parseInt(e.target.value))}
                    style={{
                        width: "100%",
                        height: "3px",
                        borderRadius: "2px",
                        backgroundColor: "#2a2a2a",
                        outline: "none",
                        cursor: "pointer",
                    }}
                />
            </div>

            {/* Fee Display */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", padding: "6px 0", borderTop: "1px solid rgba(255, 174, 0, 0.1)" }}>
                <span style={{ fontSize: "10px", color: "#888" }}>Fee ({quote}) ≈</span>
                <span style={{ fontSize: "11px", color: "#ededed", fontWeight: "500" }}>{fee.toFixed(2)}</span>
            </div>

            {/* Place Order Button */}
            <button
                onClick={handlePlaceOrder}
                disabled={placingOrder || !amount || (orderType !== "market" && !price)}
                style={{
                    width: "100%",
                    padding: "9px",
                    backgroundColor: side === "buy" ? "#22c55e" : "#ef4444",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: placingOrder || !amount || (orderType !== "market" && !price) ? "not-allowed" : "pointer",
                    opacity: placingOrder || !amount || (orderType !== "market" && !price) ? 0.5 : 1,
                    transition: "all 0.2s ease",
                }}
            >
                {placingOrder ? "Placing..." : `${side.toUpperCase()} ${base}`}
            </button>
        </div>
    );
}


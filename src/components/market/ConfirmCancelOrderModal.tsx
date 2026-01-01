"use client";

import { useEffect } from "react";

interface ActiveOrder {
    id: number;
    exchange_account_id: number;
    symbol: string;
    side: "buy" | "sell";
    order_type: "market" | "limit" | "stop";
    status: string;
    quantity: string;
    price: string | null;
    filled_quantity: string;
    average_price: string | null;
    exchange_order_id: string | null;
    fee: string;
    fee_currency: string | null;
    created_at: string;
    updated_at: string;
    executed_at: string | null;
    cancelled_at: string | null;
    error_message: string | null;
}

interface ConfirmCancelOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    order: ActiveOrder | null;
}

// Function to determine appropriate decimal places for price
function getPriceDecimals(price: number): number {
    if (price >= 1000) return 2;
    if (price >= 100) return 2;
    if (price >= 10) return 3;
    if (price >= 1) return 4;
    if (price >= 0.1) return 5;
    if (price >= 0.01) return 6;
    if (price >= 0.001) return 7;
    if (price >= 0.0001) return 8;
    if (price >= 0.00001) return 9;
    if (price >= 0.000001) return 10;
    if (price >= 0.0000001) return 11;
    if (price >= 0.00000001) return 12;
    return 16;
}

// Function to format price with appropriate decimal places
function formatPrice(price: number): string {
    const decimals = getPriceDecimals(price);
    const formatted = price.toFixed(decimals);
    // Remove trailing zeros, but keep at least one decimal place for small numbers
    if (price < 1) {
        return formatted.replace(/\.?0+$/, '') || '0';
    }
    return formatted.replace(/\.0+$/, '') || formatted;
}

// Function to format number with commas
function formatNumber(num: number): string {
    return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 8,
    });
}

export default function ConfirmCancelOrderModal({
    isOpen,
    onClose,
    onConfirm,
    order,
}: ConfirmCancelOrderModalProps) {
    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            // Prevent body scroll when modal is open
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    if (!isOpen || !order) return null;

    const [base, quote] = order.symbol.split("/");
    const quantity = parseFloat(order.quantity);
    const price = order.price ? parseFloat(order.price) : null;
    const total = price ? quantity * price : null;

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.75)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                animation: "fadeIn 0.2s ease-in-out",
            }}
            onClick={onClose}
        >
            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
                @keyframes slideUp {
                    from {
                        transform: translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `}</style>
            <div
                style={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid rgba(255, 174, 0, 0.3)",
                    borderRadius: "12px",
                    padding: "24px",
                    maxWidth: "450px",
                    width: "90%",
                    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
                    animation: "slideUp 0.3s ease-out",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Title */}
                <h3
                    style={{
                        color: "#ffffff",
                        margin: 0,
                        marginBottom: "16px",
                        fontSize: "20px",
                        fontWeight: "600",
                        textAlign: "center",
                    }}
                >
                    Cancel Order
                </h3>

                {/* Confirmation Question */}
                <p
                    style={{
                        color: "#ededed",
                        fontSize: "14px",
                        margin: 0,
                        marginBottom: "20px",
                        textAlign: "center",
                    }}
                >
                    Are you sure you want to cancel this order?
                </p>

                {/* Order Details */}
                <div
                    style={{
                        backgroundColor: "#0f0f0f",
                        borderRadius: "8px",
                        padding: "16px",
                        marginBottom: "24px",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                >
                    {/* Order Type */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "12px",
                        }}
                    >
                        <span style={{ color: "#888", fontSize: "13px" }}>Order Type:</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ color: "#ffffff", fontSize: "13px", fontWeight: "500" }}>
                                {order.order_type.charAt(0).toUpperCase() + order.order_type.slice(1)}
                            </span>
                            <span style={{ color: "#888" }}>→</span>
                            <span
                                style={{
                                    color: order.side === "buy" ? "#22c55e" : "#ef4444",
                                    fontSize: "13px",
                                    fontWeight: "500",
                                }}
                            >
                                {order.side.charAt(0).toUpperCase() + order.side.slice(1)}
                            </span>
                        </div>
                    </div>

                    {/* Pair */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "12px",
                        }}
                    >
                        <span style={{ color: "#888", fontSize: "13px" }}>Pair:</span>
                        <span style={{ color: "#ffffff", fontSize: "13px", fontWeight: "500" }}>
                            {order.symbol}
                        </span>
                    </div>

                    {/* Price */}
                    {price && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: "12px",
                            }}
                        >
                            <span style={{ color: "#888", fontSize: "13px" }}>Price:</span>
                            <span style={{ color: "#ffffff", fontSize: "13px", fontWeight: "500" }}>
                                {formatPrice(price)} {quote}
                            </span>
                        </div>
                    )}

                    {/* Amount */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "12px",
                        }}
                    >
                        <span style={{ color: "#888", fontSize: "13px" }}>Amount:</span>
                        <span style={{ color: "#ffffff", fontSize: "13px", fontWeight: "500" }}>
                            {formatNumber(quantity)} {base}
                        </span>
                    </div>

                    {/* Total */}
                    {total && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <span style={{ color: "#888", fontSize: "13px" }}>Total:</span>
                            <span style={{ color: "#ffffff", fontSize: "13px", fontWeight: "500" }}>
                                {formatPrice(total)} {quote}
                            </span>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: "10px 24px",
                            backgroundColor: "#2a2a2a",
                            color: "#ffffff",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: "6px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            minWidth: "100px",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#3a3a3a";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#2a2a2a";
                        }}
                    >
                        Dismiss
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: "10px 24px",
                            backgroundColor: "#3b82f6",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            minWidth: "100px",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#2563eb";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#3b82f6";
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}



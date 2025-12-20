"use client";

import Image from "next/image";
import { useExchange } from "@/contexts/ExchangeContext";
import { usePathname } from "next/navigation";
import { MdMenuOpen, MdExpandMore } from "react-icons/md";
import { useState, useRef, useEffect } from "react";

interface HeaderProps {
    sidebarWidth: string;
    onToggleSidebar?: () => void;
    isSidebarCollapsed?: boolean;
}

export default function Header({ sidebarWidth, onToggleSidebar, isSidebarCollapsed }: HeaderProps) {
    const { accounts, selectedAccountId, setSelectedAccountId, loading } = useExchange();
    const pathname = usePathname();
    const isAuthPage = pathname === "/login" || pathname === "/register";
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    // Get selected account
    const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
    const exchangeName = selectedAccount?.exchange_name || "";

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

    return (
        <header
            style={{
                position: "fixed",
                top: 0,
                left: sidebarWidth,
                right: 0,
                height: "70px",
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
                                    accounts.map((acc) => (
                                        <div
                                            key={acc.id}
                                            onClick={() => {
                                                setSelectedAccountId(acc.id);
                                                setIsDropdownOpen(false);
                                            }}
                                            style={{
                                                padding: "12px 16px",
                                                color: selectedAccountId === acc.id ? "#FFAE00" : "#ededed",
                                                fontSize: "14px",
                                                cursor: "pointer",
                                                backgroundColor: selectedAccountId === acc.id ? "rgba(255, 174, 0, 0.1)" : "transparent",
                                                fontWeight: selectedAccountId === acc.id ? "600" : "400",
                                                transition: "all 0.2s ease",
                                            }}
                                            onMouseEnter={(e) => {
                                                if (selectedAccountId !== acc.id) {
                                                    e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.05)";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (selectedAccountId !== acc.id) {
                                                    e.currentTarget.style.backgroundColor = "transparent";
                                                }
                                            }}
                                        >
                                            {(acc.exchange_name || "Unknown").toUpperCase()}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const menuItems = [
     { name: "Market Data", path: "/market", icon: "📊" },
     { name: "Trading", path: "/trading", icon: "💹" },
     { name: "Bots", path: "/bots", icon: "🤖" },
     { name: "Performance", path: "/performance", icon: "📈" },
     { name: "Settings", path: "/settings", icon: "⚙️" },
];

export default function Sidebar() {
     const pathname = usePathname();
     const [isAuthenticated, setIsAuthenticated] = useState(false);

     useEffect(() => {
          const checkAuth = () => {
               const token = localStorage.getItem("auth_token");
               setIsAuthenticated(!!token);
          };
          checkAuth();
     }, []);

     const handleLogout = () => {
          localStorage.removeItem("auth_token");
          setIsAuthenticated(false);
          window.location.href = "/";
     };

     // Don't show sidebar on login/register pages
     if (pathname === "/login" || pathname === "/register" || !isAuthenticated) {
          return null;
     }

     return (
          <aside
               style={{
                    position: "fixed",
                    left: 0,
                    top: 0,
                    width: "250px",
                    height: "100vh",
                    backgroundColor: "#202020",
                    borderRight: "1px solid #2a2a2a",
                    padding: "24px 0",
                    display: "flex",
                    flexDirection: "column",
                    zIndex: 1000,
               }}
          >
               {/* Logo/Brand */}
               <div
                    style={{
                         padding: "0 24px 32px 24px",
                         borderBottom: "1px solid #2a2a2a",
                         marginBottom: "24px",
                         display: "flex",
                         alignItems: "center",
                         justifyContent: "center",
                    }}
               >
                    <Image
                         src="/brandlogo/Logo_dark_mode.svg"
                         alt="ArbiMind Logo"
                         width={180}
                         height={50}
                         priority
                         unoptimized
                         style={{
                              maxWidth: "100%",
                              height: "auto",
                         }}
                    />
               </div>

               {/* Navigation Items */}
               <nav
                    style={{
                         flex: 1,
                         display: "flex",
                         flexDirection: "column",
                         gap: "8px",
                         padding: "0 12px",
                    }}
               >
                    {menuItems.map((item) => {
                         const isActive = pathname === item.path || pathname?.startsWith(item.path + "/");
                         return (
                              <Link
                                   key={item.path}
                                   href={item.path}
                                   style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "12px",
                                        padding: "12px 16px",
                                        borderRadius: "8px",
                                        color: isActive ? "#FFAE00" : "#888888",
                                        backgroundColor: isActive ? "rgba(255, 174, 0, 0.1)" : "transparent",
                                        border: isActive ? "1px solid rgba(255, 174, 0, 0.3)" : "1px solid transparent",
                                        textDecoration: "none",
                                        transition: "all 0.2s ease",
                                        fontSize: "15px",
                                        fontWeight: isActive ? "600" : "400",
                                        textShadow: isActive ? "0 0 8px rgba(255, 174, 0, 0.6)" : "none",
                                   }}
                                   onMouseEnter={(e) => {
                                        if (!isActive) {
                                             e.currentTarget.style.color = "#FFAE00";
                                             e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.05)";
                                             e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.2)";
                                        }
                                   }}
                                   onMouseLeave={(e) => {
                                        if (!isActive) {
                                             e.currentTarget.style.color = "#888888";
                                             e.currentTarget.style.backgroundColor = "transparent";
                                             e.currentTarget.style.borderColor = "transparent";
                                        }
                                   }}
                              >
                                   <span style={{ fontSize: "20px" }}>{item.icon}</span>
                                   <span>{item.name}</span>
                              </Link>
                         );
                    })}
               </nav>

               {/* Logout Button */}
               <div
                    style={{
                         padding: "12px",
                         borderTop: "1px solid #2a2a2a",
                    }}
               >
                    <button
                         onClick={handleLogout}
                         style={{
                              width: "100%",
                              padding: "12px 16px",
                              backgroundColor: "rgba(255, 68, 68, 0.1)",
                              color: "#ff4444",
                              border: "1px solid rgba(255, 68, 68, 0.3)",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "15px",
                              fontWeight: "500",
                              transition: "all 0.2s ease",
                         }}
                         onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "rgba(255, 68, 68, 0.2)";
                              e.currentTarget.style.borderColor = "rgba(255, 68, 68, 0.5)";
                         }}
                         onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "rgba(255, 68, 68, 0.1)";
                              e.currentTarget.style.borderColor = "rgba(255, 68, 68, 0.3)";
                         }}
                    >
                         Logout
                    </button>
               </div>
          </aside>
     );
}

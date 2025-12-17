"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { 
     MdBarChart, 
     MdTrendingUp, 
     MdSmartToy, 
     MdAssessment, 
     MdAutoAwesome, 
     MdSettings,
     MdNotifications,
     MdSchool,
     MdDownload,
     MdLogout,
     MdChevronLeft,
     MdChevronRight
} from "react-icons/md";

// Base menu items available to all users
const baseMenuItems = [
     { name: "Market Data", path: "/market", icon: MdBarChart, adminOnly: false },
     { name: "Trading", path: "/trading", icon: MdTrendingUp, adminOnly: false },
     { name: "Bots", path: "/bots", icon: MdSmartToy, adminOnly: false },
     { name: "Performance", path: "/performance", icon: MdAssessment, adminOnly: false },
     { name: "Predictions", path: "/predictions", icon: MdAutoAwesome, adminOnly: false },
     { name: "Settings", path: "/settings", icon: MdSettings, adminOnly: false },
];

// Admin-only menu items
const adminMenuItems = [
     { name: "Monitoring", path: "/monitoring", icon: MdNotifications, adminOnly: true },
     { name: "Training", path: "/training", icon: MdSchool, adminOnly: true },
     { name: "Backfill", path: "/backfill", icon: MdDownload, adminOnly: true },
];

interface SidebarProps {
     isCollapsed: boolean;
     onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
     const pathname = usePathname();
     const [isAuthenticated, setIsAuthenticated] = useState(false);
     const [isAdmin, setIsAdmin] = useState(false);

     useEffect(() => {
          const checkAuth = async () => {
               const token = localStorage.getItem("auth_token");
               setIsAuthenticated(!!token);

               // Check if user is admin
               if (token) {
                    try {
                         const apiUrl = typeof window !== "undefined" ? "http://localhost:8000" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                         const meRes = await fetch(`${apiUrl}/auth/me`, {
                              headers: { Authorization: `Bearer ${token}` },
                         });
                         if (meRes.ok) {
                              const meData = await meRes.json();
                              const isUserAdmin = meData.username === "admin" || meData.role === "admin";
                              setIsAdmin(isUserAdmin);
                         }
                    } catch (error) {
                         console.warn("Failed to check admin status:", error);
                         setIsAdmin(false);
                    }
               }
          };
          checkAuth();
     }, []);

     const handleLogout = () => {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("selectedAccountId");
          setIsAuthenticated(false);
          // Dispatch event to notify ExchangeContext
          window.dispatchEvent(new Event("authTokenRemoved"));
          window.location.href = "/";
     };

     // Don't show sidebar on login/register pages
     if (pathname === "/login" || pathname === "/register" || !isAuthenticated) {
          return null;
     }

     const sidebarWidth = isCollapsed ? "65px" : "250px";

     return (
          <aside
               style={{
                    position: "fixed",
                    left: 0,
                    top: 0,
                    width: sidebarWidth,
                    height: "100vh",
                    backgroundColor: "#1a1a1a",
                    borderRight: "1px solid #2a2a2a",
                    padding: "24px 0",
                    display: "flex",
                    flexDirection: "column",
                    zIndex: 1000,
                    transition: "width 0.3s ease",
               }}
          >
               {/* Toggle Button */}
               <div
                    style={{
                         padding: "0 12px 16px 12px",
                         display: "flex",
                         justifyContent: isCollapsed ? "center" : "flex-end",
                         alignItems: "center",
                    }}
               >
                    <button
                         onClick={onToggle}
                         style={{
                              width: isCollapsed ? "40px" : "auto",
                              height: "40px",
                              padding: isCollapsed ? "0" : "8px 12px",
                              backgroundColor: "rgba(255, 174, 0, 0.1)",
                              color: "#FFAE00",
                              border: "1px solid rgba(255, 174, 0, 0.3)",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "18px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.2s ease",
                         }}
                         onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.2)";
                              e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.5)";
                         }}
                         onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.1)";
                              e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.3)";
                         }}
                    >
                         {isCollapsed ? <MdChevronRight size={24} /> : <MdChevronLeft size={24} />}
                    </button>
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
                    {/* Base menu items (all users) */}
                    {baseMenuItems.map((item) => {
                         const isActive = pathname === item.path || pathname?.startsWith(item.path + "/");
                         return (
                              <Link
                                   key={item.path}
                                   href={item.path}
                                   title={isCollapsed ? item.name : undefined}
                                   style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: isCollapsed ? "0" : "12px",
                                        padding: isCollapsed ? "12px" : "12px 16px",
                                        borderRadius: "8px",
                                        color: isActive ? "#FFAE00" : "#888888",
                                        backgroundColor: isActive ? "rgba(255, 174, 0, 0.1)" : "transparent",
                                        border: isActive ? "1px solid rgba(255, 174, 0, 0.3)" : "1px solid transparent",
                                        textDecoration: "none",
                                        transition: "all 0.2s ease",
                                        fontSize: isCollapsed ? "20px" : "15px",
                                        fontWeight: isActive ? "600" : "400",
                                        textShadow: isActive ? "0 0 8px rgba(255, 174, 0, 0.6)" : "none",
                                        justifyContent: isCollapsed ? "center" : "flex-start",
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
                                   <item.icon size={20} style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "inherit" }} />
                                   {!isCollapsed && <span>{item.name}</span>}
                              </Link>
                         );
                    })}

                    {/* Admin-only menu items */}
                    {isAdmin && adminMenuItems.map((item) => {
                         const isActive = pathname === item.path || pathname?.startsWith(item.path + "/");
                         return (
                              <Link
                                   key={item.path}
                                   href={item.path}
                                   title={isCollapsed ? item.name : undefined}
                                   style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: isCollapsed ? "0" : "12px",
                                        padding: isCollapsed ? "12px" : "12px 16px",
                                        borderRadius: "8px",
                                        color: isActive ? "#FFAE00" : "#888888",
                                        backgroundColor: isActive ? "rgba(255, 174, 0, 0.1)" : "transparent",
                                        border: isActive ? "1px solid rgba(255, 174, 0, 0.3)" : "1px solid transparent",
                                        textDecoration: "none",
                                        transition: "all 0.2s ease",
                                        fontSize: isCollapsed ? "20px" : "15px",
                                        fontWeight: isActive ? "600" : "400",
                                        textShadow: isActive ? "0 0 8px rgba(255, 174, 0, 0.6)" : "none",
                                        justifyContent: isCollapsed ? "center" : "flex-start",
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
                                   <item.icon size={20} style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "inherit" }} />
                                   {!isCollapsed && <span>{item.name}</span>}
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
                         title={isCollapsed ? "Logout" : undefined}
                         style={{
                              width: "100%",
                              padding: isCollapsed ? "12px" : "12px 16px",
                              backgroundColor: "rgba(255, 68, 68, 0.1)",
                              color: "#ff4444",
                              border: "1px solid rgba(255, 68, 68, 0.3)",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: isCollapsed ? "20px" : "15px",
                              fontWeight: "500",
                              transition: "all 0.2s ease",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: isCollapsed ? "center" : "flex-start",
                              gap: isCollapsed ? "0" : "8px",
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
                         <MdLogout size={20} style={{ color: "inherit" }} />
                         {!isCollapsed && <span>Logout</span>}
                    </button>
               </div>
          </aside>
     );
}

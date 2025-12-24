"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/forgot-password" || pathname === "/reset-password";
    
    // Load sidebar state from localStorage or default to false (expanded)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        // Load sidebar state from localStorage
        const savedState = localStorage.getItem("sidebarCollapsed");
        if (savedState !== null) {
            setIsSidebarCollapsed(savedState === "true");
        }
    }, []);

    const toggleSidebar = () => {
        const newState = !isSidebarCollapsed;
        setIsSidebarCollapsed(newState);
        // Save to localStorage
        localStorage.setItem("sidebarCollapsed", String(newState));
    };

    if (isAuthPage) {
        return <>{children}</>;
    }

    const sidebarWidth = isSidebarCollapsed ? "65px" : "250px";

    return (
        <>
            <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
            <Header sidebarWidth={sidebarWidth} onToggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
            <div
                style={{
                    marginLeft: sidebarWidth,
                    paddingTop: "68px",
                    minHeight: "100vh",
                    backgroundColor: "#202020",
                    transition: "margin-left 0.3s ease",
                }}
            >
                {children}
            </div>
        </>
    );
}

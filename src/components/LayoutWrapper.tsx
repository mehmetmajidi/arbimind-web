"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthPage = pathname === "/login" || pathname === "/register";

    if (isAuthPage) {
        return <>{children}</>;
    }

    return (
        <>
            <Sidebar />
            <Header />
            <div
                style={{
                    marginLeft: "250px",
                    minHeight: "100vh",
                    backgroundColor: "#202020",
                }}
            >
                {children}
            </div>
        </>
    );
}


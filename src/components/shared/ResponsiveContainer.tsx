"use client";

import { ReactNode } from "react";
import { useResponsive } from "@/hooks/useResponsive";
import { breakpoints } from "./designSystem";

interface ResponsiveContainerProps {
    children: ReactNode;
    mobile?: ReactNode;
    tablet?: ReactNode;
    desktop?: ReactNode;
    className?: string;
}

export default function ResponsiveContainer({
    children,
    mobile,
    tablet,
    desktop,
}: ResponsiveContainerProps) {
    const { isMobile, isTablet, isDesktop } = useResponsive();

    if (isMobile && mobile) return <>{mobile}</>;
    if (isTablet && tablet) return <>{tablet}</>;
    if (isDesktop && desktop) return <>{desktop}</>;

    return <>{children}</>;
}

// Responsive utility functions
export function useResponsiveStyles() {
    const { isMobile, isTablet, isDesktop } = useResponsive();

    return {
        isMobile,
        isTablet,
        isDesktop,
        // Responsive padding
        padding: isMobile ? "12px" : isTablet ? "16px" : "24px",
        // Responsive gap
        gap: isMobile ? "8px" : isTablet ? "12px" : "16px",
        // Responsive font sizes
        fontSize: {
            h1: isMobile ? "24px" : isTablet ? "28px" : "32px",
            h2: isMobile ? "20px" : isTablet ? "22px" : "24px",
            h3: isMobile ? "16px" : isTablet ? "17px" : "18px",
            body: isMobile ? "13px" : "14px",
            small: "12px",
        },
        // Responsive grid columns
        gridColumns: (cols: { mobile?: number; tablet?: number; desktop: number }) => {
            if (isMobile && cols.mobile !== undefined) return cols.mobile;
            if (isTablet && cols.tablet !== undefined) return cols.tablet;
            return cols.desktop;
        },
    };
}


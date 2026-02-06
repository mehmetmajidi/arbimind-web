"use client";

import { useState, useEffect } from "react";
import { breakpoints } from "@/components/shared/designSystem";

export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
}

/**
 * Hook for responsive design based on window width.
 * 
 * @returns Responsive state with breakpoint flags and current width
 */
export function useResponsive(): ResponsiveState {
  const [width, setWidth] = useState<number>(() => {
    // Initialize with window width if available, otherwise 0
    if (typeof window !== "undefined") {
      return window.innerWidth;
    }
    return 0;
  });

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") {
      return;
    }

    // Set initial width (in case it changed between render and effect)
    setWidth(window.innerWidth);

    // Handle resize
    const handleResize = () => {
      setWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    isMobile: width > 0 && width < breakpoints.mobile,
    isTablet: width >= breakpoints.mobile && width < breakpoints.tablet,
    isDesktop: width >= breakpoints.tablet,
    width,
  };
}

/**
 * Hook for checking if screen is mobile.
 */
export function useIsMobile(): boolean {
  const { isMobile } = useResponsive();
  return isMobile;
}

/**
 * Hook for checking if screen is tablet or larger.
 */
export function useIsTabletOrLarger(): boolean {
  const { isTablet, isDesktop } = useResponsive();
  return isTablet || isDesktop;
}

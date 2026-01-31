"use client";

import { useState, useEffect } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

interface UseResponsiveReturn {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
}

/**
 * Custom hook for responsive design
 * Breakpoints:
 * - mobile: < 768px
 * - tablet: 768px - 1279px
 * - desktop: >= 1280px
 */
export function useResponsive(): UseResponsiveReturn {
  const [width, setWidth] = useState<number>(0);
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");

  useEffect(() => {
    // Set initial width
    if (typeof window !== "undefined") {
      setWidth(window.innerWidth);
    }

    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWidth(newWidth);

      if (newWidth < 768) {
        setBreakpoint("mobile");
      } else if (newWidth < 1280) {
        setBreakpoint("tablet");
      } else {
        setBreakpoint("desktop");
      }
    };

    // Initial check
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === "mobile",
    isTablet: breakpoint === "tablet",
    isDesktop: breakpoint === "desktop",
    width,
  };
}


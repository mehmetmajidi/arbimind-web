"use client";

import { useState, useRef, useEffect } from "react";

interface TouchInteractionOptions {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    swipeThreshold?: number;
    longPressDelay?: number;
    onLongPress?: () => void;
}

export function useTouchInteractions(options: TouchInteractionOptions = {}) {
    const {
        onSwipeLeft,
        onSwipeRight,
        onSwipeUp,
        onSwipeDown,
        swipeThreshold = 50,
        longPressDelay = 500,
        onLongPress,
    } = options;

    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        touchStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now(),
        };

        // Long press detection
        if (onLongPress) {
            longPressTimerRef.current = setTimeout(() => {
                onLongPress();
            }, longPressDelay);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        // Cancel long press if user moves
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        // Cancel long press
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }

        if (!touchStartRef.current) return;

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = touch.clientY - touchStartRef.current.y;
        const deltaTime = Date.now() - touchStartRef.current.time;

        // Only detect swipe if movement is quick (< 300ms) and significant
        if (deltaTime < 300) {
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            if (absX > swipeThreshold && absX > absY) {
                // Horizontal swipe
                if (deltaX > 0 && onSwipeRight) {
                    onSwipeRight();
                } else if (deltaX < 0 && onSwipeLeft) {
                    onSwipeLeft();
                }
            } else if (absY > swipeThreshold && absY > absX) {
                // Vertical swipe
                if (deltaY > 0 && onSwipeDown) {
                    onSwipeDown();
                } else if (deltaY < 0 && onSwipeUp) {
                    onSwipeUp();
                }
            }
        }

        touchStartRef.current = null;
    };

    useEffect(() => {
        return () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
            }
        };
    }, []);

    return {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
    };
}


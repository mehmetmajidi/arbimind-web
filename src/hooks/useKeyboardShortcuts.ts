"use client";

import { useEffect } from "react";

interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
    action: () => void;
    description?: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            shortcuts.forEach((shortcut) => {
                const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
                const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
                const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
                const altMatch = shortcut.alt ? event.altKey : !event.altKey;
                const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;

                // Don't trigger if user is typing in an input
                const isTyping =
                    event.target instanceof HTMLInputElement ||
                    event.target instanceof HTMLTextAreaElement ||
                    event.target instanceof HTMLSelectElement ||
                    (event.target as HTMLElement)?.isContentEditable;

                if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch && !isTyping) {
                    event.preventDefault();
                    shortcut.action();
                }
            });
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [shortcuts]);
}

// Common keyboard shortcuts
export const commonShortcuts = {
    // Navigation
    goToMarket: { key: "m", ctrl: true, description: "Go to Market page" },
    goToBots: { key: "b", ctrl: true, description: "Go to Bots page" },
    goToTrading: { key: "t", ctrl: true, description: "Go to Trading page" },
    goToPerformance: { key: "p", ctrl: true, description: "Go to Performance page" },
    goToPredictions: { key: "r", ctrl: true, description: "Go to Predictions page" },
    
    // Actions
    refresh: { key: "r", ctrl: true, shift: true, description: "Refresh current page" },
    search: { key: "f", ctrl: true, description: "Focus search" },
    new: { key: "n", ctrl: true, description: "Create new item" },
    close: { key: "Escape", description: "Close modal/dialog" },
};


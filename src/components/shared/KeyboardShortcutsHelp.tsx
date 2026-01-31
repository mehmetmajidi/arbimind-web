"use client";

import { useState, useEffect } from "react";
import { colors } from "./designSystem";
import { MdKeyboard } from "react-icons/md";
import { commonShortcuts } from "@/hooks/useKeyboardShortcuts";

interface KeyboardShortcutsHelpProps {
    shortcuts?: Array<{ key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean; description: string }>;
}

export default function KeyboardShortcutsHelp({ shortcuts = Object.values(commonShortcuts) }: KeyboardShortcutsHelpProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Press ? to show/hide shortcuts help
            if (event.key === "?" && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
                const isTyping =
                    event.target instanceof HTMLInputElement ||
                    event.target instanceof HTMLTextAreaElement ||
                    (event.target as HTMLElement)?.isContentEditable;

                if (!isTyping) {
                    event.preventDefault();
                    setShowHelp(!showHelp);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [showHelp]);

    const formatKey = (shortcut: typeof shortcuts[0]) => {
        const parts: string[] = [];
        if (shortcut.ctrl) parts.push("Ctrl");
        if (shortcut.shift) parts.push("Shift");
        if (shortcut.alt) parts.push("Alt");
        if (shortcut.meta) parts.push("Meta");
        parts.push(shortcut.key.toUpperCase());
        return parts.join(" + ");
    };

    if (!showHelp) {
        return (
            <button
                onClick={() => setShowHelp(true)}
                style={{
                    position: "fixed",
                    bottom: "20px",
                    right: "20px",
                    padding: "12px",
                    backgroundColor: colors.panelBackground,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "50%",
                    color: colors.text,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
                }}
                title="Keyboard Shortcuts (Press ?)"
            >
                <MdKeyboard size={24} />
            </button>
        );
    }

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10000,
            }}
            onClick={() => setShowHelp(false)}
        >
            <div
                style={{
                    backgroundColor: colors.panelBackground,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "12px",
                    padding: "24px",
                    maxWidth: "600px",
                    maxHeight: "80vh",
                    overflow: "auto",
                    color: colors.text,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600", color: colors.primary }}>
                        Keyboard Shortcuts
                    </h2>
                    <button
                        onClick={() => setShowHelp(false)}
                        style={{
                            padding: "4px",
                            backgroundColor: "transparent",
                            border: "none",
                            color: colors.secondaryText,
                            cursor: "pointer",
                            fontSize: "24px",
                        }}
                    >
                        ×
                    </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {shortcuts.map((shortcut, index) => (
                        <div
                            key={index}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "12px",
                                backgroundColor: colors.background,
                                borderRadius: "6px",
                            }}
                        >
                            <span style={{ fontSize: "14px", color: colors.text }}>{shortcut.description}</span>
                            <kbd
                                style={{
                                    padding: "4px 8px",
                                    backgroundColor: colors.background,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: "4px",
                                    fontSize: "12px",
                                    fontFamily: "monospace",
                                    color: colors.primary,
                                }}
                            >
                                {formatKey(shortcut)}
                            </kbd>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: "20px", padding: "12px", backgroundColor: colors.background, borderRadius: "6px", fontSize: "12px", color: colors.secondaryText }}>
                    Press <kbd style={{ padding: "2px 6px", backgroundColor: colors.panelBackground, borderRadius: "3px" }}>?</kbd> to toggle this help
                </div>
            </div>
        </div>
    );
}


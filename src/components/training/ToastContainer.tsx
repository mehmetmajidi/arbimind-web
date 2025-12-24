"use client";

import { useState, useCallback, useEffect } from "react";
import Toast, { ToastType } from "./Toast";

export interface ToastMessage {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContainerProps {
    maxToasts?: number;
}

export default function ToastContainer({ maxToasts = 5 }: ToastContainerProps) {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = useCallback((type: ToastType, message: string, duration?: number) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        const newToast: ToastMessage = { id, type, message, duration };
        
        setToasts((prev) => {
            const updated = [newToast, ...prev];
            return updated.slice(0, maxToasts);
        });
    }, [maxToasts]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    // Expose showToast globally for easy access
    useEffect(() => {
        if (typeof window !== "undefined") {
            (window as any).showTrainingToast = showToast;
        }
        return () => {
            if (typeof window !== "undefined") {
                delete (window as any).showTrainingToast;
            }
        };
    }, [showToast]);

    return (
        <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 10000, display: "flex", flexDirection: "column", gap: "8px" }}>
            {toasts.map((toast, index) => (
                <Toast
                    key={toast.id}
                    type={toast.type}
                    message={toast.message}
                    duration={toast.duration}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
}

// Helper function to show toast
export function showToast(type: ToastType, message: string, duration?: number) {
    if (typeof window !== "undefined" && (window as any).showTrainingToast) {
        (window as any).showTrainingToast(type, message, duration);
    } else {
        console.warn("ToastContainer not mounted. Toast:", { type, message });
    }
}


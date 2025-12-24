"use client";

interface LoadingSpinnerProps {
    size?: "small" | "medium" | "large";
    color?: string;
    text?: string;
}

export default function LoadingSpinner({ 
    size = "medium", 
    color = "#FFAE00",
    text 
}: LoadingSpinnerProps) {
    const getSize = () => {
        switch (size) {
            case "small":
                return { width: "16px", height: "16px", borderWidth: "2px" };
            case "large":
                return { width: "48px", height: "48px", borderWidth: "4px" };
            default: // medium
                return { width: "24px", height: "24px", borderWidth: "3px" };
        }
    };

    const sizeStyles = getSize();

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <div
                style={{
                    width: sizeStyles.width,
                    height: sizeStyles.height,
                    border: `${sizeStyles.borderWidth} solid rgba(255, 174, 0, 0.2)`,
                    borderTop: `${sizeStyles.borderWidth} solid ${color}`,
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                }}
            />
            {text && (
                <span style={{ color: "#888", fontSize: "12px" }}>
                    {text}
                </span>
            )}
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}


"use client";

interface SkeletonLoaderProps {
    type?: "text" | "table" | "card" | "circle";
    lines?: number;
    width?: string;
    height?: string;
}

export default function SkeletonLoader({ 
    type = "text", 
    lines = 3,
    width,
    height 
}: SkeletonLoaderProps) {
    const baseStyle: React.CSSProperties = {
        backgroundColor: "#202020",
        borderRadius: "4px",
        animation: "pulse 1.5s ease-in-out infinite",
    };

    if (type === "circle") {
        return (
            <div
                style={{
                    ...baseStyle,
                    width: width || "40px",
                    height: height || "40px",
                    borderRadius: "50%",
                }}
            />
        );
    }

    if (type === "card") {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ ...baseStyle, width: width || "100%", height: height || "20px" }} />
                <div style={{ ...baseStyle, width: "80%", height: "16px" }} />
                <div style={{ ...baseStyle, width: "60%", height: "16px" }} />
            </div>
        );
    }

    if (type === "table") {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {Array.from({ length: lines }).map((_, idx) => (
                    <div key={idx} style={{ display: "flex", gap: "8px" }}>
                        <div style={{ ...baseStyle, width: "20%", height: "20px" }} />
                        <div style={{ ...baseStyle, width: "15%", height: "20px" }} />
                        <div style={{ ...baseStyle, width: "15%", height: "20px" }} />
                        <div style={{ ...baseStyle, width: "10%", height: "20px" }} />
                        <div style={{ ...baseStyle, width: "15%", height: "20px" }} />
                        <div style={{ ...baseStyle, width: "15%", height: "20px" }} />
                        <div style={{ ...baseStyle, width: "10%", height: "20px" }} />
                    </div>
                ))}
            </div>
        );
    }

    // text
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Array.from({ length: lines }).map((_, idx) => (
                <div
                    key={idx}
                    style={{
                        ...baseStyle,
                        width: idx === lines - 1 ? "60%" : width || "100%",
                        height: height || "16px",
                    }}
                />
            ))}
        </div>
    );
}


"use client";

import { useState, useRef, useEffect } from "react";
import { colors } from "./designSystem";
import { MdInfo } from "react-icons/md";

interface TooltipProps {
    content: string;
    children?: React.ReactNode;
    position?: "top" | "bottom" | "left" | "right";
    icon?: boolean;
    delay?: number;
}

export default function Tooltip({
    content,
    children,
    position = "top",
    icon = false,
    delay = 300,
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [showTimeout, setShowTimeout] = useState<NodeJS.Timeout | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        return () => {
            if (showTimeout) {
                clearTimeout(showTimeout);
            }
        };
    }, [showTimeout]);

    const handleMouseEnter = () => {
        const timeout = setTimeout(() => {
            setIsVisible(true);
        }, delay);
        setShowTimeout(timeout);
    };

    const handleMouseLeave = () => {
        if (showTimeout) {
            clearTimeout(showTimeout);
        }
        setIsVisible(false);
    };

    const getPositionStyle = () => {
        const baseStyle: React.CSSProperties = {
            position: "absolute",
            zIndex: 1000,
            padding: "8px 12px",
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: "6px",
            fontSize: "12px",
            color: colors.text,
            maxWidth: "250px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
            pointerEvents: "none",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
        };

        switch (position) {
            case "top":
                return {
                    ...baseStyle,
                    bottom: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    marginBottom: "8px",
                };
            case "bottom":
                return {
                    ...baseStyle,
                    top: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    marginTop: "8px",
                };
            case "left":
                return {
                    ...baseStyle,
                    right: "100%",
                    top: "50%",
                    transform: "translateY(-50%)",
                    marginRight: "8px",
                };
            case "right":
                return {
                    ...baseStyle,
                    left: "100%",
                    top: "50%",
                    transform: "translateY(-50%)",
                    marginLeft: "8px",
                };
            default:
                return baseStyle;
        }
    };

    return (
        <div
            ref={tooltipRef}
            style={{ position: "relative", display: "inline-block" }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {icon ? (
                <MdInfo
                    size={16}
                    color={colors.secondaryText}
                    style={{ cursor: "help", verticalAlign: "middle" }}
                />
            ) : (
                children
            )}
            {isVisible && (
                <div style={getPositionStyle()}>
                    {content}
                </div>
            )}
        </div>
    );
}


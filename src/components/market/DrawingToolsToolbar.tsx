"use client";

import { useState } from "react";
import { 
    MdEdit, 
    MdLock, 
    MdLockOpen, 
    MdVisibility, 
    MdVisibilityOff, 
    MdDelete,
    MdZoomIn,
    MdStraighten,
    MdTextFields,
    MdBrush,
    MdTrendingUp,
    MdCallSplit,
    MdGridOn,
    MdClose,
    MdLens
} from "react-icons/md";

export type DrawingTool = 
    | "select"
    | "trendline"
    | "horizontal"
    | "vertical"
    | "ray"
    | "parallel"
    | "fibonacci"
    | "brush"
    | "text"
    | "emoji"
    | "ruler"
    | "zoom"
    | "magnet"
    | "edit"
    | "lock"
    | "visibility"
    | "delete"
    | null;

interface DrawingToolsToolbarProps {
    activeTool: DrawingTool;
    onToolChange: (tool: DrawingTool) => void;
    onLockAll?: () => void;
    onUnlockAll?: () => void;
    onToggleVisibility?: () => void;
    onDeleteAll?: () => void;
    isLocked?: boolean;
    isVisible?: boolean;
}

export default function DrawingToolsToolbar({
    activeTool,
    onToolChange,
    onLockAll,
    onUnlockAll,
    onToggleVisibility,
    onDeleteAll,
    isLocked = false,
    isVisible = true,
}: DrawingToolsToolbarProps) {
    const [showLineOptions, setShowLineOptions] = useState(false);

    const tools: Array<{
        id: DrawingTool;
        icon: React.ReactNode;
        label: string;
        hasDropdown?: boolean;
    }> = [
        { 
            id: "select", 
            icon: <MdClose size={20} />, 
            label: "Close/Select" 
        },
        { 
            id: "trendline", 
            icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 18L8 12L12 16L18 10" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18 10V8H16" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            ), 
            label: "Trend Line",
            hasDropdown: true
        },
        { 
            id: "parallel", 
            icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 6L18 6" strokeLinecap="round"/>
                    <path d="M2 14L18 14" strokeLinecap="round"/>
                </svg>
            ), 
            label: "Parallel Lines" 
        },
        { 
            id: "fibonacci", 
            icon: <MdGridOn size={20} />, 
            label: "Fibonacci" 
        },
        { 
            id: "brush", 
            icon: <MdBrush size={20} />, 
            label: "Brush" 
        },
        { 
            id: "text", 
            icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <text x="4" y="15" fontSize="14" fontWeight="bold">T</text>
                    <text x="10" y="15" fontSize="10">t</text>
                </svg>
            ), 
            label: "Text" 
        },
        { 
            id: "ruler", 
            icon: <MdStraighten size={20} />, 
            label: "Ruler" 
        },
        { 
            id: "zoom", 
            icon: <MdZoomIn size={20} />, 
            label: "Zoom In" 
        },
        { 
            id: "magnet", 
            icon: <MdLens size={20} />, 
            label: "Point/Magnet" 
        },
        { 
            id: "edit", 
            icon: <MdEdit size={20} />, 
            label: "Edit" 
        },
        { 
            id: "lock", 
            icon: isLocked ? <MdLock size={20} /> : <MdLockOpen size={20} />, 
            label: isLocked ? "Unlock All" : "Lock All" 
        },
        { 
            id: "visibility", 
            icon: isVisible ? <MdVisibility size={20} /> : <MdVisibilityOff size={20} />, 
            label: isVisible ? "Hide Drawings" : "Show Drawings" 
        },
        { 
            id: "delete", 
            icon: <MdDelete size={20} />, 
            label: "Delete All" 
        },
    ];

    const handleToolClick = (tool: DrawingTool) => {
        if (tool === "lock") {
            if (isLocked && onUnlockAll) {
                onUnlockAll();
            } else if (!isLocked && onLockAll) {
                onLockAll();
            }
            return;
        }
        
        if (tool === "visibility" && onToggleVisibility) {
            onToggleVisibility();
            return;
        }
        
        if (tool === "delete" && onDeleteAll) {
            onDeleteAll();
            return;
        }

        if (tool === "trendline") {
            setShowLineOptions(!showLineOptions);
            return;
        }

        // Toggle tool selection
        if (activeTool === tool) {
            onToolChange(null);
        } else {
            onToolChange(tool);
        }
    };

    return (
        <div style={{ 
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            /* width: "100%", */
        }}>
            {tools.map((tool) => (
                <div key={tool.id} style={{ position: "relative" }}>
                    <button
                        onClick={() => handleToolClick(tool.id)}
                        title={tool.label}
                        style={{
                            width: "36px",
                            height: "36px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: activeTool === tool.id ? "rgba(255, 174, 0, 0.25)" : "transparent",
                            border: activeTool === tool.id ? "2px solid #FFAE00" : "1px solid transparent",
                            borderRadius: "6px",
                            color: activeTool === tool.id ? "#FFAE00" : "#ffffff",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                            if (activeTool !== tool.id) {
                                e.currentTarget.style.backgroundColor = "rgba(255, 174, 0, 0.15)";
                                e.currentTarget.style.borderColor = "rgba(255, 174, 0, 0.3)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeTool !== tool.id) {
                                e.currentTarget.style.backgroundColor = "transparent";
                                e.currentTarget.style.borderColor = "transparent";
                            }
                        }}
                    >
                        {tool.icon}
                    </button>
                    
                    {/* Dropdown for trendline options */}
                    {tool.hasDropdown && showLineOptions && tool.id === "trendline" && (
                        <div style={{
                            position: "absolute",
                            left: "48px",
                            top: "0",
                            backgroundColor: "#1a1a1a",
                            borderRadius: "8px",
                            padding: "8px",
                            border: "1px solid rgba(255, 174, 0, 0.2)",
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            minWidth: "120px",
                        }}>
                            <button
                                onClick={() => {
                                    onToolChange("trendline");
                                    setShowLineOptions(false);
                                }}
                                style={{
                                    padding: "8px 12px",
                                    backgroundColor: activeTool === "trendline" ? "rgba(255, 174, 0, 0.2)" : "transparent",
                                    border: "none",
                                    borderRadius: "4px",
                                    color: "#ededed",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    fontSize: "12px",
                                }}
                            >
                                Trend Line
                            </button>
                            <button
                                onClick={() => {
                                    onToolChange("horizontal");
                                    setShowLineOptions(false);
                                }}
                                style={{
                                    padding: "8px 12px",
                                    backgroundColor: activeTool === "horizontal" ? "rgba(255, 174, 0, 0.2)" : "transparent",
                                    border: "none",
                                    borderRadius: "4px",
                                    color: "#ededed",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    fontSize: "12px",
                                }}
                            >
                                Horizontal Line
                            </button>
                            <button
                                onClick={() => {
                                    onToolChange("vertical");
                                    setShowLineOptions(false);
                                }}
                                style={{
                                    padding: "8px 12px",
                                    backgroundColor: activeTool === "vertical" ? "rgba(255, 174, 0, 0.2)" : "transparent",
                                    border: "none",
                                    borderRadius: "4px",
                                    color: "#ededed",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    fontSize: "12px",
                                }}
                            >
                                Vertical Line
                            </button>
                            <button
                                onClick={() => {
                                    onToolChange("ray");
                                    setShowLineOptions(false);
                                }}
                                style={{
                                    padding: "8px 12px",
                                    backgroundColor: activeTool === "ray" ? "rgba(255, 174, 0, 0.2)" : "transparent",
                                    border: "none",
                                    borderRadius: "4px",
                                    color: "#ededed",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    fontSize: "12px",
                                }}
                            >
                                Ray
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
